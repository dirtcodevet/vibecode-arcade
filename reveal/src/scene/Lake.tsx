import { useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { ShaderMaterial } from 'three'
import { SKY_GLSL, SUN_DIR } from './skyGlsl'

/** Still water in the valley floor, reflecting the dusk sky with a slow ripple. */
export function Lake() {
  const material = useMemo(
    () =>
      new ShaderMaterial({
        uniforms: { uSunDir: { value: SUN_DIR }, uTime: { value: 0 }, uNight: { value: 0 } },
        vertexShader: /* glsl */ `
          varying vec3 vWorld;
          void main() {
            vec4 w = modelMatrix * vec4(position, 1.0);
            vWorld = w.xyz;
            gl_Position = projectionMatrix * viewMatrix * w;
          }`,
        fragmentShader: /* glsl */ `
          varying vec3 vWorld;
          ${SKY_GLSL}
          void main() {
            vec3 view = normalize(vWorld - cameraPosition);
            vec2 p = vWorld.xz * 0.05;
            vec2 ripple = vec2(fbm(p + uTime * 0.05), fbm(p * 1.3 - uTime * 0.04)) - 0.5;
            vec3 n = normalize(vec3(ripple.x * 0.06, 1.0, ripple.y * 0.06));
            vec3 r = reflect(view, n);
            r.y = abs(r.y);
            vec3 col = skyColor(r, false) * 0.62;
            // Darker toward the near shore, like depth.
            float fres = pow(1.0 - max(dot(-view, vec3(0, 1, 0)), 0.0), 3.0);
            col = mix(col * 0.35, col, fres);
            gl_FragColor = vec4(col, 1.0);
            #include <colorspace_fragment>
          }`,
      }),
    [],
  )
  useFrame((_, delta) => (material.uniforms.uTime.value += delta))
  return (
    <mesh material={material} rotation-x={-Math.PI / 2} position={[0, -38, -330]}>
      <planeGeometry args={[1400, 560, 1, 1]} />
    </mesh>
  )
}
