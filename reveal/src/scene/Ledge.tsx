import { useEffect, useMemo } from 'react'
import { DodecahedronGeometry, MeshStandardMaterial, MirroredRepeatWrapping, PlaneGeometry, Texture } from 'three'

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

function bumps(x: number, z: number) {
  return (
    Math.sin(x * 1.3 + z * 0.7) * 0.12 +
    Math.sin(x * 3.1 - z * 2.3) * 0.05 +
    Math.sin(x * 7.7 + z * 5.1) * 0.02
  )
}

/** Where the ledge drops away, as a function of x. */
export const ledgeEdge = (x: number) => -1.2 + Math.sin(x * 0.45) * 0.6 + Math.sin(x * 1.7) * 0.2

/** Height of the outcrop at world (x, z). Shared with the grass so it sits on the rock. */
export function groundHeight(x: number, z: number) {
  const edge = ledgeEdge(x)
  const drop = smooth(edge, edge - 2.5, z) * 40
  const rise = smooth(4, 14, Math.abs(x)) * 2.2
  return bumps(x, z) + rise - drop
}

const PLANE_Z = 9.5

/** The rock outcrop the dreamer sits on. Its far edge drops away into the valley. */
export function Ledge({ texture }: { texture: Texture | null }) {
  const ground = useMemo(() => {
    const g = new PlaneGeometry(60, 26, 160, 80)
    g.rotateX(-Math.PI / 2)
    const p = g.attributes.position
    for (let i = 0; i < p.count; i++) p.setY(i, groundHeight(p.getX(i), p.getZ(i) + PLANE_Z))
    g.computeVertexNormals()
    return g
  }, [])

  const rocks = useMemo(() => {
    // Small stones only: big low-poly boulders fight the painted backdrop.
    const seeds = [
      [-2.4, -0.4, 0.26, 0.18],
      [-3.4, 0.6, 0.34, 0.22],
      [2.9, -0.5, 0.3, 0.2],
      [-1.3, -1.0, 0.2, 0.14],
      [1.9, -1.1, 0.16, 0.11],
      [-0.6, 0.9, 0.14, 0.1],
      [4.1, 0.4, 0.22, 0.15],
    ]
    return seeds.map(([x, z, s, h]) => ({
      pos: [x, groundHeight(x, z) + h * 0.2, z] as [number, number, number],
      scale: [s, h, s * 0.8] as [number, number, number],
      rot: x * 1.7,
    }))
  }, [])

  const rockGeometry = useMemo(() => {
    // Faceted, slightly crushed stones rather than smooth blobs.
    const g = new DodecahedronGeometry(1, 0)
    const p = g.attributes.position
    for (let i = 0; i < p.count; i++) {
      const k = 0.78 + 0.3 * Math.abs(Math.sin(p.getX(i) * 4.1 + p.getY(i) * 2.7 + p.getZ(i) * 3.3))
      p.setXYZ(i, p.getX(i) * k, p.getY(i) * k * 0.8, p.getZ(i) * k)
    }
    g.computeVertexNormals()
    return g
  }, [])
  const groundMaterial = useMemo(() => new MeshStandardMaterial({ color: '#100e14', roughness: 0.95, metalness: 0 }), [])
  const rockMaterial = useMemo(() => new MeshStandardMaterial({ color: '#121017', roughness: 0.9, metalness: 0, flatShading: true }), [])

  // With painted rock available, the ground and stones take its detail; the firelight does the rest.
  useEffect(() => {
    if (!texture) return
    const groundMap = texture.clone()
    groundMap.wrapS = groundMap.wrapT = MirroredRepeatWrapping
    groundMap.repeat.set(14, 6)
    groundMap.needsUpdate = true
    groundMaterial.map = groundMap
    groundMaterial.color.set('#4a4652')
    groundMaterial.needsUpdate = true
    const rockMap = texture.clone()
    rockMap.wrapS = rockMap.wrapT = MirroredRepeatWrapping
    rockMap.repeat.set(1.5, 1.5)
    rockMap.needsUpdate = true
    rockMaterial.map = rockMap
    rockMaterial.color.set('#6a6168')
    rockMaterial.needsUpdate = true
  }, [texture, groundMaterial, rockMaterial])

  return (
    <group>
      <mesh geometry={ground} material={groundMaterial} position={[0, 0, PLANE_Z]} />
      {rocks.map((r, i) => (
        <mesh key={i} geometry={rockGeometry} material={rockMaterial} position={r.pos} scale={r.scale} rotation={[r.rot, r.rot * 0.6, 0]} />
      ))}
    </group>
  )
}
