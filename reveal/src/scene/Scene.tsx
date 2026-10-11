import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Environment, Lightformer } from '@react-three/drei'
import { Bloom, EffectComposer, Noise, ToneMapping, Vignette } from '@react-three/postprocessing'
import { BlendFunction, ToneMappingMode } from 'postprocessing'
import { slots, useSlotTexture } from '../slots'
import { Backdrop } from './Backdrop'
import { CameraRig } from './CameraRig'
import { Campfire } from './Campfire'
import { Dreamer } from './Dreamer'
import { Embers } from './Embers'
import { Frames } from './Frames'
import { Grass } from './Grass'
import { Lake } from './Lake'
import { Ledge } from './Ledge'
import { Mountains } from './Mountains'
import { PaintedDreamer } from './PaintedDreamer'
import { Sky } from './Sky'

const FIRE: [number, number, number] = [0.95, 0.02, -0.3]
const DREAMER: [number, number, number] = [0, 0.02, -0.55]
const KEEP_CLEAR: [number, number][] = [
  [DREAMER[0], DREAMER[2]],
  [FIRE[0], FIRE[2]],
]

/** Warm, local reflections for the brass frames: a sunset strip ahead, dusk violet above, firelight behind. */
function DuskReflections() {
  return (
    <Environment resolution={128} frames={1} environmentIntensity={0.55}>
      <Lightformer form="rect" intensity={3.2} color="#ff9a5c" position={[8, 1, -12]} scale={[26, 4, 1]} />
      <Lightformer form="rect" intensity={1.1} color="#6f5fc4" position={[0, 12, 0]} rotation-x={Math.PI / 2} scale={[30, 30, 1]} />
      <Lightformer form="circle" intensity={2.4} color="#ffb070" position={[1, 0.5, 6]} scale={[3, 3, 1]} />
    </Environment>
  )
}

/** Calls onReady after a couple of frames have drawn with `when` true, so the canvas fades in fully composed. */
function ReadyWhen({ when, onReady }: { when: boolean; onReady: () => void }) {
  const frames = useRef(0)
  const done = useRef(false)
  useEffect(() => {
    // Never hold the scene back for long if a painted layer is slow or missing.
    const t = window.setTimeout(() => {
      if (!done.current) {
        done.current = true
        onReady()
      }
    }, 6000)
    return () => window.clearTimeout(t)
  }, [onReady])
  useFrame(() => {
    if (done.current || !when) return
    if (++frames.current >= 3) {
      done.current = true
      onReady()
    }
  })
  return null
}

export function Scene({ lowPower, onReady }: { lowPower: boolean; onReady: () => void }) {
  // Painted layers replace their procedural stand-ins once loaded; missing files keep the procedural scene.
  const backdrop = useSlotTexture(slots.scene.backdrop)
  const dreamer = useSlotTexture(slots.scene.dreamer)
  const ground = useSlotTexture(slots.scene.ground)

  return (
    <>
      <CameraRig />
      <ReadyWhen when={!!backdrop && !!dreamer} onReady={onReady} />
      <DuskReflections />
      <hemisphereLight args={['#4b4478', '#0b0910', 0.55]} />
      {/* Last of the sunset, from beyond the valley: rims the dreamer and the rocks. */}
      <directionalLight color="#ff9a66" intensity={1.1} position={[16, 4, -30]} />
      <Sky />
      {backdrop ? (
        <Backdrop texture={backdrop} horizon={slots.scene.horizon} />
      ) : (
        <>
          <Mountains />
          <Lake />
        </>
      )}
      <Ledge texture={ground} />
      <Grass avoid={KEEP_CLEAR} />
      {dreamer ? <PaintedDreamer texture={dreamer} position={DREAMER} /> : <Dreamer position={DREAMER} />}
      <Campfire position={FIRE} />
      <Embers position={[FIRE[0], FIRE[1] + 0.35, FIRE[2]]} />
      <Frames />
      <EffectComposer multisampling={lowPower ? 0 : 2}>
        <Bloom mipmapBlur luminanceThreshold={0.85} luminanceSmoothing={0.25} intensity={0.85} radius={0.72} />
        <Vignette offset={0.28} darkness={0.72} />
        <Noise opacity={0.035} blendFunction={BlendFunction.SOFT_LIGHT} />
        <ToneMapping mode={ToneMappingMode.NEUTRAL} />
      </EffectComposer>
    </>
  )
}
