import type { ArcadeBridge } from '../../shared/bridge.ts';

declare global {
  interface Window {
    /** Exposed by the preload script; the shell's only way to reach the host. */
    readonly arcade: ArcadeBridge;
  }
}

export {};
