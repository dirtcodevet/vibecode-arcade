import { Vector3 } from 'three'
import { span } from '../beats'

export const FRAME_W = 4.8
export const FRAME_H = 2.7
export const FRAME_COUNT = 9
/** Window that forks in the Remix beat. */
export const HERO = 3
/** Windows that light, in order, with the four lines of the Deal. */
export const DEAL = [1, 2, 4, 5]

// Floating over the valley, loosely arced toward the ledge.
const ARC = [
  new Vector3(-13.5, 10.6, -31),
  new Vector3(-8.2, 6.0, -24.5),
  new Vector3(-4.6, 12.0, -35),
  new Vector3(0.9, 8.4, -24),
  new Vector3(5.4, 12.4, -34),
  new Vector3(8.6, 5.7, -25.5),
  new Vector3(13.4, 10.2, -31),
  new Vector3(-17.5, 5.2, -37),
  new Vector3(18.5, 5.6, -38),
]
const ARC_FACING = new Vector3(0, 5, 4)

const SPLIT = 3.5

// Scratch vectors: the layout runs for every window every frame, so it allocates nothing.
const slot = new Vector3()
const offset = new Vector3()
const ahead = new Vector3()

function shelfSlot(i: number, portrait: boolean, out: Vector3): Vector3 {
  if (portrait) {
    const col = i % 3
    const row = Math.floor(i / 3)
    return out.set((col - 1) * 5.4, 17.4 - row * 3.3, -24)
  }
  return out.set((i - 4) * 5.5, 11.2, -24)
}

export type FrameState = {
  position: Vector3
  facing: Vector3
  /** 0 hidden → 1 fully there. */
  appear: number
  /** Deal highlight. */
  lit: number
  /** 0 picture → 1 empty slot. */
  empty: number
  /** Dimming while another window is the subject. */
  dim: number
}

/**
 * Where window i is, and how it looks, at camera parameter c (see cameraParam) and raw beat b.
 * Pure, so the scene and the remix threads agree without sharing mutable state.
 */
export function frameState(i: number, c: number, b: number, portrait: boolean, out: FrameState): FrameState {
  const appear = span(c, 0.15 + i * 0.07, 0.6 + i * 0.07)

  const dealIndex = DEAL.indexOf(i)
  const lit = dealIndex < 0 ? 0 : span(b, 1.95 + dealIndex * 0.07, 2.05 + dealIndex * 0.07) * (1 - span(c, 2.4, 2.9))

  const toRemix = span(c, 2.35, 3.0)
  const leaving = span(c, 3.1, 3.7)
  const remixFocus = toRemix * (1 - leaving)
  const toShelf = span(c, 3.0, 4.0)

  out.position.copy(ARC[i])
  out.facing.copy(ARC_FACING)
  let dim = 0

  if (i === HERO) {
    const split = span(b, 3.02, 3.32)
    if (portrait) offset.set(0, SPLIT * 0.58 * split, 0)
    else offset.set(-SPLIT * split, 0, 0)
    out.position.addScaledVector(offset, remixFocus)
    out.facing.lerp(ahead.set(out.position.x, out.position.y, 40), toRemix)
  } else {
    dim = remixFocus * 0.8
  }

  shelfSlot(i, portrait, slot)
  out.position.lerp(slot, toShelf)
  out.facing.lerp(ahead.set(slot.x * 0.6, slot.y, 40), toShelf)

  out.appear = appear
  out.lit = lit
  out.empty = span(c, 3.45, 3.95)
  out.dim = dim
  return out
}

/** The fork that splits from the hero window during Remix. */
export function forkState(c: number, b: number, portrait: boolean, out: FrameState): FrameState {
  const split = span(b, 3.02, 3.32)
  const fade = span(c, 2.6, 2.95) * (1 - span(c, 3.15, 3.55))
  if (portrait) offset.set(0, -SPLIT * 0.58 * split, -0.02 * (1 - split))
  else offset.set(SPLIT * split, 0, -0.02 * (1 - split))
  out.position.copy(ARC[HERO]).add(offset)
  out.facing.set(out.position.x, out.position.y, 40)
  out.appear = fade * Math.min(1, split * 4)
  out.lit = 0
  out.empty = 0
  out.dim = 0
  return out
}

export const newFrameState = (): FrameState => ({
  position: new Vector3(),
  facing: new Vector3(),
  appear: 0,
  lit: 0,
  empty: 0,
  dim: 0,
})
