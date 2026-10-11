import { useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { CatmullRomCurve3, PerspectiveCamera, Vector3 } from 'three'
import { CAMERA_STOPS, PORTRAIT_STOPS, STOPS, cameraParam } from '../beats'
import { scroll } from '../scroll'

/** Moves the camera along the beat stops. Reduced motion holds one composed still. */
export function CameraRig() {
  const camera = useThree((s) => s.camera) as PerspectiveCamera
  const aspect = useThree((s) => s.size.width / s.size.height)

  const portrait = aspect < 0.9
  const stops = portrait ? PORTRAIT_STOPS : STOPS
  const path = useMemo(() => new CatmullRomCurve3(stops.map((s) => s.position), false, 'centripetal'), [stops])
  const look = useMemo(() => new CatmullRomCurve3(stops.map((s) => s.target), false, 'centripetal'), [stops])
  const state = useMemo(() => ({ pos: STOPS[0].position.clone(), target: STOPS[0].target.clone(), ready: false }), [])
  const desiredPos = useMemo(() => new Vector3(), [])
  const desiredTarget = useMemo(() => new Vector3(), [])

  useFrame((frame, delta) => {
    // Wider lens on tall screens so the windows still fit.
    const fov = aspect < 0.8 ? 72 : aspect < 1.2 ? 60 : 50
    if (camera.fov !== fov) {
      camera.fov = fov
      camera.updateProjectionMatrix()
    }

    if (scroll.reducedMotion) {
      desiredPos.copy(CAMERA_STOPS.shelf.position)
      desiredTarget.copy(CAMERA_STOPS.shelf.target)
    } else {
      const t = cameraParam(scroll.beat) / (STOPS.length - 1)
      path.getPoint(t, desiredPos)
      look.getPoint(t, desiredTarget)
      // A slow breath so the still moments feel alive.
      const e = frame.clock.elapsedTime
      desiredPos.x += Math.sin(e * 0.21) * 0.08
      desiredPos.y += Math.sin(e * 0.17) * 0.05
    }

    if (!state.ready || scroll.reducedMotion) {
      state.pos.copy(desiredPos)
      state.target.copy(desiredTarget)
      state.ready = true
    } else {
      const k = 1 - Math.exp(-delta * 3.2)
      state.pos.lerp(desiredPos, k)
      state.target.lerp(desiredTarget, k)
    }
    camera.position.copy(state.pos)
    camera.lookAt(state.target)
  })

  return null
}
