import { ipcMain, type IpcMainInvokeEvent, type WebContents } from 'electron';
import type { Host } from '../framework/types.ts';
import { IPC_CHANNELS } from '../shared/bridge.ts';
import { isRendererUrl, resolvePackageDir } from './locations.ts';
import { launchPackage, loadPackageReport } from './packages.ts';

const trusted = new Set<number>();

/** Only the shell page itself (never a game frame) may call the host. */
export function trustShellContents(contents: WebContents): void {
  trusted.add(contents.id);
  contents.once('destroyed', () => trusted.delete(contents.id));
}

export function registerIpc(host: Host): void {
  ipcMain.handle(IPC_CHANNELS.loadPackage, (event, dir: unknown) =>
    loadPackageReport(packageDir(event, dir)),
  );
  ipcMain.handle(IPC_CHANNELS.launchPackage, (event, dir: unknown) =>
    launchPackage(packageDir(event, dir), { host }),
  );
}

function packageDir(event: IpcMainInvokeEvent, dir: unknown): string {
  const frame = event.senderFrame;
  const fromShell =
    trusted.has(event.sender.id) && frame !== null && frame.parent === null && isRendererUrl(frame.url);
  if (!fromShell) throw new Error('Refused: request did not come from the shell page.');
  if (typeof dir !== 'string' || dir.trim() === '') throw new Error('Package folder must be a non-empty string.');
  return resolvePackageDir(dir);
}
