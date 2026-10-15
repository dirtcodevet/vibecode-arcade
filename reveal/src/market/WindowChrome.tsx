import { IconSearch, Mark } from './icons'

export type Tab = 'store' | 'library' | 'remix' | 'make'

const TABS: { id: Tab; label: string }[] = [
  { id: 'store', label: 'Store' },
  { id: 'library', label: 'Library' },
  { id: 'remix', label: 'Remix' },
  { id: 'make', label: 'Make' },
]

export function WindowChrome({
  tab,
  onTab,
  query,
  onQuery,
}: {
  tab: Tab
  onTab: (tab: Tab) => void
  query: string
  onQuery: (query: string) => void
}) {
  return (
    <div className="mk-chrome">
      <div className="mk-chrome-lead">
        <span className="mk-dots" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
        <span className="mk-mark">
          <Mark />
          <span>VibeCode Arcade</span>
        </span>
      </div>

      <nav className="mk-tabs" aria-label="Arcade">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className="mk-tab"
            aria-current={tab === t.id ? 'page' : undefined}
            onClick={() => onTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <label className="mk-search">
        <IconSearch />
        <span className="mk-sr">Search the shelf</span>
        <input
          type="search"
          value={query}
          placeholder="Search games, makers, tools"
          autoComplete="off"
          spellCheck={false}
          onChange={(e) => onQuery(e.target.value)}
        />
      </label>

      <div className="mk-chrome-trail">
        <span className="mk-ribbon">
          <i aria-hidden="true" />
          Live catalog · examples marked
        </span>
        <span className="mk-noacct">No account needed</span>
      </div>
    </div>
  )
}
