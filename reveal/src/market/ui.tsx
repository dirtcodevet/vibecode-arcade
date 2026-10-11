import { useEffect, useState, type RefObject } from 'react'
import { LICENSE_NOTE, PLATFORMS, PLATFORM_LABEL, type Builds, type License } from './types'
import { IconCheck, IconCopy } from './icons'

export function PlatformPills({ builds, label = 'Platforms' }: { builds: Builds; label?: string }) {
  return (
    <ul className="mk-pills" aria-label={label}>
      {PLATFORMS.filter((p) => builds[p]).map((p) => (
        <li key={p} className="mk-pill">
          {PLATFORM_LABEL[p]}
        </li>
      ))}
    </ul>
  )
}

export function LicenseBadge({ license }: { license: License }) {
  return (
    <span className="mk-license" title={`${license}: ${LICENSE_NOTE[license].kind}`}>
      <span className="mk-license-k">License</span>
      {license}
    </span>
  )
}

type CopyState = 'idle' | 'copied' | 'manual'

/**
 * Copies text with the async clipboard API. If that is unavailable or refused (insecure origin, denied permission),
 * it selects the source text instead so the visitor can copy it by hand.
 */
export function CopyButton({ text, label, source }: { text: string; label: string; source?: RefObject<HTMLElement | null> }) {
  const [state, setState] = useState<CopyState>('idle')

  useEffect(() => {
    if (state === 'idle') return
    const t = window.setTimeout(() => setState('idle'), 2400)
    return () => window.clearTimeout(t)
  }, [state])

  async function copy() {
    try {
      if (!navigator.clipboard?.writeText) throw new Error('clipboard unavailable')
      await navigator.clipboard.writeText(text)
      setState('copied')
    } catch {
      const el = source?.current
      const selection = window.getSelection()
      if (el && selection) {
        const range = document.createRange()
        range.selectNodeContents(el)
        selection.removeAllRanges()
        selection.addRange(range)
      }
      setState('manual')
    }
  }

  return (
    <>
      <button type="button" className="mk-copy" data-state={state} onClick={copy} aria-label={label}>
        {state === 'copied' ? <IconCheck /> : <IconCopy />}
        <span aria-hidden="true">{state === 'copied' ? 'Copied' : state === 'manual' ? 'Selected' : 'Copy'}</span>
      </button>
      <span className="mk-sr" role="status">
        {state === 'copied' ? 'Copied to clipboard.' : state === 'manual' ? 'Text selected. Copy it with your keyboard.' : ''}
      </span>
    </>
  )
}
