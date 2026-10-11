// Decides how to start an admitted package on a given desktop host. Pure: it
// takes the manifest and the relative paths of files that exist in the package.

import { isSafeRelativePath } from './paths.ts';
import { PLATFORMS, type Host, type LaunchPlan, type Manifest } from './types.ts';

export const HOST_LABELS: Readonly<Record<Host, string>> = {
  windows: 'Windows',
  darwin: 'macOS',
  linux: 'Linux',
};

/** Maps Node's process.platform to a shell host, or null if unsupported. */
export function hostFromNodePlatform(platform: string): Host | null {
  switch (platform) {
    case 'win32':
      return 'windows';
    case 'darwin':
      return 'darwin';
    case 'linux':
      return 'linux';
    default:
      return null;
  }
}

/**
 * Launch order: the native build for this host, then the web build, otherwise
 * unavailable. Android and iOS builds are never launched by the desktop shell.
 */
export function resolveLaunch(manifest: Manifest, host: Host, files: Iterable<string>): LaunchPlan {
  const present = new Set(files);
  const exists = (path: string | undefined): path is string =>
    path !== undefined && isSafeRelativePath(path) && present.has(path);

  const native = manifest.builds[host];
  if (exists(native)) return { kind: 'native', platform: host, path: native };

  const web = manifest.builds.web;
  if (exists(web)) return { kind: 'web', path: web };

  return { kind: 'unavailable', reason: unavailableReason(manifest, host) };
}

function unavailableReason(manifest: Manifest, host: Host): string {
  const needs = `Can't start this on ${HOST_LABELS[host]}: it needs a ${host} build or a web build`;
  const missing = ([host, 'web'] as const)
    .filter((platform) => manifest.builds[platform] !== undefined)
    .map((platform) => `builds.${platform} "${manifest.builds[platform]}" is missing`);
  if (missing.length > 0) return `${needs}, and ${missing.join(' and ')}.`;

  const shipped = PLATFORMS.filter((platform) => manifest.builds[platform] !== undefined);
  const phoneOnly = shipped.length > 0 && shipped.every((p) => p === 'android' || p === 'ios');
  const ships = shipped.length > 0 ? `this package ships only ${shipped.join(', ')}` : 'this package ships no builds';
  return phoneOnly
    ? `${needs}, and ${ships}. The desktop shell never launches Android or iOS builds; phones play the web build.`
    : `${needs}, and ${ships}.`;
}
