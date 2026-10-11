// The host's package service: read + admit, and launch. No Electron imports, so
// the "rejected packages never launch" guarantee is testable with plain Node.

import { resolveLaunch } from '../framework/launch.ts';
import { readPackage } from '../framework/loader.ts';
import type { Host, Manifest } from '../framework/types.ts';
import type { LaunchResult, PackageReport } from '../shared/bridge.ts';
import { spawnNative } from './native.ts';
import { mountWeb, webUrl } from './web-mounts.ts';

export async function loadPackageReport(dir: string): Promise<PackageReport> {
  const { manifest, admission } = await readPackage(dir);
  return { manifest, admission };
}

export interface LaunchOptions {
  host: Host;
  /** Starts a native build; injectable for tests. */
  startNative?: (packageRoot: string, buildPath: string) => Promise<LaunchResult>;
}

/**
 * Re-reads the package from disk and re-runs admission every time. A package
 * that fails admission gets its violations back and nothing else happens.
 */
export async function launchPackage(
  dir: string,
  { host, startNative = spawnNative }: LaunchOptions,
): Promise<LaunchResult> {
  const pkg = await readPackage(dir);
  if (!pkg.admission.ok) return { kind: 'rejected', violations: pkg.admission.violations };

  // Admission checked every field's presence and type, so this is a Manifest.
  const manifest = pkg.manifest as Manifest;
  const plan = resolveLaunch(manifest, host, pkg.files);
  switch (plan.kind) {
    case 'native':
      return startNative(pkg.root, plan.path);
    case 'web':
      mountWeb(manifest.slug, pkg.root);
      return {
        kind: 'web',
        url: webUrl(manifest.slug, plan.path),
        slug: manifest.slug,
        title: manifest.title,
      };
    case 'unavailable':
      return { kind: 'unavailable', reason: plan.reason };
  }
}
