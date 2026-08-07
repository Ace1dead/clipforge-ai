/**
 * Audio Mixer — Multi-track audio mixing with ducking, fades, and EQ.
 * Rivals Premiere Pro's Audio Track Mixer and DaVinci's Fairlight.
 */

export interface AudioTrack {
  id: string
  name: string
  volume: number            // 0-2 (1 = unity gain)
  pan: number               // -1 (left) to 1 (right)
  muted: boolean
  solo: boolean
  gain: number              // dB (-60 to 12)
  eq: AudioEQ
  fades: AudioFades
  clips: AudioClip[]
}

export interface AudioClip {
  id: string
  url: string
  startTime: number         // timeline position
  duration: number
  volume: number            // 0-1
  fadeIn: number            // seconds
  fadeOut: number           // seconds
  trimStart: number         // seconds into source
  trimEnd: number
}

export interface AudioEQ {
  low: number               // -12 to 12 dB
  mid: number
  high: number
  lowFreq: number           // Hz (60-250)
  highFreq: number          // Hz (2000-8000)
}

export interface AudioFades {
  in: number                // seconds
  out: number
  curveIn: 'linear' | 'exponential' | 'scurve'
  curveOut: 'linear' | 'exponential' | 'scurve'
}

export interface DuckingConfig {
  enabled: boolean
  sourceTrackId: string     // track that triggers ducking (e.g., voiceover)
  targetTrackId: string     // track to duck (e.g., music)
  threshold: number         // -60 to 0 dB
  ratio: number             // 1:1 to 20:1
  attack: number            // ms
  release: number           // ms
  duckAmount: number        // dB to reduce (1-20)
}

export interface MixerState {
  tracks: AudioTrack[]
  masterVolume: number      // 0-2
  masterEQ: AudioEQ
  ducking: DuckingConfig
  compressor: {
    enabled: boolean
    threshold: number
    ratio: number
    attack: number
    release: number
    gain: number
  }
  limiter: {
    enabled: boolean
    ceiling: number          // dB (-0.1 to 0)
  }
}

const DEFAULT_EQ: AudioEQ = { low: 0, mid: 0, high: 0, lowFreq: 200, highFreq: 4000 }
const DEFAULT_FADES: AudioFades = { in: 0, out: 0, curveIn: 'exponential', curveOut: 'exponential' }

export function createMixerState(): MixerState {
  return {
    tracks: [],
    masterVolume: 1,
    masterEQ: { ...DEFAULT_EQ },
    ducking: {
      enabled: false,
      sourceTrackId: '',
      targetTrackId: '',
      threshold: -20,
      ratio: 4,
      attack: 10,
      release: 200,
      duckAmount: 6,
    },
    compressor: { enabled: false, threshold: -12, ratio: 4, attack: 10, release: 100, gain: 0 },
    limiter: { enabled: false, ceiling: -0.1 },
  }
}

export function createAudioTrack(name: string): AudioTrack {
  return {
    id: `audio-track-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name,
    volume: 1,
    pan: 0,
    muted: false,
    solo: false,
    gain: 0,
    eq: { ...DEFAULT_EQ },
    fades: { ...DEFAULT_FADES },
    clips: [],
  }
}

// ═══════════════════════════════════════════════════════════════
// WEB AUDIO API PROCESSING
// ═══════════════════════════════════════════════════════════════

export interface AudioChainResult {
  destination: GainNode
  trackNodes: Map<string, { source: MediaElementAudioSourceNode; gain: GainNode; panner: StereoPannerNode; eq: BiquadFilterNode[] }>
}

/**
 * Build a Web Audio API processing chain for a mixer state.
 * Returns the destination node to connect to a MediaStream or output.
 */
export function buildAudioChain(
  audioCtx: AudioContext,
  state: MixerState,
): AudioChainResult {
  const masterGain = audioCtx.createGain()
  masterGain.gain.value = state.masterVolume

  // Master EQ
  const masterLow = audioCtx.createBiquadFilter()
  masterLow.type = 'lowshelf'
  masterLow.frequency.value = state.masterEQ.lowFreq
  masterLow.gain.value = state.masterEQ.low

  const masterMid = audioCtx.createBiquadFilter()
  masterMid.type = 'peaking'
  masterMid.frequency.value = (state.masterEQ.lowFreq + state.masterEQ.highFreq) / 2
  masterMid.Q.value = 0.7
  masterMid.gain.value = state.masterEQ.mid

  const masterHigh = audioCtx.createBiquadFilter()
  masterHigh.type = 'highshelf'
  masterHigh.frequency.value = state.masterEQ.highFreq
  masterHigh.gain.value = state.masterEQ.high

  // Master compressor
  let lastNode: AudioNode = masterHigh
  if (state.compressor.enabled) {
    const comp = audioCtx.createDynamicsCompressor()
    comp.threshold.value = state.compressor.threshold
    comp.ratio.value = state.compressor.ratio
    comp.attack.value = state.compressor.attack / 1000
    comp.release.value = state.compressor.release / 1000
    lastNode.connect(comp)
    lastNode = comp
  }

  // Master limiter
  if (state.limiter.enabled) {
    const limiter = audioCtx.createDynamicsCompressor()
    limiter.threshold.value = state.limiter.ceiling
    limiter.ratio.value = 20
    limiter.attack.value = 0.001
    limiter.release.value = 0.01
    lastNode.connect(limiter)
    lastNode = limiter
  }

  lastNode.connect(masterGain)

  const trackNodes = new Map<string, { source: MediaElementAudioSourceNode; gain: GainNode; panner: StereoPannerNode; eq: BiquadFilterNode[] }>()

  for (const track of state.tracks) {
    if (track.muted) continue

    const trackGain = audioCtx.createGain()
    trackGain.gain.value = track.volume * (track.gain > 0 ? Math.pow(10, track.gain / 20) : 1)

    const panner = audioCtx.createStereoPanner()
    panner.pan.value = track.pan

    // Track EQ
    const low = audioCtx.createBiquadFilter()
    low.type = 'lowshelf'
    low.frequency.value = track.eq.lowFreq
    low.gain.value = track.eq.low

    const mid = audioCtx.createBiquadFilter()
    mid.type = 'peaking'
    mid.frequency.value = (track.eq.lowFreq + track.eq.highFreq) / 2
    mid.Q.value = 0.7
    mid.gain.value = track.eq.mid

    const high = audioCtx.createBiquadFilter()
    high.type = 'highshelf'
    high.frequency.value = track.eq.highFreq
    high.gain.value = track.eq.high

    // Chain: source -> gain -> panner -> eq low -> mid -> high -> master
    trackGain.connect(panner)
    panner.connect(low)
    low.connect(mid)
    mid.connect(high)
    high.connect(masterLow)

    trackNodes.set(track.id, { source: null as any, gain: trackGain, panner, eq: [low, mid, high] })
  }

  return { destination: masterGain, trackNodes }
}

// ═══════════════════════════════════════════════════════════════
// DUCKING
// ═══════════════════════════════════════════════════════════════

/**
 * Calculate ducking gain reduction for a target track based on source track level.
 */
export function calculateDucking(
  sourceLevel: number,       // RMS level of source (0-1)
  config: DuckingConfig,
): number {
  if (!config.enabled) return 1

  const sourceDb = sourceLevel > 0 ? 20 * Math.log10(sourceLevel) : -60
  if (sourceDb < config.threshold) return 1

  const overDb = sourceDb - config.threshold
  const reductionDb = overDb * (1 - 1 / config.ratio)
  const duckDb = Math.min(reductionDb, config.duckAmount)

  return Math.pow(10, -duckDb / 20)
}

// ═══════════════════════════════════════════════════════════════
// FADE CURVES
// ═══════════════════════════════════════════════════════════════

export function getFadeGain(
  time: number,
  clipStart: number,
  clipEnd: number,
  fadeIn: number,
  fadeOut: number,
  curveIn: 'linear' | 'exponential' | 'scurve',
  curveOut: 'linear' | 'exponential' | 'scurve',
): number {
  let gain = 1

  // Fade in
  if (fadeIn > 0 && time < clipStart + fadeIn) {
    const t = (time - clipStart) / fadeIn
    gain *= applyFadeCurve(Math.max(0, Math.min(1, t)), curveIn)
  }

  // Fade out
  if (fadeOut > 0 && time > clipEnd - fadeOut) {
    const t = (clipEnd - time) / fadeOut
    gain *= applyFadeCurve(Math.max(0, Math.min(1, t)), curveOut)
  }

  return gain
}

function applyFadeCurve(t: number, curve: 'linear' | 'exponential' | 'scurve'): number {
  switch (curve) {
    case 'linear': return t
    case 'exponential': return t * t
    case 'scurve': return t * t * (3 - 2 * t)
  }
}

// ═══════════════════════════════════════════════════════════════
// WAVEFORM GENERATION
// ═══════════════════════════════════════════════════════════════

/**
 * Generate waveform peaks from an AudioBuffer for visualization.
 */
export function generateWaveformPeaks(
  audioBuffer: AudioBuffer,
  numPeaks: number,
): number[] {
  const raw = audioBuffer.getChannelData(0)
  const peaks: number[] = []
  const samplesPerPeak = Math.floor(raw.length / numPeaks)

  for (let i = 0; i < numPeaks; i++) {
    let max = 0
    const start = i * samplesPerPeak
    for (let j = start; j < start + samplesPerPeak && j < raw.length; j++) {
      const abs = Math.abs(raw[j])
      if (abs > max) max = abs
    }
    peaks.push(max)
  }

  return peaks
}
