import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

export type Notice = { id: number; text: string }

/** A polite status line. The live region stays mounted so screen readers hear each new message. */
export function Toast({ notice, onDone }: { notice: Notice | null; onDone: () => void }) {
  const onDoneRef = useRef(onDone)
  useEffect(() => {
    onDoneRef.current = onDone
  }, [onDone])

  useEffect(() => {
    if (!notice) return
    const t = window.setTimeout(() => onDoneRef.current(), 4800)
    return () => window.clearTimeout(t)
  }, [notice])

  return createPortal(
    <div className="mk-toast-layer" role="status" aria-live="polite">
      {notice && (
        <div key={notice.id} className="mk-toast">
          <i aria-hidden="true" />
          <span>{notice.text}</span>
        </div>
      )}
    </div>,
    document.body,
  )
}
