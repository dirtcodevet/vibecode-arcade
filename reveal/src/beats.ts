import { Vector3 } from 'three'

/** Camera stops along the scroll. One per beat; the camera settles at each while its copy is read. */
export type CameraStop = { position: Vector3; target: Vector3 }

export const BEATS = ['dream', 'arcade', 'deal', 'remix', 'shelf'] as const
export type BeatId = (typeof BEATS)[number]

export const CAMERA_STOPS: Record<BeatId, CameraStop> = {
  // Behind the dreamer, the fire to their right, the valley ahead.
  dream: { position: new Vector3(2.4, 1.85, 6.2), target: new Vector3(-0.6, 1.2, -30) },
  // Tilt up as the embers rise and the first windows open in the sky.
  arcade: { position: new Vector3(0.8, 3.0, 3.8), target: new Vector3(0, 7.5, -30) },
  // Glide out past the ledge, among the windows.
  deal: { position: new Vector3(0, 6.6, -3.5), target: new Vector3(0, 8.2, -32) },
  // Close on one window as it forks.
  remix: { position: new Vector3(-1.6, 8.4, -12.5), target: new Vector3(-1.6, 8.4, -30) },
  // Pull back wide: the dreamer, the fire, and a row of open slots over the valley.
  shelf: { position: new Vector3(0, 3.6, 9.5), target: new Vector3(0, 3.0, -26) },
}

export const STOPS = BEATS.map((id) => CAMERA_STOPS[id])

/** Tall screens: the forked pair stacks vertically, so center it and keep it below the copy. */
export const PORTRAIT_STOPS = BEATS.map((id) =>
  id === 'remix' ? { position: new Vector3(0.9, 8.4, -12.5), target: new Vector3(0.9, 11.5, -30) } : CAMERA_STOPS[id],
)

const smootherstep = (t: number) => t * t * t * (t * (t * 6 - 15) + 10)
const clamp01 = (t: number) => Math.min(1, Math.max(0, t))

/** Hold at each stop while its copy is on screen (first 40% of the section), then travel to the next. */
export const HOLD = 0.4
export function cameraParam(beat: number): number {
  const i = Math.floor(beat)
  const frac = beat - i
  return i + smootherstep(clamp01((frac - HOLD) / (1 - HOLD)))
}

/** 0→1 progress of a value between a and b, clamped. */
export function span(value: number, a: number, b: number): number {
  return clamp01((value - a) / (b - a))
}

export { smootherstep, clamp01 }
