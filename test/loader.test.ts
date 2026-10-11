import assert from 'node:assert/strict';
import { realpath } from 'node:fs/promises';
import { join } from 'node:path';
import { after, before, describe, it } from 'node:test';
import { isWithin, readPackage, resolveInside } from '../src/framework/loader.ts';
import { makeSandbox, writePackage, type Sandbox } from './fixtures.ts';
import { BROKEN_DIR, REFERENCE_DIR, referenceManifest } from './helpers.ts';

let sandbox: Sandbox;
before(async () => {
  sandbox = await makeSandbox();
});
after(() => sandbox.cleanup());

describe('readPackage', () => {
  it('reads and admits the reference cartridge from disk', async () => {
    const pkg = await readPackage(REFERENCE_DIR);
    assert.equal(pkg.root, await realpath(REFERENCE_DIR));
    assert.deepEqual([...pkg.files].sort(), ['linux/run.sh', 'web/index.html']);
    assert.deepEqual(pkg.admission, { ok: true, violations: [] });
  });

  it('rejects the broken cartridge and never counts its escaping path as a file', async () => {
    const pkg = await readPackage(BROKEN_DIR);
    assert.equal(pkg.admission.ok, false);
    assert.deepEqual([...pkg.files], ['web/index.html']);
    assert.deepEqual(new Set(pkg.admission.violations.map((v) => v.rule)), new Set(['free', 'path-jail', 'shape']));
  });

  it('reports a missing folder, missing manifest, or invalid JSON under shape', async () => {
    await sandbox.write('no-manifest/web/index.html', '<p>hi</p>');
    await sandbox.write('bad-json/arcade.json', '{ "slug": ');
    for (const [dir, pattern] of [
      [join(sandbox.dir, 'does-not-exist'), /not found/],
      [join(sandbox.dir, 'no-manifest'), /arcade\.json is missing/],
      [join(sandbox.dir, 'bad-json'), /not valid JSON/],
    ] as const) {
      const pkg = await readPackage(dir);
      assert.equal(pkg.manifest, null);
      assert.equal(pkg.admission.ok, false);
      assert.equal(pkg.admission.violations[0].rule, 'shape');
      assert.match(pkg.admission.violations[0].reason, pattern);
    }
  });

  it('flags a declared build that is not on disk', async () => {
    const dir = await writePackage(sandbox, 'missing-build', { web: 'web/index.html' });
    await sandbox.write('missing-build/arcade.json', {
      ...referenceManifest(),
      slug: 'missing-build',
      builds: { web: 'web/index.html', windows: 'windows/game.exe' },
    });
    const pkg = await readPackage(dir);
    assert.deepEqual(pkg.admission.violations.map((v) => v.rule), ['bring-a-build']);
    assert.match(pkg.admission.violations[0].reason, /windows\/game\.exe/);
  });

  it('does not count a file reached through a link that leaves the package', async () => {
    await sandbox.write('outside/web/index.html', '<p>smuggled</p>');
    await sandbox.write('linked/arcade.json', {
      ...referenceManifest(),
      slug: 'linked',
      builds: { web: 'web/index.html' },
    });
    await sandbox.linkDir('linked/web', join(sandbox.dir, 'outside', 'web'));

    const pkg = await readPackage(join(sandbox.dir, 'linked'));
    assert.equal(pkg.files.size, 0);
    assert.deepEqual(pkg.admission.violations.map((v) => v.rule), ['bring-a-build']);
    assert.equal(await resolveInside(join(sandbox.dir, 'linked'), 'web/index.html'), null);
  });
});

describe('resolveInside', () => {
  it('resolves a real file inside the package', async () => {
    const resolved = await resolveInside(REFERENCE_DIR, 'web/index.html');
    assert.equal(resolved, await realpath(join(REFERENCE_DIR, 'web', 'index.html')));
  });

  it('refuses directories, missing files, and lexical escapes', async () => {
    assert.equal(await resolveInside(REFERENCE_DIR, 'web'), null);
    assert.equal(await resolveInside(REFERENCE_DIR, 'web/missing.js'), null);
    assert.equal(await resolveInside(REFERENCE_DIR, '../broken-cartridge/arcade.json'), null);
    assert.equal(await resolveInside(join(REFERENCE_DIR, 'web'), '../arcade.json'), null);
  });
});

describe('isWithin', () => {
  it('is true only for paths strictly inside the root', () => {
    const root = join(sandbox.dir, 'pkg');
    assert.equal(isWithin(root, join(root, 'web', 'index.html')), true);
    assert.equal(isWithin(root, join(root, '..dotted', 'x')), true);
    assert.equal(isWithin(root, root), false);
    assert.equal(isWithin(root, join(root, '..', 'other')), false);
    assert.equal(isWithin(root, `${root}-sibling`), false);
  });
});
