export interface AudioAnalysisWindow {
  time: number
  rms: number
  peak: number
  motionScore: number
  sceneChangeScore: number
  hybridScore: number
  quality: number
  voiceDetected: boolean
}

export interface HybridAnalysisResult {
  windows: AudioAnalysisWindow[]
  peaks: number[]
  highlights: HighlightSegment[]
  settings: HybridSettings
}

export interface HighlightSegment {
  start: number
  end: number
  score: number
  label: string
}

export interface HybridSettings {
  windowSizeSec: number
  sensitivity: number
  motionWeight: number
  sceneWeight: number
  voiceBonus: number
  mergeGapSec: number
  minClipSec: number
  maxClipSec: number
}

const DEFAULT_SETTINGS: HybridSettings = {
  windowSizeSec: 0.5,
  sensitivity: 2.0,
  motionWeight: 0.8,
  sceneWeight: 0.6,
  voiceBonus: 0.3,
  mergeGapSec: 8,
  minClipSec: 15,
  maxClipSec: 60,
}

export function rmsToScore(rms: number, threshold: number = 0.01, ceiling: number = 0.5): number {
  if (rms < threshold) return 0
  return Math.min((rms - threshold) / (ceiling - threshold), 1.0)
}

export function computeMotionScore(prevFrame: Uint8ClampedArray, currFrame: Uint8ClampedArray): number {
  if (prevFrame.length !== currFrame.length) return 0

  let sumDiff = 0
  const step = 4
  for (let i = 0; i < prevFrame.length; i += step) {
    const diff = Math.abs(prevFrame[i] - currFrame[i])
    sumDiff += diff
  }

  const pixels = prevFrame.length / step
  return Math.min((sumDiff / pixels) / 255, 1.0)
}

export function computeSceneChangeScore(
  hist1: number[],
  hist2: number[],
): number {
  if (hist1.length !== hist2.length || hist1.length === 0) return 0

  let chiSquared = 0
  let total1 = 0
  let total2 = 0

  for (let i = 0; i < hist1.length; i++) {
    total1 += hist1[i]
    total2 += hist2[i]
  }

  if (total1 === 0 || total2 === 0) return 0

  for (let i = 0; i < hist1.length; i++) {
    const expected = (hist1[i] + hist2[i]) / 2
    if (expected > 0) {
      chiSquared += Math.pow(hist1[i] / total1 - hist2[i] / total2, 2) / expected
    }
  }

  return Math.min(chiSquared * 10, 1.0)
}

export function computeColorHistogram(imageData: Uint8ClampedArray, bins = 64): number[] {
  const hist = new Array(bins * 3).fill(0)
  const binSize = 256 / bins

  for (let i = 0; i < imageData.length; i += 4) {
    const r = Math.min(Math.floor(imageData[i] / binSize), bins - 1)
    const g = Math.min(Math.floor(imageData[i + 1] / binSize), bins - 1)
    const b = Math.min(Math.floor(imageData[i + 2] / binSize), bins - 1)
    hist[r]++
    hist[bins + g]++
    hist[bins * 2 + b]++
  }

  return hist
}

export function voiceActivityDetect(
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

export function analyzeHybridWindows(
  rmsFrames: number[],
  motionFrames: number[],
  sceneFrames: number[],
  vadFrames: boolean[],
  fps: number,
  settings: Partial<HybridSettings> = {},
): AudioAnalysisWindow[] {
  const s = { ...DEFAULT_SETTINGS, ...settings }
  const windowsPerFrame = Math.max(1, Math.round(1 / (s.windowSizeSec * fps)))

  const windows: AudioAnalysisWindow[] = []

  for (let i = 0; i < rmsFrames.length; i += windowsPerFrame) {
    const end = Math.min(i + windowsPerFrame, rmsFrames.length)
    const chunkRms = rmsFrames.slice(i, end)
    const chunkMotion = motionFrames.slice(i, end)
    const chunkScene = sceneFrames.slice(i, end)
    const chunkVad = vadFrames.slice(i, end)

    const avgRms = chunkRms.reduce((a, b) => a + b, 0) / chunkRms.length
    const avgMotion = chunkMotion.length > 0
      ? chunkMotion.reduce((a, b) => a + b, 0) / chunkMotion.length
      : 0
    const avgScene = chunkScene.length > 0
      ? chunkScene.reduce((a, b) => a + b, 0) / chunkScene.length
      : 0
    const voiceDetected = chunkVad.some(v => v)

    const audioScore = rmsToScore(avgRms)
    const maxScore = Math.max(audioScore, avgMotion, avgScene)
    const signalsActive = [audioScore, avgMotion, avgScene].filter(s => s >= 0.2).length

    let hybridScore = maxScore
    if (signalsActive >= 3) hybridScore = maxScore * 1.3
    else if (signalsActive >= 2) hybridScore = maxScore * 1.15

    if (voiceDetected) hybridScore += s.voiceBonus

    hybridScore = Math.min(hybridScore, 1.0)

    windows.push({
      time: (i / fps),
      rms: avgRms,
      peak: Math.max(...chunkRms),
      motionScore: avgMotion,
      sceneChangeScore: avgScene,
      hybridScore,
      quality: hybridScore,
      voiceDetected,
    })
  }

  return windows
}

export function computeDynamicThreshold(
  scores: number[],
  sensitivity: number = 2.0,
): number {
  if (scores.length === 0) return 0

  const sorted = [...scores].sort((a, b) => a - b)
  const percentile = sensitivity <= 1.0 ? 75 : sensitivity <= 2.0 ? 82 : sensitivity <= 3.0 ? 90 : 95
  const idx = Math.floor(sorted.length * percentile / 100)
  let threshold = sorted[idx]

  const baseline = sorted[Math.floor(sorted.length / 2)]
  if (threshold <= baseline * 1.15) {
    threshold = baseline * (1.0 + sensitivity * 0.35)
  }

  return threshold
}

export function mergeHighlights(
  windows: AudioAnalysisWindow[],
  threshold: number,
  mergeGapSec: number,
  minClipSec: number,
  maxClipSec: number,
): HighlightSegment[] {
  const above = windows.filter(w => w.hybridScore >= threshold)
  if (above.length === 0) return []

  const merged: HighlightSegment[] = []
  let current: HighlightSegment = {
    start: above[0].time,
    end: above[0].time + DEFAULT_SETTINGS.windowSizeSec,
    score: above[0].hybridScore,
    label: above[0].voiceDetected ? 'voice_peak' : 'action_peak',
  }

  for (let i = 1; i < above.length; i++) {
    const w = above[i]
    if (w.time - current.end <= mergeGapSec) {
      current.end = w.time + DEFAULT_SETTINGS.windowSizeSec
      current.score = Math.max(current.score, w.hybridScore)
      if (w.voiceDetected) current.label = 'voice_peak'
    } else {
      merged.push(current)
      current = {
        start: w.time,
        end: w.time + DEFAULT_SETTINGS.windowSizeSec,
        score: w.hybridScore,
        label: w.voiceDetected ? 'voice_peak' : 'action_peak',
      }
    }
  }
  merged.push(current)

  return merged
    .map(h => {
      let { start, end } = h
      const dur = end - start
      if (dur < minClipSec) {
        const expand = (minClipSec - dur) / 2
        start = Math.max(0, start - expand)
        end = end + expand
      }
      if (dur > maxClipSec) {
        end = start + maxClipSec
      }
      return { ...h, start, end }
    })
    .filter(h => h.end - h.start >= minClipSec * 0.5)
}

export function analyzeVideoHybrid(
  rmsFrames: number[],
  motionFrames: number[],
  sceneFrames: number[],
  vadFrames: boolean[],
  fps: number,
  settings: Partial<HybridSettings> = {},
): HybridAnalysisResult {
  const s = { ...DEFAULT_SETTINGS, ...settings }

  const windows = analyzeHybridWindows(rmsFrames, motionFrames, sceneFrames, vadFrames, fps, s)
  const scores = windows.map(w => w.hybridScore)
  const threshold = computeDynamicThreshold(scores, s.sensitivity)
  const highlights = mergeHighlights(windows, threshold, s.mergeGapSec, s.minClipSec, s.maxClipSec)

  const peaks = windows
    .filter(w => w.hybridScore >= threshold)
    .map(w => w.time)

  return { windows, peaks, highlights, settings: s }
}
