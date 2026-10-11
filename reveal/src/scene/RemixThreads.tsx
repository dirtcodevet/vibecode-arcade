import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { AdditiveBlending, CatmullRomCurve3, Group, ShaderMaterial, TubeGeometry, Vector3 } from 'three'
import { span } from '../beats'
import { FRAME_H, FRAME_W, forkState, frameState, HERO, newFrameState } from './frameLayout'

const THREADS = 22
const from = new Vector3()
const to = new Vector3()

/**
 * Golden filaments drawn from the parent window to its fork: a remix stays tied to what it came from.
 * Built once in unit space (x: 0 → 1) and stretched across the live gap each frame.
 */
export function RemixThreads({ portrait, params }: { portrait: boolean; params: () => { c: number; b: number } }) {
  const group = useRef<Group>(null)
  const hero = useMemo(newFrameState, [])
  const fork = useMemo(newFrameState, [])

  const material = useMemo(
    () =>
      new ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
        toneMapped: false,
        uniforms: { uProgress: { value: 0 }, uTime: { value: 0 } },
        vertexShader: /* glsl */ `
          varying vec2 vUv;
          void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
        fragmentShader: /* glsl */ `
          varying vec2 vUv;
          uniform float uProgress, uTime;
          void main() {
            float drawn = 1.0 - smoothstep(uProgress - 0.08, uProgress, vUv.x);
            float pulse = 0.55 + 0.45 * sin(vUv.x * 18.0 - uTime * 3.0);
            vec3 gold = vec3(1.0, 0.72, 0.36) * 2.4 * pulse;
            gl_FragColor = vec4(gold, drawn * 0.9);
          }`,
      }),
    [],
  )

  const geometries = useMemo(() => {
    const out: TubeGeometry[] = []
    for (let k = 0; k < THREADS; k++) {
      const a = (k / (THREADS - 1) - 0.5) * FRAME_H * 0.9
      const b = (((k * 7) % THREADS) / (THREADS - 1) - 0.5) * FRAME_H * 0.9
      const bow = (k % 2 ? 1 : -1) * (0.25 + (k % 5) * 0.12)
      const depth = ((k % 3) - 1) * 0.35
      const curve = new CatmullRomCurve3([
        new Vector3(0, a, 0),
        new Vector3(0.33, a + bow, depth),
        new Vector3(0.66, b - bow * 0.6, -depth),
        new Vector3(1, b, 0),
      ])
      out.push(new TubeGeometry(curve, 48, 0.012, 5, false))
    }
    return out
  }, [])

  useFrame((_, delta) => {
    const g = group.current
    if (!g) return
    const { c, b } = params()
    frameState(HERO, c, b, portrait, hero)
    forkState(c, b, portrait, fork)
    material.uniforms.uTime.value += delta
    material.uniforms.uProgress.value = span(b, 3.1, 3.42) * 1.1
    const visible = fork.appear
    g.visible = visible > 0.01
    if (!g.visible) return

    // Anchor at the hero's facing edge and stretch to the fork's.
    if (portrait) {
      to.copy(fork.position).y += FRAME_H / 2
      from.copy(hero.position).y -= FRAME_H / 2
      g.position.copy(from)
      g.rotation.set(0, 0, -Math.PI / 2)
      g.scale.set(Math.max(0.001, from.y - to.y), FRAME_W / FRAME_H / 1.6, 1)
    } else {
      from.copy(hero.position).x += FRAME_W / 2
      to.copy(fork.position).x -= FRAME_W / 2
      g.position.copy(from)
      g.rotation.set(0, 0, 0)
      g.scale.set(Math.max(0.001, to.x - from.x), 1, 1)
    }
  })

  return (
    <group ref={group}>
      {geometries.map((geo, i) => (
        <mesh key={i} geometry={geo} material={material} />
      ))}
    </group>
  )
}
