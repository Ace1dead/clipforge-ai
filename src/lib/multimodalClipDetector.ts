/**
 * Multimodal Clip Detection — Visual + Audio + Transcript combined scoring.
 * Opus Clip's biggest advantage. We match it with client-side multimodal analysis.
 */

export interface MultimodalInput {
  visualFrames: Uint8ClampedArray[]
  audioSamples: Float32Array
  transcriptWords: Array<{ text: string; start: number; end: number }>
  fps: number
  duration: number
}

export interface ModalityScore {
  modality: 'visual' | 'audio' | 'transcript'
  score: number
  confidence: number
}

export interface MultimodalHighlight {
  start: number
  end: number
  score: number
  modalities: ModalityScore[]
  label: string
}

// ═══════════════════════════════════════════════════════════════
// VISUAL ENERGY (frame-to-frame motion)
// ═══════════════════════════════════════════════════════════════

export function computeVisualEnergy(
  currentFrame: Uint8ClampedArray,
  previousFrame: Uint8ClampedArray,
  width: number,
  height: number,
): number {
  if (currentFrame.length !== previousFrame.length) return 0

  let totalDiff = 0
  const step = 4 // Sample every 4th pixel
  const pixelCount = currentFrame.length / step

  for (let i = 0; i < currentFrame.length; i += step) {
    totalDiff += Math.abs(currentFrame[i] - previousFrame[i])
  }

  // Normalize to 0-1
  return Math.min(1, (totalDiff / pixelCount) / 128)
}

// ═══════════════════════════════════════════════════════════════
// AUDIO ENERGY (RMS-based)
// ═══════════════════════════════════════════════════════════════

export function computeAudioEnergy(samples: Float32Array): number {
  if (samples.length === 0) return 0

  let sum = 0
  for (let i = 0; i < samples.length; i++) {
    sum += samples[i] ** 2
  }
  const rms = Math.sqrt(sum / samples.length)

  // Normalize to 0-1 (assuming max amplitude ~0.5)
  return Math.min(1, rms / 0.5)
}

// ═══════════════════════════════════════════════════════════════
// TRANSCRIPT ENERGY (emotional/intensity words)
// ═══════════════════════════════════════════════════════════════

const ENERGY_WORDS = new Map<string, number>([
  ['amazing', 0.9], ['incredible', 0.9], ['insane', 1.0], ['unbelievable', 0.95],
  ['shocking', 0.9], ['mind-blowing', 1.0], ['epic', 0.9], ['legendary', 0.95],
  ['crazy', 0.85], ['wild', 0.8], ['brilliant', 0.85], ['genius', 0.85],
  ['perfect', 0.8], ['terrible', 0.8], ['horrible', 0.85], ['disaster', 0.9],
  ['stop', 0.7], ['never', 0.7], ['always', 0.6], ['secret', 0.75],
  ['nobody', 0.7], ['everyone', 0.6], ['best', 0.75], ['worst', 0.75],
  ['love', 0.7], ['hate', 0.75], ['win', 0.8], ['lose', 0.75],
  ['kill', 0.85], ['die', 0.8], ['money', 0.7], ['free', 0.65],
  ['now', 0.6], ['today', 0.5], ['here', 0.5], ['this', 0.4],
])

export function computeTranscriptEnergy(text: string): number {
  const words = text.toLowerCase().split(/\s+/)
  let totalEnergy = 0
  let wordCount = 0

  for (const word of words) {
    const clean = word.replace(/[^a-z]/g, '')
    if (ENERGY_WORDS.has(clean)) {
      totalEnergy += ENERGY_WORDS.get(clean)!
      wordCount++
    }
  }

  if (wordCount === 0) return 0

  // Also boost for exclamation marks and capitalization
  const exclamationBoost = (text.match(/[!]/g)?.length ?? 0) * 0.1
  const capsBoost = (text.match(/[A-Z]{2,}/g)?.length ?? 0) * 0.05

  return Math.min(1, totalEnergy / wordCount + exclamationBoost + capsBoost)
}

// ═══════════════════════════════════════════════════════════════
// MODALITY COMBINATION (weighted fusion)
// ═══════════════════════════════════════════════════════════════

export function combineModalities(scores: ModalityScore[]): number {
  if (scores.length === 0) return 0

  let totalWeight = 0
  let weightedSum = 0

  for (const s of scores) {
    const weight = s.confidence
    weightedSum += s.score * weight
    totalWeight += weight
  }

  return totalWeight > 0 ? weightedSum / totalWeight : 0
}

// ═══════════════════════════════════════════════════════════════
// MULTIMODAL HIGHLIGHT DETECTION
// ═══════════════════════════════════════════════════════════════

export function detectMultimodalHighlights(
  input: MultimodalInput,
): MultimodalHighlight[] {
  const { visualFrames, audioSamples, transcriptWords, fps, duration } = input
  const highlights: MultimodalHighlight[] = []

  // Analyze visual frames
  const visualEnergies: number[] = []
  for (let i = 1; i < visualFrames.length; i++) {
    visualEnergies.push(computeVisualEnergy(visualFrames[i], visualFrames[i - 1], 640, 360))
  }

  // Analyze audio in windows (1s windows)
  const windowSize = Math.floor(fps)
  const audioEnergies: number[] = []
  for (let i = 0; i < audioSamples.length; i += windowSize) {
    const chunk = audioSamples.slice(i, i + windowSize)
    audioEnergies.push(computeAudioEnergy(chunk))
  }

  // Analyze transcript segments (3s windows)
  const transcriptEnergies: number[] = []
  const segmentDuration = 3
  for (let t = 0; t < duration; t += segmentDuration) {
    const segmentWords = transcriptWords.filter(w =>
      w.start >= t && w.start < t + segmentDuration
    )
    const text = segmentWords.map(w => w.text).join(' ')
    transcriptEnergies.push(computeTranscriptEnergy(text))
  }

  // Find peaks in each modality
  const visualPeaks = findPeaks(visualEnergies, 0.3)
  const audioPeaks = findPeaks(audioEnergies, 0.3)
  const transcriptPeaks = findPeaks(transcriptEnergies, 0.2)

  // Combine peaks that overlap
  const allPeaks = [
    ...visualPeaks.map(p => ({ ...p, modality: 'visual' as const, time: p.index / fps })),
    ...audioPeaks.map(p => ({ ...p, modality: 'audio' as const, time: p.index * windowSize / fps })),
    ...transcriptPeaks.map(p => ({ ...p, modality: 'transcript' as const, time: p.index * segmentDuration })),
  ]

  // Group peaks by time proximity (within 2s)
  const grouped = groupPeaksByTime(allPeaks, 2)

  for (const group of grouped) {
    const modalities: ModalityScore[] = group.map(p => ({
      modality: p.modality,
      score: p.value,
      confidence: 0.8,
    }))

    const combinedScore = combineModalities(modalities)

    if (combinedScore >= 0.3) {
      const startTime = Math.max(0, group[0].time - 1)
      const endTime = Math.min(duration, group[group.length - 1].time + 2)

      highlights.push({
        start: startTime,
        end: endTime,
        score: combinedScore,
        modalities,
        label: generateHighlightLabel(modalities),
      })
    }
  }

  // Sort by score and merge overlapping
  highlights.sort((a, b) => b.score - a.score)
  return mergeHighlights(highlights, 1)
}

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

function findPeaks(values: number[], threshold: number): Array<{ index: number; value: number }> {
  const peaks: Array<{ index: number; value: number }> = []
  for (let i = 0; i < values.length; i++) {
    if (values[i] >= threshold) {
      peaks.push({ index: i, value: values[i] })
    }
  }
  return peaks
}

function groupPeaksByTime(
  peaks: Array<{ time: number; modality: 'visual' | 'audio' | 'transcript'; value: number; index: number }>,
  maxGap: number,
): Array<Array<{ time: number; modality: 'visual' | 'audio' | 'transcript'; value: number; index: number }>> {
  if (peaks.length === 0) return []

  const sorted = [...peaks].sort((a, b) => a.time - b.time)
  const groups: Array<Array<typeof sorted[0]>> = [[sorted[0]]]

  for (let i = 1; i < sorted.length; i++) {
    const lastGroup = groups[groups.length - 1]
    if (sorted[i].time - lastGroup[lastGroup.length - 1].time <= maxGap) {
      lastGroup.push(sorted[i])
    } else {
      groups.push([sorted[i]])
    }
  }

  return groups
}

function generateHighlightLabel(modalities: ModalityScore[]): string {
  const types = modalities.map(m => m.modality)
  if (types.includes('visual') && types.includes('audio')) return 'Action Peak'
  if (types.includes('transcript') && types.includes('audio')) return 'Emotional Moment'
  if (types.includes('visual') && types.includes('transcript')) return 'Key Scene'
  if (types.length >= 3) return 'Highlight'
  return types[0] === 'visual' ? 'Visual Peak' : types[0] === 'audio' ? 'Audio Peak' : 'Speech Peak'
}

function mergeHighlights(highlights: MultimodalHighlight[], minGap: number): MultimodalHighlight[] {
  if (highlights.length === 0) return []

  const merged: MultimodalHighlight[] = [highlights[0]]
  for (let i = 1; i < highlights.length; i++) {
    const prev = merged[merged.length - 1]
    const curr = highlights[i]
    if (curr.start - prev.end <= minGap) {
      prev.end = Math.max(prev.end, curr.end)
      prev.score = Math.max(prev.score, curr.score)
      prev.label = curr.score > prev.score ? curr.label : prev.label
    } else {
      merged.push(curr)
    }
  }

  return merged
}
