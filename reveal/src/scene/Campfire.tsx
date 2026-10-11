import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { AdditiveBlending, DodecahedronGeometry, DoubleSide, MeshStandardMaterial, PointLight, ShaderMaterial } from 'three'
import { NOISE_GLSL } from './noiseGlsl'

/** A small fire beside the dreamer: crossed flame cards, a ring of stones, and a flickering light. */
export function Campfire({ position }: { position: [number, number, number] }) {
  const light = useRef<PointLight>(null)

  const flame = useMemo(
    () =>
      new ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
        side: DoubleSide,
        toneMapped: false,
        uniforms: { uTime: { value: 0 } },
        vertexShader: /* glsl */ `
          varying vec2 vUv;
          void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
        fragmentShader: /* glsl */ `
          varying vec2 vUv;
          uniform float uTime;
          ${NOISE_GLSL}
          void main() {
            vec2 uv = vUv;
            float n = n_value(vec2(uv.x * 4.0, uv.y * 3.0 - uTime * 2.6));
            float n2 = n_value(vec2(uv.x * 9.0 + 3.0, uv.y * 7.0 - uTime * 4.3));
            float x = (uv.x - 0.5) * 2.0 + (n - 0.5) * 0.6 * uv.y;
            float width = (1.0 - uv.y) * 0.85 + 0.04;
            float body = 1.0 - smoothstep(width * 0.35, width, abs(x));
            body *= smoothstep(0.0, 0.1, uv.y) * (1.0 - smoothstep(0.35 + n2 * 0.45, 1.0, uv.y));
            vec3 col = mix(vec3(1.0, 0.22, 0.04), vec3(1.0, 0.62, 0.22), body);
            col = mix(col, vec3(1.0, 0.92, 0.7), pow(body, 3.0) * (1.0 - uv.y));
            gl_FragColor = vec4(col * 3.2, body);
          }`,
      }),
    [],
  )

  const stones = useMemo(() => {
    const out: [number, number, number][] = []
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2
      out.push([Math.cos(a) * 0.28, 0.03, Math.sin(a) * 0.28])
    }
    return out
  }, [])
  const stoneGeometry = useMemo(() => new DodecahedronGeometry(0.075, 0), [])
  const stoneMaterial = useMemo(() => new MeshStandardMaterial({ color: '#2a2422', roughness: 1 }), [])
  const logMaterial = useMemo(() => new MeshStandardMaterial({ color: '#1c130e', roughness: 1, emissive: '#5a1d06', emissiveIntensity: 0.6 }), [])

  useFrame((state, delta) => {
    flame.uniforms.uTime.value += delta
    const t = state.clock.elapsedTime
    if (light.current) {
      light.current.intensity = 6 * (0.82 + 0.1 * Math.sin(t * 11.3) + 0.08 * Math.sin(t * 17.9 + 1.3))
    }
  })

  return (
    <group position={position}>
      <pointLight ref={light} color="#ff8a3c" intensity={6} distance={9} decay={1.8} position={[0, 0.45, 0]} />
      {stones.map((p, i) => (
        <mesh key={i} geometry={stoneGeometry} material={stoneMaterial} position={p} rotation={[i, i * 2, 0]} />
      ))}
      <mesh material={logMaterial} position={[0, 0.06, 0]} rotation={[0, 0.6, Math.PI / 2]}>
        <cylinderGeometry args={[0.035, 0.04, 0.42, 6]} />
      </mesh>
      <mesh material={logMaterial} position={[0, 0.07, 0]} rotation={[0, -0.7, Math.PI / 2]}>
        <cylinderGeometry args={[0.035, 0.04, 0.42, 6]} />
      </mesh>
      {[0, Math.PI / 3, (2 * Math.PI) / 3].map((r) => (
        <mesh key={r} material={flame} position={[0, 0.3, 0]} rotation={[0, r, 0]}>
          <planeGeometry args={[0.42, 0.62]} />
        </mesh>
      ))}
    </group>
  )
}
