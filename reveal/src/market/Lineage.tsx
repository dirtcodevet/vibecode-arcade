import { Fragment } from 'react'
import type { Listing } from './types'
import { ancestorsOf, art, remixesOf } from './listings'

function Node({ game, role, onClick }: { game: Listing; role: string; onClick?: () => void }) {
  const inner = (
    <>
      <span className="mk-ln-thumb">
        <img src={art(game.art)} alt="" width={1600} height={900} loading="lazy" decoding="async" style={{ objectPosition: game.focus }} />
      </span>
      <span className="mk-ln-text">
        <span className="mk-ln-role">{role}</span>
        <span className="mk-ln-title">{game.title}</span>
        <span className="mk-ln-maker">{game.maker}</span>
      </span>
    </>
  )
  return onClick ? (
    <button type="button" className="mk-ln-node" onClick={onClick}>
      {inner}
    </button>
  ) : (
    <div className="mk-ln-node is-here">{inner}</div>
  )
}

const Arrow = () => <span className="mk-ln-arrow" aria-hidden="true" />

/** parent → this → remixes. Every node but "this" navigates; the empty slot opens the remix manifest. */
export function Lineage({ game, onNavigate, onRemix }: { game: Listing; onNavigate: (slug: string) => void; onRemix: () => void }) {
  const ancestors = ancestorsOf(game)
  const remixes = remixesOf(game.slug)

  return (
    <div className="mk-ln-wrap">
      <div className="mk-ln" role="list" aria-label={`Remix lineage of ${game.title}`}>
        {ancestors.length === 0 ? (
          <div role="listitem" className="mk-ln-step">
            <div className="mk-ln-origin">
              <span className="mk-ln-role">Original</span>
              <span>No parent: this one started from a blank prompt.</span>
            </div>
          </div>
        ) : (
          ancestors.map((a, i) => (
            <Fragment key={a.slug}>
              {i > 0 && <Arrow />}
              <div role="listitem" className="mk-ln-step">
                <Node game={a} role="Remixed from" onClick={() => onNavigate(a.slug)} />
              </div>
            </Fragment>
          ))
        )}
        <Arrow />
        <div role="listitem" className="mk-ln-step" aria-current="true">
          <Node game={game} role="This game" />
        </div>
        <Arrow />
        <div role="listitem" className="mk-ln-step mk-ln-kids">
          {remixes.map((r) => (
            <Node key={r.slug} game={r} role="Remixed into" onClick={() => onNavigate(r.slug)} />
          ))}
          <button type="button" className="mk-ln-node is-open" onClick={onRemix}>
            <span className="mk-ln-thumb mk-ln-plus" aria-hidden="true">
              +
            </span>
            <span className="mk-ln-text">
              <span className="mk-ln-role">{remixes.length ? 'Next remix' : 'First remix'}</span>
              <span className="mk-ln-title">Yours</span>
              <span className="mk-ln-maker">Start from this prompt</span>
            </span>
          </button>
        </div>
      </div>
    </div>
  )
}
