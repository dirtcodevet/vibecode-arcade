# VibeCode Arcade

**Free. Open source. Vibecoded. Any platform.**

A home for games made by vibecoding, gathered from the whole community and brought to the web, Windows, macOS, Linux, Android, and iOS. Every game is free, every game ships its source, and every game ships the prompt that made it, so the next game can start as a remix.

**The shelf is empty on purpose. [Bring your games.](CONTRIBUTING.md)**

[See the reveal](https://dirtcodevet.github.io/vibecode-arcade/) · [Submit a game](https://github.com/dirtcodevet/vibecode-arcade/issues/new?template=submit-a-game.yml) · [Discussions](https://github.com/dirtcodevet/vibecode-arcade/discussions) · [The rules](docs/rules.md)

![VibeCode Arcade](reveal/public/og.jpg)

## What's in this repo

Two builds share one repo.

| | What it is | Run it |
| --- | --- | --- |
| **The reveal** (`reveal/`) | The public introduction: a scroll-driven three.js scene. A dreamer by a campfire, embers rising into windows onto game worlds, and a shelf of open slots. | `pnpm --dir reveal install` then `pnpm --dir reveal dev` |
| **The shell** (repo root) | The product: a desktop launcher that admits a game package against open rules, path-jails it, and launches it, with web builds in a sandboxed frame and native builds without a shell. | `pnpm install` then `pnpm dev` |

### The shell

- `pnpm dev` opens the window: **Arcade** (the shelf: `0 games`), **The Deal**, and **Rules**.
- **Rules** runs every admission rule against the reference cartridge in `examples/reference-cartridge`, and **Launch** opens it inside the shell. That cartridge is a conformance fixture, not a game on the shelf.
- `pnpm test` runs the rules, path-jail, and launch-order tests (Node's built-in runner).
- `pnpm smoke` builds the app, admits and launches the reference cartridge, confirms the deliberately broken one is rejected, and saves screenshots to `.work/smoke/`.

The rules live in `src/framework/` with no Electron imports. v0.1 hosts them in Electron; the end-state supervisor is Rust with Tauri as the window. See [docs/platforms.md](docs/platforms.md).

### The reveal

Built with React Three Fiber, drei, and postprocessing. The scene is procedural first: the sky, mountains, lake, fire, and windows are code, and the generated art drops into slots named in `reveal/assets/slots.json`. If a file is missing, the procedural version stays.

- Windows onto game worlds and the key art: **Grok Imagine** (`reveal/tools/gen_art.py`)
- Score: **Google Lyria** (`reveal/tools/gen_music.py`), crossfaded into a loop, with procedural Web Audio wind, fire, and chimes on top
- Reduced motion holds one still frame and stacks the copy. Add `?motion=full` to the URL to override either way.

It deploys to GitHub Pages from `.github/workflows/pages.yml` on every push to `main` that touches `reveal/`.

## What's not here

No accounts. No payments. No DRM. No tracking. No games on the shelf yet: that's the point.

## License

MIT. Games on the shelf carry their own free licenses.
