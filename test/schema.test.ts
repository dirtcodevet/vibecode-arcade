import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import Ajv2020 from 'ajv/dist/2020.js';
import { pathProblem } from '../src/framework/paths.ts';
import { admit, FREE_LICENSES, SLUG_PATTERN, SOURCE_URL_PATTERN } from '../src/framework/rules.ts';
import { MANIFEST_FIELDS, PLATFORMS } from '../src/framework/types.ts';
import {
  ESCAPING_PATHS,
  MUTATIONS,
  mutated,
  readJson,
  REFERENCE_FILES,
  referenceManifest,
  SAFE_PATHS,
} from './helpers.ts';

interface Schema {
  required: string[];
  properties: Record<string, { enum?: string[]; pattern?: string; properties?: Record<string, unknown> }>;
  $defs: Record<string, { pattern: string }>;
}

const schema = readJson('catalog', 'game.schema.json') as Schema;
const validate = new Ajv2020({ allErrors: true, strict: true }).compile(schema);
const shelfSchema = readJson('catalog', 'shelf.schema.json') as {
  additionalProperties: boolean;
  required: string[];
  properties: { games: { items: { additionalProperties: boolean; required: string[] } } };
};
const validateShelf = new Ajv2020({ allErrors: true, strict: true }).compile(shelfSchema);

describe('catalog/game.schema.json agrees with the rules module', () => {
  it('accepts the reference manifest, which the rules also admit', () => {
    const manifest = referenceManifest();
    assert.equal(validate(manifest), true, JSON.stringify(validate.errors));
    assert.equal(admit(manifest, REFERENCE_FILES).ok, true);
  });

  it('requires exactly the manifest fields and allows no others', () => {
    assert.deepEqual(schema.required, [...MANIFEST_FIELDS]);
    assert.deepEqual(Object.keys(schema.properties).sort(), [...MANIFEST_FIELDS].sort());
    assert.equal((schema as unknown as { additionalProperties: boolean }).additionalProperties, false);
  });

  it('allows exactly the platforms as build keys', () => {
    assert.deepEqual(Object.keys(schema.properties.builds.properties ?? {}).sort(), [...PLATFORMS].sort());
  });

  it('uses the same license list and patterns as the rules', () => {
    assert.deepEqual(schema.properties.license.enum, [...FREE_LICENSES]);
    assert.equal(new RegExp(schema.$defs.slug.pattern).source, SLUG_PATTERN.source);
    assert.equal(new RegExp(schema.properties.sourceUrl.pattern ?? '').source, SOURCE_URL_PATTERN.source);
  });

  it('rejects every mutation the rules reject without looking at the disk', () => {
    for (const mutation of MUTATIONS) {
      if (mutation.schemaDetects === false) continue;
      const manifest = mutated(mutation);
      assert.equal(admit(manifest, mutation.files ?? REFERENCE_FILES).ok, false, mutation.name);
      assert.equal(validate(manifest), false, `schema should reject: ${mutation.name}`);
    }
  });

  it('agrees with the path jail on which build paths are safe', () => {
    for (const path of [...ESCAPING_PATHS, ...SAFE_PATHS]) {
      const manifest = { ...referenceManifest(), builds: { linux: path } };
      assert.equal(validate(manifest), pathProblem(path) === null, JSON.stringify(path));
    }
  });
});

describe('catalog/shelf.schema.json', () => {
  it('accepts the real shelf and forbids extra fields', () => {
    const shelf = readJson('catalog', 'shelf.json');
    assert.equal(validateShelf(shelf), true, JSON.stringify(validateShelf.errors));
    assert.equal(shelfSchema.additionalProperties, false);
    assert.equal(shelfSchema.properties.games.items.additionalProperties, false);
    assert.deepEqual(shelfSchema.required, ['games']);
    assert.deepEqual(shelfSchema.properties.games.items.required, ['packageDir']);
  });

  it('rejects a priced listing', () => {
    assert.equal(validateShelf({ games: [{ packageDir: 'examples/reference-cartridge', price: 1 }] }), false);
  });
});
