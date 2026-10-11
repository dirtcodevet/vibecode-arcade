import type { Listing } from './types'
import { art, bySlug } from './listings'
import { PlatformPills } from './ui'
import { IconBranch } from './icons'

/**
 * A listing card. The title is the real button; its ::after stretches over the whole card,
 * so the card is one click target and one tab stop while the rest stays plain, readable text.
 */
export function GameCard({ game, onOpen, compact = false }: { game: Listing; onOpen: (slug: string) => void; compact?: boolean }) {
  const parent = bySlug(game.remixOf)
  return (
    <article className={`mk-card${compact ? ' is-compact' : ''}`}>
      <div className="mk-card-art">
        <img
          src={art(game.art)}
          alt={game.artAlt}
          width={1600}
          height={900}
          loading="lazy"
          decoding="async"
          style={{ objectPosition: game.focus }}
        />
        {parent && (
          <span className="mk-tag mk-card-tag">
            <IconBranch size={13} />
            <span className="mk-tag-text">Remix of {parent.title}</span>
          </span>
        )}
      </div>
      <div className="mk-card-body">
        <h4 className="mk-card-title">
          <button type="button" className="mk-card-hit" onClick={() => onOpen(game.slug)}>
            {game.title}
          </button>
        </h4>
        <p className="mk-card-by">
          {game.maker}
          <span aria-hidden="true"> · </span>
          <span className="mk-made">{game.madeWith}</span>
        </p>
        {!compact && <p className="mk-card-tagline">{game.tagline}</p>}
        <PlatformPills builds={game.builds} />
      </div>
    </article>
  )
}
