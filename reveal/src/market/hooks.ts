import { useEffect, useState, type RefObject } from 'react'

/**
 * True when the reveal holds still: ?motion=reduced (html.reduced) or a recording (html.capture).
 * The OS reduced-motion setting is deliberately ignored, matching the rest of the site.
 */
function readReduced() {
  if (typeof document === 'undefined') return false
  const html = document.documentElement.classList
  return html.contains('reduced') || html.contains('capture')
}

export function useReducedMotion() {
  // The site sets these classes once at startup, before the storefront mounts.
  const [reduced, setReduced] = useState(readReduced)
  useEffect(() => setReduced(readReduced()), [])
  return reduced
}

/** Whether the element is at least partly on screen. Defaults to true where IntersectionObserver is missing. */
export function useInView(ref: RefObject<Element | null>, threshold = 0.25) {
  const [inView, setInView] = useState(true)
  useEffect(() => {
    const el = ref.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold })
    io.observe(el)
    return () => io.disconnect()
  }, [ref, threshold])
  return inView
}
