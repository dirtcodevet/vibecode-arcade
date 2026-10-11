import { ipcMain, type IpcMainInvokeEvent, type WebContents } from 'electron';
import type { Host } from '../framework/types.ts';
import { IPC_CHANNELS } from '../shared/bridge.ts';
import { isShellFrame, shellPackageDir } from './ipc-guards.ts';
import { appRoot, isRendererUrl } from './locations.ts';
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
  if (!trusted.has(event.sender.id) || !isShellFrame(event.senderFrame, isRendererUrl)) {
    throw new Error('Refused: request did not come from the shell page.');
  }
  return shellPackageDir(dir, appRoot());
}
