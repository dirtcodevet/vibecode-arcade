import { useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { BufferGeometry, DoubleSide, Float32BufferAttribute, InstancedMesh, MeshStandardMaterial, Object3D } from 'three'
import { scroll } from '../scroll'
import { groundHeight, ledgeEdge } from './Ledge'

const COUNT = 2200

/** One curved blade, three segments tall, tapering to a point. uv.y runs 0 at the root to 1 at the tip. */
function bladeGeometry() {
  const positions: number[] = []
  const uvs: number[] = []
  const segments = 3
  for (let i = 0; i <= segments; i++) {
    const t = i / segments
    const w = 0.022 * (1 - t)
    const bend = t * t * 0.12
    positions.push(-w, t, bend, w, t, bend)
    uvs.push(0, t, 1, t)
  }
  const index: number[] = []
  for (let i = 0; i < segments; i++) {
    const a = i * 2
    index.push(a, a + 1, a + 2, a + 1, a + 3, a + 2)
  }
  const g = new BufferGeometry()
  g.setAttribute('position', new Float32BufferAttribute(positions, 3))
  g.setAttribute('uv', new Float32BufferAttribute(uvs, 2))
  g.setIndex(index)
  g.computeVertexNormals()
  return g
}

/** Dry grass in tufts along the ledge, swaying in the valley wind and catching the firelight. */
export function Grass({ avoid }: { avoid: [number, number][] }) {
  const mesh = useRef<InstancedMesh>(null)
  const geometry = useMemo(bladeGeometry, [])
  const time = useMemo(() => ({ value: 0 }), [])

  const material = useMemo(() => {
    const m = new MeshStandardMaterial({ color: '#6b5636', roughness: 0.9, side: DoubleSide })
    m.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = time
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nuniform float uTime;')
        .replace(
          '#include <begin_vertex>',
          `#include <begin_vertex>
           float phase = instanceMatrix[3].x * 1.7 + instanceMatrix[3].z * 0.9;
           float sway = sin(uTime * 1.6 + phase) * 0.06 + sin(uTime * 3.1 + phase * 2.3) * 0.02;
           transformed.x += sway * uv.y * uv.y;
           transformed.z -= abs(sway) * 0.5 * uv.y * uv.y;`,
        )
    }
    return m
  }, [time])

  useLayoutEffect(() => {
    const m = mesh.current
    if (!m) return
    const dummy = new Object3D()
    let placed = 0
    let seed = 7
    const rand = () => {
      seed = (seed * 16807) % 2147483647
      return seed / 2147483647
    }
    while (placed < COUNT) {
      // Tufts: pick a center, then scatter a handful of blades around it.
      const cx = (rand() - 0.5) * 22
      const cz = ledgeEdge(cx) + 0.15 + Math.pow(rand(), 1.6) * 9
      if (avoid.some(([ax, az]) => Math.hypot(cx - ax, cz - az) < 0.9)) continue
      const blades = 6 + Math.floor(rand() * 10)
      for (let b = 0; b < blades && placed < COUNT; b++) {
        const x = cx + (rand() - 0.5) * 0.35
        const z = cz + (rand() - 0.5) * 0.35
        dummy.position.set(x, groundHeight(x, z) - 0.02, z)
        dummy.rotation.set((rand() - 0.5) * 0.5, rand() * Math.PI * 2, (rand() - 0.5) * 0.5)
        const h = 0.18 + rand() * 0.38
        dummy.scale.set(1, h, 1)
        dummy.updateMatrix()
        m.setMatrixAt(placed++, dummy.matrix)
      }
    }
    m.instanceMatrix.needsUpdate = true
    m.computeBoundingSphere()
  }, [avoid])

  useFrame((_, delta) => {
    if (!scroll.reducedMotion) time.value += delta
  })

  return <instancedMesh ref={mesh} args={[geometry, material, COUNT]} />
}
