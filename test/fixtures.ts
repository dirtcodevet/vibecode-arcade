// Throwaway package folders on disk for loader and host tests.

import { mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { referenceManifest } from './helpers.ts';

export interface Sandbox {
  dir: string;
  /** Writes a file (creating folders); `arcade.json` values are JSON-encoded. */
  write(relPath: string, contents: unknown): Promise<string>;
  /** Directory link that works without admin rights on Windows (a junction). */
  linkDir(relPath: string, target: string): Promise<void>;
  cleanup(): Promise<void>;
}

export async function makeSandbox(): Promise<Sandbox> {
  const dir = await mkdtemp(join(tmpdir(), 'arcade-test-'));
  return {
    dir,
    async write(relPath, contents) {
      const file = join(dir, relPath);
      await mkdir(dirname(file), { recursive: true });
      await writeFile(file, typeof contents === 'string' ? contents : JSON.stringify(contents, null, 2));
      return file;
    },
    async linkDir(relPath, target) {
      const link = join(dir, relPath);
      await mkdir(dirname(link), { recursive: true });
      await symlink(target, link, 'junction');
    },
    cleanup: () => rm(dir, { recursive: true, force: true }),
  };
}

/** A minimal valid package: reference manifest with the given builds, files written. */
export async function writePackage(
  sandbox: Sandbox,
  name: string,
  builds: Record<string, string>,
  extra: Record<string, unknown> = {},
): Promise<string> {
  await sandbox.write(join(name, 'arcade.json'), { ...referenceManifest(), slug: name, builds, ...extra });
  for (const path of Object.values(builds)) await sandbox.write(join(name, path), `build ${path}`);
  return join(sandbox.dir, name);
}
