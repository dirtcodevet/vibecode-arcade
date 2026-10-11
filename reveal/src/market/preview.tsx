// Dev-only preview: renders the Arcade section alone. Served by the dev server at /market.html.
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/fraunces'
import '@fontsource-variable/inter-tight'
import '@fontsource/jetbrains-mono/400.css'
import '../styles.css'
import { MarketSection } from './MarketSection'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MarketSection />
  </StrictMode>,
)
