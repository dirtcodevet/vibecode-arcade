import { useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { IconClose } from './icons'

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

function focusables(root: HTMLElement) {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => el.getClientRects().length > 0)
}

/**
 * The dialog shell: portalled to <body> so no transformed ancestor can trap position:fixed.
 * Traps focus, closes on Esc / backdrop / the close button, locks page scroll, and hands focus back to the opener.
 */
export function Modal({ labelledBy, onClose, children }: { labelledBy: string; onClose: () => void; children: ReactNode }) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const onCloseRef = useRef(onClose)
  const pressedBackdrop = useRef(false)
  // Captured during the first render: child effects (which move focus into the dialog) run before ours.
  const [opener] = useState(() => (document.activeElement instanceof HTMLElement ? document.activeElement : null))

  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const onKey = (e: KeyboardEvent) => {
      const root = dialogRef.current
      if (!root) return
      if (e.key === 'Escape') {
        e.preventDefault()
        onCloseRef.current()
        return
      }
      if (e.key !== 'Tab') return
      const items = focusables(root)
      if (items.length === 0) {
        e.preventDefault()
        return
      }
      const first = items[0]
      const last = items[items.length - 1]
      const active = document.activeElement
      if (e.shiftKey && (active === first || !root.contains(active))) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && (active === last || !root.contains(active))) {
        e.preventDefault()
        first.focus()
      }
    }

    // Belt and braces: if focus escapes anyway (e.g. a click on the page behind), pull it back in.
    const onFocusIn = (e: FocusEvent) => {
      const root = dialogRef.current
      if (root && e.target instanceof Node && !root.contains(e.target)) focusables(root)[0]?.focus()
    }

    document.addEventListener('keydown', onKey)
    document.addEventListener('focusin', onFocusIn)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('focusin', onFocusIn)
      document.body.style.overflow = prevOverflow
      if (opener?.isConnected) opener.focus({ preventScroll: true })
    }
  }, [opener])

  return createPortal(
    <div
      className="mk-modal"
      onMouseDown={(e) => {
        pressedBackdrop.current = e.target === e.currentTarget
      }}
      onClick={(e) => {
        if (pressedBackdrop.current && e.target === e.currentTarget) onCloseRef.current()
        pressedBackdrop.current = false
      }}
    >
      <div ref={dialogRef} className="mk-dialog" role="dialog" aria-modal="true" aria-labelledby={labelledBy}>
        <button type="button" className="mk-close" aria-label="Close game page" onClick={() => onCloseRef.current()}>
          <IconClose />
        </button>
        <div className="mk-dialog-scroll">{children}</div>
      </div>
    </div>,
    document.body,
  )
}
