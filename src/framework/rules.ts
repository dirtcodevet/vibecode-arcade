// The admission rules. This module is the single source of truth: the Rules
// screen renders RULES, the host calls admit(), and docs/rules.md explains them.
// admit() is pure: it takes a parsed manifest and the relative paths of files
// that exist in the package, and never touches the disk itself.

import { pathProblem } from './paths.ts';
import {
  MANIFEST_FIELDS,
  PLATFORMS,
  type Admission,
  type FileSet,
  type Platform,
  type RuleId,
  type Violation,
} from './types.ts';

export const FREE_LICENSES = [
  'MIT',
  'Apache-2.0',
  'BSD-2-Clause',
  'BSD-3-Clause',
  'ISC',
  'MPL-2.0',
  'GPL-3.0-only',
  'GPL-3.0-or-later',
  'AGPL-3.0-only',
  'Unlicense',
  'CC0-1.0',
] as const;

export const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;
/** Lowercase http(s) scheme followed by a host; the URL must also parse. */
export const SOURCE_URL_PATTERN = /^https?:\/\/[^\s/?#]+/;
export const MIN_PROMPT_LENGTH = 80;
/** Web builds are served only from this folder of the package. */
export const WEB_FOLDER = 'web/';

export interface RuleInfo {
  id: RuleId;
  title: string;
  summary: string;
  /** Optional reference detail shown under the summary (e.g. the license list). */
  detail?: string;
}

type Fields = Record<string, unknown>;

interface Rule extends RuleInfo {
  /** Returns one plain-English reason per problem found; empty means pass. */
  check(fields: Fields, files: FileSet): string[];
}

const RULE_LIST: readonly Rule[] = [
  {
    id: 'identity',
    title: 'Identity',
    summary:
      'A slug of lowercase words joined by single hyphens, plus a title, maker, and tagline that are not blank.',
    check(fields) {
      const reasons: string[] = [];
      const slug = text(fields, 'slug');
      if (slug !== undefined && !SLUG_PATTERN.test(slug)) {
        reasons.push(
          `slug "${slug}" must be lowercase letters and digits in words joined by single hyphens, like "star-garden".`,
        );
      }
      for (const key of ['title', 'maker', 'tagline'] as const) {
        const value = text(fields, key);
        if (value !== undefined && value.trim() === '') reasons.push(`${key} must not be blank.`);
      }
      return reasons;
    },
  },
  {
    id: 'free',
    title: 'Free',
    summary: 'Published under one of the accepted free, open-source licenses.',
    detail: FREE_LICENSES.join(' · '),
    check(fields) {
      const license = text(fields, 'license');
      if (license === undefined || isFreeLicense(license)) return [];
      return [
        `license "${license}" is not on the free-license list (${FREE_LICENSES.join(', ')}).`,
      ];
    },
  },
  {
    id: 'provenance',
    title: 'Provenance',
    summary: `Ships its prompt (${MIN_PROMPT_LENGTH}+ characters on how it was vibecoded) and an http(s) link to the source.`,
    check(fields) {
      const reasons: string[] = [];
      const prompt = text(fields, 'prompt');
      if (prompt !== undefined) {
        const length = Array.from(prompt.trim()).length;
        if (length < MIN_PROMPT_LENGTH) {
          reasons.push(
            `prompt is ${length} characters; write at least ${MIN_PROMPT_LENGTH} — a short paragraph on how the game was vibecoded.`,
          );
        }
      }
      const sourceUrl = text(fields, 'sourceUrl');
      if (sourceUrl !== undefined && !isHttpUrl(sourceUrl)) {
        reasons.push(`sourceUrl "${sourceUrl}" must be an http(s) link to the game's source code.`);
      }
      return reasons;
    },
  },
  {
    id: 'bring-a-build',
    title: 'Bring a build',
    summary:
      'At least one build for any platform, and every declared build file is really in the package. Web builds live in web/.',
    detail: PLATFORMS.join(' · '),
    check(fields, files) {
      if (!isRecord(fields.builds)) return [];
      const builds = declaredBuilds(fields.builds);
      if (builds.length === 0) {
        return [`declare at least one build (${PLATFORMS.join(', ')}); any single platform is enough.`];
      }
      const reasons: string[] = [];
      for (const [platform, path] of builds) {
        if (pathProblem(path) !== null) continue; // path-jail reports it
        if (platform === 'web' && !path.startsWith(WEB_FOLDER)) {
          reasons.push(
            `builds.web "${path}" must live inside the ${WEB_FOLDER} folder; the shell serves web builds only from there.`,
          );
        } else if (!files.has(path)) {
          reasons.push(`builds.${platform} points to "${path}", which is not in the package.`);
        }
      }
      return reasons;
    },
  },
  {
    id: 'path-jail',
    title: 'Path jail',
    summary:
      'Build paths are plain relative paths inside the package: no absolute paths, drives, network shares, URLs, backslashes, empty segments, or "..".',
    check(fields) {
      if (!isRecord(fields.builds)) return [];
      return declaredBuilds(fields.builds).flatMap(([platform, path]) => {
        const problem = pathProblem(path);
        return problem === null ? [] : [`builds.${platform} "${path}" ${problem}.`];
      });
    },
  },
  {
    id: 'remix',
    title: 'Remix',
    summary: 'remixOf is null, or the slug of the game this one grew from.',
    check(fields) {
      const parent = fields.remixOf;
      if (typeof parent !== 'string' || SLUG_PATTERN.test(parent)) return [];
      return [`remixOf "${parent}" must be null or the slug of the game this one remixes.`];
    },
  },
  {
    id: 'shape',
    title: 'Shape',
    summary:
      'Exactly the manifest fields, each with the right type. No price, DRM, or accounts: unknown fields fail.',
    check(fields) {
      return [...unknownFields(fields), ...fieldTypeProblems(fields)];
    },
  },
];

/** Rule descriptions in evaluation order, for display. */
export const RULES: readonly RuleInfo[] = RULE_LIST.map(({ check: _check, ...info }) => info);

/** Checks a parsed arcade.json against every rule. */
export function admit(manifest: unknown, files: Iterable<string>): Admission {
  if (!isRecord(manifest)) {
    return reject([{ rule: 'shape', reason: 'arcade.json must contain a JSON object.' }]);
  }
  const present = new Set(files);
  const violations = RULE_LIST.flatMap((rule) =>
    rule.check(manifest, present).map((reason): Violation => ({ rule: rule.id, reason })),
  );
  return { ok: violations.length === 0, violations };
}

export function reject(violations: Violation[]): Admission {
  return { ok: false, violations };
}

export function isFreeLicense(license: string): boolean {
  return (FREE_LICENSES as readonly string[]).includes(license);
}

function unknownFields(fields: Fields): string[] {
  const allowed: readonly string[] = MANIFEST_FIELDS;
  const reasons = Object.keys(fields)
    .filter((key) => !allowed.includes(key))
    .map((key) => `unknown field "${key}"; arcade.json allows only ${MANIFEST_FIELDS.join(', ')}.`);
  if (isRecord(fields.builds)) {
    const platforms: readonly string[] = PLATFORMS;
    for (const key of Object.keys(fields.builds)) {
      if (!platforms.includes(key)) {
        reasons.push(`unknown build "builds.${key}"; builds may be ${PLATFORMS.join(', ')}.`);
      }
    }
  }
  return reasons;
}

function fieldTypeProblems(fields: Fields): string[] {
  const reasons: string[] = [];
  for (const key of MANIFEST_FIELDS) {
    if (!Object.hasOwn(fields, key)) {
      reasons.push(`missing required field "${key}".`);
      continue;
    }
    const value = fields[key];
    if (key === 'builds') {
      if (!isRecord(value)) {
        reasons.push('builds must be an object mapping platforms to file paths.');
        continue;
      }
      for (const [platform, path] of Object.entries(value)) {
        if (typeof path !== 'string') reasons.push(`builds.${platform} must be a file path string.`);
      }
    } else if (key === 'remixOf') {
      if (value !== null && typeof value !== 'string') {
        reasons.push('remixOf must be null or a slug string.');
      }
    } else if (typeof value !== 'string') {
      reasons.push(`${key} must be a string.`);
    }
  }
  return reasons;
}

/** Known platforms whose build value is a string, in platform order. */
function declaredBuilds(builds: Fields): [Platform, string][] {
  return PLATFORMS.flatMap((platform): [Platform, string][] => {
    const path = builds[platform];
    return Object.hasOwn(builds, platform) && typeof path === 'string' ? [[platform, path]] : [];
  });
}

function text(fields: Fields, key: string): string | undefined {
  const value = fields[key];
  return typeof value === 'string' ? value : undefined;
}

function isRecord(value: unknown): value is Fields {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isHttpUrl(value: string): boolean {
  if (!SOURCE_URL_PATTERN.test(value)) return false;
  try {
    const url = new URL(value);
    return (url.protocol === 'http:' || url.protocol === 'https:') && url.hostname !== '';
  } catch {
    return false;
  }
}
