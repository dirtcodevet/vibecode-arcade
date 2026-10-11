import { useState } from 'react';

export interface RunningGame {
  url: string;
  slug: string;
  title: string;
}

/** A web build in a frame that may run scripts and nothing else: no same-origin, no top navigation, no popups. */
export function GameFrame({ game, onClose }: { game: RunningGame; onClose: () => void }) {
  const [loaded, setLoaded] = useState(false);
  return (
    <section className="game" data-game-frame data-loaded={loaded ? 'true' : 'false'}>
      <header className="game-bar">
        <button type="button" className="button button--quiet" onClick={onClose}>
          ← Back to Rules
        </button>
        <div className="game-title">
          <strong>{game.title}</strong>
          <span>{game.url}</span>
        </div>
        <span className="tag">sandboxed · scripts only</span>
      </header>
      <iframe
        className="game-frame"
        title={game.title}
        src={game.url}
        sandbox="allow-scripts"
        referrerPolicy="no-referrer"
        onLoad={() => setLoaded(true)}
      />
    </section>
  );
}
