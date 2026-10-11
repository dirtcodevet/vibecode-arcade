// Which admitted packages the arcade-game:// protocol may serve. A package is
// mounted only by a successful web launch, keyed by its slug (the URL host).

import { WEB_FOLDER } from '../framework/rules.ts';

export const GAME_SCHEME = 'arcade-game';

const mounts = new Map<string, string>();

export function mountWeb(slug: string, packageRoot: string): void {
  mounts.set(slug, packageRoot);
}

export function mountedRoot(slug: string): string | undefined {
  return mounts.get(slug);
}

export function isMounted(slug: string): boolean {
  return mounts.has(slug);
}

/** `web/index.html` in package `star-garden` → `arcade-game://star-garden/index.html`. */
export function webUrl(slug: string, buildPath: string): string {
  const inside = buildPath.startsWith(WEB_FOLDER) ? buildPath.slice(WEB_FOLDER.length) : buildPath;
  const encoded = inside.split('/').map(encodeURIComponent).join('/');
  return `${GAME_SCHEME}://${slug}/${encoded}`;
}
