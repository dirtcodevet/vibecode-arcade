import { shelf, SHELL_VERSION } from '../shelf.ts';

const platform = window.arcade.getPlatform();

export function StatusLine() {
  const count = shelf.games.length;
  return (
    <footer className="status" data-status>
      <span>
        <span className="status-dot" aria-hidden="true" />
        {platform.label} {platform.osVersion} · {platform.arch}
      </span>
      <span>v{SHELL_VERSION}</span>
      <span>
        {count} {count === 1 ? 'game' : 'games'}
      </span>
    </footer>
  );
}
