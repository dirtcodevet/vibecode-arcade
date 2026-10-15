import shelfJson from '../../../catalog/shelf.json';
import referenceCartridge from '../../../examples/reference-cartridge/arcade.json';
import type { Manifest } from '../../framework/types.ts';

export interface Shelf {
  games: Manifest[];
}

/** In-repo packages the renderer can bundle. Keys match catalog/shelf.json packageDir values. */
const BUNDLED: Record<string, Manifest> = {
  'examples/reference-cartridge': referenceCartridge as Manifest,
};

function resolveShelf(file: { games: { packageDir: string }[] }): Shelf {
  return {
    games: file.games.map((entry) => {
      const manifest = BUNDLED[entry.packageDir];
      if (!manifest) {
        throw new Error(`Shelf package "${entry.packageDir}" is not bundled in the shell.`);
      }
      return manifest;
    }),
  };
}

/** The listed games, resolved from catalog/shelf.json. Only admitted in-repo packages. */
export const shelf: Shelf = resolveShelf(shelfJson);

export const SHELL_VERSION = '0.1';
