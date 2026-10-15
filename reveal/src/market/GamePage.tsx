import { Fragment, useEffect, useId, useRef, useState } from 'react'
import { SUBMIT } from '../links'
import { Modal } from './Modal'
import { Lineage } from './Lineage'
import { art, bySlug, hostPath, platformsOf, remixManifest } from './listings'
import { LICENSE_NOTE, PLATFORM_LABEL, type Listing } from './types'
import { CopyButton, LicenseBadge } from './ui'
import { useReducedMotion } from './hooks'
import { IconBranch, IconCode, IconDownload, IconPlay } from './icons'

type Actions = {
  onNavigate: (slug: string) => void
  onPlay: (game: Listing) => void
  onSource: (game: Listing) => void
}

export function GamePage({ slug, remix, onClose, ...actions }: { slug: string; remix: boolean; onClose: () => void } & Actions) {
  const titleId = useId()
  const game = bySlug(slug)
  if (!game) return null
  return (
    <Modal labelledBy={titleId} onClose={onClose}>
      {/* Keyed by slug: walking the lineage swaps the page inside the same dialog, so focus restore still targets the original opener. */}
      <GameBody key={game.slug} game={game} titleId={titleId} startWithRemix={remix} {...actions} />
    </Modal>
  )
}

function licenseLine(game: Listing) {
  const { kind, copyleft } = LICENSE_NOTE[game.license]
  if (copyleft) return `${kind}. Changes stay under the same license.`
  if (kind === 'Public domain') return 'Public domain. No conditions at all.'
  return `${kind}. Keep the notice and remix freely.`
}

function GameBody({ game, titleId, startWithRemix, onNavigate, onPlay, onSource }: { game: Listing; titleId: string; startWithRemix: boolean } & Actions) {
  const reduced = useReducedMotion()
  const promptHeadId = useId()
  const lineageHeadId = useId()
  const remixId = useId()
  const titleRef = useRef<HTMLHeadingElement>(null)
  const promptSecRef = useRef<HTMLElement>(null)
  const promptRef = useRef<HTMLPreElement>(null)
  const remixRef = useRef<HTMLDivElement>(null)
  const snippetRef = useRef<HTMLPreElement>(null)
  const [remixOpen, setRemixOpen] = useState(startWithRemix)

  const parent = bySlug(game.remixOf)
  const hasWeb = !!game.builds.web
  const snippet = remixManifest(game)
  const snippetLines = snippet.split('\n')
  const copyleft = LICENSE_NOTE[game.license].copyleft

  /** Scrolls the dialog (never the page) so `el` sits near the top, unless it is already fully visible. */
  const reveal = (el: HTMLElement | null, always = false) => {
    const scroller = el?.closest<HTMLElement>('.mk-dialog-scroll')
    if (!el || !scroller) return
    const box = scroller.getBoundingClientRect()
    const r = el.getBoundingClientRect()
    if (!always && r.top >= box.top && r.bottom <= box.bottom) return
    scroller.scrollTo({ top: scroller.scrollTop + r.top - box.top - 20, behavior: reduced ? 'auto' : 'smooth' })
  }

  useEffect(() => {
    titleRef.current?.closest('.mk-dialog-scroll')?.scrollTo({ top: 0 })
    titleRef.current?.focus({ preventScroll: true })
    if (startWithRemix) requestAnimationFrame(() => reveal(promptSecRef.current, true))
    // Mount only: each game gets a fresh body (keyed by slug).
  }, [])

  const openRemix = () => {
    setRemixOpen(true)
    requestAnimationFrame(() => reveal(remixRef.current))
  }

  return (
    <article className="mk-gp">
      <div className="mk-gp-hero">
        {game.art ? (
          <img src={art(game.art)} alt={game.artAlt} width={1600} height={900} decoding="async" style={{ objectPosition: game.focus }} />
        ) : (
          <div className="mk-gp-plain" aria-hidden="true" />
        )}
        <span className={`mk-ribbon mk-gp-ribbon${game.example ? '' : ' is-live'}`}>
          <i aria-hidden="true" />
          {game.example ? 'Preview · example listing' : 'On the shelf · real package'}
        </span>
      </div>

      <header className="mk-gp-head">
        {parent && (
          <button type="button" className="mk-tag mk-tag-btn" onClick={() => onNavigate(parent.slug)}>
            <IconBranch size={13} /> Remix of {parent.title}
          </button>
        )}
        <h2 id={titleId} ref={titleRef} tabIndex={-1} className="mk-gp-title">
          {game.title}
        </h2>
        <p className="mk-gp-by">
          by <strong>{game.maker}</strong>
          <span aria-hidden="true"> · </span>
          <span className="mk-made">Made with {game.madeWith}</span>
        </p>
        <p className="mk-gp-tagline">{game.tagline}</p>
        <div className="mk-gp-actions">
          <button type="button" className="mk-btn mk-btn-primary" onClick={() => onPlay(game)}>
            {hasWeb ? <IconPlay /> : <IconDownload />}
            {hasWeb ? 'Play in browser' : 'Get the build'}
          </button>
          <button type="button" className="mk-btn" onClick={() => onSource(game)}>
            <IconCode />
            View source
          </button>
          <button
            type="button"
            className="mk-btn mk-btn-ghost"
            aria-expanded={remixOpen}
            aria-controls={remixId}
            onClick={() => (remixOpen ? setRemixOpen(false) : openRemix())}
          >
            <IconBranch />
            Remix this
          </button>
        </div>
      </header>

      <div className="mk-gp-grid">
        <div className="mk-gp-main">
          <section ref={promptSecRef} className="mk-gp-sec" aria-labelledby={promptHeadId}>
            <div className="mk-gp-sec-head">
              <h3 id={promptHeadId} className="mk-h3">
                The prompt
              </h3>
              <CopyButton text={game.prompt} label="Copy the prompt" source={promptRef} />
            </div>
            <pre ref={promptRef} className="mk-prompt">
              {game.prompt}
            </pre>

            <div id={remixId} ref={remixRef} className="mk-remix" hidden={!remixOpen}>
              <div className="mk-remix-head">
                <span className="mk-remix-file">arcade.json</span>
                <span className="mk-remix-hint">for your remix · remixOf prefilled</span>
                <CopyButton text={snippet} label="Copy the remix arcade.json" source={snippetRef} />
              </div>
              <pre ref={snippetRef} className="mk-code">
                <code>
                  {snippetLines.map((line, i) => (
                    <Fragment key={i}>
                      {line.includes('"remixOf"') ? <mark className="mk-hl">{line}</mark> : line}
                      {i < snippetLines.length - 1 ? '\n' : ''}
                    </Fragment>
                  ))}
                </code>
              </pre>
              <p className="mk-remix-note">
                Fork the source, start from the prompt above, and keep <code>remixOf</code> set to <code>{game.slug}</code> so credit flows back to{' '}
                {game.maker}.{copyleft ? ` ${game.license} is copyleft, so the license carries over.` : ''} Then{' '}
                <a href={SUBMIT} target="_blank" rel="noreferrer">
                  open a submission
                </a>
                .
              </p>
            </div>
          </section>

          <section className="mk-gp-sec" aria-labelledby={lineageHeadId}>
            <div className="mk-gp-sec-head">
              <h3 id={lineageHeadId} className="mk-h3">
                Remix lineage
              </h3>
            </div>
            <Lineage game={game} onNavigate={onNavigate} onRemix={openRemix} />
          </section>
        </div>

        <aside className="mk-gp-side" aria-label="Listing details">
          <section className="mk-side-block">
            <h3 className="mk-side-h">Builds</h3>
            <ul className="mk-builds">
              {platformsOf(game).map((p) => (
                <li key={p}>
                  <span className="mk-pill">{PLATFORM_LABEL[p]}</span>
                  <code className="mk-path">{game.builds[p]}</code>
                </li>
              ))}
            </ul>
          </section>
          <section className="mk-side-block">
            <h3 className="mk-side-h">License</h3>
            <LicenseBadge license={game.license} />
            <p className="mk-side-note">{licenseLine(game)}</p>
          </section>
          <section className="mk-side-block">
            <h3 className="mk-side-h">Source</h3>
            {game.example ? (
              <a
                className="mk-src"
                href="#"
                aria-disabled="true"
                onClick={(e) => {
                  e.preventDefault()
                  onSource(game)
                }}
              >
                <IconCode />
                <span>{hostPath(game.sourceUrl)}</span>
              </a>
            ) : (
              <a className="mk-src" href={game.sourceUrl} target="_blank" rel="noreferrer">
                <IconCode />
                <span>{hostPath(game.sourceUrl)}</span>
              </a>
            )}
            <p className="mk-side-note">
              {game.example ? 'Example address: this listing is a preview.' : 'Public source for this admitted package.'}
            </p>
          </section>
          {game.genres.length > 0 && (
            <section className="mk-side-block">
              <h3 className="mk-side-h">Tags</h3>
              <ul className="mk-tags">
                {game.genres.map((g) => (
                  <li key={g}>{g}</li>
                ))}
              </ul>
            </section>
          )}
          <p className="mk-gp-free">Free · open source · no account · no tracking</p>
        </aside>
      </div>
    </article>
  )
}
