# Framework

The shell is split so the parts that define "what a package is" can outlive the
current host. Everything in `src/framework/` is plain TypeScript with no Electron
imports. A later Rust/Tauri supervisor reimplements the same contract, and these
files and their tests are the spec it follows.

```
src/framework/   the contract: types, admission rules, launch order, path jail, disk loader
src/shared/      the bridge contract between UI and host (three calls) + bundled example list
src/main/        Electron host: window, arcade-game:// protocol, IPC, native spawn, smoke run
src/preload/     contextBridge: exposes exactly the three bridge calls
src/renderer/    React UI: Arcade, The Deal, Rules, game frame, status line
catalog/         shelf.json (the listings, empty) and game.schema.json (manifest schema)
examples/        reference-cartridge (passes) and broken-cartridge (fails on purpose)
```

## Package layout

A package is a folder with an `arcade.json` and whatever builds it brings:

```
star-garden/
  arcade.json
  web/index.html            ← builds.web (must live in web/)
  web/game.wasm             ← anything else the web build loads
  linux/run.sh              ← builds.linux
  windows/game.exe          ← builds.windows
  darwin/Game.app/Contents/MacOS/Game   ← builds.darwin
  android/game.apk          ← builds.android (listed, never launched by the desktop shell)
  ios/game.ipa              ← builds.ios     (listed, never launched by the desktop shell)
```

Only declared builds matter. Folder names other than `web/` are a convention,
not a rule.

## Manifest fields

| Field | Type | Notes |
| --- | --- | --- |
| `slug` | string | `^[a-z0-9]+(-[a-z0-9]+)*$`; also the `arcade-game://` host |
| `title` | string | not blank |
| `maker` | string | not blank |
| `tagline` | string | not blank |
| `license` | string | one of the free SPDX ids in [rules.md](rules.md#free) |
| `prompt` | string | ≥ 80 characters trimmed; how it was vibecoded |
| `sourceUrl` | string | `http(s)://` link to the source |
| `builds` | object | optional keys `web`, `linux`, `windows`, `darwin`, `android`, `ios`; at least one; values are relative file paths |
| `remixOf` | `null` \| string | parent slug, or `null` |

There are no other fields: no price, DRM, account, or anything else. Unknown
fields fail admission. The machine-readable version is
[`catalog/game.schema.json`](../catalog/game.schema.json).

## Pure functions and the loader

| Module | Function | Pure? |
| --- | --- | --- |
| `rules.ts` | `admit(manifest, files)` → `{ ok, violations }` | yes |
| `launch.ts` | `resolveLaunch(manifest, host, files)` → launch plan | yes |
| `paths.ts` | `pathProblem(path)` → reason or `null` | yes |
| `loader.ts` | `readPackage(dir)` → `{ root, manifest, files, admission }` | reads disk |
| `loader.ts` | `resolveInside(root, relPath)` → real path or `null` | reads disk |

`files` is the set of relative paths known to exist. The loader builds it by
checking each declared build path. A path is included only if it passes the
lexical jail, exists as a regular file, and its real path is inside the package.
Tests can therefore call the pure functions with plain arrays.

## Launch order

`resolveLaunch(manifest, host, files)`, with `host` being `windows`, `darwin`,
or `linux` (mapped from Node's `win32` / `darwin` / `linux`):

1. **Native build for this host**, if its file exists → `{ kind: 'native', path }`
2. **Web build**, if its file exists → `{ kind: 'web', path }`
3. Otherwise → `{ kind: 'unavailable', reason }`, where the reason names what's
   missing (for example "needs a windows build or a web build, and this package
   ships only android, ios").

Android and iOS builds are never launched by the desktop shell. They're listed
artifacts; phones play the web build.

Launching always starts over. The host re-reads the package from disk, re-runs
`admit`, and only then resolves a plan. A package that fails admission gets its
violations back (`{ kind: 'rejected', violations }`), and nothing is mounted or
spawned.

## Path jail

Two layers, both required:

1. **Lexical** (`paths.ts`, rule `path-jail`): the manifest path has to be a
   plain relative path. No absolute, drive, UNC, URL, backslash, colon, empty,
   or dot-only segments.
2. **On disk** (`loader.ts`): before reading or running anything, the host
   resolves the real path with `fs.realpath`, following symlinks and Windows
   junctions, and checks that it is strictly inside the package's real root.
   A link that points outside the package makes the file count as missing.

## Web builds: `arcade-game://`

- `arcade-game` is registered as a privileged, standard, secure scheme.
- A successful web launch **mounts** the admitted package under its slug, so
  `web/index.html` becomes `arcade-game://<slug>/index.html`.
- The handler serves only files under the mounted package's real `web/` folder:
  the decoded URL path goes through the lexical jail, then the realpath check
  (and `web/` itself must be inside the package). Files are sent with explicit
  MIME types (`application/wasm` included), `nosniff`, and `no-store`. Anything
  else, including unmounted slugs, gets a 404.
- The renderer shows the game in `<iframe sandbox="allow-scripts">`. There is
  no `allow-same-origin`, so the game runs with an opaque origin (`null`). It
  can't reach the shell page, the preload bridge, cookies, or storage. It can't
  navigate the shell or open popups, and the shell's CSP (`frame-src
  arcade-game:`) keeps the frame on game URLs. Responses carry
  `Access-Control-Allow-Origin: *` so an opaque-origin game can still `fetch`
  its own assets.

## Native builds

`child_process.spawn(realPath, [], { cwd: packageRoot, shell: false })`. The
manifest path is never put into a shell string. Right before spawning, the
host re-resolves the build's real path and refuses to start it unless it is
inside the package root, which defeats symlink escapes planted after
admission. On Windows the native build must be a real executable (`.exe`);
`.bat`/`.cmd` need a shell and won't start. On Linux/macOS it needs its
executable bit and, for scripts, a shebang.

## Host duties

| Layer | Owns | Never does |
| --- | --- | --- |
| **main** (`src/main`) | Disk access, admission at the trust boundary, process spawning, the `arcade-game://` protocol, window + session hardening (deny permissions except pointer lock/fullscreen, no popups, no navigation away), IPC sender checks | Trust anything the renderer or a manifest says without re-checking it |
| **preload** (`src/preload`) | Exposes exactly `getPlatform()`, `loadPackage(dir)`, `launchPackage(dir)` on `window.arcade` via `contextBridge` | Expose Node, `ipcRenderer`, or arbitrary channels |
| **renderer** (`src/renderer`) | Screens, the rules list (imported from `rules.ts`), rendering admission results, the sandboxed game frame, the status line | Touch the disk, spawn processes, or decide admission |

The shell window runs with `contextIsolation: true`, `nodeIntegration: false`,
`sandbox: true`, and a CSP of `default-src 'self'; script-src 'self'; frame-src
arcade-game:; object-src 'none'; base-uri 'none'; form-action 'none'`. IPC
handlers accept calls only from the top frame of the shell window loaded from
the shell's own URL. Relative package folders resolve against the app root
(the repo in development, the resources folder when packaged).

### The bridge (`src/shared/bridge.ts`)

```ts
getPlatform(): { platform, host, label, arch, osVersion }
loadPackage(dir): Promise<{ manifest, admission }>
launchPackage(dir): Promise<
  | { kind: 'web'; url; slug; title }
  | { kind: 'native'; path; pid }
  | { kind: 'rejected'; violations }
  | { kind: 'unavailable'; reason }
  | { kind: 'error'; reason }>
```

A Tauri host implements the same three calls as commands.

## The shelf

`catalog/shelf.json` is `{ "games": [] }`. It's bundled into the renderer at
build time, and its length is the "N games" in the status line. It is empty on
purpose: the first listings come from the community. The example packages are
conformance fixtures, not listings.

## Checks

- `pnpm test` runs Node's built-in test runner over `test/*.test.ts`: rules,
  path jail, launch order, schema agreement, loader (including junction
  escapes), and the host's package service and `arcade-game://` resolver.
- `pnpm smoke` builds, then starts the real app with `ARCADE_SMOKE=1`. It
  admits and launches both example packages, drives the UI (including launching
  the reference cartridge into the sandboxed frame and refusing the broken one),
  saves screenshots to `.work/smoke/`, and exits non-zero on any failed check.
