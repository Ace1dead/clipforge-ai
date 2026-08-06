/**
 * Advanced Audio Analyzer — Multi-indicator scoring system.
 * Based on Auto-clipper's v3_temporal scoring + stream-clipper's VAD combo detection.
 * Client-side implementation using Web Audio API.
 */

export interface AudioChunk {
  time: number
  rms: number
  peak: number
  duration: number
}

export interface AudioSpike {
  start: number
  end: number
  score: number
  hasVoice: boolean
  intensity?: number
}

export interface MultiIndicatorInput {
  aboveThreshold: boolean
  suddenChange: boolean
  isTransient: boolean
  sustainedEnergy: boolean
  wellAboveBaseline: boolean
  voiceDetected: boolean
}

export interface VADSettings {
  frameSizeMs: number
  mode: 'normal' | 'aggressive' | 'very-aggressive'
  sampleRate: number
}

export interface SpikeDetectionSettings {
  thresholdDb: number
  minGapSec: number
  windowSizeSec?: number
  sensitivity?: number
}

// ═══════════════════════════════════════════════════════════════
// VOLUME SPIKE DETECTION (Auto-clipper + stream-clipper)
// ═══════════════════════════════════════════════════════════════

/**
 * Detects volume spikes using dynamic threshold.
 * Based on stream-clipper's analyze_audio() + Auto-clipper's detect_volume_spikes().
 */
export function detectVolumeSpikes(
  chunks: AudioChunk[],
  settings: SpikeDetectionSettings,
): AudioSpike[] {
  if (chunks.length === 0) return []

  const { thresholdDb, minGapSec } = settings
  const thresholdLinear = dbToLinear(thresholdDb)

  // Compute baseline (median RMS)
  const rmsValues = chunks.map(c => c.rms).sort((a, b) => a - b)
  const baseline = rmsValues[Math.floor(rmsValues.length / 2)]

  // Dynamic threshold: max of static threshold and baseline * multiplier
  const dynamicThreshold = Math.max(
    thresholdLinear,
    baseline * (1 + (settings.sensitivity ?? 2.0) * 0.35),
  )

  const spikes: AudioSpike[] = []
  let lastSpikeEnd = -minGapSec

  for (const chunk of chunks) {
    if (chunk.rms >= dynamicThreshold && chunk.time - lastSpikeEnd >= minGapSec) {
      spikes.push({
        start: chunk.time,
        end: chunk.time + chunk.duration,
        score: 0, // Computed later
        hasVoice: false, // Determined by VAD
      })
      lastSpikeEnd = chunk.time + chunk.duration
    }
  }

  return spikes
}

// ═══════════════════════════════════════════════════════════════
// MULTI-INDICATOR SCORING (Auto-clipper v3_temporal)
// ═══════════════════════════════════════════════════════════════

/**
 * Scores an audio chunk based on multiple indicators.
 * Each indicator adds points (max 100).
 *
 * Based on Auto-clipper's PixelAnalyzer scoring with audio indicators:
 * - Above threshold: +20
 * - Sudden change: +15
 * - Transient (crest factor): +10
 * - Sustained energy: +15
 * - Well above baseline: +10
 * - Voice detected: +30
 */
export function computeMultiIndicatorScore(input: MultiIndicatorInput): number {
  let score = 0

  if (input.aboveThreshold) score += 20
  if (input.suddenChange) score += 15
  if (input.isTransient) score += 10
  if (input.sustainedEnergy) score += 15
  if (input.wellAboveBaseline) score += 10
  if (input.voiceDetected) score += 30

  return Math.min(100, score)
}

// ═══════════════════════════════════════════════════════════════
// VOICE ACTIVITY DETECTION (stream-clipper VAD)
// ═══════════════════════════════════════════════════════════════

/**
 * Detects voice activity in audio chunks using energy-based VAD.
 * Based on stream-clipper's webrtc-vad approach but using Web Audio API.
 */
export function detectVoiceActivity(
  chunks: AudioChunk[],
  settings: VADSettings,
): Array<{ time: number; hasVoice: boolean; voiceRatio: number }> {
  if (chunks.length === 0) return []

  // Compute baseline energy
  const rmsValues = chunks.map(c => c.rms).sort((a, b) => a - b)
  const baseline = rmsValues[Math.floor(rmsValues.length / 2)]
  const stdDev = computeStdDev(rmsValues)

  // Voice threshold: above baseline + sensitivity factor
  const voiceThreshold = baseline + stdDev * 0.5

  // Aggressive mode raises threshold
  const multiplier = settings.mode === 'aggressive' ? 1.5
    : settings.mode === 'very-aggressive' ? 2.0
    : 1.0

  return chunks.map(chunk => {
    const voiceRatio = chunk.rms > voiceThreshold * multiplier
      ? Math.min(1, (chunk.rms - voiceThreshold) / (baseline * 2))
      : 0

    return {
      time: chunk.time,
      hasVoice: voiceRatio > 0.2,
      voiceRatio,
    }
  })
}

// ═══════════════════════════════════════════════════════════════
// SPIKE SCORING (stream-clipper formula)
// ═══════════════════════════════════════════════════════════════

/**
 * Computes final spike score (0-100).
 * Based on stream-clipper's score formula:
 * intensity = ((peak_rms / baseline - 1.0) * 30).clamp(0, 40)
 * quality_bonus = (quality - 40).max(0) * 0.6
 * voice_bonus = voice_ratio * 20.0
 * score = (intensity + quality_bonus + voice_bonus).clamp(0, 100)
 */
export function scoreAudioSpike(params: {
  rms: number
  baseline: number
  peak: number
  voiceRatio: number
  quality: number
}): number {
  const { rms, baseline, peak, voiceRatio, quality } = params

  const intensity = clamp(((peak / Math.max(baseline, 0.001)) - 1) * 30, 0, 40)
  const qualityBonus = Math.max(0, quality - 40) * 0.6
  const voiceBonus = clamp(voiceRatio * 20, 0, 20)

  return clamp(Math.round(intensity + qualityBonus + voiceBonus), 0, 100)
}

// ═══════════════════════════════════════════════════════════════
// SPIKE MERGING
// ═══════════════════════════════════════════════════════════════

/**
 * Merges overlapping or nearby spikes.
 * Based on stream-clipper's merge logic.
 */
export function mergeSpikes(
  spikes: AudioSpike[],
  gapTolerance: number = 0.5,
): AudioSpike[] {
  if (spikes.length === 0) return []

  const sorted = [...spikes].sort((a, b) => a.start - b.start)
  const merged: AudioSpike[] = [sorted[0]]

  for (let i = 1; i < sorted.length; i++) {
    const prev = merged[merged.length - 1]
    const curr = sorted[i]

    if (curr.start - prev.end <= gapTolerance) {
      prev.end = Math.max(prev.end, curr.end)
      prev.score = Math.max(prev.score, curr.score)
      prev.hasVoice = prev.hasVoice || curr.hasVoice
    } else {
      merged.push({ ...curr })
    }
  }

  return merged
}

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

function dbToLinear(db: number): number {
  return Math.pow(10, db / 20)
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function computeStdDev(values: number[]): number {
  if (values.length === 0) return 0
  const mean = values.reduce((a, b) => a + b, 0) / values.length
  const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length
  return Math.sqrt(variance)
}

/**
 * Extracts audio chunks from an AudioBuffer.
 * Used to prepare audio data for spike detection.
 */
export function extractChunks(buffer: AudioBuffer, chunkDuration: number = 0.5): AudioChunk[] {
  const channelData = buffer.getChannelData(0)
  const sampleRate = buffer.sampleRate
  const samplesPerChunk = Math.floor(sampleRate * chunkDuration)
  const chunks: AudioChunk[] = []

  for (let i = 0; i < channelData.length; i += samplesPerChunk) {
    const chunk = channelData.slice(i, i + samplesPerChunk)
    const rms = computeRMS(chunk)
    const peak = computePeak(chunk)

    chunks.push({
      time: i / sampleRate,
      rms,
      peak,
      duration: chunk.length / sampleRate,
    })
  }

  return chunks
}

function computeRMS(samples: Float32Array): number {
  if (samples.length === 0) return 0
  let sum = 0
  for (let i = 0; i < samples.length; i++) {
    sum += samples[i] ** 2
  }
  return Math.sqrt(sum / samples.length)
}

function computePeak(samples: Float32Array): number {
  if (samples.length === 0) return 0
  let peak = 0
  for (let i = 0; i < samples.length; i++) {
    peak = Math.max(peak, Math.abs(samples[i]))
  }
  return peak
}
