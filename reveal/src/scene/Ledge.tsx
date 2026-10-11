import { useMemo } from 'react'
import { DodecahedronGeometry, MeshStandardMaterial, PlaneGeometry } from 'three'

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

/** The rock outcrop the dreamer sits on. Its far edge drops away into the valley. */
export function Ledge() {
  const ground = useMemo(() => {
    const g = new PlaneGeometry(60, 26, 120, 60)
    g.rotateX(-Math.PI / 2)
    const p = g.attributes.position
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i)
      const z = p.getZ(i) + 9.5 // world z: the plane spans -3.5 .. 22.5
      const edge = -1.2 + Math.sin(x * 0.45) * 0.6 + Math.sin(x * 1.7) * 0.2
      const drop = smooth(edge, edge - 2.5, z) * 40
      const rise = smooth(4, 14, Math.abs(x)) * 2.2
      p.setY(i, bumps(x, z) + rise - drop)
    }
    g.computeVertexNormals()
    return g
  }, [])

  const rocks = useMemo(() => {
    const out: { pos: [number, number, number]; scale: [number, number, number]; rot: number }[] = []
    const seeds = [
      [-2.4, -0.4, 0.42, 0.32],
      [-3.6, 0.5, 0.7, 0.5],
      [3.2, -0.6, 0.5, 0.36],
      [4.6, 0.9, 0.9, 0.55],
      [-1.3, -1.0, 0.28, 0.2],
      [-6.0, 2.0, 1.2, 0.8],
      [6.8, 2.6, 1.4, 0.9],
    ]
    for (const [x, z, s, h] of seeds) out.push({ pos: [x, h * 0.25, z], scale: [s, h, s * 0.8], rot: x * 1.7 })
    return out
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

  return (
    <group>
      <mesh geometry={ground} material={groundMaterial} position={[0, 0, 9.5]} />
      {rocks.map((r, i) => (
        <mesh key={i} geometry={rockGeometry} material={rockMaterial} position={r.pos} scale={r.scale} rotation={[r.rot, r.rot * 0.6, 0]} />
      ))}
    </group>
  )
}
