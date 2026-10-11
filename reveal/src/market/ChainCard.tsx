import type { Listing } from './types'
import { art } from './listings'
import { IconArrow } from './icons'

/** One remix link: the original on the left, the remix on the right. Each half opens its own game page. */
export function ChainCard({ parent, child, onOpen }: { parent: Listing; child: Listing; onOpen: (slug: string) => void }) {
  return (
    <article className="mk-chain">
      <div className="mk-chain-pair">
        <button type="button" className="mk-chain-node" onClick={() => onOpen(parent.slug)} aria-label={`Open ${parent.title}, the original`}>
          <img src={art(parent.art)} alt="" width={1600} height={900} loading="lazy" decoding="async" style={{ objectPosition: parent.focus }} />
          <span className="mk-chain-role">Original</span>
        </button>
        <span className="mk-chain-link" aria-hidden="true">
          <IconArrow />
        </span>
        <button type="button" className="mk-chain-node" onClick={() => onOpen(child.slug)} aria-label={`Open ${child.title}, the remix`}>
          <img src={art(child.art)} alt="" width={1600} height={900} loading="lazy" decoding="async" style={{ objectPosition: child.focus }} />
          <span className="mk-chain-role is-remix">Remix</span>
        </button>
      </div>
      <div className="mk-chain-body">
        <h4 className="mk-chain-title">
          {parent.title}
          <span className="mk-chain-arrow" aria-hidden="true">
            {' '}
            →{' '}
          </span>
          <span className="mk-sr"> remixed into </span>
          {child.title}
        </h4>
        <p className="mk-chain-makers">
          {parent.maker} <span aria-hidden="true">→</span>
          <span className="mk-sr"> then </span> {child.maker}
        </p>
        {child.remixNote && <p className="mk-chain-note">{child.remixNote}</p>}
      </div>
    </article>
  )
}
