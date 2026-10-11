// Reads a package folder from disk into the inputs the pure rules take: the
// parsed manifest plus the set of declared build files that really exist inside
// the package. Also holds the disk half of the path jail (realpath checks), so
// symlinks and junctions cannot smuggle a file in from outside the package.

import { readFile, realpath, stat } from 'node:fs/promises';
import { isAbsolute, join, relative, resolve, sep } from 'node:path';
import { pathProblem } from './paths.ts';
import { admit, reject } from './rules.ts';
import type { Admission } from './types.ts';

export const MANIFEST_FILE = 'arcade.json';

export interface LoadedPackage {
  /** Real (symlink-resolved) absolute path of the package folder. */
  root: string;
  /** Parsed arcade.json, or null if it could not be read or parsed. */
  manifest: unknown;
  /** Declared build paths that exist as regular files inside the package. */
  files: Set<string>;
  admission: Admission;
}

export async function readPackage(dir: string): Promise<LoadedPackage> {
  const requested = resolve(dir);
  const root = await realDirectory(requested);
  if (root === null) return unreadable(requested, `package folder "${dir}" was not found.`);

  let source: string;
  try {
    source = await readFile(join(root, MANIFEST_FILE), 'utf8');
  } catch {
    return unreadable(root, `${MANIFEST_FILE} is missing from the package folder.`);
  }

  let manifest: unknown;
  try {
    manifest = JSON.parse(source.replace(/^﻿/, ''));
  } catch (error) {
    return unreadable(root, `${MANIFEST_FILE} is not valid JSON (${(error as Error).message}).`);
  }

  const files = new Set<string>();
  for (const path of declaredPaths(manifest)) {
    if ((await resolveInside(root, path)) !== null) files.add(path);
  }
  return { root, manifest, files, admission: admit(manifest, files) };
}

/**
 * Resolves a manifest-style relative path to a real absolute file path, or
 * null unless it passes the lexical jail, exists as a regular file, and its
 * real path (after following every symlink) is still inside `root`.
 */
export async function resolveInside(root: string, relPath: string): Promise<string | null> {
  if (pathProblem(relPath) !== null) return null;
  try {
    const realRoot = await realpath(root);
    const target = await realpath(join(realRoot, ...relPath.split('/')));
    if (!isWithin(realRoot, target)) return null;
    return (await stat(target)).isFile() ? target : null;
  } catch {
    return null;
  }
}

/** True if `target` is strictly inside `root` (both absolute, already real). */
export function isWithin(root: string, target: string): boolean {
  const rel = relative(root, target);
  return rel !== '' && rel !== '..' && !rel.startsWith(`..${sep}`) && !isAbsolute(rel);
}

async function realDirectory(path: string): Promise<string | null> {
  try {
    const real = await realpath(path);
    return (await stat(real)).isDirectory() ? real : null;
  } catch {
    return null;
  }
}

function declaredPaths(manifest: unknown): string[] {
  if (typeof manifest !== 'object' || manifest === null) return [];
  const builds = (manifest as Record<string, unknown>).builds;
  if (typeof builds !== 'object' || builds === null || Array.isArray(builds)) return [];
  return Object.values(builds).filter((path): path is string => typeof path === 'string');
}

function unreadable(root: string, reason: string): LoadedPackage {
  return { root, manifest: null, files: new Set(), admission: reject([{ rule: 'shape', reason }]) };
}
