import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { isSafeRelativePath, pathProblem } from '../src/framework/paths.ts';
import { admit } from '../src/framework/rules.ts';
import { ESCAPING_PATHS, REFERENCE_FILES, referenceManifest, SAFE_PATHS } from './helpers.ts';

describe('path jail', () => {
  for (const path of ESCAPING_PATHS) {
    it(`rejects ${JSON.stringify(path)}`, () => {
      const problem = pathProblem(path);
      assert.notEqual(problem, null);
      assert.equal(isSafeRelativePath(path), false);

      const manifest = { ...referenceManifest(), builds: { web: 'web/index.html', linux: path } };
      const jail = admit(manifest, [...REFERENCE_FILES, path]).violations.filter((v) => v.rule === 'path-jail');
      assert.equal(jail.length, 1);
      assert.ok(jail[0].reason.includes(problem!), jail[0].reason);
    });
  }

  for (const path of SAFE_PATHS) {
    it(`allows ${JSON.stringify(path)}`, () => {
      assert.equal(pathProblem(path), null);
    });
  }

  it('explains each kind of escape in plain English', () => {
    assert.match(pathProblem('../x')!, /"\.\."/);
    assert.match(pathProblem('/etc/x')!, /absolute path/);
    assert.match(pathProblem('C:\\x')!, /Windows/);
    assert.match(pathProblem('\\\\server\\x')!, /network/);
    assert.match(pathProblem('https://x')!, /URL/);
    assert.match(pathProblem('file:///x')!, /URL/);
    assert.match(pathProblem('web\\index.html')!, /backslash/);
    assert.match(pathProblem('web//index.html')!, /empty folder name/);
  });
});
