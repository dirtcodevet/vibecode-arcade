// The host's security policies, exercised with fake Electron objects: session
// permissions, navigation locks, window preferences, scheme privileges, and the
// IPC sender and package-folder checks.

import assert from 'node:assert/strict';
import { join, resolve } from 'node:path';
import { describe, it } from 'node:test';
import type { Session, WebContents } from 'electron';
import { isShellFrame, shellPackageDir } from '../src/main/ipc-guards.ts';
import {
  ALLOWED_PERMISSIONS,
  hardenSession,
  isAllowedFrameUrl,
  lockWebContents,
  shellWebPreferences,
} from '../src/main/security.ts';
import { GAME_SCHEME_PRIVILEGES } from '../src/main/web-mounts.ts';
import { EXAMPLE_PACKAGES } from '../src/shared/examples.ts';

type Listener = (...args: any[]) => unknown;

/** Records handlers and event listeners the way Session and WebContents take them. */
function fakeEmitter() {
  const listeners = new Map<string, Listener>();
  const handlers: Record<string, Listener> = {};
  const target = {
    on(event: string, listener: Listener) {
      listeners.set(event, listener);
      return target;
    },
    setPermissionRequestHandler: (handler: Listener) => void (handlers.request = handler),
    setPermissionCheckHandler: (handler: Listener) => void (handlers.check = handler),
    setDevicePermissionHandler: (handler: Listener) => void (handlers.device = handler),
    setWindowOpenHandler: (handler: Listener) => void (handlers.windowOpen = handler),
  };
  /** Fires `event` with a preventable event object; returns whether it was prevented. */
  function emit(event: string, details: object = {}, ...rest: unknown[]): boolean {
    const listener = listeners.get(event);
    assert.ok(listener, `no listener for ${event}`);
    let prevented = false;
    listener({ ...details, preventDefault: () => (prevented = true) }, ...rest);
    return prevented;
  }
  return { target, handlers, emit };
}

describe('hardenSession', () => {
  const { target, handlers, emit } = fakeEmitter();
  hardenSession(target as unknown as Session);

  it('grants pointer lock and fullscreen requests and denies the rest', () => {
    const answers = new Map<string, boolean>();
    for (const permission of ['pointerLock', 'fullscreen', 'media', 'geolocation', 'notifications', 'openExternal', 'hid']) {
      handlers.request(null, permission, (granted: boolean) => answers.set(permission, granted));
    }
    assert.deepEqual(
      [...answers].filter(([, granted]) => granted).map(([permission]) => permission),
      ['pointerLock', 'fullscreen'],
    );
  });

  it('answers permission checks with the same allowlist (Electron says "granted" without one)', () => {
    for (const permission of ['media', 'geolocation', 'notifications', 'clipboard-read', 'serial', 'usb', 'hid']) {
      assert.equal(handlers.check(null, permission, 'arcade-game://x', {}), false, permission);
    }
    for (const permission of ALLOWED_PERMISSIONS) assert.equal(handlers.check(null, permission, '', {}), true);
  });

  it('refuses device access and cancels every download', () => {
    assert.equal(handlers.device({ deviceType: 'usb', origin: 'arcade-game://x' }), false);
    assert.equal(emit('will-download'), true);
  });
});

describe('lockWebContents', () => {
  const { target, handlers, emit } = fakeEmitter();
  lockWebContents(target as unknown as WebContents);

  it('denies every new window', () => {
    for (const url of ['https://example.com/', 'arcade-game://x/', 'file:///C:/x']) {
      assert.deepEqual(handlers.windowOpen({ url }), { action: 'deny' });
    }
  });

  it('never lets the shell page navigate away', () => {
    assert.equal(emit('will-navigate', { url: 'https://example.com/' }), true);
    assert.equal(emit('will-navigate', { url: 'file:///C:/Windows/win.ini' }), true);
  });

  it('keeps game frames on arcade-game:// URLs', () => {
    for (const url of ['arcade-game://star-garden/index.html', 'about:blank']) {
      assert.equal(emit('will-frame-navigate', { url, isMainFrame: false }), false, url);
      assert.equal(emit('will-redirect', { url, isMainFrame: false }), false, url);
    }
    for (const url of [
      'https://example.com/',
      'file:///C:/Windows/win.ini',
      'data:text/html,<p>x</p>',
      'blob:arcade-game://x/1',
      'about:srcdoc',
      'javascript:alert(1)',
      'chrome://settings',
      'devtools://devtools/bundled/inspector.html',
      'ARCADE-GAME-evil://x',
    ]) {
      assert.equal(emit('will-frame-navigate', { url, isMainFrame: false }), true, url);
      assert.equal(emit('will-redirect', { url, isMainFrame: false }), true, url);
    }
  });

  it('refuses webviews and cancels Bluetooth device picks', () => {
    assert.equal(emit('will-attach-webview'), true);
    let picked: string | undefined;
    assert.equal(emit('select-bluetooth-device', {}, [{ deviceId: 'pad' }], (id: string) => (picked = id)), true);
    assert.equal(picked, '');
  });

  it('isAllowedFrameUrl matches only the game scheme and about:blank', () => {
    assert.equal(isAllowedFrameUrl('arcade-game://x/index.html'), true);
    assert.equal(isAllowedFrameUrl('about:blank'), true);
    assert.equal(isAllowedFrameUrl('arcade-game:x'), false);
    assert.equal(isAllowedFrameUrl('about:blank#x'), false);
  });
});

describe('shellWebPreferences', () => {
  it('spells out every hardening switch', () => {
    const prefs = shellWebPreferences({ preload: '/preload.js', packaged: true, smoke: false });
    assert.equal(prefs.contextIsolation, true);
    assert.equal(prefs.sandbox, true);
    assert.equal(prefs.webSecurity, true);
    assert.equal(prefs.safeDialogs, true);
    for (const key of [
      'nodeIntegration',
      'nodeIntegrationInSubFrames',
      'nodeIntegrationInWorker',
      'allowRunningInsecureContent',
      'experimentalFeatures',
      'webviewTag',
      'navigateOnDragDrop',
    ] as const) {
      assert.equal(prefs[key], false, key);
    }
  });

  it('turns DevTools off in packaged builds only', () => {
    assert.equal(shellWebPreferences({ preload: '', packaged: true, smoke: false }).devTools, false);
    assert.equal(shellWebPreferences({ preload: '', packaged: false, smoke: false }).devTools, true);
  });
});

describe('arcade-game:// privileges', () => {
  it('never bypasses CSP or allows service workers', () => {
    const privileges: Record<string, unknown> = GAME_SCHEME_PRIVILEGES;
    assert.equal(privileges.bypassCSP, undefined);
    assert.equal(privileges.allowServiceWorkers, undefined);
    assert.equal(privileges.secure, true);
    assert.equal(privileges.standard, true);
  });
});

describe('isShellFrame (IPC sender check)', () => {
  const shellUrl = 'file:///C:/app/out/renderer/index.html';
  const isShellUrl = (url: string) => url.split('#')[0] === shellUrl;

  it('accepts the shell page top frame', () => {
    assert.equal(isShellFrame({ parent: null, url: `${shellUrl}#rules` }, isShellUrl), true);
  });

  it('refuses game frames, other pages, and frames that are gone', () => {
    const top = { parent: null, url: shellUrl };
    assert.equal(isShellFrame({ parent: top, url: 'arcade-game://x/index.html' }, isShellUrl), false);
    assert.equal(isShellFrame({ parent: top, url: shellUrl }, isShellUrl), false, 'a nested copy of the shell');
    assert.equal(isShellFrame({ parent: null, url: 'https://example.com/' }, isShellUrl), false);
    assert.equal(isShellFrame({ parent: undefined, url: shellUrl }, isShellUrl), false);
    assert.equal(isShellFrame(null, isShellUrl), false);
    const disposed = {
      parent: null,
      get url(): string {
        throw new Error('Render frame was disposed');
      },
    };
    assert.equal(isShellFrame(disposed, isShellUrl), false);
  });
});

describe('shellPackageDir (IPC package folders)', () => {
  const appRoot = resolve('arcade-root');

  it('resolves each bundled package against the app root', () => {
    for (const pkg of EXAMPLE_PACKAGES) {
      assert.equal(shellPackageDir(pkg.dir, appRoot), join(appRoot, ...pkg.dir.split('/')));
    }
  });

  it('refuses any other folder, however it is spelled', () => {
    for (const dir of [
      'C:\\Windows\\System32',
      'C:/Windows/System32',
      '\\\\server\\share\\pkg',
      '/etc',
      '..',
      'examples',
      'examples/',
      'examples/reference-cartridge/',
      'examples/reference-cartridge/../broken-cartridge',
      'examples/../../elsewhere',
      'examples\\reference-cartridge',
      'Examples/Reference-Cartridge',
      ' examples/reference-cartridge',
      resolve(appRoot, 'examples', 'reference-cartridge'),
      '',
    ]) {
      assert.throws(() => shellPackageDir(dir, appRoot), /bundled packages/, dir);
    }
  });

  it('refuses non-strings', () => {
    for (const dir of [undefined, null, 42, ['examples/reference-cartridge'], { toString: () => 'examples/reference-cartridge' }]) {
      assert.throws(() => shellPackageDir(dir, appRoot), /bundled packages/);
    }
  });
});
