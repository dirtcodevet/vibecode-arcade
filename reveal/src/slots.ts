import { useEffect, useState } from 'react'
import { SRGBColorSpace, Texture, TextureLoader } from 'three'
import slots from '../assets/slots.json'

export { slots }

/** Resolves a public/ path against the deployed base (works at / and under /vibecode-arcade/). */
export const asset = (path: string) => `${import.meta.env.BASE_URL}${path}`

const loader = new TextureLoader()

/** Loads a slot texture; returns null while loading or if the file is missing, so callers keep their fallback. */
export function useSlotTexture(path: string | undefined): Texture | null {
  const [texture, setTexture] = useState<Texture | null>(null)
  useEffect(() => {
    if (!path) return
    let alive = true
    loader.load(
      asset(path),
      (t) => {
        t.colorSpace = SRGBColorSpace
        t.anisotropy = 4
        if (alive) setTexture(t)
      },
      undefined,
      () => {
        /* missing slot: procedural fallback stays */
      },
    )
    return () => {
      alive = false
    }
  }, [path])
  return texture
}
