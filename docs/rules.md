# Admission rules

A package gets onto the shelf, and gets launched by the shell, only if it passes
admission. The rules are implemented once, in
[`src/framework/rules.ts`](../src/framework/rules.ts). The Rules screen reads its
list from that module, the host calls `admit()` from it, and this page explains it.
If this page and the code ever disagree, the code wins. Fix the page.

```ts
admit(manifest: unknown, files: Iterable<string>): { ok: boolean; violations: { rule; reason }[] }
```

`admit` is pure. It takes the parsed `arcade.json` and the relative paths of the
files that exist in the package. It never reads the disk itself; the host's loader
does that. Every rule runs on every check, so you see all the problems at once,
each with a plain-English reason. A package is admitted when there are zero
violations.

Admission is about the package itself. Whether it can *launch on this computer*
is a separate question, answered by `resolveLaunch` (see
[framework.md](framework.md#launch-order)). A package with only an Android build
is admitted, and a Windows desktop will just say it can't start it there.

## The rules

### `identity`

- `slug` is lowercase letters and digits in words joined by single hyphens:
  `^[a-z0-9]+(-[a-z0-9]+)*$` (for example `star-garden`; not `Star_Garden`,
  `star--garden`, or `star-garden-`).
- `title`, `maker`, and `tagline` are not blank.

**Why:** the slug is the game's permanent name. It's used in URLs
(`arcade-game://<slug>/`), folder names, and `remixOf` links, so it has to be
boring and unambiguous. A listing with no title, maker, or tagline has nothing
to show.

### `free`

`license` is exactly one of these SPDX ids: `MIT`, `Apache-2.0`, `BSD-2-Clause`,
`BSD-3-Clause`, `ISC`, `MPL-2.0`, `GPL-3.0-only`, `GPL-3.0-or-later`,
`AGPL-3.0-only`, `Unlicense`, `CC0-1.0`. Ids are case-sensitive, so `mit` fails.

**Why:** the arcade promises that every game is free and open source. That
only means something if the license actually grants the freedom to read,
change, and share the game. "Non-commercial" and "source-available" licenses
don't, so they aren't on the list.

### `provenance`

- `prompt` is at least 80 characters once trimmed: a short paragraph on how the
  game was vibecoded.
- `sourceUrl` is an `http://` or `https://` link with a host.

**Why:** every game ships with its prompt, so remixing is how the next game
starts. A one-liner like "made with AI" teaches nobody anything. The source
link is what makes "open source" checkable.

### `bring-a-build`

- At least one build is declared. Any platform counts: `web`, `linux`,
  `windows`, `darwin`, `android`, `ios`. One is enough.
- Every declared build file actually exists in the package.
- The web build lives inside the `web/` folder (for example `web/index.html`).
  The shell serves web builds only from there.

**Why:** a listing without a playable build is just an ad. Bring what you have.
A Godot export for three desktops, a single HTML file, an APK: all welcome.
The `web/` requirement exists because the `arcade-game://` handler serves
nothing outside a package's `web/` folder.

### `path-jail`

Every build path is a plain relative path that stays inside the package. These
are rejected:

| Pattern | Example |
| --- | --- |
| Absolute POSIX path | `/etc/x` |
| Windows drive path | `C:\x`, `C:/x`, `c:x` |
| UNC / network share | `\\server\x`, `//server/x` |
| URL or any scheme | `https://x`, `file:///x`, `javascript:...` |
| Backslashes anywhere | `web\index.html`, `web\..\x` |
| `:` anywhere (drives, NTFS streams) | `game.exe:stream` |
| Empty segments | `web//index.html`, `web/` |
| Dot-only segments, including `..` | `../x`, `web/../../x`, `./web/index.html` |
| Control characters | `web/\u0000x` |

**Why:** a manifest is input from strangers, and these paths are later handed to
the file server and to process spawning. Rejecting everything that isn't
obviously inside the package is simpler and safer than trying to normalize
clever paths. This lexical check is half of the jail. The host also resolves
real paths (following symlinks and junctions) before it reads or runs anything;
see [framework.md](framework.md#path-jail).

### `remix`

`remixOf` is `null` for an original game, or the slug of the game this one grew
from. In v0.1 the parent doesn't need to be on the local shelf.

**Why:** remix lineage is how credit flows in an arcade built on shared prompts.
It only needs to be a well-formed slug for now; resolving parents comes with a
real catalog.

### `shape`

- `arcade.json` is a JSON object with exactly these fields, all required:
  `slug`, `title`, `maker`, `tagline`, `license`, `prompt`, `sourceUrl`,
  `builds`, `remixOf`.
- Each field has the right type: strings, `builds` an object of platform →
  path string, and `remixOf` `null` or a string.
- Unknown fields fail, at the top level and inside `builds`.

**Why:** no price, no DRM, no account, no tracking. The manifest has no place
to put them, and that's on purpose. A closed shape also means a typo like
`sourceURL` fails loudly instead of being silently ignored. Unreadable packages
(missing folder, missing `arcade.json`, invalid JSON) are reported under `shape`
too.

## Where else the rules show up

- [`catalog/game.schema.json`](../catalog/game.schema.json) is the same contract
  as a JSON Schema (draft 2020-12, `additionalProperties: false`) for editors and
  CI. Tests keep it in sync with the rules module: same fields, licenses, slug
  pattern, URL pattern, and path-jail verdicts. A schema can't check whether
  files exist, so `rules.ts` stays authoritative.
- [`test/rules.test.ts`](../test/rules.test.ts) has one deliberate break per case
  and asserts it trips exactly the rule it's meant to.
