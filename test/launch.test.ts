import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { hostFromNodePlatform, resolveLaunch } from '../src/framework/launch.ts';
import { HOSTS, type Builds, type Manifest } from '../src/framework/types.ts';
import { REFERENCE_FILES, referenceManifest } from './helpers.ts';

const ALL_BUILDS: Builds = {
  web: 'web/index.html',
  linux: 'linux/run.sh',
  windows: 'windows/game.exe',
  darwin: 'darwin/Game.app/Contents/MacOS/Game',
  android: 'android/game.apk',
  ios: 'ios/game.ipa',
};

function withBuilds(builds: Builds): Manifest {
  return { ...referenceManifest(), builds };
}

describe('resolveLaunch', () => {
  it('prefers the native build for this host over the web build', () => {
    for (const host of HOSTS) {
      const plan = resolveLaunch(withBuilds(ALL_BUILDS), host, Object.values(ALL_BUILDS));
      assert.deepEqual(plan, { kind: 'native', platform: host, path: ALL_BUILDS[host] });
    }
  });

  it('falls back to the web build when there is no native build for this host', () => {
    assert.deepEqual(resolveLaunch(referenceManifest(), 'windows', REFERENCE_FILES), {
      kind: 'web',
      path: 'web/index.html',
    });
    assert.deepEqual(resolveLaunch(referenceManifest(), 'darwin', REFERENCE_FILES), {
      kind: 'web',
      path: 'web/index.html',
    });
  });

  it('launches the reference cartridge natively on Linux', () => {
    assert.deepEqual(resolveLaunch(referenceManifest(), 'linux', REFERENCE_FILES), {
      kind: 'native',
      platform: 'linux',
      path: 'linux/run.sh',
    });
  });

  it('falls back to web when the native build is declared but missing', () => {
    const manifest = withBuilds({ web: 'web/index.html', windows: 'windows/game.exe' });
    assert.equal(resolveLaunch(manifest, 'windows', ['web/index.html']).kind, 'web');
  });

  it('is unavailable when neither a native nor a web build exists, naming what is missing', () => {
    const manifest = withBuilds({ windows: 'windows/game.exe', web: 'web/index.html' });
    const plan = resolveLaunch(manifest, 'windows', []);
    assert.equal(plan.kind, 'unavailable');
    assert.ok(plan.kind === 'unavailable');
    assert.match(plan.reason, /windows build or a web build/);
    assert.match(plan.reason, /windows\/game\.exe/);
    assert.match(plan.reason, /web\/index\.html/);
  });

  it('is unavailable on a desktop with only other desktops’ builds, listing what it ships', () => {
    const manifest = withBuilds({ darwin: ALL_BUILDS.darwin });
    const plan = resolveLaunch(manifest, 'linux', [ALL_BUILDS.darwin!]);
    assert.ok(plan.kind === 'unavailable');
    assert.match(plan.reason, /linux build or a web build/);
    assert.match(plan.reason, /ships only darwin/);
  });

  it('never chooses android or ios builds', () => {
    const phoneOnly = withBuilds({ android: ALL_BUILDS.android, ios: ALL_BUILDS.ios });
    const files = [ALL_BUILDS.android!, ALL_BUILDS.ios!];
    for (const host of HOSTS) {
      const plan = resolveLaunch(phoneOnly, host, files);
      assert.ok(plan.kind === 'unavailable', host);
      assert.match(plan.reason, /never launches Android or iOS/);
    }
    const withWeb = withBuilds({ android: ALL_BUILDS.android, ios: ALL_BUILDS.ios, web: ALL_BUILDS.web });
    for (const host of HOSTS) {
      assert.deepEqual(resolveLaunch(withWeb, host, [...files, ALL_BUILDS.web!]), {
        kind: 'web',
        path: 'web/index.html',
      });
    }
  });

  it('ignores an unsafe native path even if the caller lists it as present', () => {
    const manifest = withBuilds({ windows: '../escape/game.exe', web: 'web/index.html' });
    const plan = resolveLaunch(manifest, 'windows', ['../escape/game.exe', 'web/index.html']);
    assert.equal(plan.kind, 'web');
  });
});

describe('hostFromNodePlatform', () => {
  it('maps Node platforms to shell hosts', () => {
    assert.equal(hostFromNodePlatform('win32'), 'windows');
    assert.equal(hostFromNodePlatform('darwin'), 'darwin');
    assert.equal(hostFromNodePlatform('linux'), 'linux');
    assert.equal(hostFromNodePlatform('freebsd'), null);
  });
});
