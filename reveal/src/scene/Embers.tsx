import { useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { AdditiveBlending, BufferGeometry, Float32BufferAttribute, ShaderMaterial } from 'three'
import { scroll } from '../scroll'
import { span } from '../beats'

const COUNT = 380

/**
 * Embers rise from the fire. As the reveal opens they stream higher and out over the valley,
 * toward the windows. Motion is computed on the GPU from a per-particle seed.
 */
export function Embers({ position }: { position: [number, number, number] }) {
  const { gl, size } = useThree()

  const geometry = useMemo(() => {
    const g = new BufferGeometry()
    const seeds = new Float32Array(COUNT * 4)
    for (let i = 0; i < seeds.length; i++) seeds[i] = Math.random()
    g.setAttribute('position', new Float32BufferAttribute(new Float32Array(COUNT * 3), 3))
    g.setAttribute('aSeed', new Float32BufferAttribute(seeds, 4))
    return g
  }, [])

  const material = useMemo(
    () =>
      new ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
        toneMapped: false,
        uniforms: { uTime: { value: 0 }, uFlow: { value: 0 }, uScale: { value: 400 }, uMotion: { value: 1 } },
        vertexShader: /* glsl */ `
          attribute vec4 aSeed;
          uniform float uTime, uFlow, uScale, uMotion;
          varying float vAlpha, vHeat;
          void main() {
            float life = 5.0 + aSeed.x * 7.0;
            float t = mod(uTime * uMotion + aSeed.y * life, life) / life;
            float rise = 2.6 + aSeed.w * 1.6 + uFlow * 16.0 * aSeed.w;
            float swirl = aSeed.z * 6.2832 + t * (4.0 + aSeed.x * 4.0);
            float radius = 0.1 + t * (0.9 + uFlow * 2.5) * (0.4 + aSeed.w);
            vec3 p = vec3(cos(swirl) * radius, t * rise, sin(swirl) * radius);
            // Wind carries them out over the edge, toward the valley and the windows.
            p.z -= t * t * (3.5 + uFlow * 30.0) * (0.35 + aSeed.w);
            p.x += (aSeed.z - 0.5) * t * (2.4 + uFlow * 26.0) - t * t * 0.8;
            vec4 mv = modelViewMatrix * vec4(p, 1.0);
            gl_Position = projectionMatrix * mv;
            float worldSize = (0.025 + aSeed.w * 0.05) * (1.0 - t * 0.45);
            gl_PointSize = clamp(worldSize * projectionMatrix[1][1] * uScale / -mv.z, 1.0, 9.0 * uScale / 450.0);
            // Fade embers that drift right up to the lens instead of letting them balloon into blobs.
            float near = smoothstep(1.2, 4.0, -mv.z);
            vAlpha = smoothstep(0.0, 0.04, t) * (1.0 - smoothstep(0.55, 1.0, t)) * near;
            vHeat = 1.0 - t;
          }`,
        fragmentShader: /* glsl */ `
          varying float vAlpha, vHeat;
          void main() {
            float d = length(gl_PointCoord - 0.5);
            float a = smoothstep(0.5, 0.0, d);
            vec3 col = mix(vec3(1.0, 0.28, 0.06), vec3(1.0, 0.78, 0.4), vHeat);
            gl_FragColor = vec4(col * 3.0, a * vAlpha);
          }`,
      }),
    [],
  )

  useFrame((_, delta) => {
    const u = material.uniforms
    u.uTime.value += delta
    u.uScale.value = (size.height * gl.getPixelRatio()) / 2
    u.uMotion.value = scroll.reducedMotion ? 0.15 : 1
    const flow = span(scroll.beat, 0.35, 1.2) * (1 - span(scroll.beat, 3.4, 4.2) * 0.55)
    u.uFlow.value += (flow - u.uFlow.value) * Math.min(1, delta * 1.5)
  })

  return <points geometry={geometry} material={material} position={position} frustumCulled={false} />
}
