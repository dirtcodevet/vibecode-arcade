import { useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { BackSide, ShaderMaterial, Texture } from 'three'
import { span } from '../beats'
import { scroll } from '../scroll'
import { skyShared } from './skyShared'

const RADIUS = 700
const ARC = (110 * Math.PI) / 180
/** World height the horizon sits at, roughly the camera's eye line across the reveal. */
const EYE = 3

/** Averages two rows at the painting's top or bottom so the procedural sky continues the same color past its edges. */
function sampleEdgeColor(image: CanvasImageSource & { width: number; height: number }, edge: 'top' | 'bottom') {
  const canvas = document.createElement('canvas')
  canvas.width = 48
  canvas.height = 27
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) return null
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height)
  const { data } = ctx.getImageData(8, edge === 'top' ? 0 : canvas.height - 2, canvas.width - 16, 2)
  let r = 0
  let g = 0
  let b = 0
  const n = data.length / 4
  for (let i = 0; i < data.length; i += 4) {
    r += data[i]
    g += data[i + 1]
    b += data[i + 2]
  }
  return [r / n / 255, g / n / 255, b / n / 255] as const
}

/**
 * The painted valley: a matte painting on a far curved screen. Distant enough that it holds still like real
 * mountains while the near scene (ledge, fire, windows) moves in front of it. Edges fade into the procedural sky.
 */
export function Backdrop({ texture, horizon }: { texture: Texture; horizon: number }) {
  const image = texture.image as HTMLImageElement
  const aspect = image.width / image.height
  const height = (RADIUS * ARC) / aspect
  const top = (1 - horizon) * height
  const bottom = -horizon * height

  useEffect(() => {
    const top = sampleEdgeColor(image, 'top')
    const bottom = sampleEdgeColor(image, 'bottom')
    if (!top || !bottom) return
    skyShared.uTop.value.setRGB(top[0], top[1], top[2])
    skyShared.uBottom.value.setRGB(bottom[0], bottom[1], bottom[2])
    skyShared.uTopMix.value = 1
    return () => {
      skyShared.uTopMix.value = 0
    }
  }, [image])

  const material = useMemo(
    () =>
      new ShaderMaterial({
        side: BackSide,
        transparent: true,
        depthWrite: false,
        uniforms: { uMap: { value: texture }, uDim: { value: 1 } },
        vertexShader: /* glsl */ `
          varying vec2 vUv;
          void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
        fragmentShader: /* glsl */ `
          varying vec2 vUv;
          uniform sampler2D uMap;
          uniform float uDim;
          void main() {
            vec2 uv = vec2(1.0 - vUv.x, vUv.y);
            vec3 c = texture2D(uMap, uv).rgb * uDim;
            float a = smoothstep(0.0, 0.07, uv.x) * smoothstep(1.0, 0.93, uv.x) * smoothstep(1.0, 0.84, uv.y);
            gl_FragColor = vec4(c, a);
            #include <colorspace_fragment>
          }`,
      }),
    [texture],
  )

  useFrame((_, delta) => {
    // Night deepens a little through the middle of the reveal, then eases back for the shelf.
    const dim = 1 - 0.22 * span(scroll.beat, 1, 2.6) + 0.1 * span(scroll.beat, 3.4, 4)
    material.uniforms.uDim.value += (dim - material.uniforms.uDim.value) * Math.min(1, delta * 2)
  })

  return (
    <mesh material={material} position={[0, EYE + (top + bottom) / 2, 0]} renderOrder={-5} frustumCulled={false}>
      <cylinderGeometry args={[RADIUS, RADIUS, height, 96, 1, true, Math.PI - ARC / 2, ARC]} />
    </mesh>
  )
}
