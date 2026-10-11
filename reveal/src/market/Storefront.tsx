import { useCallback, useId, useMemo, useState } from 'react'
import { CONTRIBUTING, SUBMIT } from '../links'
import type { Listing, Platform } from './types'
import { CHAINS, FEATURED, LISTINGS, ON_PHONE, bySlug, hostPath } from './listings'
import { WindowChrome, type Tab } from './WindowChrome'
import { Hero } from './Hero'
import { Filters, type GenreFilter } from './Filters'
import { GameCard } from './GameCard'
import { SlotCard } from './SlotCard'
import { ChainCard } from './ChainCard'
import { Row } from './Row'
import { GamePage } from './GamePage'
import { LibraryPane, MakePane, RemixPane } from './Panes'
import { Toast, type Notice } from './Toast'

const isListing = (l: Listing | undefined): l is Listing => !!l

/** The interactive app window. All state is local: nothing is stored, sent, or tracked. */
export function Storefront() {
  const shelfHeadId = useId()
  const [tab, setTab] = useState<Tab>('store')
  const [query, setQuery] = useState('')
  const [genre, setGenre] = useState<GenreFilter>('All')
  const [platforms, setPlatforms] = useState<Platform[]>([])
  const [open, setOpen] = useState<{ slug: string; remix: boolean } | null>(null)
  const [recent, setRecent] = useState<string[]>([])
  const [notice, setNotice] = useState<Notice | null>(null)

  const say = useCallback((text: string) => setNotice({ id: Date.now(), text }), [])

  const openGame = useCallback((slug: string, remix = false) => {
    setOpen({ slug, remix })
    setRecent((r) => [slug, ...r.filter((s) => s !== slug)])
  }, [])

  const onPlay = useCallback(
    (g: Listing) =>
      say(
        g.builds.web
          ? `${g.title} is an example listing, so there's nothing to play yet. In the Arcade, Play runs ${g.builds.web} in a sandboxed frame.`
          : `${g.title} is an example listing, so there's no build to download yet.`,
      ),
    [say],
  )
  const onSource = useCallback((g: Listing) => say(`${hostPath(g.sourceUrl)} is an example address. Real listings link to real source.`), [say])

  const q = query.trim().toLowerCase()
  const filtering = q !== '' || genre !== 'All' || platforms.length > 0

  const results = useMemo(
    () =>
      LISTINGS.filter(
        (l) =>
          (genre === 'All' || l.genres.includes(genre)) &&
          (platforms.length === 0 || platforms.some((p) => l.builds[p])) &&
          (!q || [l.title, l.maker, l.tagline, l.madeWith].some((s) => s.toLowerCase().includes(q))),
      ),
    [q, genre, platforms],
  )

  const clear = () => {
    setQuery('')
    setGenre('All')
    setPlatforms([])
  }

  const togglePlatform = (p: Platform) => setPlatforms((ps) => (ps.includes(p) ? ps.filter((x) => x !== p) : [...ps, p]))

  const onQuery = (value: string) => {
    setQuery(value)
    if (tab !== 'store') setTab('store')
  }

  const countLine = `${results.length} ${results.length === 1 ? 'game' : 'games'}${q ? ` matching “${query.trim()}”` : ''}`

  return (
    <>
      <div className="mk-window">
        <WindowChrome tab={tab} onTab={setTab} query={query} onQuery={onQuery} />

        <div className="mk-body">
          {tab === 'store' && (
            <div className="mk-pane">
              <Hero games={FEATURED} hold={!!open} onOpen={openGame} onPlay={onPlay} onSource={onSource} />

              <section className="mk-shelf" aria-labelledby={shelfHeadId}>
                <header className="mk-shelf-head">
                  <h3 id={shelfHeadId} className="mk-h3">
                    {filtering ? 'Results' : 'New on the shelf'}
                  </h3>
                  <p className="mk-row-note" aria-live="polite">
                    {countLine}
                  </p>
                </header>
                <Filters
                  genre={genre}
                  onGenre={setGenre}
                  platforms={platforms}
                  onPlatform={togglePlatform}
                  active={filtering}
                  onClear={clear}
                />
                {results.length > 0 ? (
                  <div className="mk-grid">
                    {results.map((g) => (
                      <GameCard key={g.slug} game={g} onOpen={openGame} />
                    ))}
                    {!filtering && (
                      <>
                        <SlotCard title="Your game here" body="Any engine, any platform. Free, open source, and shipped with its prompt." cta="Submit a game" href={SUBMIT} />
                        <SlotCard title="Or remix one" body="Fork a prompt, change the world, credit the original. That's how the next game starts." cta="Read the guide" href={CONTRIBUTING} />
                      </>
                    )}
                  </div>
                ) : (
                  <div className="mk-empty">
                    <p className="mk-empty-title">
                      Nothing here yet — be the first:{' '}
                      <a href={SUBMIT} target="_blank" rel="noreferrer">
                        Submit a game
                      </a>
                    </p>
                    <p className="mk-empty-sub">
                      No example listing matches {q ? `“${query.trim()}”` : 'those filters'}. On the real shelf, that gap is yours to fill.
                    </p>
                    <button type="button" className="mk-btn" onClick={clear}>
                      Clear filters
                    </button>
                  </div>
                )}
              </section>

              {!filtering && (
                <>
                  <Row title="Remix chains" note="Every listing remembers where it came from, so credit flows back." wide>
                    {CHAINS.map(([parent, child]) => (
                      <ChainCard key={child.slug} parent={parent} child={child} onOpen={openGame} />
                    ))}
                  </Row>
                  <Row title="Plays on your phone" note="A web build runs in any phone browser. Some ship Android and iOS builds too.">
                    {ON_PHONE.map((g) => (
                      <GameCard key={g.slug} game={g} onOpen={openGame} compact />
                    ))}
                  </Row>
                </>
              )}

              <footer className="mk-store-foot">
                <p>
                  <strong>The real shelf is empty until the community submits games.</strong> These ten listings are examples, painted for this
                  preview. Every real one is free, open source, and ships with its prompt.
                </p>
                <a className="mk-btn mk-btn-primary" href={SUBMIT} target="_blank" rel="noreferrer">
                  Submit a game
                </a>
              </footer>
            </div>
          )}

          {tab === 'library' && <LibraryPane recent={recent.map(bySlug).filter(isListing)} onOpen={openGame} onBrowse={() => setTab('store')} />}
          {tab === 'remix' && <RemixPane onOpen={openGame} />}
          {tab === 'make' && <MakePane />}
        </div>
      </div>

      {open && (
        <GamePage
          slug={open.slug}
          remix={open.remix}
          onClose={() => setOpen(null)}
          onNavigate={(slug) => openGame(slug)}
          onPlay={onPlay}
          onSource={onSource}
        />
      )}
      <Toast notice={notice} onDone={() => setNotice(null)} />
    </>
  )
}
