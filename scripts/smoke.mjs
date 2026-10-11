// Runs the built app once in smoke mode (see src/main/smoke.ts) and exits with
// its exit code. Expects `electron-vite build` to have run first.

import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const electron = createRequire(import.meta.url)('electron');

if (!existsSync(join(root, 'out', 'main', 'index.js'))) {
  console.error('smoke: out/main/index.js is missing; run `pnpm build` first.');
  process.exit(1);
}

const env = { ...process.env, ARCADE_SMOKE: '1' };
delete env.ELECTRON_RUN_AS_NODE;

const child = spawn(electron, ['.'], { cwd: root, env, stdio: 'inherit' });
child.on('error', (error) => {
  console.error(`smoke: could not start Electron: ${error.message}`);
  process.exit(1);
});
child.on('exit', (code, signal) => {
  const status = code ?? 1;
  console.log(`smoke: electron exited with ${signal ?? `code ${status}`} → ${status === 0 ? 'PASS' : 'FAIL'}`);
  process.exit(status);
});
