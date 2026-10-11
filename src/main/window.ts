import { BrowserWindow } from 'electron';
import { preloadPath, rendererEntry } from './locations.ts';

export const GROUND_COLOR = '#12110e';

export function createMainWindow({ smoke = false } = {}): BrowserWindow {
  const win = new BrowserWindow({
    width: 1120,
    height: 740,
    minWidth: 900,
    minHeight: 600,
    title: 'VibeCode Arcade',
    backgroundColor: GROUND_COLOR,
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      preload: preloadPath(),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      spellcheck: false,
      // Smoke runs capture the page while it may be unfocused.
      backgroundThrottling: !smoke,
    },
  });
  win.once('ready-to-show', () => win.show());

  const entry = rendererEntry();
  void ('url' in entry ? win.loadURL(entry.url) : win.loadFile(entry.file));
  return win;
}
