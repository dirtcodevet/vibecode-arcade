// The host-side pieces that need no Electron: the package service, the
// arcade-game:// file resolver, native spawn guards, and MIME types.

import assert from 'node:assert/strict';
import { realpath } from 'node:fs/promises';
import { join } from 'node:path';
import { after, before, describe, it } from 'node:test';
import type { LaunchResult } from '../src/shared/bridge.ts';
import { mimeType } from '../src/main/mime.ts';
import { spawnNative } from '../src/main/native.ts';
import { launchPackage, loadPackageReport } from '../src/main/packages.ts';
import { resolveWebAsset } from '../src/main/web-assets.ts';
import { isMounted, mountedRoot, webUrl } from '../src/main/web-mounts.ts';
import { makeSandbox, writePackage, type Sandbox } from './fixtures.ts';
import { BROKEN_DIR, REFERENCE_DIR } from './helpers.ts';

let sandbox: Sandbox;
before(async () => {
  sandbox = await makeSandbox();
});
after(() => sandbox.cleanup());

function recordingStarter() {
  const calls: [string, string][] = [];
  const start = async (root: string, path: string): Promise<LaunchResult> => {
    calls.push([root, path]);
    return { kind: 'native', path, pid: 1234 };
  };
  return { calls, start };
}

describe('launchPackage', () => {
  it('launches the reference cartridge as web on Windows and mounts only it', async () => {
    const native = recordingStarter();
    const result = await launchPackage(REFERENCE_DIR, { host: 'windows', startNative: native.start });
    assert.deepEqual(result, {
      kind: 'web',
      url: 'arcade-game://reference-cartridge/index.html',
      slug: 'reference-cartridge',
      title: 'Reference Cartridge',
    });
    assert.equal(native.calls.length, 0);
    assert.equal(mountedRoot('reference-cartridge'), await realpath(REFERENCE_DIR));
  });

  it('starts the native Linux build from the real package root', async () => {
    const native = recordingStarter();
    const result = await launchPackage(REFERENCE_DIR, { host: 'linux', startNative: native.start });
    assert.equal(result.kind, 'native');
    assert.deepEqual(native.calls, [[await realpath(REFERENCE_DIR), 'linux/run.sh']]);
  });

  it('returns the violations of a rejected package and launches nothing', async () => {
    for (const host of ['windows', 'darwin', 'linux'] as const) {
      const native = recordingStarter();
      const result = await launchPackage(BROKEN_DIR, { host, startNative: native.start });
      assert.equal(result.kind, 'rejected');
      assert.ok(result.kind === 'rejected');
      assert.deepEqual(new Set(result.violations.map((v) => v.rule)), new Set(['free', 'path-jail', 'shape']));
      assert.equal(native.calls.length, 0);
      assert.equal(isMounted('broken-cartridge'), false);
    }
  });

  it('is unavailable when the host has neither a native nor a web build', async () => {
    const dir = await writePackage(sandbox, 'phone-only', { android: 'android/game.apk' });
    const result = await launchPackage(dir, { host: 'windows' });
    assert.ok(result.kind === 'unavailable');
    assert.match(result.reason, /windows build or a web build/);
    assert.equal(isMounted('phone-only'), false);
  });

  it('loadPackageReport returns the manifest and admission', async () => {
    const report = await loadPackageReport(REFERENCE_DIR);
    assert.equal(report.admission.ok, true);
    assert.equal((report.manifest as { slug: string }).slug, 'reference-cartridge');
  });
});

describe('resolveWebAsset (arcade-game:// files)', () => {
  it('serves files from the package web/ folder', async () => {
    assert.equal(
      await resolveWebAsset(REFERENCE_DIR, '/index.html'),
      await realpath(join(REFERENCE_DIR, 'web', 'index.html')),
    );
  });

  it('404s anything outside web/, however it is spelled', async () => {
    for (const pathname of [
      '/',
      '/../arcade.json',
      '/%2e%2e/arcade.json',
      '/..%2farcade.json',
      '/..%5carcade.json',
      '/%2e%2e%2f%2e%2e%2fbroken-cartridge/arcade.json',
      '/C:%5cWindows%5cwin.ini',
      '/missing.js',
      '/%zz',
    ]) {
      assert.equal(await resolveWebAsset(REFERENCE_DIR, pathname), null, pathname);
    }
  });

  it('404s when web/ itself links outside the package', async () => {
    await sandbox.write('elsewhere/index.html', '<p>outside</p>');
    await sandbox.write('linked-web/arcade.json', '{}');
    await sandbox.linkDir('linked-web/web', join(sandbox.dir, 'elsewhere'));
    assert.equal(await resolveWebAsset(join(sandbox.dir, 'linked-web'), '/index.html'), null);
  });
});

describe('spawnNative', () => {
  it('refuses a build path that does not resolve inside the package', async () => {
    const result = await spawnNative(REFERENCE_DIR, '../broken-cartridge/web/index.html');
    assert.equal(result.kind, 'error');
  });
});

describe('webUrl and mimeType', () => {
  it('maps a web build path to an arcade-game URL rooted at web/', () => {
    assert.equal(webUrl('star-garden', 'web/index.html'), 'arcade-game://star-garden/index.html');
    assert.equal(webUrl('star-garden', 'web/my game/index.html'), 'arcade-game://star-garden/my%20game/index.html');
  });

  it('serves correct MIME types', () => {
    assert.equal(mimeType('index.html'), 'text/html; charset=utf-8');
    assert.equal(mimeType('game.JS'), 'text/javascript; charset=utf-8');
    assert.equal(mimeType('game.wasm'), 'application/wasm');
    assert.equal(mimeType('game.pck'), 'application/octet-stream');
  });
});
