// Checks on every call that crosses from the shell page into the host. Kept
// free of Electron imports so they can be tested with plain Node.

import { resolve } from 'node:path';
import { EXAMPLE_PACKAGES } from '../shared/examples.ts';

/** The parts of Electron's WebFrameMain the sender check reads. */
export interface SenderFrame {
  readonly parent: unknown;
  readonly url: string;
}

/**
 * True only for the shell page itself: a top-level frame showing the shell's
 * own URL. Game frames live in the same WebContents, so checking the sender
 * WebContents alone is not enough. A frame that is gone (null, or throws when
 * read) is refused.
 */
export function isShellFrame(frame: SenderFrame | null | undefined, isShellUrl: (url: string) => boolean): boolean {
  try {
    return frame != null && frame.parent === null && isShellUrl(frame.url);
  } catch {
    return false;
  }
}

/**
 * The package folder the shell page asked for, resolved against the app root.
 * v0.1 only checks and launches the packages bundled with the shell, so the
 * request must name one of them exactly; any other path (absolute, relative,
 * or climbing out) is refused before the disk is touched.
 */
export function shellPackageDir(dir: unknown, appRoot: string): string {
  const known = typeof dir === 'string' ? EXAMPLE_PACKAGES.find((pkg) => pkg.dir === dir) : undefined;
  if (known === undefined) throw new Error('Refused: the shell can only check and launch its bundled packages.');
  return resolve(appRoot, known.dir);
}
