import { Suspense, useEffect, useMemo, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { Scene } from './scene/Scene'
import { Overlay } from './overlay/Overlay'
import { SoundToggle } from './audio/SoundToggle'
import { BEATS } from './beats'
import { onBeatChange, startScrollTracking } from './scroll'
import { REPO, RULES } from './links'

function webglAvailable() {
  try {
    const c = document.createElement('canvas')
    return !!(c.getContext('webgl2') || c.getContext('webgl'))
  } catch {
    return false
  }
}

function BeatDots() {
  const [beat, setBeat] = useState(0)
  useEffect(() => onBeatChange(setBeat), [])
  return (
    <nav className="dots" aria-label="Sections">
      {BEATS.map((id, i) => (
        <a key={id} href={`#${id}`} className={i === beat ? 'is-on' : ''} aria-label={id} onClick={(e) => {
          e.preventDefault()
          document.querySelector(`[data-beat="${id}"]`)?.scrollIntoView({ behavior: 'smooth' })
        }} />
      ))}
    </nav>
  )
}

export function App() {
  useEffect(() => startScrollTracking(), [])
  const hasGL = useMemo(webglAvailable, [])
  const lowPower = useMemo(
    () => window.matchMedia('(pointer: coarse)').matches || (navigator.hardwareConcurrency ?? 8) <= 4,
    [],
  )

  return (
    <>
      <div className="stage" aria-hidden="true">
        {hasGL ? (
          <Canvas
            dpr={[1, lowPower ? 1.25 : 1.5]}
            gl={{ antialias: false, powerPreference: 'high-performance' }}
            camera={{ fov: 50, near: 0.1, far: 2000, position: [2.4, 1.85, 6.2] }}
          >
            <Suspense fallback={null}>
              <Scene lowPower={lowPower} />
            </Suspense>
          </Canvas>
        ) : (
          <div className="stage-fallback" />
        )}
      </div>
      <header className="bar">
        <a className="mark" href={REPO}>
          <svg viewBox="0 0 32 32" aria-hidden="true">
            <rect x="3" y="7" width="26" height="18" rx="3" fill="none" stroke="currentColor" strokeWidth="2" />
            <circle cx="16" cy="16" r="3.2" fill="#f0a24b" />
          </svg>
          <span>VibeCode Arcade</span>
        </a>
        <nav className="bar-links">
          <a href="#how">How it works</a>
          <a href={RULES}>Rules</a>
          <a href={REPO}>GitHub</a>
        </nav>
      </header>
      <BeatDots />
      <Overlay />
      <SoundToggle />
    </>
  )
}
