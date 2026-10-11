import { useRef, type ReactNode } from 'react'
import { CONTRIBUTING, SUBMIT } from '../links'
import type { Listing } from './types'
import { CHAINS, LISTINGS, MANIFEST_TEMPLATE, remixesOf } from './listings'
import { GameCard } from './GameCard'
import { ChainCard } from './ChainCard'
import { Row } from './Row'
import { CopyButton } from './ui'

type Open = (slug: string) => void

function PaneHead({ title, children }: { title: string; children: ReactNode }) {
  return (
    <header className="mk-pane-head">
      <h3 className="mk-h3 mk-pane-title">{title}</h3>
      <p>{children}</p>
    </header>
  )
}

export function LibraryPane({ recent, onOpen, onBrowse }: { recent: Listing[]; onOpen: Open; onBrowse: () => void }) {
  return (
    <div className="mk-pane">
      <PaneHead title="Library">Your library lives on this device. No account, no cloud sync, nothing tracked.</PaneHead>
      {recent.length > 0 ? (
        <div>
          <p className="mk-row-note mk-library-note">Opened in this preview, most recent first. Close the tab and it's gone.</p>
          <div className="mk-grid">
            {recent.map((g) => (
              <GameCard key={g.slug} game={g} onOpen={onOpen} compact />
            ))}
          </div>
        </div>
      ) : (
        <div className="mk-empty">
          <p className="mk-empty-title">Nothing here yet.</p>
          <p className="mk-empty-sub">Games you open from the store show up here, and only here.</p>
          <button type="button" className="mk-btn" onClick={onBrowse}>
            Browse the store
          </button>
        </div>
      )}
    </div>
  )
}

export function RemixPane({ onOpen }: { onOpen: Open }) {
  const waiting = LISTINGS.filter((l) => !l.remixOf && remixesOf(l.slug).length === 0)
  return (
    <div className="mk-pane">
      <PaneHead title="Remix">
        Every game ships with its prompt. Fork it, change it, and <code>remixOf</code> keeps the credit flowing back to the original.
      </PaneHead>
      <div className="mk-chain-grid">
        {CHAINS.map(([parent, child]) => (
          <ChainCard key={child.slug} parent={parent} child={child} onOpen={onOpen} />
        ))}
      </div>
      <Row title="Waiting for a first remix" note="Originals nobody has remixed yet. Open one and hit Remix this.">
        {waiting.map((g) => (
          <GameCard key={g.slug} game={g} onOpen={onOpen} compact />
        ))}
      </Row>
    </div>
  )
}

const STEPS = [
  ['Make a game.', 'Any engine, any language, any model. Three.js, Godot, Phaser, Bevy, Love2D, plain C. If you vibecoded it, it counts.'],
  ['Add arcade.json.', 'Who made it, its license, the prompt, where the source lives, and which builds you ship.'],
  ['Open a submission.', "It's checked against the same open rules the desktop shell runs, then it goes on the shelf."],
] as const

export function MakePane() {
  const codeRef = useRef<HTMLPreElement>(null)
  return (
    <div className="mk-pane">
      <PaneHead title="Make">The shelf fills up one vibecoded game at a time. Three steps, no account.</PaneHead>
      <ol className="mk-steps">
        {STEPS.map(([title, body], i) => (
          <li key={title}>
            <span className="mk-step-n" aria-hidden="true">
              {i + 1}
            </span>
            <h4>{title}</h4>
            <p>{body}</p>
          </li>
        ))}
      </ol>
      <div className="mk-remix mk-manifest">
        <div className="mk-remix-head">
          <span className="mk-remix-file">arcade.json</span>
          <span className="mk-remix-hint">at your repo root</span>
          <CopyButton text={MANIFEST_TEMPLATE} label="Copy the arcade.json template" source={codeRef} />
        </div>
        <pre ref={codeRef} className="mk-code">
          <code>{MANIFEST_TEMPLATE}</code>
        </pre>
      </div>
      <div className="mk-make-ctas">
        <a className="mk-btn mk-btn-primary" href={SUBMIT} target="_blank" rel="noreferrer">
          Submit a game
        </a>
        <a className="mk-btn" href={CONTRIBUTING} target="_blank" rel="noreferrer">
          Read the guide
        </a>
      </div>
    </div>
  )
}
