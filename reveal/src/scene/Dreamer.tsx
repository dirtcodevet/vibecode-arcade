import { useMemo } from 'react'
import { MeshStandardMaterial } from 'three'

type Part = { kind: 'sphere' | 'capsule'; pos: [number, number, number]; rot?: [number, number, number]; scale?: [number, number, number]; r: number; len?: number }

const deg = (d: number) => (d * Math.PI) / 180

// A figure sitting at the edge, knees up, arms around them, looking out at the valley (-z).
const PARTS: Part[] = [
  { kind: 'sphere', pos: [0, 0.15, 0], r: 0.2, scale: [1.15, 0.7, 1] },
  { kind: 'capsule', pos: [0, 0.47, -0.04], rot: [deg(-18), 0, 0], r: 0.17, len: 0.34 },
  { kind: 'sphere', pos: [0, 0.83, -0.13], r: 0.115 },
  // hood
  { kind: 'sphere', pos: [0, 0.85, -0.1], r: 0.135, scale: [1, 1.05, 1.1] },
  // thighs, forward and up to the knees
  { kind: 'capsule', pos: [-0.1, 0.27, -0.2], rot: [deg(-58), 0, 0], r: 0.075, len: 0.3 },
  { kind: 'capsule', pos: [0.1, 0.27, -0.2], rot: [deg(-58), 0, 0], r: 0.075, len: 0.3 },
  // shins, down to the rock
  { kind: 'capsule', pos: [-0.1, 0.24, -0.44], rot: [deg(10), 0, 0], r: 0.065, len: 0.3 },
  { kind: 'capsule', pos: [0.1, 0.24, -0.44], rot: [deg(10), 0, 0], r: 0.065, len: 0.3 },
  // arms wrapped around the knees
  { kind: 'capsule', pos: [-0.19, 0.57, -0.2], rot: [deg(-62), 0, deg(-8)], r: 0.055, len: 0.3 },
  { kind: 'capsule', pos: [0.19, 0.57, -0.2], rot: [deg(-62), 0, deg(8)], r: 0.055, len: 0.3 },
  { kind: 'sphere', pos: [0, 0.48, -0.42], r: 0.07, scale: [2.2, 0.9, 0.9] },
]

export function Dreamer({ position }: { position: [number, number, number] }) {
  const material = useMemo(() => new MeshStandardMaterial({ color: '#0d0b12', roughness: 0.85 }), [])
  return (
    <group position={position}>
      {PARTS.map((p, i) => (
        <mesh key={i} position={p.pos} rotation={p.rot ?? [0, 0, 0]} scale={p.scale ?? [1, 1, 1]} material={material}>
          {p.kind === 'sphere' ? <sphereGeometry args={[p.r, 20, 14]} /> : <capsuleGeometry args={[p.r, p.len ?? 0.3, 6, 12]} />}
        </mesh>
      ))}
    </group>
  )
}
