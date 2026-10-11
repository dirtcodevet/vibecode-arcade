// ARCADE_SMOKE=1: drive the real window end to end, log results as JSON, save
// screenshots to .work/smoke/, and return a process exit code.

import type { BrowserWindow } from 'electron';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { Host } from '../framework/types.ts';
import type { LaunchResult, PackageReport } from '../shared/bridge.ts';
import { BROKEN_CARTRIDGE, EXAMPLE_PACKAGES, REFERENCE_CARTRIDGE, type ExamplePackage } from '../shared/examples.ts';
import { appRoot, resolvePackageDir } from './locations.ts';
import { launchPackage, loadPackageReport } from './packages.ts';
import { isMounted } from './web-mounts.ts';

const STEP_TIMEOUT_MS = 15_000;

interface PackageRun {
  dir: string;
  report: PackageReport;
  launch: LaunchResult;
}

export async function runSmoke(win: BrowserWindow, host: Host): Promise<number> {
  // Attach before the page finishes loading so startup errors (e.g. CSP) count.
  const consoleErrors: string[] = [];
  win.webContents.on('console-message', ({ level, message }) => {
    if (level === 'error') consoleErrors.push(message);
  });
  const outDir = join(appRoot(), '.work', 'smoke');
  await mkdir(outDir, { recursive: true });
  const checks: Record<string, boolean> = {};

  await loaded(win);
  await shown(win);
  await waitFor(win, `document.querySelector('[data-screen="arcade"]') !== null`);
  checks.statusShowsZeroGames = await evaluate<boolean>(
    win,
    `document.querySelector('[data-status]')?.textContent.includes('0 games') ?? false`,
  );
  await capture(win, join(outDir, 'arcade.png'));

  const runs = new Map<string, PackageRun>();
  for (const example of EXAMPLE_PACKAGES) {
    const dir = resolvePackageDir(example.dir);
    const report = await loadPackageReport(dir);
    const launch = await launchPackage(dir, { host });
    const run = { dir: example.dir, report, launch };
    runs.set(example.dir, run);
    log({ step: 'package', ...run });
  }

  await evaluate(win, `location.hash = '#deal'`);
  await waitFor(win, `document.querySelector('[data-screen="deal"]') !== null`);
  await capture(win, join(outDir, 'deal.png'));

  await evaluate(win, `location.hash = '#rules'`);
  await waitFor(win, `document.querySelector('[data-admission]')?.dataset.admission === 'pass'`);
  await capture(win, join(outDir, 'rules.png'));

  // The UI path for a rejected package: pick it, press Launch, see the refusal.
  await selectPackage(win, BROKEN_CARTRIDGE, 'fail');
  await evaluate(win, `document.querySelector('[data-action="launch"]').click()`);
  await waitFor(win, `document.querySelector('[data-launch="rejected"]') !== null`);
  await evaluate(win, `document.querySelector('[data-launch]').scrollIntoView({ block: 'end' })`);
  checks.uiRefusedBroken = await evaluate<boolean>(win, `document.querySelector('[data-game-frame]') === null`);
  await capture(win, join(outDir, 'rules-broken.png'));

  await selectPackage(win, REFERENCE_CARTRIDGE, 'pass');
  await evaluate(win, `document.querySelector('[data-action="launch"]').click()`);
  await waitFor(win, `document.querySelector('[data-game-frame]')?.dataset.loaded === 'true'`);
  checks.frameIsSandboxed = await evaluate<boolean>(
    win,
    `document.querySelector('[data-game-frame] iframe')?.getAttribute('sandbox') === 'allow-scripts'`,
  );
  // The main process can reach into any frame: toss one more ball through the
  // cartridge's own pointer handler, then read back what the cartridge reports.
  const gameFrame = win.webContents.mainFrame.framesInSubtree.find((frame) =>
    frame.url.startsWith('arcade-game://'),
  );
  await delay(400);
  await gameFrame?.executeJavaScript(
    `document.getElementById('court').dispatchEvent(new PointerEvent('pointerdown', { clientX: innerWidth * 0.6, clientY: innerHeight * 0.5, bubbles: true }))`,
  );
  await delay(700);
  await capture(win, join(outDir, 'launched.png'));
  const cartridgeSays = String(await gameFrame?.executeJavaScript(`document.getElementById('meta').textContent`));
  log({ step: 'cartridge', frameUrl: gameFrame?.url, says: cartridgeSays });
  checks.frameOriginIsOpaque = cartridgeSays.includes('origin: null');
  checks.cartridgeReactsToInput = cartridgeSays.includes('balls tossed: 3');

  const reference = runs.get(REFERENCE_CARTRIDGE.dir);
  const broken = runs.get(BROKEN_CARTRIDGE.dir);
  checks.referenceAdmitted = reference?.report.admission.ok === true;
  checks.referenceLaunchedWeb = reference?.launch.kind === 'web';
  checks.brokenRejected = broken?.report.admission.ok === false;
  checks.brokenNotLaunched = broken?.launch.kind === 'rejected' && !isMounted('broken-cartridge');
  checks.noConsoleErrors = consoleErrors.length === 0;

  const passed = Object.values(checks).every(Boolean);
  log({ step: 'verdict', passed, checks, consoleErrors, screenshots: outDir });
  return passed ? 0 : 1;
}

function log(entry: object): void {
  console.log(`[smoke] ${JSON.stringify(entry, null, 2)}`);
}

async function selectPackage(win: BrowserWindow, pkg: ExamplePackage, expected: 'pass' | 'fail'): Promise<void> {
  await evaluate(
    win,
    `[...document.querySelectorAll('.segmented button')].find((b) => b.textContent === ${JSON.stringify(pkg.label)}).click()`,
  );
  await waitFor(win, `document.querySelector('[data-admission]')?.dataset.admission === '${expected}'`);
}

function shown(win: BrowserWindow): Promise<void> {
  if (win.isVisible()) return Promise.resolve();
  return new Promise((resolve) => win.once('show', () => resolve()));
}

function loaded(win: BrowserWindow): Promise<void> {
  const contents = win.webContents;
  if (!contents.isLoading()) return Promise.resolve();
  return new Promise((resolve) => contents.once('did-finish-load', () => resolve()));
}

function evaluate<T = unknown>(win: BrowserWindow, script: string): Promise<T> {
  return win.webContents.executeJavaScript(script) as Promise<T>;
}

async function waitFor(win: BrowserWindow, condition: string): Promise<void> {
  const deadline = Date.now() + STEP_TIMEOUT_MS;
  while (Date.now() < deadline) {
    if (await evaluate<boolean>(win, `Boolean(${condition})`)) return;
    await delay(100);
  }
  throw new Error(`Timed out waiting for: ${condition}`);
}

async function capture(win: BrowserWindow, file: string): Promise<void> {
  // Let React commit and the compositor paint before grabbing pixels.
  await evaluate(win, 'new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)))');
  await delay(250);
  const image = await win.webContents.capturePage();
  if (image.isEmpty()) throw new Error(`Captured an empty image for ${file}`);
  await writeFile(file, image.toPNG());
  log({ step: 'screenshot', file });
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
