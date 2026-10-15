import { cpSync, mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

const revealRoot = fileURLToPath(new URL('.', import.meta.url))

/** Copies admitted web builds so the reveal can actually play catalog games. */
function syncShelfPlay(): Plugin {
  const src = resolve(revealRoot, '../examples/reference-cartridge/web')
  const destPublic = resolve(revealRoot, 'public/play/reference-cartridge')
  const destDist = resolve(revealRoot, 'dist/play/reference-cartridge')
  const copy = (to: string) => {
    mkdirSync(to, { recursive: true })
    cpSync(src, to, { recursive: true })
  }
  return {
    name: 'sync-shelf-play',
    buildStart() {
      copy(destPublic)
    },
    closeBundle() {
      copy(destDist)
    },
  }
}

// Relative base so the same build works at a domain root or under /vibecode-arcade/ on GitHub Pages.
export default defineConfig({
  base: './',
  plugins: [react(), syncShelfPlay()],
  server: {
    fs: { allow: [resolve(revealRoot, '..')] },
  },
  build: { chunkSizeWarningLimit: 1600 },
})
