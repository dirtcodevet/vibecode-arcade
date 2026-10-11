import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Manifest, RuleId } from '../src/framework/types.ts';

export const REPO_ROOT = fileURLToPath(new URL('..', import.meta.url));
export const REFERENCE_DIR = join(REPO_ROOT, 'examples', 'reference-cartridge');
export const BROKEN_DIR = join(REPO_ROOT, 'examples', 'broken-cartridge');
export const REFERENCE_FILES = ['web/index.html', 'linux/run.sh'];

export function readJson(...segments: string[]): unknown {
  return JSON.parse(readFileSync(join(REPO_ROOT, ...segments), 'utf8'));
}

/** A fresh, mutable copy of the reference cartridge's manifest. */
export function referenceManifest(): Manifest & Record<string, unknown> {
  return readJson('examples', 'reference-cartridge', 'arcade.json') as Manifest & Record<string, unknown>;
}

type Mutable = Record<string, unknown> & { builds: Record<string, unknown> };

export interface Mutation {
  rule: RuleId;
  name: string;
  mutate: (manifest: Mutable) => void;
  /** Files present in the package; defaults to REFERENCE_FILES. */
  files?: string[];
  /** False when only the disk can tell (a declared file is missing). */
  schemaDetects?: boolean;
}

/** One deliberate break per case; each must trip exactly the named rule. */
export const MUTATIONS: readonly Mutation[] = [
  { rule: 'identity', name: 'slug with capitals and underscore', mutate: (m) => (m.slug = 'Star_Garden') },
  { rule: 'identity', name: 'slug with a double hyphen', mutate: (m) => (m.slug = 'star--garden') },
  { rule: 'identity', name: 'slug with a trailing hyphen', mutate: (m) => (m.slug = 'star-garden-') },
  { rule: 'identity', name: 'blank title', mutate: (m) => (m.title = '   ') },
  { rule: 'identity', name: 'empty maker', mutate: (m) => (m.maker = '') },
  { rule: 'identity', name: 'blank tagline', mutate: (m) => (m.tagline = '\n\t') },
  { rule: 'free', name: 'proprietary license', mutate: (m) => (m.license = 'Proprietary') },
  { rule: 'free', name: 'license ids are case-sensitive SPDX', mutate: (m) => (m.license = 'mit') },
  { rule: 'free', name: 'non-commercial license', mutate: (m) => (m.license = 'CC-BY-NC-4.0') },
  { rule: 'provenance', name: 'prompt too short', mutate: (m) => (m.prompt = 'Made it with AI.') },
  {
    rule: 'provenance',
    name: 'prompt padded with whitespace to look long',
    mutate: (m) => (m.prompt = `   ${'x'.repeat(79)}${' '.repeat(40)}`),
  },
  { rule: 'provenance', name: 'source is not http(s)', mutate: (m) => (m.sourceUrl = 'ftp://example.com/game') },
  { rule: 'provenance', name: 'source is not a URL', mutate: (m) => (m.sourceUrl = 'github.com/someone/game') },
  { rule: 'bring-a-build', name: 'no builds at all', mutate: (m) => (m.builds = {}) },
  {
    rule: 'bring-a-build',
    name: 'declared windows build is missing',
    mutate: (m) => (m.builds.windows = 'windows/game.exe'),
    schemaDetects: false,
  },
  {
    rule: 'bring-a-build',
    name: 'web build outside web/',
    mutate: (m) => (m.builds.web = 'index.html'),
    files: ['index.html', 'linux/run.sh'],
  },
  { rule: 'path-jail', name: 'build climbs out with ..', mutate: (m) => (m.builds.linux = '../escape/run.sh') },
  { rule: 'path-jail', name: 'absolute windows build path', mutate: (m) => (m.builds.windows = 'C:\\Games\\game.exe') },
  { rule: 'remix', name: 'remixOf is not a slug', mutate: (m) => (m.remixOf = 'Some Other Game') },
  { rule: 'shape', name: 'unknown price field', mutate: (m) => (m.price = 4.99) },
  { rule: 'shape', name: 'unknown drm field', mutate: (m) => (m.drm = true) },
  { rule: 'shape', name: 'unknown build platform', mutate: (m) => (m.builds.switch = 'switch/game.nsp') },
  { rule: 'shape', name: 'missing tagline', mutate: (m) => delete m.tagline },
  { rule: 'shape', name: 'missing remixOf', mutate: (m) => delete m.remixOf },
  { rule: 'shape', name: 'title is a number', mutate: (m) => (m.title = 42) },
  { rule: 'shape', name: 'remixOf is a number', mutate: (m) => (m.remixOf = 7) },
  { rule: 'shape', name: 'builds is a string', mutate: (m) => (m.builds = 'web/index.html' as never) },
  { rule: 'shape', name: 'build path is an array', mutate: (m) => (m.builds.web = ['web/index.html']) },
];

export function mutated(mutation: Mutation): Record<string, unknown> {
  const manifest = referenceManifest() as unknown as Mutable;
  mutation.mutate(manifest);
  return manifest;
}

/** Paths that must never pass the jail. */
export const ESCAPING_PATHS = [
  '../x',
  '/etc/x',
  'C:\\x',
  '\\\\server\\x',
  'web/../../x',
  'https://x',
  'file:///x',
  'C:/x',
  'c:x',
  '//server/x',
  'web\\..\\x',
  'web\\index.html',
  '..',
  'web/..',
  './web/index.html',
  'web/./index.html',
  '...',
  'web//index.html',
  'web/',
  '',
  'web/index.html:stream',
  'javascript:alert(1)',
  'data:text/html,hi',
  'web/\u0000index.html',
  'web/index.html\n',
];

/** Plain relative paths that must pass the jail. */
export const SAFE_PATHS = [
  'web/index.html',
  'linux/run.sh',
  'windows/game.exe',
  'darwin/Game.app/Contents/MacOS/Game',
  'android/game.apk',
  'ios/game.ipa',
  'web/.well-known/info.txt',
  'web/my game/index.html',
  'web/..hidden/file.js',
  'web/v1.2/index.html',
];
