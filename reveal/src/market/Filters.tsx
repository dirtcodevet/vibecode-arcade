import { GENRES, PLATFORMS, PLATFORM_LABEL, type Genre, type Platform } from './types'

export type GenreFilter = Genre | 'All'

export function Filters({
  genre,
  onGenre,
  platforms,
  onPlatform,
  active,
  onClear,
}: {
  genre: GenreFilter
  onGenre: (genre: GenreFilter) => void
  platforms: Platform[]
  onPlatform: (platform: Platform) => void
  active: boolean
  onClear: () => void
}) {
  return (
    <div className="mk-filters">
      <div className="mk-chips" role="group" aria-label="Filter by genre">
        {(['All', ...GENRES] as GenreFilter[]).map((g) => (
          <button key={g} type="button" className="mk-chip" aria-pressed={genre === g} onClick={() => onGenre(g)}>
            {g}
          </button>
        ))}
      </div>
      <div className="mk-plats" role="group" aria-label="Filter by platform">
        <span className="mk-plats-label" aria-hidden="true">
          Plays on
        </span>
        {PLATFORMS.map((p) => (
          <button key={p} type="button" className="mk-toggle" aria-pressed={platforms.includes(p)} onClick={() => onPlatform(p)}>
            {PLATFORM_LABEL[p]}
          </button>
        ))}
        {active && (
          <button type="button" className="mk-clear" onClick={onClear}>
            Clear filters
          </button>
        )}
      </div>
    </div>
  )
}
