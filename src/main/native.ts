import { spawn } from 'node:child_process';
import { resolveInside } from '../framework/loader.ts';
import type { LaunchResult } from '../shared/bridge.ts';

/**
 * Starts a native build directly: no shell, no argument string, and only after
 * re-checking that the build's real path (symlinks followed) is inside the package.
 */
export async function spawnNative(packageRoot: string, buildPath: string): Promise<LaunchResult> {
  const executable = await resolveInside(packageRoot, buildPath);
  if (executable === null) {
    return {
      kind: 'error',
      reason: `"${buildPath}" does not resolve to a file inside the package, so it was not started.`,
    };
  }

  const child = spawn(executable, [], {
    cwd: packageRoot,
    shell: false,
    detached: true,
    stdio: 'ignore',
  });
  try {
    await new Promise<void>((resolve, reject) => {
      child.once('spawn', resolve);
      child.once('error', reject);
    });
  } catch (error) {
    return { kind: 'error', reason: `Could not start "${buildPath}": ${(error as Error).message}` };
  }
  child.unref();
  return { kind: 'native', path: buildPath, pid: child.pid ?? null };
}
