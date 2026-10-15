/** Mirrors catalog/game.schema.json. These are the only fields arcade.json allows. */

export const LICENSES = [
  'MIT',
  'Apache-2.0',
  'BSD-2-Clause',
  'BSD-3-Clause',
  'ISC',
  'MPL-2.0',
  'GPL-3.0-only',
  'GPL-3.0-or-later',
  'AGPL-3.0-only',
  'Unlicense',
  'CC0-1.0',
] as const

export type License = (typeof LICENSES)[number]

export const PLATFORMS = ['web', 'windows', 'darwin', 'linux', 'android', 'ios'] as const

export type Platform = (typeof PLATFORMS)[number]

export const PLATFORM_LABEL: Record<Platform, string> = {
  web: 'Web',
  windows: 'Windows',
  darwin: 'macOS',
  linux: 'Linux',
  android: 'Android',
  ios: 'iOS',
}

/** At least one build, keyed by platform. Each value is a path relative to the package root. */
export type Builds = Partial<Record<Platform, string>>

export interface ArcadeManifest {
  slug: string
  title: string
  maker: string
  tagline: string
  license: License
  prompt: string
  sourceUrl: string
  builds: Builds
  remixOf: string | null
}

export const GENRES = ['Cozy', 'Action', 'Puzzle', 'Space', 'Racing', 'Exploration', 'Pixel', 'Stealth'] as const

export type Genre = (typeof GENRES)[number]

/** A manifest plus the storefront-only fields this preview needs to draw a listing. */
export interface Listing extends ArcadeManifest {
  /** Path under reveal/public. Omitted for catalog games without painted key art. */
  art?: string
  artAlt: string
  /** CSS object-position, so tight crops keep the subject in frame. */
  focus?: string
  genres: Genre[]
  /** Engine + model, e.g. "Godot + Grok". */
  madeWith: string
  /** For remixes: what changed from the parent. */
  remixNote?: string
  /** Preview-only painted listings. Real catalog games leave this unset. */
  example?: boolean
  /** Same-origin path to a playable web build, for real listings. */
  playUrl?: string
}

export const LICENSE_NOTE: Record<License, { kind: string; copyleft: boolean }> = {
  MIT: { kind: 'Permissive', copyleft: false },
  'Apache-2.0': { kind: 'Permissive, with a patent grant', copyleft: false },
  'BSD-2-Clause': { kind: 'Permissive', copyleft: false },
  'BSD-3-Clause': { kind: 'Permissive', copyleft: false },
  ISC: { kind: 'Permissive', copyleft: false },
  'MPL-2.0': { kind: 'File-level copyleft', copyleft: true },
  'GPL-3.0-only': { kind: 'Copyleft', copyleft: true },
  'GPL-3.0-or-later': { kind: 'Copyleft', copyleft: true },
  'AGPL-3.0-only': { kind: 'Network copyleft', copyleft: true },
  Unlicense: { kind: 'Public domain', copyleft: false },
  'CC0-1.0': { kind: 'Public domain', copyleft: false },
}
