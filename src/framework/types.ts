// The package contract. Pure TypeScript with no host imports, so a later
// Rust/Tauri supervisor can reimplement exactly the same shapes.

/** Every platform a package may ship a build for. */
export const PLATFORMS = ['web', 'linux', 'windows', 'darwin', 'android', 'ios'] as const;
export type Platform = (typeof PLATFORMS)[number];

/** Desktop operating systems the shell itself runs on. */
export const HOSTS = ['windows', 'darwin', 'linux'] as const;
export type Host = (typeof HOSTS)[number];

/** Build paths keyed by platform, each relative to the package root. */
export type Builds = Partial<Record<Platform, string>>;

/** The contents of a package's arcade.json. Nothing more, nothing less. */
export interface Manifest {
  slug: string;
  title: string;
  maker: string;
  tagline: string;
  license: string;
  prompt: string;
  sourceUrl: string;
  builds: Builds;
  remixOf: string | null;
}

/** Every top-level manifest field, in display order. All are required. */
export const MANIFEST_FIELDS = [
  'slug',
  'title',
  'maker',
  'tagline',
  'license',
  'prompt',
  'sourceUrl',
  'builds',
  'remixOf',
] as const satisfies readonly (keyof Manifest)[];

export type RuleId =
  | 'identity'
  | 'free'
  | 'provenance'
  | 'bring-a-build'
  | 'path-jail'
  | 'remix'
  | 'shape';

export interface Violation {
  rule: RuleId;
  reason: string;
}

export interface Admission {
  ok: boolean;
  violations: Violation[];
}

/** What the shell should do to start a package on a given host. */
export type LaunchPlan =
  | { kind: 'native'; platform: Host; path: string }
  | { kind: 'web'; path: string }
  | { kind: 'unavailable'; reason: string };

/** Relative paths of package files known to exist on disk. */
export type FileSet = ReadonlySet<string>;
