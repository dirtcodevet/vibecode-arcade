import { app, BrowserWindow } from 'electron';
import { preloadPath, rendererEntry } from './locations.ts';
import { shellWebPreferences } from './security.ts';

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
    webPreferences: shellWebPreferences({ preload: preloadPath(), packaged: app.isPackaged, smoke }),
  });
  win.once('ready-to-show', () => win.show());

  const entry = rendererEntry();
  void ('url' in entry ? win.loadURL(entry.url) : win.loadFile(entry.file));
  return win;
}
