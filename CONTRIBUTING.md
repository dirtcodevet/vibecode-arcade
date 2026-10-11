# Bring your game

VibeCode Arcade is a home for games made by vibecoding. Every game is free, open source, and ships with the prompt that made it. Any engine, any language, any platform.

The shelf starts empty on purpose. The first games come from you.

## Get on the shelf

1. **Make a game.** Three.js, Godot, Phaser, Unity, Love2D, Bevy, plain C: if you vibecoded it, it counts.
2. **Publish the source** under a free license (list below).
3. **Add `arcade.json`** to your repo root, next to your build folders.
4. **Open a [Submit a game](https://github.com/dirtcodevet/vibecode-arcade/issues/new?template=submit-a-game.yml) issue.** It gets checked against the same open rules the desktop shell runs, then it goes on the shelf.

Not ready yet? Share a work in progress in [Discussions](https://github.com/dirtcodevet/vibecode-arcade/discussions).

## The package

A game the shell can launch is a directory:

```
your-game/
  arcade.json          the manifest
  web/index.html       a web build (runs inside the shell on every OS, and on phones)
  windows/game.exe     native builds are optional extras...
  darwin/...           ...macOS
  linux/run.sh         ...Linux
  android/game.apk     ...Android
  ios/game.ipa         ...iOS
```

Ship **at least one** build. Any platform counts.

### arcade.json

```json
{
  "slug": "your-game",
  "title": "Your Game",
  "maker": "you",
  "tagline": "One line that makes people click.",
  "license": "MIT",
  "prompt": "How you vibecoded it: the tools, the prompts, what you asked for and what came back.",
  "sourceUrl": "https://github.com/you/your-game",
  "builds": { "web": "web/index.html", "windows": "windows/game.exe" },
  "remixOf": null
}
```

| Field | What it is |
| --- | --- |
| `slug` | Lowercase words joined by single hyphens: `star-farm`, `tiny-golf-2`. |
| `title`, `maker`, `tagline` | Non-empty text for the listing. |
| `license` | One of `MIT`, `Apache-2.0`, `BSD-2-Clause`, `BSD-3-Clause`, `ISC`, `MPL-2.0`, `GPL-3.0-only`, `GPL-3.0-or-later`, `AGPL-3.0-only`, `Unlicense`, `CC0-1.0`. |
| `prompt` | At least 80 characters on how it was vibecoded. This is the part people remix. |
| `sourceUrl` | An `http(s)` link to the source. |
| `builds` | Any of `web`, `windows`, `darwin` (macOS), `linux`, `android`, `ios`. Each is a path relative to the package root, and the file must exist. A web build lives inside `web/`, because that folder is what the shell serves to its sandboxed frame. |
| `remixOf` | `null`, or the slug of the game you remixed, so credit flows back. |

There are no price, DRM, or account fields, and unknown fields fail admission. Build paths can't be absolute, can't be URLs, and can't contain `..`: a package can only reach its own files.

The full rules, with the reason behind each, are in [docs/rules.md](docs/rules.md). The schema is [catalog/game.schema.json](catalog/game.schema.json).

### Check it yourself

Clone this repo and run the shell (`pnpm install`, then `pnpm dev`). The **Rules** screen runs the admission rules against a package and shows exactly what passes and what doesn't.

## Work on the Arcade itself

- **Desktop shell** (repo root): electron-vite + React + TypeScript. `pnpm install`, `pnpm dev`, `pnpm test`, `pnpm smoke`. The rules live in `src/framework`, which has no Electron imports. See [docs/framework.md](docs/framework.md) and [docs/platforms.md](docs/platforms.md).
- **The reveal** (`reveal/`): the three.js site. `pnpm --dir reveal install`, then `pnpm --dir reveal dev`. Art and music are replaceable slots listed in `reveal/assets/slots.json`. Regenerate them with `reveal/tools/gen_scene.py` and `reveal/tools/gen_art.py` (Grok Imagine, needs `XAI_API_KEY`) and `reveal/tools/gen_music.py` (Lyria, needs `GEMINI_API_KEY`). Every slot has a procedural fallback.

Small, focused pull requests are easiest to review. Keep it free, keep it open, keep it vibecoded.
