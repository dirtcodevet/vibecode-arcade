import shelfFile from '../../catalog/shelf.json'
import referenceCartridge from '../../examples/reference-cartridge/arcade.json'
import type { ArcadeManifest } from './market/types'

/** In-repo packages the reveal can bundle. Keys match catalog/shelf.json packageDir values. */
const BUNDLED: Record<string, ArcadeManifest> = {
  'examples/reference-cartridge': referenceCartridge as ArcadeManifest,
}

/** Real catalog games, in shelf order. Throws if the reveal forgot to bundle a listed package. */
export function shelfManifests(): ArcadeManifest[] {
  return shelfFile.games.map((entry) => {
    const manifest = BUNDLED[entry.packageDir]
    if (!manifest) throw new Error(`Reveal is missing bundled package ${entry.packageDir}`)
    return manifest
  })
}
