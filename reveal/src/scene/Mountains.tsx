import { useMemo } from 'react'
import { BufferGeometry, Color, Float32BufferAttribute, MeshBasicMaterial } from 'three'

/** Deterministic 1D noise so the range is the same on every load. */
function ridgeNoise(x: number, seed: number) {
  let v = 0
  let amp = 1
  let freq = 1
  for (let o = 0; o < 7; o++) {
    const t = x * freq + seed * 13.7 + o * 31.1
    v += amp * (Math.sin(t) * 0.5 + Math.sin(t * 1.93 + seed) * 0.3 + Math.sin(t * 3.71 - seed * 2.1) * 0.2)
    amp *= 0.5
    freq *= 2.07
  }
  return v
}

type Layer = {
  z: number
  width: number
  base: number
  height: number
  /** Valley shape: 0 = full range, 1 = deep V opening in the middle. */
  valley: number
  freq: number
  seed: number
  top: string
  mist: string
  /** Sharpen peaks (higher = more alpine). */
  peak: number
}

// Near → far. Each layer is a vertical strip: ridge line, a mid row, and a misty foot.
const LAYERS: Layer[] = [
  { z: -560, width: 2600, base: -8, height: 140, valley: 0, freq: 0.006, seed: 1, top: '#6d5068', mist: '#9c6a6c', peak: 2.1 },
  { z: -420, width: 1900, base: -20, height: 105, valley: 0.2, freq: 0.009, seed: 2, top: '#43334f', mist: '#6f4b5e', peak: 1.9 },
  { z: -300, width: 1400, base: -30, height: 78, valley: 0.45, freq: 0.013, seed: 3, top: '#2a2140', mist: '#4e3651', peak: 1.6 },
  { z: -190, width: 900, base: -36, height: 64, valley: 0.7, freq: 0.02, seed: 4, top: '#1a1630', mist: '#33263f', peak: 1.35 },
  { z: -110, width: 560, base: -40, height: 56, valley: 0.85, freq: 0.03, seed: 5, top: '#0f0e1f', mist: '#1f1a2e', peak: 1.15 },
]

function buildLayer(l: Layer) {
  const cols = 220
  const positions: number[] = []
  const colors: number[] = []
  const top = new Color(l.top)
  const mist = new Color(l.mist)
  const mid = top.clone().lerp(mist, 0.45)
  const rim = top.clone().lerp(new Color('#ff9a6a'), 0.16)
  const foot = l.base - 70

  for (let i = 0; i <= cols; i++) {
    const u = i / cols
    const x = (u - 0.5) * l.width
    const nx = x / (l.width * 0.5)
    const n = ridgeNoise(x * l.freq, l.seed) * 0.5 + 0.5
    const shaped = Math.pow(Math.max(0, n), l.peak)
    // Open a valley in the middle so the lake shows between the walls.
    const v = 1 - l.valley * Math.exp(-Math.pow(nx * 2.4, 2))
    const y = l.base + l.height * shaped * v
    const yMid = Math.min(y, l.base + l.height * 0.12)
    positions.push(x, y, 0, x, yMid - 6, 0, x, foot, 0)
    // Ridge lines on the sun side (right of the valley) catch a little of the last light.
    const lit = Math.max(0, Math.min(1, (nx + 0.1) * 1.4)) * shaped
    const c = top.clone().lerp(rim, lit)
    colors.push(c.r, c.g, c.b, mid.r, mid.g, mid.b, mist.r, mist.g, mist.b)
  }

  const index: number[] = []
  for (let i = 0; i < cols; i++) {
    const a = i * 3
    const b = (i + 1) * 3
    index.push(a, a + 1, b, b, a + 1, b + 1, a + 1, a + 2, b + 1, b + 1, a + 2, b + 2)
  }
  const g = new BufferGeometry()
  g.setAttribute('position', new Float32BufferAttribute(positions, 3))
  g.setAttribute('color', new Float32BufferAttribute(colors, 3))
  g.setIndex(index)
  return g
}

export function Mountains() {
  const layers = useMemo(() => LAYERS.map((l) => ({ l, geometry: buildLayer(l) })), [])
  const material = useMemo(() => new MeshBasicMaterial({ vertexColors: true, fog: false }), [])
  return (
    <group>
      {layers.map(({ l, geometry }) => (
        <mesh key={l.z} geometry={geometry} material={material} position={[0, 0, l.z]} />
      ))}
    </group>
  )
}
