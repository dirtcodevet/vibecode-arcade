// Maps an arcade-game:// request path to a file in a package's web/ folder.
// Kept free of Electron imports so it can be tested with plain Node.

import { realpath } from 'node:fs/promises';
import { join } from 'node:path';
import { isWithin, resolveInside } from '../framework/loader.ts';
import { WEB_FOLDER } from '../framework/rules.ts';

/**
 * Returns the real path of the requested file, or null (→ 404) unless it is a
 * regular file whose real path is inside the package's real web/ folder, which
 * itself must be inside the package.
 */
export async function resolveWebAsset(packageRoot: string, urlPathname: string): Promise<string | null> {
  let relPath: string;
  try {
    relPath = decodeURIComponent(urlPathname.replace(/^\//, ''));
  } catch {
    return null;
  }
  const webRoot = await realWebFolder(packageRoot);
  return webRoot === null ? null : resolveInside(webRoot, relPath);
}

async function realWebFolder(packageRoot: string): Promise<string | null> {
  try {
    const root = await realpath(packageRoot);
    const web = await realpath(join(root, WEB_FOLDER));
    return isWithin(root, web) ? web : null;
  } catch {
    return null;
  }
}
