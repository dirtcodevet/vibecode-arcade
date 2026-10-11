import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import {
  AdditiveBlending,
  CanvasTexture,
  Group,
  MeshBasicMaterial,
  Shape,
  ShapeGeometry,
  ShaderMaterial,
  Texture,
} from 'three'
import { cameraParam } from '../beats'
import { scroll } from '../scroll'
import { slots, useSlotTexture } from '../slots'
import { NOISE_GLSL } from './noiseGlsl'
import { FRAME_COUNT, FRAME_H, FRAME_W, forkState, frameState, newFrameState, type FrameState } from './frameLayout'
import { RemixThreads } from './RemixThreads'

function roundedRect(w: number, h: number, r: number) {
  const s = new Shape()
  const x = -w / 2
  const y = -h / 2
  s.moveTo(x + r, y)
  s.lineTo(x + w - r, y)
  s.quadraticCurveTo(x + w, y, x + w, y + r)
  s.lineTo(x + w, y + h - r)
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  s.lineTo(x + r, y + h)
  s.quadraticCurveTo(x, y + h, x, y + h - r)
  s.lineTo(x, y + r)
  s.quadraticCurveTo(x, y, x + r, y)
  return s
}

function ring(w: number, h: number, thickness: number, r: number) {
  const outer = roundedRect(w + thickness * 2, h + thickness * 2, r + thickness)
  outer.holes.push(roundedRect(w, h, r))
  return new ShapeGeometry(outer, 6)
}

/** "SLOT 007 / OPEN" lettering for an empty window, drawn once fonts are ready. */
function useSlotLabel(index: number, text: string): Texture {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 768
    canvas.height = 432
    return new CanvasTexture(canvas)
  }, [])
  useEffect(() => {
    const draw = () => {
      const canvas = texture.image as HTMLCanvasElement
      const ctx = canvas.getContext('2d')!
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.fillStyle = '#fff'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.lineWidth = 3
      ctx.strokeStyle = '#fff'
      const cx = canvas.width / 2
      ctx.beginPath()
      ctx.moveTo(cx - 34, 170)
      ctx.lineTo(cx + 34, 170)
      ctx.moveTo(cx, 136)
      ctx.lineTo(cx, 204)
      ctx.stroke()
      ctx.font = '500 34px "Inter Tight Variable", system-ui, sans-serif'
      ctx.letterSpacing = '10px'
      ctx.fillText(`SLOT ${String(index + 1).padStart(3, '0')}`, cx + 5, 268)
      ctx.font = '400 26px "Inter Tight Variable", system-ui, sans-serif'
      ctx.letterSpacing = '6px'
      ctx.globalAlpha = 0.7
      ctx.fillText(text, cx + 3, 318)
      ctx.globalAlpha = 1
      texture.needsUpdate = true
    }
    draw()
    document.fonts?.ready.then(draw)
  }, [texture, index, text])
  return texture
}

const pictureVertex = /* glsl */ `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`

const pictureFragment = /* glsl */ `
  varying vec2 vUv;
  uniform sampler2D uMap, uLabel;
  uniform float uHasMap, uEmpty, uOpacity, uTime, uSeed, uLit, uDim;
  ${NOISE_GLSL}
  void main() {
    vec2 uv = vUv;
    vec3 world;
    if (uHasMap > 0.5) {
      vec2 drift = vec2(sin(uTime * 0.07 + uSeed) * 0.012, cos(uTime * 0.05 + uSeed) * 0.009);
      world = texture2D(uMap, (uv - 0.5) * 0.95 + 0.5 + drift).rgb;
    } else {
      // Procedural stand-in until art exists: a warm dream swirling behind glass.
      float n = n_fbm(uv * vec2(3.2, 1.8) + vec2(uTime * 0.03, -uTime * 0.02) + uSeed * 7.0);
      world = mix(vec3(0.10, 0.06, 0.16), vec3(0.95, 0.55, 0.30), smoothstep(0.35, 0.8, n));
      world = pow(world, vec3(2.2));
    }
    float vig = smoothstep(0.9, 0.25, length((uv - 0.5) * vec2(1.0, 0.8)));
    world *= mix(0.5, 1.0, vig) * (0.8 + 0.5 * uLit);

    vec3 glass = mix(vec3(0.006, 0.005, 0.011), vec3(0.022, 0.017, 0.034), uv.y);
    float label = texture2D(uLabel, uv).a;
    glass += vec3(1.0, 0.62, 0.30) * label * 0.85;
    float edge = 1.0 - smoothstep(0.0, 0.05, min(min(uv.x, 1.0 - uv.x) * 1.78, min(uv.y, 1.0 - uv.y)));
    glass += vec3(0.9, 0.48, 0.22) * edge * 0.12;

    vec3 col = mix(world, glass, uEmpty) * (1.0 - uDim * 0.75);
    gl_FragColor = vec4(col, uOpacity);
    #include <colorspace_fragment>
  }`

type WindowProps = { index: number; map: string | undefined; label: string; stateFor: (s: FrameState) => FrameState }

function Window({ index, map, label, stateFor }: WindowProps) {
  const group = useRef<Group>(null)
  const texture = useSlotTexture(map)
  const labelTexture = useSlotLabel(index, label)
  const state = useMemo(newFrameState, [])

  const border = useMemo(() => ring(FRAME_W, FRAME_H, 0.09, 0.12), [])
  const innerLine = useMemo(() => ring(FRAME_W - 0.04, FRAME_H - 0.04, 0.018, 0.1), [])

  const borderMaterial = useMemo(() => new MeshBasicMaterial({ color: '#8f6236', transparent: true }), [])
  const lineMaterial = useMemo(
    () => new MeshBasicMaterial({ color: '#ffb066', transparent: true, toneMapped: false, blending: AdditiveBlending, depthWrite: false }),
    [],
  )
  const haloMaterial = useMemo(
    () =>
      new ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
        toneMapped: false,
        uniforms: { uStrength: { value: 0 } },
        vertexShader: pictureVertex,
        fragmentShader: /* glsl */ `
          varying vec2 vUv;
          uniform float uStrength;
          void main() {
            vec2 p = (vUv - 0.5) * vec2(1.6, 1.0);
            float d = length(p);
            float g = smoothstep(0.75, 0.15, d);
            gl_FragColor = vec4(vec3(1.0, 0.55, 0.25) * g * g, uStrength);
          }`,
      }),
    [],
  )
  const picture = useMemo(
    () =>
      new ShaderMaterial({
        transparent: true,
        uniforms: {
          uMap: { value: null },
          uLabel: { value: null },
          uHasMap: { value: 0 },
          uEmpty: { value: 0 },
          uOpacity: { value: 0 },
          uTime: { value: 0 },
          uSeed: { value: index * 1.37 },
          uLit: { value: 0 },
          uDim: { value: 0 },
        },
        vertexShader: pictureVertex,
        fragmentShader: pictureFragment,
      }),
    [index],
  )

  useEffect(() => {
    picture.uniforms.uMap.value = texture
    picture.uniforms.uHasMap.value = texture ? 1 : 0
    picture.uniforms.uLabel.value = labelTexture
  }, [picture, texture, labelTexture])

  useFrame((_, delta) => {
    const g = group.current
    if (!g) return
    stateFor(state)
    const t = (picture.uniforms.uTime.value += delta)
    const bob = scroll.reducedMotion ? 0 : Math.sin(t * 0.6 + index * 1.9) * 0.12 * (1 - state.empty)
    g.position.copy(state.position)
    g.position.y += bob
    g.lookAt(state.facing)
    const s = 0.6 + 0.4 * state.appear + state.lit * 0.06
    g.scale.setScalar(s)
    g.visible = state.appear > 0.001

    const u = picture.uniforms
    u.uOpacity.value = state.appear
    u.uEmpty.value = state.empty
    u.uLit.value = state.lit
    u.uDim.value = state.dim
    borderMaterial.opacity = state.appear * (1 - state.dim * 0.6)
    lineMaterial.opacity = state.appear * (0.35 + state.lit * 0.65 + state.empty * 0.25) * (1 - state.dim * 0.8)
    haloMaterial.uniforms.uStrength.value = state.appear * (0.05 + state.lit * 0.3 + state.empty * 0.04) * (1 - state.dim)
  })

  return (
    <group ref={group}>
      <mesh material={haloMaterial} position={[0, 0, -0.08]}>
        <planeGeometry args={[FRAME_W * 2.2, FRAME_H * 2.6]} />
      </mesh>
      <mesh material={picture}>
        <planeGeometry args={[FRAME_W, FRAME_H]} />
      </mesh>
      <mesh geometry={border} material={borderMaterial} position={[0, 0, 0.005]} />
      <mesh geometry={innerLine} material={lineMaterial} position={[0, 0, 0.01]} />
    </group>
  )
}

/** Windows into games that could be made. They open over the valley, light for the Deal, fork, then wait empty. */
export function Frames() {
  const portrait = useThree((s) => s.size.width / s.size.height < 0.9)
  const worlds = slots.worlds
  // Reduced motion: a single composed still — every window open, in the arc.
  const params = () => (scroll.reducedMotion ? { c: 1.5, b: 1.5 } : { c: cameraParam(scroll.beat), b: scroll.beat })

  return (
    <group>
      {Array.from({ length: FRAME_COUNT }, (_, i) => (
        <Window
          key={i}
          index={i}
          map={worlds[i]}
          label="OPEN  ·  BRING YOUR GAME"
          stateFor={(s) => {
            const { c, b } = params()
            return frameState(i, c, b, portrait, s)
          }}
        />
      ))}
      <Window
        index={9}
        map={worlds[3]?.replace('04.jpg', '04b.jpg')}
        label="REMIX"
        stateFor={(s) => {
          const { c, b } = params()
          return forkState(c, b, portrait, s)
        }}
      />
      <RemixThreads portrait={portrait} params={params} />
    </group>
  )
}
