import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { cp, mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { after, before, describe, it } from 'node:test';
import { promisify } from 'node:util';
import { checkPackage, checkShelf, parseShelf } from '../src/framework/catalog.ts';
import { makeSandbox, writePackage, type Sandbox } from './fixtures.ts';
import { REPO_ROOT, REFERENCE_DIR, referenceManifest } from './helpers.ts';

const execFileAsync = promisify(execFile);

function validateCatalog(args: string[] = []) {
  return execFileAsync(
    process.execPath,
    [
      '--experimental-strip-types',
      '--disable-warning=MODULE_TYPELESS_PACKAGE_JSON',
      join(REPO_ROOT, 'scripts', 'validate-catalog.ts'),
      ...args,
    ],
    { cwd: REPO_ROOT, encoding: 'utf8' },
  );
}

let sandbox: Sandbox;
before(async () => {
  sandbox = await makeSandbox();
});
after(() => sandbox.cleanup());

describe('parseShelf', () => {
  it('accepts an empty catalog', () => {
    const result = parseShelf({ games: [] });
    assert.deepEqual(result, { ok: true, shelf: { games: [] } });
  });

  it('accepts listings that only name an in-repo package folder', () => {
    const result = parseShelf({ games: [{ packageDir: 'examples/reference-cartridge' }] });
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.deepEqual(result.shelf.games, [{ packageDir: 'examples/reference-cartridge' }]);
    }
  });

  it('rejects a missing games array, extra shelf fields, and non-objects', () => {
    for (const data of [null, [], 'shelf', { games: {} }, { games: [], affiliate: 'x' }, { listings: [] }]) {
      const result = parseShelf(data);
      assert.equal(result.ok, false, JSON.stringify(data));
    }
  });

  it('rejects a listing that is not a packageDir object, or that sneaks in a price', () => {
    for (const games of [
      ['examples/reference-cartridge'],
      [{ slug: 'star-garden' }],
      [{ packageDir: 'examples/reference-cartridge', price: 4.99 }],
      [{ packageDir: 'examples/reference-cartridge', affiliateUrl: 'https://example.com/?tag=x' }],
      [{ packageDir: '' }],
      [{ packageDir: 12 }],
    ]) {
      const result = parseShelf({ games });
      assert.equal(result.ok, false, JSON.stringify(games));
    }
  });

  it('rejects duplicate packageDir entries before touching the disk', () => {
    const result = parseShelf({
      games: [{ packageDir: 'examples/a' }, { packageDir: 'examples/a' }],
    });
    assert.equal(result.ok, false);
    if (!result.ok) assert.match(result.issues[0].reason, /duplicate/i);
  });
});

describe('checkShelf', () => {
  it('admits the real catalog: every listed package passes the admission rules', async () => {
    const report = await checkShelf(REPO_ROOT);
    assert.equal(report.ok, true, JSON.stringify(report.issues, null, 2));
    for (const game of report.games) {
      assert.equal(game.manifest.slug.length > 0, true);
      assert.equal(game.manifest.sourceUrl.includes('github.com/example/'), false);
      assert.equal('price' in game.manifest, false);
    }
  });

  it('lists the in-repo reference cartridge and no fictional example.github.com games', async () => {
    const report = await checkShelf(REPO_ROOT);
    assert.equal(report.ok, true, JSON.stringify(report.issues, null, 2));
    assert.ok(
      report.games.some((game) => game.packageDir === 'examples/reference-cartridge'),
      'the only verifiable in-repo game is the reference cartridge',
    );
    assert.equal(
      report.games.some((game) => game.packageDir === 'examples/broken-cartridge'),
      false,
    );
  });

  it('treats an empty shelf as valid', async () => {
    await sandbox.write('empty/catalog/shelf.json', { games: [] });
    const report = await checkShelf(join(sandbox.dir, 'empty'));
    assert.deepEqual(report, { ok: true, issues: [], games: [] });
  });

  it('loads a listed package, admits it, and returns its manifest', async () => {
    const root = join(sandbox.dir, 'one-game');
    await writePackage(
      {
        dir: root,
        write: (rel, contents) => sandbox.write(join('one-game', rel), contents),
        linkDir: (rel, target) => sandbox.linkDir(join('one-game', rel), target),
        cleanup: async () => undefined,
      },
      'examples/star-garden',
      { web: 'web/index.html' },
      { slug: 'star-garden' },
    );
    await sandbox.write('one-game/catalog/shelf.json', { games: [{ packageDir: 'examples/star-garden' }] });

    const report = await checkShelf(root);
    assert.equal(report.ok, true, JSON.stringify(report.issues));
    assert.equal(report.games.length, 1);
    assert.equal(report.games[0].packageDir, 'examples/star-garden');
    assert.equal(report.games[0].manifest.slug, 'star-garden');
  });

  it('fails when a listed package is not admitted', async () => {
    const root = join(sandbox.dir, 'bad-shelf');
    await mkdir(join(root, 'catalog'), { recursive: true });
    await mkdir(join(root, 'examples'), { recursive: true });
    await cp(join(REPO_ROOT, 'examples', 'broken-cartridge'), join(root, 'examples', 'broken-cartridge'), {
      recursive: true,
    });
    await writeFile(
      join(root, 'catalog', 'shelf.json'),
      JSON.stringify({ games: [{ packageDir: 'examples/broken-cartridge' }] }),
    );

    const report = await checkShelf(root);
    assert.equal(report.ok, false);
    assert.ok(report.issues.some((issue) => /free|path-jail|shape/.test(issue.reason) || issue.where.includes('broken')));
  });

  it('fails when two listings share a slug', async () => {
    const root = join(sandbox.dir, 'dup-slug');
    const boxed: Sandbox = {
      dir: root,
      write: (rel, contents) => sandbox.write(join('dup-slug', rel), contents),
      linkDir: (rel, target) => sandbox.linkDir(join('dup-slug', rel), target),
      cleanup: async () => undefined,
    };
    await writePackage(boxed, 'examples/one', { web: 'web/index.html' }, { slug: 'same-game' });
    await writePackage(boxed, 'examples/two', { web: 'web/index.html' }, { slug: 'same-game' });
    await sandbox.write('dup-slug/catalog/shelf.json', {
      games: [{ packageDir: 'examples/one' }, { packageDir: 'examples/two' }],
    });

    const report = await checkShelf(root);
    assert.equal(report.ok, false);
    assert.ok(report.issues.some((issue) => /slug/.test(issue.reason)));
  });

  it('refuses a packageDir that climbs out of the repo', async () => {
    await sandbox.write('escape/catalog/shelf.json', { games: [{ packageDir: '../etc' }] });
    const report = await checkShelf(join(sandbox.dir, 'escape'));
    assert.equal(report.ok, false);
    assert.ok(report.issues.some((issue) => /packageDir|path|inside/i.test(issue.reason)));
  });
});

describe('checkPackage', () => {
  it('admits the reference cartridge from disk', async () => {
    const result = await checkPackage(REFERENCE_DIR);
    assert.equal(result.admission.ok, true);
    assert.equal((result.manifest as { slug: string }).slug, 'reference-cartridge');
  });

  it('rejects a package whose arcade.json breaks the admission rules', async () => {
    const dir = await writePackage(sandbox, 'priced', { web: 'web/index.html' }, { price: 9.99 });
    const result = await checkPackage(dir);
    assert.equal(result.admission.ok, false);
    assert.ok(result.admission.violations.some((v) => v.rule === 'shape'));
  });

  it('the reference manifest is a valid catalog game: not an example.github.com fiction', () => {
    const manifest = referenceManifest();
    assert.equal(manifest.sourceUrl.includes('github.com/example/'), false);
    assert.match(manifest.sourceUrl, /^https:\/\//);
    assert.equal('price' in manifest, false);
  });
});

describe('validate-catalog CLI', () => {
  it('admits the real shelf and prints the reference cartridge', async () => {
    const { stdout } = await validateCatalog();
    assert.match(stdout, /1 game admitted/);
    assert.match(stdout, /reference-cartridge/);
  });

  it('admits a package folder passed as an argument', async () => {
    const { stdout } = await validateCatalog(['examples/reference-cartridge']);
    assert.match(stdout, /admitted reference-cartridge/);
  });

  it('ignores a literal -- so pnpm run forwarding does not look like a package folder', async () => {
    const { stdout } = await validateCatalog(['--', 'examples/reference-cartridge']);
    assert.match(stdout, /admitted reference-cartridge/);
    assert.doesNotMatch(stdout, /failed admission/);
  });

  it('rejects the broken cartridge when checked as a package', async () => {
    await assert.rejects(() => validateCatalog(['examples/broken-cartridge']), (error: NodeJS.ErrnoException & { stderr: string }) => {
      assert.match(error.stderr, /failed admission/);
      return true;
    });
  });
});
