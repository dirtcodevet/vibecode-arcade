import { shelfManifests } from '../catalog'
import { PLATFORMS, type ArcadeManifest, type Listing, type Platform } from './types'

/**
 * EXAMPLE LISTINGS. Preview data only: these games, makers, and repos do not exist.
 * The real catalog is SHELF_LISTINGS, from catalog/shelf.json.
 * Every manifest field follows catalog/game.schema.json; art, artAlt, focus, genres, madeWith and remixNote are UI-only.
 * Ordered newest first, the way "New on the shelf" shows them.
 */
const EXAMPLE_RAW: Listing[] = [
  {
    slug: 'rimespire',
    title: 'Rimespire',
    maker: 'aurorafox',
    tagline: "Emberspire's sunset froze over. Same castle, a longer night, a colder dragon.",
    license: 'MPL-2.0',
    prompt:
      'A remix of emberspire, starting from its published prompt and source. I gave Claude the original GDScript and asked: "Keep the castle, the wall-building and the wave editor. Turn the endless sunset into a polar night under the aurora. The dragon is made of ice now: its breath freezes defenses instead of burning them, and you thaw them with lanterns. The sea is frozen surf you can build on." Follow-ups: a cold palette pass, a snow particle system that does not tank the web build, and twelve new waves tuned for the slower, frozen defenses.',
    sourceUrl: 'https://github.com/example/rimespire',
    builds: { web: 'web/index.html', windows: 'windows/Rimespire.exe' },
    remixOf: 'emberspire',
    art: 'slots/worlds/04b.jpg',
    artAlt: 'The same cliff castle at night, frozen over beneath green aurora, with an ice dragon in flight.',
    focus: '68% 40%',
    genres: ['Action', 'Exploration'],
    madeWith: 'Godot + Claude',
    remixNote: 'Kept the castle and the wave editor; swapped the sunset for a polar night and the fire dragon for one made of ice.',
  },
  {
    slug: 'hearthwood',
    title: 'Hearthwood',
    maker: 'softvoxel',
    tagline: 'A voxel mill town where the river does half the farming.',
    license: 'MIT',
    prompt:
      'Remix of lowtide-acres. I kept its farming loop and save format and asked Grok: "Rebuild this as a voxel village on a river at dawn. Replace the tide with a water wheel that powers the mill, so you grind crops into goods the neighbours trade for. Lanterns light up at dusk. Everything is placeable blocks, so players can grow the village themselves." Then greedy meshing so big villages stay smooth, a four-season cycle, and an Electron wrapper for the desktop builds.',
    sourceUrl: 'https://github.com/example/hearthwood',
    builds: {
      web: 'web/index.html',
      windows: 'windows/Hearthwood.exe',
      darwin: 'darwin/Hearthwood.app/Contents/MacOS/Hearthwood',
      linux: 'linux/hearthwood.AppImage',
    },
    remixOf: 'lowtide-acres',
    art: 'slots/worlds/07.jpg',
    artAlt: 'A voxel village at dawn: a water wheel turns beside a misty river, lanterns glow on wooden posts.',
    focus: '55% 50%',
    genres: ['Cozy', 'Exploration'],
    madeWith: 'Three.js + Grok',
    remixNote: "Lowtide's farming loop rebuilt in voxels. The tide became a water wheel, and the island became a river town.",
  },
  {
    slug: 'halcyon-stairs',
    title: 'Halcyon Stairs',
    maker: 'lilacstep',
    tagline: 'Turn the sky until the staircases line up. Then walk home.',
    license: 'CC0-1.0',
    prompt:
      'Godot 4 with Gemini. The prompt: "An impossible-geometry puzzle game among floating stone islands above the clouds. Rotate the camera in 90-degree steps; when two staircases line up on screen, they connect for real and the wanderer can cross. Forty hand-made levels, no text, gentle music." Then I asked for a plain-text level format I could edit by hand, a hint system that only ever nudges, and touch controls for the iOS and Android builds. Public domain, so take the levels and make more.',
    sourceUrl: 'https://github.com/example/halcyon-stairs',
    builds: { web: 'web/index.html', ios: 'ios/HalcyonStairs.ipa', android: 'android/halcyon-stairs.apk' },
    remixOf: null,
    art: 'slots/worlds/08.jpg',
    artAlt: 'Floating stone islands joined by impossible staircases above pastel clouds, a lone wanderer on a bridge.',
    focus: '55% 45%',
    genres: ['Puzzle', 'Cozy'],
    madeWith: 'Godot + Gemini',
  },
  {
    slug: 'nightwharf',
    title: 'Nightwharf',
    maker: 'quietkeel',
    tagline: 'Rain, lamplight, and one locked ledger. Steal it before the bell.',
    license: 'GPL-3.0-only',
    prompt:
      'LÖVE and Lua, vibecoded with Claude. The prompt: "A top-down stealth heist in a rainy harbour town at night. Lamplight pools are the only light; rain masks your footsteps but puddles splash. Guards walk patrol routes with readable vision cones, and there is no combat: if you are seen, you run. Steal the harbourmaster\'s ledger before the bell tolls." Then a noise-propagation grid, an in-game level editor, and fused executables for Windows, macOS and Linux.',
    sourceUrl: 'https://github.com/example/nightwharf',
    builds: {
      windows: 'windows/nightwharf.exe',
      darwin: 'darwin/Nightwharf.app/Contents/MacOS/nightwharf',
      linux: 'linux/nightwharf.AppImage',
    },
    remixOf: null,
    art: 'slots/worlds/09.jpg',
    artAlt: 'Top-down view of a rainy harbour at night; a cloaked figure slips between crates under lamplight.',
    focus: '62% 55%',
    genres: ['Stealth', 'Puzzle'],
    madeWith: 'Love2D + Claude',
  },
  {
    slug: 'dustline-rally',
    title: 'Dustline Rally',
    maker: 'redmesa',
    tagline: "Your rival's dust trail is the racing line. Drive inside it and you're blind.",
    license: 'BSD-3-Clause',
    prompt:
      'Plain C and raylib, vibecoded with Codex in the terminal. The ask: "A point-to-point desert rally against one ghost rival. The rival\'s dust trail lingers and shows the fast line, but driving inside it blinds you. Arcade handling over a real suspension model: weight transfer, wheelspin on sand, airtime off crests." I iterated on a heightmap track generator, a co-driver who calls the corners, and keeping each binary under 10 MB.',
    sourceUrl: 'https://github.com/example/dustline-rally',
    builds: { windows: 'windows/dustline.exe', linux: 'linux/dustline' },
    remixOf: null,
    art: 'slots/worlds/06.jpg',
    artAlt: 'An off-road rally buggy throws up dust in a red-rock canyon at sunset.',
    focus: '38% 60%',
    genres: ['Racing', 'Action'],
    madeWith: 'Raylib + Codex',
  },
  {
    slug: 'brass-fathom',
    title: 'Brass Fathom',
    maker: 'tinbellows',
    tagline: 'Your headlamp is the only map. Glowing coral is the only fuel.',
    license: 'ISC',
    prompt:
      'Remixed from lanternfall: same core idea, light is your life, taken underwater. Made with Gemini and Babylon.js. Prompt: "A slow, moody exploration game. You pilot a brass submarine through drowned temple ruins. The headlamp reveals the map and slowly drains your battery; glowing coral recharges it. No combat, just currents, sealed doors and pressure-plate puzzles." Follow-ups added volumetric light shafts, tilt steering on phones, and an Android package through Capacitor.',
    sourceUrl: 'https://github.com/example/brass-fathom',
    builds: { web: 'web/index.html', android: 'android/brass-fathom.apk' },
    remixOf: 'lanternfall',
    art: 'slots/worlds/05.jpg',
    artAlt: 'A brass submarine shines its headlamp between the carved columns of a sunken temple.',
    focus: '58% 58%',
    genres: ['Exploration', 'Puzzle'],
    madeWith: 'Babylon.js + Gemini',
    remixNote: "Took Lanternfall's light-is-life rule underwater: the lantern became a headlamp, the cave became a drowned temple.",
  },
  {
    slug: 'emberspire',
    title: 'Emberspire',
    maker: 'wrenhollow',
    tagline: 'Hold the cliff castle through one long sunset. The dragon is coming home.',
    license: 'MPL-2.0',
    prompt:
      'Built in Godot 4, with Grok writing most of the GDScript. The opening prompt: "A castle-defense game on a sea cliff during one endless sunset. You place ballistas and lanterns along the walls; a great dragon circles, and its attack pattern changes as the sun sinks. Waves crash on the rocks and knock out the lowest defenses." Then a day curve that drives both the lighting and the difficulty, a wave editor saved as JSON, and exports for the web plus all three desktops.',
    sourceUrl: 'https://github.com/example/emberspire',
    builds: {
      web: 'web/index.html',
      windows: 'windows/Emberspire.exe',
      darwin: 'darwin/Emberspire.app/Contents/MacOS/Emberspire',
      linux: 'linux/Emberspire.x86_64',
    },
    remixOf: null,
    art: 'slots/worlds/04.jpg',
    artAlt: 'A spired castle on a sea cliff at sunset, a dragon flying past over crashing waves.',
    focus: '68% 40%',
    genres: ['Action', 'Exploration'],
    madeWith: 'Godot + Grok',
  },
  {
    slug: 'ringbreakers',
    title: 'Ringbreakers',
    maker: 'nullorbit',
    tagline: 'Dogfight inside the ice rings of a gas giant. Every shard is cover.',
    license: 'Apache-2.0',
    prompt:
      'Rust and Bevy, pair-programmed with Claude. The brief: "Arcade dogfighting inside a gas giant\'s ice ring. Newtonian-ish flight with a flight-assist toggle, thousands of instanced ice chunks that shatter on impact, and enemy AI that uses the debris as cover." Later asks: split-screen local co-op, controller rumble, a fixed-step deterministic simulation so replays work, and a CI matrix that builds Windows, macOS and Linux from a single tag.',
    sourceUrl: 'https://github.com/example/ringbreakers',
    builds: {
      windows: 'windows/ringbreakers.exe',
      darwin: 'darwin/Ringbreakers.app/Contents/MacOS/ringbreakers',
      linux: 'linux/ringbreakers',
    },
    remixOf: null,
    art: 'slots/worlds/03.jpg',
    artAlt: 'Two starfighters streak through the glittering ice rings of a banded gas giant.',
    focus: '40% 55%',
    genres: ['Space', 'Action'],
    madeWith: 'Bevy + Claude',
  },
  {
    slug: 'lanternfall',
    title: 'Lanternfall',
    maker: 'pocketmoth',
    tagline: "Your lantern is your light and your last life. Don't let it go out.",
    license: 'GPL-3.0-or-later',
    prompt:
      'Made with Gemini and Phaser 3, pixel art drawn in Aseprite. First prompt: "A 16-bit cave platformer where your lantern is both your light radius and your health. Taking a hit dims it; glowing mushrooms refill it. Tight controls: coyote time, jump buffering, variable jump height." Then I iterated on a loader for Tiled JSON maps, a waterfall shader that respects integer scaling, and a speedrun timer. Web-only on purpose: one folder, plays anywhere with a keyboard or a gamepad.',
    sourceUrl: 'https://github.com/example/lanternfall',
    builds: { web: 'web/index.html' },
    remixOf: null,
    art: 'slots/worlds/02.jpg',
    artAlt: 'A pixel-art cave of glowing mushrooms and waterfalls; a small hero leaps a gap holding a lantern.',
    focus: '42% 50%',
    genres: ['Pixel', 'Action', 'Exploration'],
    madeWith: 'Phaser + Gemini',
  },
  {
    slug: 'lowtide-acres',
    title: 'Lowtide Acres',
    maker: 'marigoldbyte',
    tagline: 'Grow a seaside farm one tide at a time. The chickens have opinions.',
    license: 'MIT',
    prompt:
      'Vibecoded with Claude in one Vite + Three.js repo over a long weekend. The opening ask: "Make a low-poly farming game on a tiny island at golden hour: tilled plots, a windmill whose speed follows the wind, chickens that wander and trail you when you hold seeds. The tide floods the lowest plots twice a day, so planting is a timing puzzle." Follow-ups asked for thumb-friendly touch controls, a save in localStorage, and every model under 500 triangles so it runs on old phones. Capacitor wraps the same web build for Android and iOS.',
    sourceUrl: 'https://github.com/example/lowtide-acres',
    builds: { web: 'web/index.html', android: 'android/lowtide-acres.apk', ios: 'ios/LowtideAcres.ipa' },
    remixOf: null,
    art: 'slots/worlds/01.jpg',
    artAlt: 'A low-poly island farm at sunset: a windmill on the hill, vegetable plots, chickens and a wooden pier.',
    focus: '42% 55%',
    genres: ['Cozy', 'Exploration'],
    madeWith: 'Three.js + Claude',
  },
]

export const LISTINGS: Listing[] = EXAMPLE_RAW.map((listing) => ({ ...listing, example: true }))

/** Resolves a public/ path against the deployed base (works at / and under a subpath). */
export const art = (path: string) => `${import.meta.env.BASE_URL}${path}`

const SHELF_PRESENTATION: Record<string, Pick<Listing, 'artAlt' | 'madeWith' | 'genres' | 'playUrl'>> = {
  'reference-cartridge': {
    artAlt: 'A dark canvas court. Click or tap to toss bouncing balls.',
    madeWith: 'Canvas + AI agent',
    genres: [],
    playUrl: `${import.meta.env.BASE_URL}play/reference-cartridge/index.html`,
  },
}

function listingFromManifest(manifest: ArcadeManifest): Listing {
  const extra = SHELF_PRESENTATION[manifest.slug]
  return {
    ...manifest,
    artAlt: extra?.artAlt ?? `${manifest.title} on VibeCode Arcade.`,
    madeWith: extra?.madeWith ?? 'Vibecoded',
    genres: extra?.genres ?? [],
    playUrl: extra?.playUrl,
  }
}

/** Real catalog games from catalog/shelf.json. Never includes the painted example listings. */
export const SHELF_LISTINGS: Listing[] = shelfManifests().map(listingFromManifest)

const INDEX = new Map([...SHELF_LISTINGS, ...LISTINGS].map((l) => [l.slug, l]))

export const bySlug = (slug: string | null | undefined): Listing | undefined => (slug ? INDEX.get(slug) : undefined)

export const remixesOf = (slug: string) => LISTINGS.filter((l) => l.remixOf === slug)

/** Oldest ancestor first. Guards against cycles even though admission would never allow one. */
export function ancestorsOf(game: Listing): Listing[] {
  const out: Listing[] = []
  const seen = new Set([game.slug])
  let parent = bySlug(game.remixOf)
  while (parent && !seen.has(parent.slug)) {
    out.unshift(parent)
    seen.add(parent.slug)
    parent = bySlug(parent.remixOf)
  }
  return out
}

export const platformsOf = (game: Listing): Platform[] => PLATFORMS.filter((p) => game.builds[p])

export const FEATURED: Listing[] = SHELF_LISTINGS

/** [parent, remix] pairs. */
export const CHAINS: [Listing, Listing][] = LISTINGS.flatMap((child) => {
  const parent = bySlug(child.remixOf)
  return parent ? [[parent, child] as [Listing, Listing]] : []
})

/** A web build runs in any phone browser; native phone builds count too. */
export const ON_PHONE: Listing[] = LISTINGS.filter((l) => l.builds.web || l.builds.android || l.builds.ios)

export const hostPath = (url: string) => url.replace(/^https?:\/\//, '')

/** The arcade.json a remixer would start from: remixOf points back so credit flows to the original. */
export function remixManifest(game: Listing): string {
  return JSON.stringify(
    {
      slug: `${game.slug}-remix`,
      title: `${game.title} Remix`,
      maker: 'you',
      tagline: 'One line that makes people click.',
      license: game.license,
      prompt: `Started from ${game.slug}'s prompt, then: what you changed, which tools you used, and what came back.`,
      sourceUrl: `https://github.com/you/${game.slug}-remix`,
      builds: { web: 'web/index.html' },
      remixOf: game.slug,
    },
    null,
    2,
  )
}

export const MANIFEST_TEMPLATE = `{
  "slug": "your-game",
  "title": "Your Game",
  "maker": "you",
  "tagline": "One line that makes people click.",
  "license": "MIT",
  "prompt": "How you vibecoded it: the tools, the prompts, what you asked for and what came back.",
  "sourceUrl": "https://github.com/you/your-game",
  "builds": { "web": "web/index.html", "windows": "windows/game.exe" },
  "remixOf": null
}`
