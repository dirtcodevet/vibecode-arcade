// The contract between the shell UI and its host process. The Electron
// preload implements it today; a Tauri host would implement the same three calls.

import type { Admission, Host, Violation } from '../framework/types.ts';

export interface PlatformInfo {
  /** Node-style platform id, e.g. "win32". */
  platform: string;
  host: Host | null;
  /** Human label, e.g. "Windows". */
  label: string;
  arch: string;
  osVersion: string;
}

export interface PackageReport {
  /** The parsed arcade.json (unvalidated unless admission.ok), or null if unreadable. */
  manifest: unknown;
  admission: Admission;
}

export type LaunchResult =
  | { kind: 'web'; url: string; slug: string; title: string }
  | { kind: 'native'; path: string; pid: number | null }
  | { kind: 'rejected'; violations: Violation[] }
  | { kind: 'unavailable'; reason: string }
  | { kind: 'error'; reason: string };

export interface ArcadeBridge {
  getPlatform(): PlatformInfo;
  loadPackage(dir: string): Promise<PackageReport>;
  launchPackage(dir: string): Promise<LaunchResult>;
}

export const IPC_CHANNELS = {
  loadPackage: 'arcade:load-package',
  launchPackage: 'arcade:launch-package',
} as const;
