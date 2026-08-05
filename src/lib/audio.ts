import { encodeMp3 } from './mp3'
import { encodeWav } from './wav'
import { clamp } from './format'

let audioCtx: AudioContext | null = null

export function getAudioCtx(): AudioContext {
  if (!audioCtx) {
    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    audioCtx = new Ctor()
  }
  if (audioCtx.state === 'suspended') void audioCtx.resume()
  return audioCtx
}

export async function decodeAudio(source: Blob | string): Promise<AudioBuffer> {
  const ctx = getAudioCtx()
  let data: ArrayBuffer
  if (typeof source === 'string') {
    const res = await fetch(source)
    if (!res.ok) throw new Error('Could not load audio from URL')
    data = await res.arrayBuffer()
  } else {
    data = await source.arrayBuffer()
  }
  return await ctx.decodeAudioData(data)
}

export type AudioFormat = 'wav' | 'mp3'

export async function bufferToBlob(buffer: AudioBuffer, format: AudioFormat, kbps = 160): Promise<Blob> {
  if (format === 'mp3') {
    try {
      return await encodeMp3(buffer, kbps)
    } catch {
      return encodeWav(buffer)
    }
  }
  return encodeWav(buffer)
}

export function trimBuffer(buffer: AudioBuffer, startSec: number, endSec: number): AudioBuffer {
  const ctx = getAudioCtx()
  const sr = buffer.sampleRate
  const s = Math.max(0, Math.floor(startSec * sr))
  const e = Math.min(buffer.length, Math.floor(endSec * sr))
  const len = Math.max(1, e - s)
  const out = ctx.createBuffer(Math.min(2, buffer.numberOfChannels), len, sr)
  for (let c = 0; c < out.numberOfChannels; c++) {
    out.getChannelData(c).set(buffer.getChannelData(c).subarray(s, e))
  }
  return out
}

export function concatBuffers(list: AudioBuffer[]): AudioBuffer {
  const ctx = getAudioCtx()
  const total = list.reduce((n, b) => n + b.length, 0)
  const out = ctx.createBuffer(2, Math.max(1, total), list[0]?.sampleRate ?? ctx.sampleRate)
  let offset = 0
  for (const b of list) {
    for (let c = 0; c < 2; c++) {
      const src = b.numberOfChannels > c ? b.getChannelData(c) : b.getChannelData(b.numberOfChannels - 1)
      out.getChannelData(c).set(src, offset)
    }
    offset += b.length
  }
  return out
}

export function mixBuffers(layers: { buffer: AudioBuffer; gain: number }[]): AudioBuffer {
  const ctx = getAudioCtx()
  const sr = layers.length ? layers[0].buffer.sampleRate : ctx.sampleRate
  const total = layers.reduce((n, l) => Math.max(n, l.buffer.length), 0)
  const out = ctx.createBuffer(2, Math.max(1, total), sr)
  for (const layer of layers) {
    const g = layer.gain
    for (let c = 0; c < 2; c++) {
      const src = layer.buffer.numberOfChannels > c ? layer.buffer.getChannelData(c) : layer.buffer.getChannelData(layer.buffer.numberOfChannels - 1)
      const dst = out.getChannelData(c)
      for (let i = 0; i < src.length; i++) dst[i] += src[i] * g
    }
  }
  return out
}

export function applyGain(buffer: AudioBuffer, gain: number): AudioBuffer {
  const out = copyOf(buffer)
  for (let c = 0; c < out.numberOfChannels; c++) {
    const d = out.getChannelData(c)
    for (let i = 0; i < d.length; i++) d[i] *= gain
  }
  return out
}

function copyOf(buffer: AudioBuffer): AudioBuffer {
  const ctx = getAudioCtx()
  const out = ctx.createBuffer(buffer.numberOfChannels, buffer.length, buffer.sampleRate)
  for (let c = 0; c < buffer.numberOfChannels; c++) out.getChannelData(c).set(buffer.getChannelData(c))
  return out
}

export function analyzePeak(buffer: AudioBuffer): number {
  let peak = 0
  for (let c = 0; c < buffer.numberOfChannels; c++) {
    const d = buffer.getChannelData(c)
    for (let i = 0; i < d.length; i++) peak = Math.max(peak, Math.abs(d[i]))
  }
  return peak
}

export function normalizePeak(buffer: AudioBuffer, target = 0.89): AudioBuffer {
  const peak = analyzePeak(buffer)
  if (peak <= 0) return copyOf(buffer)
  return applyGain(buffer, target / peak)
}

export function loudnessNormalize(buffer: AudioBuffer, targetRms = 0.12): AudioBuffer {
  let sum = 0
  let count = 0
  for (let c = 0; c < buffer.numberOfChannels; c++) {
    const d = buffer.getChannelData(c)
    for (let i = 0; i < d.length; i++) { sum += d[i] * d[i]; count++ }
  }
  const rms = Math.sqrt(sum / Math.max(1, count))
  if (rms <= 0.0001) return copyOf(buffer)
  const gain = clamp(targetRms / rms, 0.1, 8)
  const out = applyGain(buffer, gain)
  const peak = analyzePeak(out)
  return peak > 1 ? applyGain(out, 0.95 / peak) : out
}

export interface EnhanceOpts { deNoise: number; presence: number; warm: number; air: number; compress: boolean }

export async function enhanceSpeech(buffer: AudioBuffer, opts: EnhanceOpts): Promise<AudioBuffer> {
  let out = buffer
  if (opts.deNoise > 0) out = await spectralGate(out, opts.deNoise)
  const offline = new OfflineAudioContext(2, out.length, out.sampleRate)
  const src = offline.createBufferSource()
  src.buffer = out
  const chain: AudioNode[] = [src]
  if (opts.warm > 0) { const f = offline.createBiquadFilter(); f.type = 'lowshelf'; f.frequency.value = 250; f.gain.value = opts.warm * 6; chain.push(f) }
  if (opts.presence > 0) { const f = offline.createBiquadFilter(); f.type = 'peaking'; f.frequency.value = 3200; f.Q.value = 0.9; f.gain.value = opts.presence * 5; chain.push(f) }
  if (opts.air > 0) { const f = offline.createBiquadFilter(); f.type = 'highshelf'; f.frequency.value = 8000; f.gain.value = opts.air * 5; chain.push(f) }
  const hp = offline.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 70
  chain.push(hp)
  if (opts.compress) {
    const comp = offline.createDynamicsCompressor()
    comp.threshold.value = -20
    comp.knee.value = 10
    comp.ratio.value = 3.5
    comp.attack.value = 0.004
    comp.release.value = 0.12
    chain.push(comp)
    const makeup = offline.createGain(); makeup.gain.value = 1.8
    chain.push(makeup)
  }
  for (let i = 0; i < chain.length - 1; i++) chain[i].connect(chain[i + 1])
  chain[chain.length - 1].connect(offline.destination)
  src.start(0)
  const rendered = await offline.startRendering()
  return normalizePeak(rendered, 0.94)
}

/** STFT spectral gating — reduces steady background noise (hiss/hum). */
function spectralGate(buffer: AudioBuffer, amount: number): Promise<AudioBuffer> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      try {
        const ctx = getAudioCtx()
        const mono = buffer.getChannelData(0)
        const sr = buffer.sampleRate
        const N = 2048
        const hop = N / 4
        const win = hann(N)
        const frames: number = Math.max(0, Math.floor((mono.length - N) / hop) + 1)
        if (frames < 4) { resolve(copyOf(buffer)); return }

        const fft = new FFT(N)
        const spectra: Float32Array[] = []
        const rmsPerFrame: number[] = []
        const time = new Float64Array(N)
        for (let f = 0; f < frames; f++) {
          for (let i = 0; i < N; i++) time[i] = mono[f * hop + i] * win[i]
          const re = time.slice()
          const im = new Float64Array(N)
          fft.forward(re, im)
          const mag = new Float32Array(N / 2 + 1)
          let rms = 0
          for (let i = 0; i < mag.length; i++) {
            const m = Math.sqrt(re[i] * re[i] + im[i] * im[i])
            mag[i] = m
            rms += m * m
          }
          spectra.push(mag)
          rmsPerFrame.push(Math.sqrt(rms / mag.length))
        }
        const sorted = [...rmsPerFrame].sort((a, b) => a - b)
        const noiseFloor = sorted[Math.floor(sorted.length * 0.2)] || 0.001
        const floorMult = 1.4 + (1 - amount) * 1.2

        const out = new Float32Array(mono.length)
        const outCount = new Float32Array(mono.length)
        const synth = new Float32Array(N)
        for (let f = 0; f < frames; f++) {
          const mag = spectra[f]
          const frameRe = new Float64Array(N)
          const frameIm = new Float64Array(N)
          for (let i = 0; i < mag.length; i++) {
            const ref = Math.max(noiseFloor * floorMult, mag[i] * 0.15)
            const scale = mag[i] <= ref ? Math.pow(mag[i] / Math.max(ref, 1e-9), 1.6) : 1
            frameRe[i] = mag[i] * scale
            frameIm[i] = mag[i] * scale * 0.3
          }
          fft.inverse(frameRe, frameIm)
          for (let i = 0; i < N; i++) synth[i] = frameRe[i] * win[i]
          for (let i = 0; i < N; i++) {
            const idx = f * hop + i
            if (idx < out.length) { out[idx] += synth[i]; outCount[idx] += win[i] }
          }
        }
        for (let i = 0; i < out.length; i++) out[i] = outCount[i] > 0.0001 ? out[i] / outCount[i] : 0
        const result = ctx.createBuffer(2, mono.length, sr)
        result.getChannelData(0).set(out)
        result.getChannelData(1).set(out)
        resolve(normalizePeak(result, 0.92))
      } catch (e) {
        reject(e instanceof Error ? e : new Error('Spectral processing failed'))
      }
    }, 0)
  })
}

function hann(n: number): Float32Array {
  const w = new Float32Array(n)
  for (let i = 0; i < n; i++) w[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (n - 1)))
  return w
}

/** Minimal radix-2 FFT (real+imag arrays, in-place). */
class FFT {
  private n: number
  private bitRev: number[]
  constructor(n: number) { this.n = n; this.bitRev = buildBitRev(n) }
  forward(re: Float64Array, im: Float64Array): void { this.transform(re, im, false) }
  inverse(re: Float64Array, im: Float64Array): void { this.transform(re, im, true) }
  private transform(re: Float64Array, im: Float64Array, invert: boolean): void {
    const n = this.n
    for (let i = 0; i < n; i++) {
      const j = this.bitRev[i]
      if (j > i) { const tr = re[i]; re[i] = re[j]; re[j] = tr; const ti = im[i]; im[i] = im[j]; im[j] = ti }
    }
    for (let len = 2; len <= n; len <<= 1) {
      const ang = (2 * Math.PI / len) * (invert ? 1 : -1)
      const wr = Math.cos(ang)
      const wi = Math.sin(ang)
      for (let i = 0; i < n; i += len) {
        let cr = 1, ci = 0
        const half = len >> 1
        for (let k = 0; k < half; k++) {
          const ur = re[i + k], ui = im[i + k]
          const vr = re[i + k + half] * cr - im[i + k + half] * ci
          const vi = re[i + k + half] * ci + im[i + k + half] * cr
          re[i + k] = ur + vr; im[i + k] = ui + vi
          re[i + k + half] = ur - vr; im[i + k + half] = ui - vi
          const nwr = cr * wr - ci * wi
          ci = cr * wi + ci * wr
          cr = nwr
        }
      }
    }
    if (invert) { for (let i = 0; i < n; i++) { re[i] /= n; im[i] /= n } }
  }
}

function buildBitRev(n: number): number[] {
  const out = new Array<number>(n)
  const bits = Math.round(Math.log2(n))
  for (let i = 0; i < n; i++) {
    let rev = 0
    let x = i
    for (let b = 0; b < bits; b++) { rev = (rev << 1) | (x & 1); x >>= 1 }
    out[i] = rev
  }
  return out
}

/** Classic karaoke vocal removal via L-R center cancellation. */
export function vocalRemove(buffer: AudioBuffer): AudioBuffer {
  const ctx = getAudioCtx()
  const out = ctx.createBuffer(2, buffer.length, buffer.sampleRate)
  if (buffer.numberOfChannels >= 2) {
    const l = buffer.getChannelData(0)
    const r = buffer.getChannelData(1)
    const o1 = out.getChannelData(0)
    const o2 = out.getChannelData(1)
    for (let i = 0; i < buffer.length; i++) {
      const v = (l[i] - r[i]) * 1.4
      o1[i] = v
      o2[i] = v
    }
  } else {
    const m = buffer.getChannelData(0)
    const o1 = out.getChannelData(0)
    const o2 = out.getChannelData(1)
    for (let i = 0; i < buffer.length; i++) { o1[i] = m[i] * 0.6; o2[i] = m[i] * 0.6 }
  }
  return normalizePeak(out, 0.92)
}

export async function extractVocals(buffer: AudioBuffer): Promise<AudioBuffer> {
  const ctx = getAudioCtx()
  const length = buffer.length
  const mono = ctx.createBuffer(1, length, buffer.sampleRate)
  if (buffer.numberOfChannels >= 2) {
    const l = buffer.getChannelData(0)
    const r = buffer.getChannelData(1)
    const m = mono.getChannelData(0)
    for (let i = 0; i < length; i++) m[i] = (l[i] + r[i]) / 2
  } else {
    mono.getChannelData(0).set(buffer.getChannelData(0))
  }
  const offline = new OfflineAudioContext(1, length, buffer.sampleRate)
  const src = offline.createBufferSource()
  src.buffer = mono
  const hp = offline.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 180
  const comp = offline.createDynamicsCompressor(); comp.threshold.value = -16; comp.ratio.value = 3
  src.connect(hp); hp.connect(comp); comp.connect(offline.destination)
  src.start(0)
  const rendered = await offline.startRendering()
  return normalizePeak(rendered, 0.92)
}

/** Resample for pitch shifting. Returns buffer + playbackRate to keep duration. */
export function pitchShift(buffer: AudioBuffer, semitones: number): { buffer: AudioBuffer; rate: number } {
  const factor = Math.pow(2, semitones / 12)
  const newLen = Math.max(2, Math.floor(buffer.length / factor))
  const ctx = getAudioCtx()
  const out = ctx.createBuffer(Math.min(2, buffer.numberOfChannels), newLen, buffer.sampleRate)
  for (let c = 0; c < out.numberOfChannels; c++) {
    const src = buffer.getChannelData(c)
    const dst = out.getChannelData(c)
    for (let i = 0; i < newLen; i++) {
      const pos = i * factor
      const i0 = Math.floor(pos)
      const i1 = Math.min(src.length - 1, i0 + 1)
      const frac = pos - i0
      dst[i] = src[i0] * (1 - frac) + src[i1] * frac
    }
  }
  return { buffer: out, rate: factor }
}

export function analyzeEnergy(buffer: AudioBuffer, windowSec = 0.5): number[] {
  const sr = buffer.sampleRate
  const win = Math.max(1, Math.floor(windowSec * sr))
  const steps = Math.max(1, Math.floor(buffer.length / win))
  const out: number[] = []
  const d = buffer.getChannelData(0)
  for (let s = 0; s < steps; s++) {
    let sum = 0
    const start = s * win
    const end = Math.min(buffer.length, start + win)
    for (let i = start; i < end; i++) sum += d[i] * d[i]
    out.push(Math.sqrt(sum / Math.max(1, end - start)))
  }
  return out
}

export interface SpeechSegment { start: number; end: number; score: number }

export function speechSegments(buffer: AudioBuffer, windowSec = 0.5): SpeechSegment[] {
  const energy = analyzeEnergy(buffer, windowSec)
  const sorted = [...energy].sort((a, b) => a - b)
  const thresh = Math.max(sorted[Math.floor(sorted.length * 0.5)] ?? 0, (sorted[sorted.length - 1] ?? 0) * 0.12)
  const win = windowSec
  const segs: SpeechSegment[] = []
  let cur: { start: number; score: number } | null = null
  for (let i = 0; i < energy.length; i++) {
    const t = i * win
    if (energy[i] > thresh) {
      if (!cur) cur = { start: t, score: 0 }
      cur.score += energy[i]
    } else if (cur) {
      segs.push({ start: cur.start, end: t, score: cur.score })
      cur = null
    }
  }
  if (cur) segs.push({ start: cur.start, end: energy.length * win, score: cur.score })
  return segs.filter((s) => s.end - s.start >= 0.4)
}

export function getWaveform(buffer: AudioBuffer, buckets = 120): number[] {
  const d = buffer.getChannelData(0)
  const out: number[] = []
  const per = Math.max(1, Math.floor(d.length / buckets))
  for (let b = 0; b < buckets; b++) {
    let peak = 0
    const start = b * per
    const end = Math.min(d.length, start + per)
    for (let i = start; i < end; i++) peak = Math.max(peak, Math.abs(d[i]))
    out.push(peak)
  }
  return out
}

// ─── Beat Detection ────────────────────────────────────────────

export interface BeatInfo {
  bpm: number
  beatTimes: number[]
  tempo: 'slow' | 'mid' | 'fast' | 'very_fast'
  energyBands: { bass: number; mid: number; treble: number }
  onsetStrength: number[]
  confidence: number
}

/**
 * Detect beats in an audio buffer using spectral flux onset detection
 * and autocorrelation-based BPM estimation.
 */
export function detectBeats(buffer: AudioBuffer): BeatInfo {
  const mono = buffer.getChannelData(0)
  const sr = buffer.sampleRate
  const N = 2048
  const hop = 512
  const win = hann(N)
  const fft = new FFT(N)
  const numBins = N / 2 + 1

  // Band boundaries (Hz → bin index)
  const bassEnd = Math.floor(250 * N / sr)
  const midEnd = Math.floor(4000 * N / sr)

  // Compute spectral flux per frame
  const frames = Math.max(1, Math.floor((mono.length - N) / hop))
  const spectralFlux: number[] = []
  const bandEnergies: { bass: number; mid: number; treble: number }[] = []
  let prevMag = new Float32Array(numBins)

  for (let f = 0; f < frames; f++) {
    const frame = new Float64Array(N)
    for (let i = 0; i < N; i++) {
      const idx = f * hop + i
      frame[i] = idx < mono.length ? mono[idx] * win[i] : 0
    }
    const im = new Float64Array(N)
    fft.forward(frame, im)

    const mag = new Float32Array(numBins)
    let bass = 0, mid = 0, treble = 0
    for (let i = 0; i < numBins; i++) {
      mag[i] = Math.sqrt(frame[i] * frame[i] + im[i] * im[i])
      if (i < bassEnd) bass += mag[i]
      else if (i < midEnd) mid += mag[i]
      else treble += mag[i]
    }

    // Half-wave rectified spectral flux (only positive changes)
    let flux = 0
    for (let i = 0; i < numBins; i++) {
      const diff = mag[i] - prevMag[i]
      if (diff > 0) flux += diff
    }
    spectralFlux.push(flux)
    bandEnergies.push({
      bass: bass / Math.max(1, bassEnd),
      mid: mid / Math.max(1, midEnd - bassEnd),
      treble: treble / Math.max(1, numBins - midEnd),
    })
    prevMag = mag
  }

  // Normalize onset strength
  const maxFlux = Math.max(...spectralFlux, 0.001)
  for (let i = 0; i < spectralFlux.length; i++) spectralFlux[i] /= maxFlux

  // Adaptive threshold peak picking for beat times
  const beatTimes = peakPickOnsets(spectralFlux, hop, sr)

  // BPM estimation via autocorrelation
  const bpm = estimateBPM(spectralFlux, sr, hop)

  // Classify tempo
  let tempo: BeatInfo['tempo'] = 'mid'
  if (bpm < 80) tempo = 'slow'
  else if (bpm < 110) tempo = 'mid'
  else if (bpm < 140) tempo = 'fast'
  else tempo = 'very_fast'

  // Average band energies
  const avgBands = bandEnergies.reduce(
    (acc, b) => ({ bass: acc.bass + b.bass, mid: acc.mid + b.mid, treble: acc.treble + b.treble }),
    { bass: 0, mid: 0, treble: 0 }
  )
  const n = Math.max(1, bandEnergies.length)
  const energyBands = { bass: avgBands.bass / n, mid: avgBands.mid / n, treble: avgBands.treble / n }

  // Confidence: how periodic are the detected beats
  const confidence = beatTimes.length > 2 ? computePeriodicityConfidence(beatTimes) : 0.5

  return { bpm, beatTimes, tempo, energyBands, onsetStrength: spectralFlux, confidence }
}

/** Peak-pick onsets using adaptive thresholding */
function peakPickOnsets(flux: number[], hop: number, sr: number): number[] {
  const beats: number[] = []
  const windowSize = 16 // ~500ms at typical frame rates
  const thresholdMult = 1.4
  const minInterval = Math.floor(sr * 0.3 / hop) // minimum 300ms between beats

  for (let i = windowSize; i < flux.length - 1; i++) {
    // Local mean over past window
    let localMean = 0
    for (let j = Math.max(0, i - windowSize); j < i; j++) localMean += flux[j]
    localMean /= windowSize

    const threshold = localMean * thresholdMult + 0.02
    if (flux[i] > threshold && flux[i] > flux[i - 1] && flux[i] >= flux[i + 1]) {
      const timeSec = (i * hop) / sr
      if (beats.length === 0 || i - (beats[beats.length - 1] * sr / hop) >= minInterval) {
        beats.push(timeSec)
      }
    }
  }
  return beats
}

/** Estimate BPM via autocorrelation of the onset strength signal */
function estimateBPM(flux: number[], sr: number, hop: number): number {
  const minBPM = 60
  const maxBPM = 180
  const minLag = Math.floor(60 * sr / (maxBPM * hop))
  const maxLag = Math.floor(60 * sr / (minBPM * hop))

  let bestCorr = -1
  let bestLag = minLag

  for (let lag = minLag; lag <= Math.min(maxLag, flux.length - 1); lag++) {
    let corr = 0
    let count = 0
    for (let i = 0; i < flux.length - lag; i++) {
      corr += flux[i] * flux[i + lag]
      count++
    }
    corr /= Math.max(1, count)

    // Prefer integer multiples (downbeat emphasis)
    if (lag % 2 === 0) corr *= 1.05

    if (corr > bestCorr) {
      bestCorr = corr
      bestLag = lag
    }
  }

  const bpm = (60 * sr) / (bestLag * hop)
  return Math.round(Math.max(minBPM, Math.min(maxBPM, bpm)))
}

/** Compute how periodic the beat intervals are (0-1) */
function computePeriodicityConfidence(beatTimes: number[]): number {
  if (beatTimes.length < 3) return 0.5
  const intervals: number[] = []
  for (let i = 1; i < beatTimes.length; i++) intervals.push(beatTimes[i] - beatTimes[i - 1])
  const mean = intervals.reduce((a, b) => a + b, 0) / intervals.length
  const variance = intervals.reduce((a, b) => a + (b - mean) ** 2, 0) / intervals.length
  const cv = Math.sqrt(variance) / Math.max(mean, 0.001) // coefficient of variation
  return Math.max(0, Math.min(1, 1 - cv)) // lower CV = higher confidence
}

/** Get beat times nearest to a given time (for UI markers) */
export function getNearestBeats(beatTimes: number[], time: number, count = 4): number[] {
  return beatTimes
    .map(t => ({ t, dist: Math.abs(t - time) }))
    .sort((a, b) => a.dist - b.dist)
    .slice(0, count)
    .map(b => b.t)
    .sort((a, b) => a - b)
}

/** Get the beat energy at a specific time (for triggering effects) */
export function getBeatIntensity(beatTimes: number[], time: number, decaySec = 0.15): number {
  let minDist = Infinity
  for (const bt of beatTimes) {
    const d = Math.abs(bt - time)
    if (d < minDist) minDist = d
  }
  return Math.max(0, 1 - minDist / decaySec)
}