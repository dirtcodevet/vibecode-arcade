import shelfJson from '../../../catalog/shelf.json';
import type { Manifest } from '../../framework/types.ts';

export interface Shelf {
  games: Manifest[];
}

/** The listed games, bundled from catalog/shelf.json. Empty on purpose in v0.1. */
export const shelf: Shelf = shelfJson as Shelf;

export const SHELL_VERSION = '0.1';
