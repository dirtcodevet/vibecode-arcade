import { Bloom, EffectComposer, Noise, ToneMapping, Vignette } from '@react-three/postprocessing'
import { BlendFunction, ToneMappingMode } from 'postprocessing'
import { CameraRig } from './CameraRig'
import { Campfire } from './Campfire'
import { Dreamer } from './Dreamer'
import { Embers } from './Embers'
import { Frames } from './Frames'
import { Lake } from './Lake'
import { Ledge } from './Ledge'
import { Mountains } from './Mountains'
import { Sky } from './Sky'

const FIRE: [number, number, number] = [0.95, 0.02, -0.3]

export function Scene({ lowPower }: { lowPower: boolean }) {
  return (
    <>
      <CameraRig />
      <hemisphereLight args={['#4b4478', '#0b0910', 0.55]} />
      {/* Last of the sunset, from beyond the valley: rims the dreamer and the rocks. */}
      <directionalLight color="#ff9a66" intensity={1.1} position={[10, 4, -30]} />
      <Sky />
      <Mountains />
      <Lake />
      <Ledge />
      <Dreamer position={[0, 0.02, -0.55]} />
      <Campfire position={FIRE} />
      <Embers position={[FIRE[0], FIRE[1] + 0.35, FIRE[2]]} />
      <Frames />
      <EffectComposer multisampling={lowPower ? 0 : 4}>
        <Bloom mipmapBlur luminanceThreshold={0.85} luminanceSmoothing={0.25} intensity={0.85} radius={0.72} />
        <Vignette offset={0.28} darkness={0.72} />
        <Noise opacity={0.035} blendFunction={BlendFunction.SOFT_LIGHT} />
        <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      </EffectComposer>
    </>
  )
}
