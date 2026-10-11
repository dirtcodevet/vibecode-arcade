import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Relative base so the same build works at a domain root or under /vibecode-arcade/ on GitHub Pages.
export default defineConfig({
  base: './',
  plugins: [react()],
  build: { chunkSizeWarningLimit: 1600 },
})
