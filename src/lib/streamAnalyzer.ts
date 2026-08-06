export interface StreamHighlight {
  start: number
  end: number
  score: number
  criteria: StreamCriteria
  label: string
}

export interface StreamCriteria {
  aboveThreshold: boolean
  suddenChange: boolean
  transient: boolean
  sustained: boolean
  wellAboveBaseline: boolean
  voiceDetected: boolean
}

export interface StreamAnalysisSettings {
  sensitivity: number
  minHighlightSec: number
  maxHighlightSec: number
  mergeGapSec: number
  chunkDurationSec: number
}

const DEFAULT_STREAM_SETTINGS: StreamAnalysisSettings = {
  sensitivity: 2.0,
  minHighlightSec: 10,
  maxHighlightSec: 60,
  mergeGapSec: 5,
  chunkDurationSec: 0.5,
}

export function computeRMS(samples: Float32Array): number {
  if (samples.length === 0) return 0
  let sum = 0
  for (let i = 0; i < samples.length; i++) {
    sum += samples[i] * samples[i]
  }
  return Math.sqrt(sum / samples.length)
}

export function computePeak(samples: Float32Array): number {
  let max = 0
  for (let i = 0; i < samples.length; i++) {
    const abs = Math.abs(samples[i])
    if (abs > max) max = abs
  }
  return max
}

export function computeCrestFactor(peak: number, rms: number): number {
  if (rms === 0) return 0
  return peak / rms
}

export function energyBasedVAD(
  rmsValues: number[],
  sensitivity: number = 1.0,
): boolean[] {
  if (rmsValues.length === 0) return []

  const sorted = [...rmsValues].sort((a, b) => a - b)
  const medianIdx = Math.floor(sorted.length / 2)
  const baseline = sorted[medianIdx]
  const threshold = baseline * (1.0 + sensitivity * 0.5)

  return rmsValues.map(rms => rms > threshold)
}

export function analyzeStreamAudio(
  audioBuffer: AudioBuffer,
  settings: Partial<StreamAnalysisSettings> = {},
): StreamHighlight[] {
  const s = { ...DEFAULT_STREAM_SETTINGS, ...settings }
  const sampleRate = audioBuffer.sampleRate
  const channelData = audioBuffer.getChannelData(0)
  const chunkSamples = Math.floor(sampleRate * s.chunkDurationSec)
  const totalChunks = Math.ceil(channelData.length / chunkSamples)

  const rmsValues: number[] = []
  for (let i = 0; i < totalChunks; i++) {
    const start = i * chunkSamples
    const end = Math.min(start + chunkSamples, channelData.length)
    const chunk = channelData.slice(start, end)
    rmsValues.push(computeRMS(chunk))
  }

  const vadResults = energyBasedVAD(rmsValues, s.sensitivity)
  const sorted = [...rmsValues].sort((a, b) => a - b)
  const baseline = sorted[Math.floor(sorted.length / 2)]
  const variance = rmsValues.reduce((sum, r) => sum + Math.pow(r - baseline, 2), 0) / rmsValues.length
  const stdDev = Math.sqrt(variance)

  const percentile = s.sensitivity <= 1.0 ? 75 : s.sensitivity <= 2.0 ? 82 : 90
  let threshold = sorted[Math.floor(sorted.length * percentile / 100)]
  if (threshold <= baseline * 1.15) {
    threshold = baseline * (1.0 + s.sensitivity * 0.35)
  }

  const highlights: StreamHighlight[] = []
  let currentStart = -1

  for (let i = 0; i < rmsValues.length; i++) {
    const time = i * s.chunkDurationSec
    const criteria = evaluateCriteria(rmsValues, i, baseline, stdDev, threshold, vadResults)

    const meetsThreshold = criteria.aboveThreshold && (
      criteria.voiceDetected ||
      [criteria.suddenChange, criteria.transient, criteria.sustained, criteria.wellAboveBaseline]
        .filter(Boolean).length >= 2
    )

    if (meetsThreshold) {
      if (currentStart === -1) currentStart = time
    } else {
      if (currentStart !== -1) {
        const dur = time - currentStart
        if (dur >= s.minHighlightSec) {
          const end = Math.min(time, currentStart + s.maxHighlightSec)
          const score = computeHighlightScore(rmsValues, currentStart, end, s.chunkDurationSec, baseline, stdDev)
          highlights.push({
            start: currentStart,
            end,
            score,
            criteria,
            label: criteria.voiceDetected ? 'Voice Highlight' : 'Action Highlight',
          })
        }
        currentStart = -1
      }
    }
  }

  if (currentStart !== -1) {
    const time = rmsValues.length * s.chunkDurationSec
    const dur = time - currentStart
    if (dur >= s.minHighlightSec) {
      const end = Math.min(time, currentStart + s.maxHighlightSec)
      const score = computeHighlightScore(rmsValues, currentStart, end, s.chunkDurationSec, baseline, stdDev)
      highlights.push({
        start: currentStart,
        end,
        score,
        criteria: evaluateCriteria(rmsValues, Math.floor(currentStart / s.chunkDurationSec), baseline, stdDev, threshold, vadResults),
        label: 'Highlight',
      })
    }
  }

  return mergeStreamHighlights(highlights, s.mergeGapSec, s.minHighlightSec)
}

function evaluateCriteria(
  rmsValues: number[],
  index: number,
  baseline: number,
  stdDev: number,
  threshold: number,
  vadResults: boolean[],
): StreamCriteria {
  const aboveThreshold = rmsValues[index] > threshold

  let suddenChange = false
  if (index >= 2) {
    const deltas: number[] = []
    for (let i = Math.max(0, index - 5); i < index; i++) {
      deltas.push(Math.abs(rmsValues[i + 1] - rmsValues[i]))
    }
    const avgDelta = deltas.length > 0 ? deltas.reduce((a, b) => a + b, 0) / deltas.length : 0
    const currentDelta = Math.abs(rmsValues[index] - rmsValues[index - 1])
    suddenChange = currentDelta > avgDelta * 1.5
  }

  let transient = false
  if (rmsValues[index] > 0) {
    const sorted = [...rmsValues].sort((a, b) => a - b)
    const peak = sorted[sorted.length - 1]
    transient = computeCrestFactor(peak, rmsValues[index]) > 2.0
  }

  let sustained = false
  if (index < rmsValues.length - 1) {
    sustained = rmsValues[index] > baseline * 1.2 && rmsValues[index + 1] > baseline * 1.2
  }

  const wellAboveBaseline = rmsValues[index] > baseline + 1.5 * stdDev
  const voiceDetected = index < vadResults.length && vadResults[index]

  return {
    aboveThreshold,
    suddenChange,
    transient,
    sustained,
    wellAboveBaseline,
    voiceDetected,
  }
}

function computeHighlightScore(
  rmsValues: number[],
  start: number,
  end: number,
  chunkDuration: number,
  baseline: number,
  stdDev: number,
): number {
  const startIdx = Math.floor(start / chunkDuration)
  const endIdx = Math.min(Math.floor(end / chunkDuration), rmsValues.length - 1)
  const chunkScores: number[] = []

  for (let i = startIdx; i <= endIdx; i++) {
    const score = stdDev > 0
      ? Math.min((rmsValues[i] - baseline) / stdDev, 2) / 2
      : 0
    chunkScores.push(Math.max(0, score))
  }

  if (chunkScores.length === 0) return 0
  return chunkScores.reduce((a, b) => a + b, 0) / chunkScores.length * 100
}

function mergeStreamHighlights(
  highlights: StreamHighlight[],
  mergeGapSec: number,
  minDurSec: number,
): StreamHighlight[] {
  if (highlights.length === 0) return []

  const sorted = [...highlights].sort((a, b) => a.start - b.start)
  const merged: StreamHighlight[] = [sorted[0]]

  for (let i = 1; i < sorted.length; i++) {
    const prev = merged[merged.length - 1]
    const curr = sorted[i]

    if (curr.start - prev.end <= mergeGapSec) {
      prev.end = Math.max(prev.end, curr.end)
      prev.score = Math.max(prev.score, curr.score)
      prev.label = curr.criteria.voiceDetected ? 'Voice Highlight' : prev.label
    } else {
      merged.push(curr)
    }
  }

  return merged.filter(h => h.end - h.start >= minDurSec * 0.5)
}
