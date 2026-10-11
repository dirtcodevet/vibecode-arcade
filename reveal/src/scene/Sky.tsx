import { useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { BackSide, ShaderMaterial } from 'three'
import { SKY_GLSL, SUN_DIR } from './skyGlsl'
import { skyShared } from './skyShared'
import { scroll } from '../scroll'

/** Dusk sky dome. Stars come out as the reveal moves toward night. */
export function Sky() {
  const material = useMemo(
    () =>
      new ShaderMaterial({
        side: BackSide,
        depthWrite: false,
        uniforms: { uSunDir: { value: SUN_DIR }, uTime: { value: 0 }, uNight: { value: 0.35 }, ...skyShared },
        vertexShader: /* glsl */ `
          varying vec3 vDir;
          void main() {
            vDir = position;
            vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            gl_Position = p.xyww;
          }`,
        fragmentShader: /* glsl */ `
          varying vec3 vDir;
          ${SKY_GLSL}
          void main() {
            gl_FragColor = vec4(skyColor(vDir, true), 1.0);
            #include <colorspace_fragment>
          }`,
      }),
    [],
  )

  useFrame((_, delta) => {
    material.uniforms.uTime.value += delta
    const night = 0.35 + 0.65 * Math.min(1, scroll.beat / 3)
    material.uniforms.uNight.value += (night - material.uniforms.uNight.value) * Math.min(1, delta * 2)
  })

  return (
    <mesh material={material} renderOrder={-10} frustumCulled={false}>
      <sphereGeometry args={[900, 48, 24]} />
    </mesh>
  )
}
