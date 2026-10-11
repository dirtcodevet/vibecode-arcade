// Session and web-contents lockdown. Electron is imported for types only, so
// these policies can be exercised with plain Node and fake objects.

import type { Session, WebContents, WebPreferences } from 'electron';
import { GAME_SCHEME } from './web-mounts.ts';

/**
 * The shell window's webPreferences with every security switch spelled out,
 * not left to defaults. Packaged builds get no DevTools; smoke runs keep
 * painting while unfocused.
 */
export function shellWebPreferences(options: { preload: string; packaged: boolean; smoke: boolean }): WebPreferences {
  return {
    preload: options.preload,
    contextIsolation: true,
    sandbox: true,
    nodeIntegration: false,
    nodeIntegrationInSubFrames: false,
    nodeIntegrationInWorker: false,
    webSecurity: true,
    allowRunningInsecureContent: false,
    experimentalFeatures: false,
    webviewTag: false,
    navigateOnDragDrop: false,
    safeDialogs: true,
    devTools: !options.packaged,
    spellcheck: false,
    backgroundThrottling: !options.smoke,
  };
}

/** The only permissions any page may hold. */
export const ALLOWED_PERMISSIONS: ReadonlySet<string> = new Set(['pointerLock', 'fullscreen']);

/**
 * Games get pointer lock and fullscreen; every other permission is denied, both
 * when a page asks for it and when Chromium merely checks it (without a check
 * handler Electron answers "granted"). No device access, no downloads.
 */
export function hardenSession(session: Session): void {
  session.setPermissionRequestHandler((_contents, permission, callback) => {
    callback(ALLOWED_PERMISSIONS.has(permission));
  });
  session.setPermissionCheckHandler((_contents, permission) => ALLOWED_PERMISSIONS.has(permission));
  session.setDevicePermissionHandler(() => false);
  session.on('will-download', (event) => event.preventDefault());
}

/** Frames below the shell page (the game frame and anything it nests) may load only these. */
export function isAllowedFrameUrl(url: string): boolean {
  return url.startsWith(`${GAME_SCHEME}://`) || url === 'about:blank';
}

/**
 * The shell page never navigates away, opens windows, or hosts webviews; game
 * frames may only navigate (or be redirected) within arcade-game://.
 */
export function lockWebContents(contents: WebContents): void {
  contents.setWindowOpenHandler(() => ({ action: 'deny' }));
  contents.on('will-navigate', (event) => event.preventDefault());
  contents.on('will-frame-navigate', (event) => {
    if (event.isMainFrame) return; // covered by will-navigate
    if (!isAllowedFrameUrl(event.url)) event.preventDefault();
  });
  contents.on('will-redirect', (event) => {
    if (!event.isMainFrame && !isAllowedFrameUrl(event.url)) event.preventDefault();
  });
  contents.on('will-attach-webview', (event) => event.preventDefault());
  // With no handler, Electron picks the first Bluetooth device it finds.
  contents.on('select-bluetooth-device', (event, _devices, callback) => {
    event.preventDefault();
    callback('');
  });
}
