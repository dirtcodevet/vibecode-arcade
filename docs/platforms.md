# Platforms

## Games: any platform is welcome

Web, Linux, Windows, macOS, Android, iOS. Bring whichever builds you have, and
one is enough. A package declares its builds in `arcade.json`, and the desktop
shell picks what it can run:

- the native build for the computer it's on (Windows, macOS, or Linux), otherwise
- the web build, in a sandboxed frame, otherwise
- it says plainly what's missing.

Android and iOS builds are listed and kept with the package, but the desktop
shell never launches them. Phones play the web build.

Games stay polyglot. The arcade cares about the package, not the engine:

- **Godot** is the recommended route to one project, many platforms. A single
  project exports web, Windows, macOS, Linux, Android, and iOS builds. For web
  exports, prefer the no-threads option. v0.1 doesn't set the cross-origin
  isolation headers that threaded web builds need.
- **Plain web / three.js** is welcome. A folder with `index.html` is a complete
  package.
- **C++** (or Rust, Zig, anything that produces a binary) is allowed. Ship the
  executable for each desktop you support.

## The shell: one app on three desktops

The same shell runs on Windows, macOS, and Linux.

**v0.1 host: Electron.** The machine this was built on has Node and WebView2 but
no Rust toolchain or Visual Studio C++ tools, so the first host is Electron
(electron-vite + React + TypeScript). It isn't the end state. The code is laid
out so it doesn't have to be:

- `src/framework/` (manifest types, admission rules, launch order, path jail)
  is plain TypeScript with no Electron imports. It's the spec a native
  supervisor reimplements, with the tests as the conformance suite.
- The UI talks to its host through three calls (`getPlatform`, `loadPackage`,
  `launchPackage`; see [framework.md](framework.md#the-bridge-srcsharedbridgets)).
  Any host that implements those can run the same screens.

**End state: a Rust supervisor, with Tauri as the window.** Rust owns the disk,
admission at the trust boundary, the `arcade-game://` protocol, and process
supervision. Tauri provides the window. The shelf screens stay TypeScript and
move over as they are.

## Packaging

`electron-builder.yml` declares installers for all three desktops:

| OS | Targets |
| --- | --- |
| Windows | NSIS installer, portable `.exe` |
| macOS | `.dmg`, `.zip` |
| Linux | AppImage, `.deb`, `.tar.gz` |

They're declared, not built yet. `pnpm dist` would run electron-builder for the
current OS. macOS builds need a Mac (and signing to run without warnings);
Linux AppImage/deb can be built on Linux or in CI. The bundled example packages
ship as extra resources, so the Rules screen works in an installed app too.
