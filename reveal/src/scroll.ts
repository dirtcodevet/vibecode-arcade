import { BEATS } from './beats'

/**
 * Scroll state shared by the DOM overlay, the 3D scene, and the audio engine.
 * `beat` is continuous: 0 at the first beat, BEATS.length - 1 at the last. The scene reads it every frame;
 * listeners hear only when the whole-number beat changes.
 */
export const scroll = {
  beat: 0,
  velocity: 0,
  reducedMotion: false,
}

type Listener = (beat: number) => void
const listeners = new Set<Listener>()
let lastWhole = -1

export function onBeatChange(fn: Listener): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

/** Maps window scroll onto beat position using the tops of the [data-beat] sections. */
export function startScrollTracking(): () => void {
  let lastY = window.scrollY
  let lastT = performance.now()

  // ?motion=full or ?motion=reduced overrides the OS preference (handy for testing, and an opt-in either way).
  const forced = new URLSearchParams(window.location.search).get('motion')
  const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
  const applyMotion = (reduced: boolean) => {
    scroll.reducedMotion = forced === 'full' ? false : forced === 'reduced' ? true : reduced
    document.documentElement.classList.toggle('reduced', scroll.reducedMotion)
  }
  applyMotion(motionQuery.matches)
  const onMotion = (e: MediaQueryListEvent) => applyMotion(e.matches)
  motionQuery.addEventListener('change', onMotion)
  if (import.meta.env.DEV) Object.assign(window, { __scroll: scroll })

  const update = () => {
    const sections = Array.from(document.querySelectorAll<HTMLElement>('[data-beat]'))
    if (sections.length === 0) return
    // A beat is "arrived" when its section's top reaches 35% down the viewport.
    const probe = window.scrollY + window.innerHeight * 0.35
    const tops = sections.map((s) => s.offsetTop)
    let beat = 0
    for (let i = 0; i < tops.length; i++) {
      const next = tops[i + 1] ?? tops[i] + sections[i].offsetHeight
      if (probe >= tops[i]) beat = i + Math.min(1, (probe - tops[i]) / (next - tops[i]))
    }
    scroll.beat = Math.min(beat, BEATS.length - 1)

    const now = performance.now()
    const dt = Math.max(16, now - lastT)
    scroll.velocity = (window.scrollY - lastY) / dt
    lastY = window.scrollY
    lastT = now

    const whole = Math.round(scroll.beat)
    if (whole !== lastWhole) {
      lastWhole = whole
      listeners.forEach((fn) => fn(whole))
    }
  }

  update()
  window.addEventListener('scroll', update, { passive: true })
  window.addEventListener('resize', update)
  return () => {
    window.removeEventListener('scroll', update)
    window.removeEventListener('resize', update)
    motionQuery.removeEventListener('change', onMotion)
  }
}
