// The host-side pieces that need no Electron: the package service, the
// arcade-game:// file resolver, native spawn guards, and MIME types.

import assert from 'node:assert/strict';
import { realpath } from 'node:fs/promises';
import { join } from 'node:path';
import { after, before, describe, it } from 'node:test';
import type { LaunchResult } from '../src/shared/bridge.ts';
import { mimeType } from '../src/main/mime.ts';
import { childEnv, nativeFileProblem, spawnNative } from '../src/main/native.ts';
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
      '/%252e%252e/arcade.json',
      '/%2E%2E%2Farcade.json',
      '/%00',
      '/index.html%00.png',
      '/index.html::$DATA',
      '/index.html%3a%3a$DATA',
      '/C:/Windows/win.ini',
      '//127.0.0.1/c$/Windows/win.ini',
      '/%5c%5c127.0.0.1%5cc$%5cWindows%5cwin.ini',
      '/CON',
      '/NUL',
      '/CONIN$',
      '/COM1',
      '/index.html/',
      `/${'a/'.repeat(2000)}index.html`,
    ]) {
      assert.equal(await resolveWebAsset(REFERENCE_DIR, pathname), null, pathname);
    }
  });

  it('404s traversal however the URL parser hands it over', async () => {
    for (const spelling of ['/%2e%2e/arcade.json', '/web/../../arcade.json', '/./../arcade.json']) {
      const { pathname } = new URL(`arcade-game://reference-cartridge${spelling}`);
      assert.equal(await resolveWebAsset(REFERENCE_DIR, pathname), null, spelling);
    }
  });

  it('404s when web/ itself links outside the package', async () => {
    await sandbox.write('elsewhere/index.html', '<p>outside</p>');
    await sandbox.write('linked-web/arcade.json', '{}');
    await sandbox.linkDir('linked-web/web', join(sandbox.dir, 'elsewhere'));
    assert.equal(await resolveWebAsset(join(sandbox.dir, 'linked-web'), '/index.html'), null);
  });

  it('404s a file reached through a link inside web/ that leaves the package', async () => {
    await sandbox.write('secrets/token.txt', 'hunter2');
    await sandbox.write('inner-link/web/index.html', '<p>game</p>');
    await sandbox.linkDir('inner-link/web/assets', join(sandbox.dir, 'secrets'));
    const root = join(sandbox.dir, 'inner-link');
    assert.equal(await resolveWebAsset(root, '/assets/token.txt'), null);
    assert.equal(await resolveWebAsset(root, '/index.html'), await realpath(join(root, 'web', 'index.html')));
  });
});

describe('spawnNative', () => {
  it('refuses a build path that does not resolve inside the package', async () => {
    const result = await spawnNative(REFERENCE_DIR, '../broken-cartridge/web/index.html');
    assert.equal(result.kind, 'error');
  });

  it('refuses anything but an .exe on Windows, before spawning', async () => {
    const dir = await writePackage(sandbox, 'script-build', {
      web: 'web/index.html',
      windows: 'windows/game.bat',
    });
    await sandbox.write('script-build/windows/game.cmd', '@echo off');
    await sandbox.write('script-build/windows/game.png', 'MZ');
    for (const build of ['windows/game.bat', 'windows/game.cmd', 'windows/game.png']) {
      const result = await spawnNative(dir, build, 'win32');
      assert.ok(result.kind === 'error', build);
      assert.match(result.reason, /not an \.exe/);
    }
  });

  it('returns an error instead of throwing when the OS refuses the file', async () => {
    // On Windows, spawning a .bat without a shell throws EINVAL synchronously
    // (CVE-2024-27980); elsewhere the file lacks an executable bit.
    const dir = await writePackage(sandbox, 'refused-build', { windows: 'windows/game.bat' });
    const result = await spawnNative(dir, 'windows/game.bat', 'linux');
    assert.equal(result.kind, 'error');
  });

  it('nativeFileProblem allows .exe on Windows and any file elsewhere', () => {
    assert.equal(nativeFileProblem('C:\\pkg\\windows\\Game.EXE', 'win32'), null);
    assert.notEqual(nativeFileProblem('C:\\pkg\\windows\\game.exe.bat', 'win32'), null);
    assert.notEqual(nativeFileProblem('C:\\pkg\\windows\\game', 'win32'), null);
    assert.equal(nativeFileProblem('/pkg/linux/run.sh', 'linux'), null);
    assert.equal(nativeFileProblem('/pkg/darwin/Game.app/Contents/MacOS/Game', 'darwin'), null);
  });
});

describe('childEnv (native build environment)', () => {
  it('drops the shell runtime switches and credential-named variables', () => {
    const env = childEnv({
      PATH: '/usr/bin',
      SystemRoot: 'C:\\Windows',
      HOME: '/home/player',
      APPDATA: 'C:\\Users\\player\\AppData\\Roaming',
      XAUTHORITY: '/run/user/1000/xauth',
      DISPLAY: ':0',
      LANG: 'en_US.UTF-8',
      NUMBER_OF_PROCESSORS: '8',
      TOKENIZERS_PARALLELISM: 'false',
      KEYBOARD_LAYOUT: 'us',
      NODE_OPTIONS: '--require ./evil.js',
      NODE_EXTRA_CA_CERTS: '/tmp/ca.pem',
      ELECTRON_RUN_AS_NODE: '1',
      npm_config__authToken: 'npm_secret',
      ARCADE_SMOKE: '1',
      GITHUB_TOKEN: 'ghp_x',
      OPENAI_API_KEY: 'sk-x',
      ANTHROPIC_API_KEY: 'sk-ant-x',
      AWS_SECRET_ACCESS_KEY: 'x',
      AWS_SESSION_TOKEN: 'x',
      AZURE_OPENAI_KEY: 'x',
      DB_PASSWORD: 'x',
      CLIENT_SECRET: 'x',
      SSH_AUTH_SOCK: '/tmp/agent.sock',
      EMPTY: undefined,
    });
    assert.deepEqual(Object.keys(env).sort(), [
      'APPDATA',
      'DISPLAY',
      'HOME',
      'KEYBOARD_LAYOUT',
      'LANG',
      'NUMBER_OF_PROCESSORS',
      'PATH',
      'SystemRoot',
      'TOKENIZERS_PARALLELISM',
      'XAUTHORITY',
    ]);
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
