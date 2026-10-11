import { span } from '../beats'
import { onBeatChange, scroll } from '../scroll'
import { asset, slots } from '../slots'

/**
 * The reveal's sound. A generated soundtrack (Lyria) when the slot file exists, otherwise a procedural pad;
 * plus procedural wind, campfire crackle, transition whooshes, Deal chimes, and a remix shimmer — all Web Audio.
 */
export class Score {
  private ctx: AudioContext
  private master: GainNode
  private reverb: ConvolverNode
  private noise: AudioBuffer
  private musicFilter: BiquadFilterNode
  private musicGain: GainNode
  private fireGain: GainNode
  private windGain: GainNode
  private tracks: HTMLAudioElement[] = []
  private active = 0
  private pad: { gain: GainNode; oscs: OscillatorNode[] } | null = null
  private timers: number[] = []
  private unsubscribe: () => void = () => {}
  private raf = 0
  private lastBeat = -1

  constructor() {
    this.ctx = new AudioContext()
    this.master = this.ctx.createGain()
    this.master.gain.value = 0
    const comp = this.ctx.createDynamicsCompressor()
    comp.threshold.value = -14
    comp.ratio.value = 3
    this.master.connect(comp).connect(this.ctx.destination)

    this.reverb = this.ctx.createConvolver()
    this.reverb.buffer = this.impulse(3.2)
    const wet = this.ctx.createGain()
    wet.gain.value = 0.32
    this.reverb.connect(wet).connect(this.master)

    this.noise = this.ctx.createBuffer(1, this.ctx.sampleRate * 2, this.ctx.sampleRate)
    const data = this.noise.getChannelData(0)
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1

    this.musicFilter = this.ctx.createBiquadFilter()
    this.musicFilter.type = 'lowpass'
    this.musicFilter.frequency.value = 1400
    this.musicGain = this.ctx.createGain()
    this.musicGain.gain.value = 0.62
    this.musicFilter.connect(this.musicGain).connect(this.master)

    this.windGain = this.ctx.createGain()
    this.windGain.gain.value = 0.0
    this.windGain.connect(this.master)
    this.fireGain = this.ctx.createGain()
    this.fireGain.gain.value = 0.0
    this.fireGain.connect(this.master)
  }

  async start() {
    await this.ctx.resume()
    this.master.gain.setTargetAtTime(0.9, this.ctx.currentTime, 0.8)
    this.startWind()
    this.timers.push(window.setInterval(() => this.crackle(), 55))
    await this.startMusic()
    this.unsubscribe = onBeatChange((beat) => this.onBeat(beat))
    const tick = () => {
      this.mix()
      this.raf = requestAnimationFrame(tick)
    }
    tick()
  }

  stop() {
    this.master.gain.setTargetAtTime(0, this.ctx.currentTime, 0.25)
    this.unsubscribe()
    cancelAnimationFrame(this.raf)
    this.timers.forEach((t) => clearInterval(t))
    this.timers = []
    window.setTimeout(() => {
      this.tracks.forEach((t) => t.pause())
      this.ctx.close()
    }, 900)
  }

  /** Continuous mix from scroll position: the music opens up as the windows appear; the fire fades with distance. */
  private mix() {
    const b = scroll.beat
    const now = this.ctx.currentTime
    const open = span(b, 0.3, 1.3)
    this.musicFilter.frequency.setTargetAtTime(1400 + open * 17000, now, 0.4)
    const nearFire = Math.max(1 - span(b, 0.6, 2.0), span(b, 3.4, 4.0) * 0.6)
    this.fireGain.gain.setTargetAtTime(0.5 * nearFire, now, 0.3)
    this.windGain.gain.setTargetAtTime(0.05 + 0.07 * span(b, 1.5, 3.0), now, 0.6)
  }

  private onBeat(beat: number) {
    if (this.lastBeat === -1) {
      this.lastBeat = beat
      return
    }
    if (beat !== this.lastBeat) this.whoosh(beat > this.lastBeat ? 1 : -1)
    if (beat === 2 && this.lastBeat < 2) [0, 0.45, 0.9, 1.35].forEach((d, i) => this.chime([587.33, 659.25, 880, 987.77][i], d))
    if (beat === 3 && this.lastBeat < 3) this.shimmer()
    this.lastBeat = beat
    if (this.pad) this.padChord(beat)
  }

  private async startMusic() {
    const url = asset(slots.music)
    const ok = await fetch(url, { method: 'HEAD' }).then((r) => r.ok && (r.headers.get('content-type') ?? '').includes('audio')).catch(() => false)
    if (!ok) {
      this.startPad()
      return
    }
    // Two elements crossfade so the cue loops without a hard cut.
    for (let i = 0; i < 2; i++) {
      const el = new Audio(url)
      el.preload = 'auto'
      el.crossOrigin = 'anonymous'
      const src = this.ctx.createMediaElementSource(el)
      const g = this.ctx.createGain()
      g.gain.value = i === 0 ? 1 : 0
      src.connect(g).connect(this.musicFilter)
      ;(el as HTMLAudioElement & { _gain?: GainNode })._gain = g
      this.tracks.push(el)
    }
    await this.tracks[0].play().catch(() => this.startPad())
    this.timers.push(window.setInterval(() => this.loopCheck(), 250))
  }

  private loopCheck() {
    const cur = this.tracks[this.active] as HTMLAudioElement & { _gain?: GainNode }
    if (!cur.duration || cur.currentTime < cur.duration - 6) return
    const nextIndex = 1 - this.active
    const next = this.tracks[nextIndex] as HTMLAudioElement & { _gain?: GainNode }
    const now = this.ctx.currentTime
    next.currentTime = 0
    next._gain!.gain.cancelScheduledValues(now)
    next._gain!.gain.setValueAtTime(0, now)
    next._gain!.gain.linearRampToValueAtTime(1, now + 5)
    cur._gain!.gain.setValueAtTime(cur._gain!.gain.value, now)
    cur._gain!.gain.linearRampToValueAtTime(0, now + 5.5)
    next.play().catch(() => {})
    this.active = nextIndex
  }

  private startPad() {
    const gain = this.ctx.createGain()
    gain.gain.value = 0
    const lp = this.ctx.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.value = 900
    gain.connect(lp)
    lp.connect(this.musicFilter)
    lp.connect(this.reverb)
    const oscs = [0, 1, 2, 3].map((i) => {
      const o = this.ctx.createOscillator()
      o.type = i % 2 ? 'sawtooth' : 'triangle'
      o.detune.value = (i - 1.5) * 7
      o.connect(gain)
      o.start()
      return o
    })
    this.pad = { gain, oscs }
    gain.gain.setTargetAtTime(0.05, this.ctx.currentTime, 2)
    this.padChord(0)
  }

  private padChord(beat: number) {
    if (!this.pad) return
    // D major color, one chord per beat.
    const chords = [
      [146.83, 220.0, 293.66, 369.99],
      [123.47, 185.0, 246.94, 293.66],
      [98.0, 146.83, 196.0, 246.94],
      [164.81, 220.0, 293.66, 329.63],
      [110.0, 164.81, 220.0, 277.18],
    ]
    const chord = chords[Math.max(0, Math.min(chords.length - 1, beat))]
    this.pad.oscs.forEach((o, i) => o.frequency.setTargetAtTime(chord[i], this.ctx.currentTime, 1.2))
  }

  private startWind() {
    const src = this.ctx.createBufferSource()
    src.buffer = this.noise
    src.loop = true
    const bp = this.ctx.createBiquadFilter()
    bp.type = 'bandpass'
    bp.frequency.value = 380
    bp.Q.value = 0.7
    const swell = this.ctx.createGain()
    swell.gain.value = 0.6
    src.connect(bp).connect(swell).connect(this.windGain)
    src.start()
    this.timers.push(
      window.setInterval(() => {
        const now = this.ctx.currentTime
        swell.gain.setTargetAtTime(0.35 + Math.random() * 0.65, now, 1.8)
        bp.frequency.setTargetAtTime(260 + Math.random() * 380, now, 2.2)
      }, 2400),
    )
  }

  private crackle() {
    if (Math.random() > 0.32) return
    const now = this.ctx.currentTime
    const src = this.ctx.createBufferSource()
    src.buffer = this.noise
    const bp = this.ctx.createBiquadFilter()
    bp.type = 'bandpass'
    const pop = Math.random() < 0.15
    bp.frequency.value = pop ? 300 + Math.random() * 500 : 1600 + Math.random() * 4200
    bp.Q.value = pop ? 1.5 : 4
    const g = this.ctx.createGain()
    const peak = (pop ? 0.9 : 0.35) * (0.3 + Math.random() * 0.7)
    const len = pop ? 0.06 : 0.008 + Math.random() * 0.03
    g.gain.setValueAtTime(0, now)
    g.gain.linearRampToValueAtTime(peak, now + 0.002)
    g.gain.exponentialRampToValueAtTime(0.0001, now + len)
    src.connect(bp).connect(g).connect(this.fireGain)
    src.start(now, Math.random() * 1.5, len + 0.02)
  }

  private whoosh(direction: number) {
    const now = this.ctx.currentTime
    const src = this.ctx.createBufferSource()
    src.buffer = this.noise
    src.loop = true
    const bp = this.ctx.createBiquadFilter()
    bp.type = 'bandpass'
    bp.Q.value = 1.2
    const [a, b] = direction > 0 ? [260, 1700] : [1500, 300]
    bp.frequency.setValueAtTime(a, now)
    bp.frequency.exponentialRampToValueAtTime(b, now + 0.9)
    const g = this.ctx.createGain()
    g.gain.setValueAtTime(0, now)
    g.gain.linearRampToValueAtTime(0.16, now + 0.45)
    g.gain.exponentialRampToValueAtTime(0.0001, now + 1.5)
    src.connect(bp).connect(g)
    g.connect(this.master)
    g.connect(this.reverb)
    src.start(now)
    src.stop(now + 1.6)
  }

  private chime(freq: number, delay: number) {
    const t = this.ctx.currentTime + delay
    const g = this.ctx.createGain()
    g.gain.setValueAtTime(0, t)
    g.gain.linearRampToValueAtTime(0.09, t + 0.01)
    g.gain.exponentialRampToValueAtTime(0.0001, t + 3.2)
    g.connect(this.reverb)
    g.connect(this.master)
    for (const [mult, amp] of [[1, 1], [2.01, 0.35], [3.98, 0.12]]) {
      const o = this.ctx.createOscillator()
      o.type = 'sine'
      o.frequency.value = freq * mult
      const og = this.ctx.createGain()
      og.gain.value = amp
      o.connect(og).connect(g)
      o.start(t)
      o.stop(t + 3.3)
    }
  }

  private shimmer() {
    const notes = [1174.66, 1318.51, 1479.98, 1760, 1975.53, 2349.32]
    notes.forEach((f, i) => this.chime(f, 0.15 + i * 0.09))
  }

  private impulse(seconds: number) {
    const rate = this.ctx.sampleRate
    const len = Math.floor(rate * seconds)
    const buf = this.ctx.createBuffer(2, len, rate)
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch)
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6)
    }
    return buf
  }
}
