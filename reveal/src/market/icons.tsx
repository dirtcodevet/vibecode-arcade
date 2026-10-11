import type { ReactNode } from 'react'

function Svg({ children, size = 16 }: { children: ReactNode; size?: number }) {
  return (
    <svg
      className="mk-icon"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  )
}

/** The VibeCode Arcade mark, same as the reveal site's header. */
export function Mark() {
  return (
    <svg className="mk-mark-svg" viewBox="0 0 32 32" aria-hidden="true">
      <rect x="3" y="7" width="26" height="18" rx="3" fill="none" stroke="currentColor" strokeWidth="2" />
      <circle cx="16" cy="16" r="3.2" fill="#f0a24b" />
    </svg>
  )
}

export const IconSearch = () => (
  <Svg>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </Svg>
)

export const IconPlay = () => (
  <Svg>
    <path d="M7 5v14l11-7z" fill="currentColor" stroke="none" />
  </Svg>
)

export const IconCode = () => (
  <Svg>
    <path d="m8 7-5 5 5 5M16 7l5 5-5 5" />
  </Svg>
)

/** A fork: one line splitting in two, for remixes. */
export const IconBranch = ({ size = 16 }: { size?: number }) => (
  <Svg size={size}>
    <circle cx="6" cy="5" r="2" />
    <circle cx="6" cy="19" r="2" />
    <circle cx="18" cy="7" r="2" />
    <path d="M6 7v10M18 9c0 5-6 4-11.5 8.5" />
  </Svg>
)

export const IconClose = () => (
  <Svg size={18}>
    <path d="M6 6l12 12M18 6 6 18" />
  </Svg>
)

export const IconCopy = () => (
  <Svg size={14}>
    <rect x="9" y="9" width="11" height="11" rx="2" />
    <path d="M5 15V5a2 2 0 0 1 2-2h8" />
  </Svg>
)

export const IconCheck = () => (
  <Svg size={14}>
    <path d="m5 12 5 5 9-10" />
  </Svg>
)

export const IconChevron = ({ dir }: { dir: 'left' | 'right' }) => (
  <Svg size={18}>
    <path d={dir === 'left' ? 'm15 6-6 6 6 6' : 'm9 6 6 6-6 6'} />
  </Svg>
)

export const IconPause = () => (
  <Svg size={14}>
    <path d="M8 5v14M16 5v14" />
  </Svg>
)

export const IconDownload = () => (
  <Svg>
    <path d="M12 4v11m0 0-4.5-4.5M12 15l4.5-4.5M5 20h14" />
  </Svg>
)

export const IconArrow = () => (
  <Svg size={14}>
    <path d="M5 12h14m-5-5 5 5-5 5" />
  </Svg>
)
