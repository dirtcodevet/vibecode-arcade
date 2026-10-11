import { useEffect, useRef, useState } from 'react'
import { Score } from './score'

/** Sound starts off (browsers require a gesture). One tap turns on the score; another fades it out. */
export function SoundToggle() {
  const [on, setOn] = useState(false)
  const score = useRef<Score | null>(null)

  useEffect(() => () => score.current?.stop(), [])

  const toggle = async () => {
    if (on) {
      score.current?.stop()
      score.current = null
      setOn(false)
      return
    }
    const s = new Score()
    score.current = s
    setOn(true)
    await s.start()
  }

  return (
    <button className={`sound ${on ? 'is-on' : ''}`} onClick={toggle} aria-pressed={on} aria-label={on ? 'Turn sound off' : 'Turn sound on'}>
      <span className="sound-bars" aria-hidden="true">
        <i />
        <i />
        <i />
        <i />
      </span>
      <span className="sound-label">{on ? 'Sound on' : 'Sound off'}</span>
    </button>
  )
}
