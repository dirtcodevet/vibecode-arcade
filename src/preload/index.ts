// The only surface the shell page gets: three calls, no Node, no raw IPC.

import { contextBridge, ipcRenderer } from 'electron';
import { HOST_LABELS, hostFromNodePlatform } from '../framework/launch.ts';
import { IPC_CHANNELS, type ArcadeBridge } from '../shared/bridge.ts';

const host = hostFromNodePlatform(process.platform);

const bridge: ArcadeBridge = {
  getPlatform: () => ({
    platform: process.platform,
    host,
    label: host === null ? process.platform : HOST_LABELS[host],
    arch: process.arch,
    osVersion: process.getSystemVersion(),
  }),
  loadPackage: (dir) => invoke(IPC_CHANNELS.loadPackage, dir),
  launchPackage: (dir) => invoke(IPC_CHANNELS.launchPackage, dir),
};

/** Forwards only a string argument; the main process re-checks everything anyway. */
function invoke(channel: string, dir: unknown) {
  if (typeof dir !== 'string') return Promise.reject(new TypeError('Package folder must be a string.'));
  return ipcRenderer.invoke(channel, dir);
}

contextBridge.exposeInMainWorld('arcade', bridge);
