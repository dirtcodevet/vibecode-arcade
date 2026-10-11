// The arcade-game:// scheme. It serves files from the web/ folder of packages
// that were admitted and launched, and nothing else.

import { protocol } from 'electron';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { Readable } from 'node:stream';
import { mimeType } from './mime.ts';
import { resolveWebAsset } from './web-assets.ts';
import { GAME_SCHEME, mountedRoot } from './web-mounts.ts';

const GAME_HEADERS = {
  'cache-control': 'no-store',
  'x-content-type-options': 'nosniff',
  // Game frames are sandboxed without allow-same-origin, so their origin is
  // opaque; this lets them fetch their own assets (wasm, data packs).
  'access-control-allow-origin': '*',
  'cross-origin-resource-policy': 'cross-origin',
};

/** Must run before the app is ready. */
export function registerGameScheme(): void {
  protocol.registerSchemesAsPrivileged([
    {
      scheme: GAME_SCHEME,
      privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, stream: true },
    },
  ]);
}

export function handleGameProtocol(): void {
  protocol.handle(GAME_SCHEME, async (request) => {
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return plain(405, 'Method not allowed');
    }
    const url = new URL(request.url);
    const root = mountedRoot(url.hostname);
    const file = root === undefined ? null : await resolveWebAsset(root, url.pathname);
    if (file === null) return plain(404, 'Not found');

    const { size } = await stat(file);
    const body =
      request.method === 'HEAD' ? null : (Readable.toWeb(createReadStream(file)) as ReadableStream);
    return new Response(body, {
      status: 200,
      headers: { ...GAME_HEADERS, 'content-type': mimeType(file), 'content-length': String(size) },
    });
  });
}

function plain(status: number, message: string): Response {
  return new Response(message, {
    status,
    headers: { ...GAME_HEADERS, 'content-type': 'text/plain; charset=utf-8' },
  });
}
