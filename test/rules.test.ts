import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { admit, FREE_LICENSES, RULES } from '../src/framework/rules.ts';
import type { RuleId } from '../src/framework/types.ts';
import { MUTATIONS, mutated, readJson, REFERENCE_FILES, referenceManifest } from './helpers.ts';

const RULE_IDS: RuleId[] = ['identity', 'free', 'provenance', 'bring-a-build', 'path-jail', 'remix', 'shape'];

describe('admit: accept', () => {
  it('admits the reference cartridge', () => {
    assert.deepEqual(admit(referenceManifest(), REFERENCE_FILES), { ok: true, violations: [] });
  });

  it('accepts the file list as an array or a set', () => {
    assert.equal(admit(referenceManifest(), new Set(REFERENCE_FILES)).ok, true);
  });

  it('counts any single platform as bringing a build, phones included', () => {
    const manifest = { ...referenceManifest(), builds: { android: 'android/game.apk' } };
    assert.equal(admit(manifest, ['android/game.apk']).ok, true);
  });

  it('accepts every license on the free list', () => {
    for (const license of FREE_LICENSES) {
      assert.equal(admit({ ...referenceManifest(), license }, REFERENCE_FILES).ok, true, license);
    }
  });

  it('accepts a remix of a slug that is not on the local shelf', () => {
    assert.equal(admit({ ...referenceManifest(), remixOf: 'some-parent-game' }, REFERENCE_FILES).ok, true);
  });
});

describe('admit: reject', () => {
  for (const mutation of MUTATIONS) {
    it(`${mutation.rule}: ${mutation.name}`, () => {
      const result = admit(mutated(mutation), mutation.files ?? REFERENCE_FILES);
      assert.equal(result.ok, false);
      assert.deepEqual(
        [...new Set(result.violations.map((v) => v.rule))],
        [mutation.rule],
        `expected only ${mutation.rule}, got ${JSON.stringify(result.violations)}`,
      );
      for (const { reason } of result.violations) {
        assert.ok(reason.length > 15 && /\s/.test(reason), `reason should be a sentence: ${reason}`);
      }
    });
  }

  it('has at least one rejecting case for every rule id', () => {
    assert.deepEqual(new Set(MUTATIONS.map((m) => m.rule)), new Set(RULE_IDS));
  });

  it('rejects manifests that are not JSON objects under shape', () => {
    for (const manifest of [null, [], 'arcade', 42, undefined]) {
      const result = admit(manifest, []);
      assert.equal(result.ok, false);
      assert.deepEqual(result.violations.map((v) => v.rule), ['shape']);
    }
  });

  it('names the offending value in the reason', () => {
    const result = admit({ ...referenceManifest(), license: 'Proprietary', price: 1 }, REFERENCE_FILES);
    assert.match(result.violations.find((v) => v.rule === 'free')!.reason, /"Proprietary"/);
    assert.match(result.violations.find((v) => v.rule === 'shape')!.reason, /"price"/);
  });

  it('rejects the broken cartridge for its license, escaping path, and price field', () => {
    const result = admit(readJson('examples', 'broken-cartridge', 'arcade.json'), ['web/index.html']);
    assert.equal(result.ok, false);
    assert.deepEqual(new Set(result.violations.map((v) => v.rule)), new Set(['free', 'path-jail', 'shape']));
  });

  it('reports every problem at once, in rule order', () => {
    const result = admit(
      { ...referenceManifest(), slug: 'Bad Slug', license: 'Proprietary', extra: true },
      REFERENCE_FILES,
    );
    assert.deepEqual(result.violations.map((v) => v.rule), ['identity', 'free', 'shape']);
  });
});

describe('RULES', () => {
  it('describes the seven rules in evaluation order', () => {
    assert.deepEqual(RULES.map((rule) => rule.id), RULE_IDS);
  });

  it('gives every rule a title and summary for the Rules screen', () => {
    for (const rule of RULES) {
      assert.ok(rule.title.length > 0 && rule.summary.length > 20, rule.id);
      assert.equal('check' in rule, false, 'display info must not leak the checker');
    }
  });
});
