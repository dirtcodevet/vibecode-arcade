// The public catalog: catalog/shelf.json names in-repo packages. Admission
// still lives in rules.ts; this module only loads the shelf and runs admit()
// on each listed arcade.json. No Electron imports.

import { readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { isWithin, readPackage } from './loader.ts';
import { pathProblem } from './paths.ts';
import type { Admission, Manifest } from './types.ts';

export const SHELF_FILE = 'catalog/shelf.json';

export interface ShelfEntry {
  packageDir: string;
}

export interface ShelfFile {
  games: ShelfEntry[];
}

export interface CatalogIssue {
  where: string;
  reason: string;
}

export interface CatalogGame {
  packageDir: string;
  manifest: Manifest;
}

export interface CatalogReport {
  ok: boolean;
  issues: CatalogIssue[];
  games: CatalogGame[];
}

export interface PackageCheck {
  manifest: unknown;
  admission: Admission;
}

type Fields = Record<string, unknown>;

/** Structural check of shelf.json. Does not read packages from disk. */
export function parseShelf(data: unknown): { ok: true; shelf: ShelfFile } | { ok: false; issues: CatalogIssue[] } {
  if (!isRecord(data)) {
    return fail('catalog/shelf.json', 'must be a JSON object with a games array.');
  }
  const extra = Object.keys(data).filter((key) => key !== 'games');
  if (extra.length > 0) {
    return fail(
      'catalog/shelf.json',
      `unknown field "${extra[0]}"; the shelf allows only games. No prices, DRM, or affiliate links.`,
    );
  }
  if (!Array.isArray(data.games)) {
    return fail('catalog/shelf.json', 'games must be an array of { packageDir } listings.');
  }

  const issues: CatalogIssue[] = [];
  const seen = new Set<string>();
  const games: ShelfEntry[] = [];

  data.games.forEach((entry, index) => {
    const where = `games[${index}]`;
    if (!isRecord(entry)) {
      issues.push({ where, reason: 'each listing must be an object with packageDir.' });
      return;
    }
    const unknown = Object.keys(entry).filter((key) => key !== 'packageDir');
    if (unknown.length > 0) {
      issues.push({
        where,
        reason: `unknown field "${unknown[0]}"; listings only name a packageDir. No prices or affiliate fields.`,
      });
    }
    const packageDir = entry.packageDir;
    if (typeof packageDir !== 'string' || packageDir.trim() === '') {
      issues.push({ where, reason: 'packageDir must be a non-empty path relative to the repo root.' });
      return;
    }
    if (seen.has(packageDir)) {
      issues.push({ where, reason: `duplicate packageDir "${packageDir}".` });
      return;
    }
    seen.add(packageDir);
    games.push({ packageDir });
  });

  return issues.length > 0 ? { ok: false, issues } : { ok: true, shelf: { games } };
}

/** Reads catalog/shelf.json from repoRoot and admits every listed package. */
export async function checkShelf(repoRoot: string): Promise<CatalogReport> {
  const root = resolve(repoRoot);
  const shelfPath = join(root, SHELF_FILE);
  let source: string;
  try {
    source = await readFile(shelfPath, 'utf8');
  } catch {
    return {
      ok: false,
      issues: [{ where: SHELF_FILE, reason: `${SHELF_FILE} is missing.` }],
      games: [],
    };
  }

  let data: unknown;
  try {
    data = JSON.parse(source.replace(/^\uFEFF/, ''));
  } catch (error) {
    return {
      ok: false,
      issues: [{ where: SHELF_FILE, reason: `not valid JSON (${(error as Error).message}).` }],
      games: [],
    };
  }

  const parsed = parseShelf(data);
  if (!parsed.ok) return { ok: false, issues: parsed.issues, games: [] };

  const issues: CatalogIssue[] = [];
  const games: CatalogGame[] = [];
  const slugs = new Map<string, string>();

  for (const { packageDir } of parsed.shelf.games) {
    const where = packageDir;
    const pathIssue = packageDirProblem(root, packageDir);
    if (pathIssue) {
      issues.push({ where, reason: pathIssue });
      continue;
    }

    const pkg = await readPackage(join(root, packageDir));
    if (!pkg.admission.ok) {
      for (const violation of pkg.admission.violations) {
        issues.push({ where, reason: `${violation.rule}: ${violation.reason}` });
      }
      continue;
    }

    const manifest = pkg.manifest as Manifest;
    const earlier = slugs.get(manifest.slug);
    if (earlier) {
      issues.push({
        where,
        reason: `slug "${manifest.slug}" is already used by ${earlier}.`,
      });
      continue;
    }
    slugs.set(manifest.slug, packageDir);
    games.push({ packageDir, manifest });
  }

  return { ok: issues.length === 0, issues, games };
}

/** Admits one package folder (a game repo root that contains arcade.json). */
export async function checkPackage(dir: string): Promise<PackageCheck> {
  const pkg = await readPackage(dir);
  return { manifest: pkg.manifest, admission: pkg.admission };
}

function packageDirProblem(repoRoot: string, packageDir: string): string | null {
  const lexical = pathProblem(packageDir);
  if (lexical) return `packageDir "${packageDir}" ${lexical}.`;
  const absolute = resolve(repoRoot, packageDir);
  if (!isWithin(repoRoot, absolute)) {
    return `packageDir "${packageDir}" must stay inside the repository.`;
  }
  return null;
}

function fail(where: string, reason: string): { ok: false; issues: CatalogIssue[] } {
  return { ok: false, issues: [{ where, reason }] };
}

function isRecord(value: unknown): value is Fields {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
