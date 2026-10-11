import { useEffect, useState, type RefObject } from 'react'

const QUERY = '(prefers-reduced-motion: reduce)'

/** True when the OS asks for less motion, or the reveal site forced it (html.reduced, set from ?motion=reduced). */
function readReduced() {
  if (typeof window === 'undefined') return false
  return window.matchMedia(QUERY).matches || document.documentElement.classList.contains('reduced')
}

export function useReducedMotion() {
  const [reduced, setReduced] = useState(readReduced)
  useEffect(() => {
    const mq = window.matchMedia(QUERY)
    const update = () => setReduced(readReduced())
    mq.addEventListener('change', update)
    update()
    return () => mq.removeEventListener('change', update)
  }, [])
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
