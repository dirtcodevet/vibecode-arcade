import { useRef, useState, type CSSProperties, type FocusEvent } from 'react'
import type { Listing } from './types'
import { art, bySlug } from './listings'
import { useInView, useReducedMotion } from './hooks'
import { LicenseBadge, PlatformPills } from './ui'
import { IconBranch, IconCode, IconDownload, IconPause, IconPlay } from './icons'

const DWELL_MS = 6000

/** Was this focus from the keyboard? Mouse clicks on the thumbnails shouldn't freeze the rotation. */
function isKeyboardFocus(el: Element) {
  try {
    return el.matches(':focus-visible')
  } catch {
    return true
  }
}

export function Hero({
  games,
  hold,
  onOpen,
  onPlay,
  onSource,
}: {
  games: Listing[]
  /** Pause from outside, e.g. while the game page is open. */
  hold: boolean
  onOpen: (slug: string, remix?: boolean) => void
  onPlay: (game: Listing) => void
  onSource: (game: Listing) => void
}) {
  const rootRef = useRef<HTMLElement>(null)
  const reduced = useReducedMotion()
  const inView = useInView(rootRef)
  const [index, setIndex] = useState(0)
  const [hovered, setHovered] = useState(false)
  const [focused, setFocused] = useState(false)
  const [stopped, setStopped] = useState(false)

  const rotating = !reduced && !stopped && games.length > 1
  const running = rotating && !hovered && !focused && !hold && inView
  const game = games[index]
  const parent = bySlug(game.remixOf)
  const hasWeb = !!game.builds.web

  const onFocus = (e: FocusEvent<HTMLElement>) => {
    if (isKeyboardFocus(e.target)) setFocused(true)
  }
  const onBlur = (e: FocusEvent<HTMLElement>) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFocused(false)
  }

  return (
    <section
      ref={rootRef}
      className="mk-hero"
      aria-roledescription="carousel"
      aria-label="Featured games"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={onFocus}
      onBlur={onBlur}
      style={{ '--mk-dwell': `${DWELL_MS}ms` } as CSSProperties}
    >
      <h3 className="mk-sr">Featured</h3>
      <div
        className="mk-hero-slide"
        role="group"
        aria-roledescription="slide"
        aria-label={`${index + 1} of ${games.length}: ${game.title}`}
        aria-live={running ? 'off' : 'polite'}
      >
        {/* Mouse convenience: the art opens the game page. Keyboard users get the title button. */}
        <div className="mk-hero-stage" onClick={() => onOpen(game.slug)}>
          {games.map((g, i) => (
            <img
              key={g.slug}
              className={`mk-hero-art${i === index ? ' is-on' : ''}${rotating ? ' is-drifting' : ''}`}
              src={art(g.art)}
              alt={i === index ? g.artAlt : ''}
              aria-hidden={i === index ? undefined : true}
              width={1600}
              height={900}
              decoding="async"
              style={{ objectPosition: g.focus, animationPlayState: running ? 'running' : 'paused' }}
            />
          ))}
          <div className="mk-hero-scrim" aria-hidden="true" />
        </div>

        <div className="mk-hero-body" key={game.slug}>
          <p className="mk-hero-kicker">
            <span>Featured</span>
            {parent && (
              <span className="mk-tag">
                <IconBranch size={13} /> Remix of {parent.title}
              </span>
            )}
          </p>
          <h4 className="mk-hero-title">
            <button type="button" onClick={() => onOpen(game.slug)}>
              {game.title}
            </button>
          </h4>
          <p className="mk-hero-by">
            by <strong>{game.maker}</strong>
            <span aria-hidden="true"> · </span>
            <span className="mk-made">{game.madeWith}</span>
          </p>
          <p className="mk-hero-tagline">{game.tagline}</p>
          <div className="mk-badges">
            <LicenseBadge license={game.license} />
            <PlatformPills builds={game.builds} />
          </div>
          <div className="mk-hero-actions">
            <button type="button" className="mk-btn mk-btn-primary" onClick={() => onPlay(game)}>
              {hasWeb ? <IconPlay /> : <IconDownload />}
              {hasWeb ? 'Play in browser' : 'Get the build'}
            </button>
            <button type="button" className="mk-btn" onClick={() => onSource(game)}>
              <IconCode />
              View source
            </button>
            <button type="button" className="mk-btn mk-btn-ghost" onClick={() => onOpen(game.slug, true)}>
              <IconBranch />
              Remix the prompt
            </button>
          </div>
        </div>

        {rotating && (
          <span
            key={`${game.slug}-${index}`}
            className="mk-hero-progress"
            aria-hidden="true"
            style={{ animationPlayState: running ? 'running' : 'paused' }}
            onAnimationEnd={() => setIndex((i) => (i + 1) % games.length)}
          />
        )}
      </div>

      <div className="mk-hero-strip">
        <div className="mk-hero-thumbs" role="group" aria-label="Choose a featured game">
          {games.map((g, i) => (
            <button
              key={g.slug}
              type="button"
              className="mk-thumb"
              aria-current={i === index ? 'true' : undefined}
              aria-label={`Show ${g.title}`}
              onClick={() => setIndex(i)}
            >
              <img src={art(g.art)} alt="" width={1600} height={900} loading="lazy" decoding="async" style={{ objectPosition: g.focus }} />
              <span className="mk-thumb-title" aria-hidden="true">
                {g.title}
              </span>
            </button>
          ))}
        </div>
        {!reduced && games.length > 1 && (
          <button
            type="button"
            className="mk-hero-pause"
            aria-pressed={stopped}
            aria-label={stopped ? 'Resume automatic rotation' : 'Pause automatic rotation'}
            onClick={() => setStopped((s) => !s)}
          >
            {stopped ? <IconPlay /> : <IconPause />}
          </button>
        )}
      </div>
    </section>
  )
}
