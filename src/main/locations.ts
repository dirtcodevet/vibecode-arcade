import { app } from 'electron';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

/** Folder that bundled examples are resolved against (repo root in dev). */
export function appRoot(): string {
  return app.isPackaged ? process.resourcesPath : app.getAppPath();
}

/** Package folders may be absolute, or relative to the app root. */
export function resolvePackageDir(dir: string): string {
  return resolve(appRoot(), dir);
}

export function preloadPath(): string {
  return join(__dirname, '../preload/index.js');
}

const rendererFile = join(__dirname, '../renderer/index.html');

/** The dev server URL under `electron-vite dev`, otherwise the built file. */
export function rendererEntry(): { url: string } | { file: string } {
  const devUrl = process.env.ELECTRON_RENDERER_URL;
  return !app.isPackaged && devUrl ? { url: devUrl } : { file: rendererFile };
}

export function isRendererUrl(url: string): boolean {
  const entry = rendererEntry();
  if ('url' in entry) return safeOrigin(url) === safeOrigin(entry.url);
  return url.split('#')[0] === pathToFileURL(entry.file).href;
}

function safeOrigin(url: string): string | null {
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}
