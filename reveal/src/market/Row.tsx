import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { useReducedMotion } from './hooks'
import { IconChevron } from './icons'

/** A titled shelf that scrolls sideways inside itself, never the page. */
export function Row({ title, note, wide = false, children }: { title: string; note?: string; wide?: boolean; children: ReactNode }) {
  const id = useId()
  const trackRef = useRef<HTMLDivElement>(null)
  const reduced = useReducedMotion()
  const [edges, setEdges] = useState({ start: true, end: true })

  const measure = useCallback(() => {
    const el = trackRef.current
    if (!el) return
    setEdges({ start: el.scrollLeft <= 4, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 4 })
  }, [])

  useEffect(() => {
    measure()
    const el = trackRef.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [measure])

  const page = (dir: 1 | -1) => {
    const el = trackRef.current
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.85, behavior: reduced ? 'auto' : 'smooth' })
  }

  const overflows = !(edges.start && edges.end)

  return (
    <section className="mk-row" aria-labelledby={id}>
      <header className="mk-row-head">
        <div>
          <h3 id={id} className="mk-h3">
            {title}
          </h3>
          {note && <p className="mk-row-note">{note}</p>}
        </div>
        {overflows && (
          <div className="mk-row-nav">
            <button type="button" className="mk-round" aria-label={`Scroll ${title} back`} disabled={edges.start} onClick={() => page(-1)}>
              <IconChevron dir="left" />
            </button>
            <button type="button" className="mk-round" aria-label={`Scroll ${title} forward`} disabled={edges.end} onClick={() => page(1)}>
              <IconChevron dir="right" />
            </button>
          </div>
        )}
      </header>
      <div ref={trackRef} className={`mk-row-track${wide ? ' is-wide' : ''}`} onScroll={measure}>
        {children}
      </div>
    </section>
  )
}
