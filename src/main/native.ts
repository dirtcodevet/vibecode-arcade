import { spawn, type ChildProcess } from 'node:child_process';
import { extname } from 'node:path';
import { resolveInside } from '../framework/loader.ts';
import type { LaunchResult } from '../shared/bridge.ts';

/**
 * Starts a native build directly: no shell, no arguments, a scrubbed
 * environment, and only after re-checking that the build's real path (symlinks
 * followed) is inside the package and is a kind of file this host may run.
 */
export async function spawnNative(
  packageRoot: string,
  buildPath: string,
  platform: NodeJS.Platform = process.platform,
): Promise<LaunchResult> {
  const executable = await resolveInside(packageRoot, buildPath);
  if (executable === null) {
    return {
      kind: 'error',
      reason: `"${buildPath}" does not resolve to a file inside the package, so it was not started.`,
    };
  }
  const problem = nativeFileProblem(executable, platform);
  if (problem !== null) return { kind: 'error', reason: `"${buildPath}" ${problem}, so it was not started.` };

  let child: ChildProcess;
  try {
    // Throws synchronously for some files (e.g. EINVAL for .bat/.cmd on Windows).
    child = spawn(executable, [], {
      cwd: packageRoot,
      env: childEnv(process.env),
      shell: false,
      detached: true,
      stdio: 'ignore',
    });
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

/**
 * Why this host will not run the file, or null. Windows runs only `.exe`
 * (checked on the real path, so a link named game.exe can't point at a .bat).
 * Linux and macOS rely on the executable bit, as the reference cartridge's
 * shell script does.
 */
export function nativeFileProblem(realPath: string, platform: NodeJS.Platform): string | null {
  if (platform === 'win32' && extname(realPath).toLowerCase() !== '.exe') {
    return 'is not an .exe; on Windows the shell starts only executables, never .bat, .cmd, or scripts';
  }
  return null;
}

/** Variables that steer Node/Electron or the shell itself, not the game. */
const SHELL_ONLY = /^(ELECTRON_|NODE_|NPM_|ARCADE_)/i;
/** Names that usually hold credentials. */
const SECRET =
  /(^|_)(TOKEN|SECRETS?|PASSWORD|PASSWD|PASSPHRASE|CREDENTIALS?|API_?KEY|ACCESS_?KEY|PRIVATE_?KEY)(_|$)|_KEY$|^SSH_AUTH_SOCK$/i;

/**
 * The environment a native build starts with: the user's own, minus the
 * shell's runtime switches (NODE_OPTIONS, ELECTRON_RUN_AS_NODE, npm_config_*)
 * and variables named like credentials (GITHUB_TOKEN, OPENAI_API_KEY, ...).
 * A native build still runs with the user's full rights; this only stops the
 * shell from handing it secrets directly.
 */
export function childEnv(env: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  return Object.fromEntries(
    Object.entries(env).filter(([name, value]) => value !== undefined && !SHELL_ONLY.test(name) && !SECRET.test(name)),
  );
}
