import { app, BrowserWindow, dialog, session } from 'electron';
import { join } from 'node:path';
import { hostFromNodePlatform } from '../framework/launch.ts';
import { registerIpc, trustShellContents } from './ipc.ts';
import { appRoot } from './locations.ts';
import { handleGameProtocol, registerGameScheme } from './protocol.ts';
import { hardenSession, lockNavigation } from './security.ts';
import { runSmoke } from './smoke.ts';
import { createMainWindow } from './window.ts';

const smoke = process.env.ARCADE_SMOKE === '1';
const SMOKE_DEADLINE_MS = 90_000;

registerGameScheme();
if (smoke) {
  app.setPath('userData', join(appRoot(), '.work', 'smoke-profile'));
  // Keep painting and animating even if the smoke window is covered or unfocused.
  app.commandLine.appendSwitch('disable-renderer-backgrounding');
  app.commandLine.appendSwitch('disable-backgrounding-occluded-windows');
  app.commandLine.appendSwitch('disable-features', 'CalculateNativeWinOcclusion');
}

app.on('web-contents-created', (_event, contents) => lockNavigation(contents));

function openWindow(): BrowserWindow {
  const win = createMainWindow({ smoke });
  trustShellContents(win.webContents);
  return win;
}

async function start(): Promise<void> {
  const host = hostFromNodePlatform(process.platform);
  if (host === null) {
    dialog.showErrorBox('VibeCode Arcade', `Unsupported operating system: ${process.platform}`);
    app.exit(1);
    return;
  }
  handleGameProtocol();
  hardenSession(session.defaultSession);
  registerIpc(host);
  const win = openWindow();

  if (smoke) {
    setTimeout(() => {
      console.error('[smoke] deadline exceeded');
      app.exit(1);
    }, SMOKE_DEADLINE_MS).unref();
    const code = await runSmoke(win, host).catch((error: unknown) => {
      console.error('[smoke] failed:', error);
      return 1;
    });
    app.exit(code);
  }
}

app.whenReady().then(start, (error: unknown) => {
  console.error(error);
  app.exit(1);
});

app.on('activate', () => {
  if (app.isReady() && BrowserWindow.getAllWindows().length === 0) openWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
