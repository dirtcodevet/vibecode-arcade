import { Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { advance, Canvas } from '@react-three/fiber'
import { PerformanceMonitor } from '@react-three/drei'
import { Scene } from './scene/Scene'
import { Overlay } from './overlay/Overlay'
import { SoundToggle } from './audio/SoundToggle'
import { BEATS } from './beats'
import { onBeatChange, scroll, scrollToTarget, startScrollTracking } from './scroll'
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
        <a
          key={id}
          href={`#${id}`}
          className={i === beat ? 'is-on' : ''}
          aria-label={id}
          onClick={(e) => {
            e.preventDefault()
            scrollToTarget(`[data-beat="${id}"]`)
          }}
        />
      ))}
    </nav>
  )
}

/** Recording hook (?capture=1): the recorder renders exactly one frame per call, at a time it chooses. */
function useCaptureBridge(ready: boolean) {
  useEffect(() => {
    if (!scroll.capture) return
    Object.assign(window, {
      __capture: {
        step: (seconds: number) => advance(seconds),
        ready: () => ready,
      },
    })
  }, [ready])
}

export function App() {
  useEffect(() => startScrollTracking(), [])
  const hasGL = useMemo(webglAvailable, [])
  const lowPower = useMemo(
    () => window.matchMedia('(pointer: coarse)').matches || (navigator.hardwareConcurrency ?? 8) <= 4,
    [],
  )
  // Cap the drawing buffer at ~3.2M pixels so big monitors stay smooth, then let the monitor step down if needed.
  const maxDpr = useMemo(
    () => Math.max(1, Math.min(lowPower ? 1.25 : 1.5, Math.sqrt(3_200_000 / (window.innerWidth * window.innerHeight)))),
    [lowPower],
  )
  const [dpr, setDpr] = useState(maxDpr)
  const [ready, setReady] = useState(false)
  const onReady = useCallback(() => setReady(true), [])
  useCaptureBridge(ready)

  return (
    <>
      <div className={`stage${ready ? ' is-ready' : ''}`} aria-hidden="true">
        {hasGL ? (
          <Canvas
            dpr={scroll.capture ? 1 : dpr}
            frameloop={scroll.capture ? 'never' : 'always'}
            gl={{ antialias: false, powerPreference: 'high-performance' }}
            camera={{ fov: 50, near: 0.1, far: 2000, position: [2.4, 1.85, 6.2] }}
          >
            <PerformanceMonitor onDecline={() => setDpr(1)} onIncline={() => setDpr(maxDpr)} flipflops={3} onFallback={() => setDpr(1)}>
              <Suspense fallback={null}>
                <Scene lowPower={lowPower} onReady={onReady} />
              </Suspense>
            </PerformanceMonitor>
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
          <a href="#arcade">The Arcade</a>
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
