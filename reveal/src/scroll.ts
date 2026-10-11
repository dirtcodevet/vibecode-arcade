import Lenis from 'lenis'
import 'lenis/dist/lenis.css'
import { BEATS } from './beats'

/**
 * Scroll state shared by the DOM overlay, the 3D scene, and the audio engine.
 * `beat` is continuous: 0 at the first beat, BEATS.length - 1 at the last. The scene reads it every frame;
 * listeners hear only when the whole-number beat changes.
 */
export const scroll = {
  beat: 0,
  reducedMotion: false,
}

type Listener = (beat: number) => void
const listeners = new Set<Listener>()
let lastWhole = -1
let lenis: Lenis | null = null

export function onBeatChange(fn: Listener): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

/** Smooth-scrolls to a section (or any selector), falling back to native scrolling. */
export function scrollToTarget(selector: string) {
  const el = document.querySelector<HTMLElement>(selector)
  if (!el) return
  if (lenis) lenis.scrollTo(el, { duration: 1.6 })
  else el.scrollIntoView()
}

/**
 * Maps page scroll onto beat position using the tops of the [data-beat] sections.
 * Wheel input is smoothed by Lenis, so notched mouse wheels glide instead of jumping a section at a time.
 */
export function startScrollTracking(): () => void {
  // Full motion for everyone (the OS reduced-motion setting is deliberately ignored); ?motion=reduced opts out.
  scroll.reducedMotion = new URLSearchParams(window.location.search).get('motion') === 'reduced'
  // The reveal is a story: a reload starts at the beginning instead of gliding back to an old position.
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual'
  if (!window.location.hash) window.scrollTo(0, 0)
  document.documentElement.classList.toggle('reduced', scroll.reducedMotion)
  if (import.meta.env.DEV) Object.assign(window, { __scroll: scroll })

  // Section geometry is measured on resize, not on every scroll event.
  let tops: number[] = []
  let ends: number[] = []
  const measure = () => {
    const sections = Array.from(document.querySelectorAll<HTMLElement>('[data-beat]'))
    tops = sections.map((s) => s.getBoundingClientRect().top + window.scrollY)
    ends = sections.map((s, i) => tops[i + 1] ?? tops[i] + s.offsetHeight)
  }

  const update = (y: number) => {
    if (tops.length === 0) return
    // A beat is "arrived" when its section's top reaches 35% down the viewport.
    const probe = y + window.innerHeight * 0.35
    let beat = 0
    for (let i = 0; i < tops.length; i++) {
      if (probe >= tops[i]) beat = i + Math.min(1, (probe - tops[i]) / (ends[i] - tops[i]))
    }
    scroll.beat = Math.min(beat, BEATS.length - 1)
    const whole = Math.round(scroll.beat)
    if (whole !== lastWhole) {
      lastWhole = whole
      listeners.forEach((fn) => fn(whole))
    }
  }

  measure()
  const resize = new ResizeObserver(() => {
    measure()
    update(lenis ? lenis.scroll : window.scrollY)
  })
  resize.observe(document.body)

  let raf = 0
  let onNativeScroll: (() => void) | null = null
  if (scroll.reducedMotion) {
    onNativeScroll = () => update(window.scrollY)
    window.addEventListener('scroll', onNativeScroll, { passive: true })
  } else {
    // Motion is on by our own decision, so Lenis shouldn't switch smoothing off for the OS setting.
    lenis = new Lenis({ lerp: 0.075, wheelMultiplier: 0.85, smoothWheel: true, anchors: { duration: 1.6 }, respectReducedMotion: false })
    lenis.on('scroll', (l: Lenis) => update(l.scroll))
    if (import.meta.env.DEV) Object.assign(window, { __lenis: lenis })
    const tick = (t: number) => {
      lenis?.raf(t)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
  }
  update(window.scrollY)

  return () => {
    resize.disconnect()
    cancelAnimationFrame(raf)
    if (onNativeScroll) window.removeEventListener('scroll', onNativeScroll)
    lenis?.destroy()
    lenis = null
  }
}
