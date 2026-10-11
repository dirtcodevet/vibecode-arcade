import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Mesh, MeshBasicMaterial, Texture } from 'three'

const HEIGHT = 1.12

/**
 * The dreamer as a painted cut-out. The camera only ever sees them from behind, so a card that turns to face it
 * reads as a figure, and keeps the painted firelight on the cloak.
 */
export function PaintedDreamer({ texture, position }: { texture: Texture; position: [number, number, number] }) {
  const mesh = useRef<Mesh>(null)
  const image = texture.image as HTMLImageElement
  const width = HEIGHT * (image.width / image.height)
  const material = useMemo(
    () => new MeshBasicMaterial({ map: texture, transparent: true, alphaTest: 0.06, color: '#d8d0cc' }),
    [texture],
  )

  useFrame(({ camera }) => {
    const m = mesh.current
    if (!m) return
    m.rotation.y = Math.atan2(camera.position.x - m.position.x, camera.position.z - m.position.z)
  })

  return (
    <mesh ref={mesh} material={material} position={[position[0], position[1] + HEIGHT / 2 - 0.03, position[2]]}>
      <planeGeometry args={[width, HEIGHT]} />
    </mesh>
  )
}
