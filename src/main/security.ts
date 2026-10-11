import type { Session, WebContents } from 'electron';
import { GAME_SCHEME } from './web-mounts.ts';

const ALLOWED_PERMISSIONS = new Set(['pointerLock', 'fullscreen']);

/** Games get pointer lock and fullscreen; every other permission is denied. */
export function hardenSession(session: Session): void {
  session.setPermissionRequestHandler((_contents, permission, callback) => {
    callback(ALLOWED_PERMISSIONS.has(permission));
  });
}

/**
 * The shell page never navigates away or opens windows; game frames may only
 * navigate within arcade-game://.
 */
export function lockNavigation(contents: WebContents): void {
  contents.setWindowOpenHandler(() => ({ action: 'deny' }));
  contents.on('will-navigate', (event) => event.preventDefault());
  contents.on('will-frame-navigate', (event) => {
    if (event.isMainFrame) return; // covered by will-navigate
    const allowed = event.url.startsWith(`${GAME_SCHEME}://`) || event.url === 'about:blank';
    if (!allowed) event.preventDefault();
  });
}
