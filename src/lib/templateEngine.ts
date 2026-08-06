/**
 * Template Engine — Processes a video through a ViralPreset to produce
 * fully configured editing parameters. Handles beat detection, silence cutting,
 * caption mapping, hook generation, and audio ducking.
 *
 * This is the core pipeline that turns raw video + preset ID → exportable clip.
 */

import type { TimedWord } from './captions'
import type { WordTimestamp } from './editor/transcript'
import type { ViralPreset, TimingRules, MotionRules, CaptionRules, AudioRules, HookRules, OverlayRules } from './viralPresets'
import { getPresetById, ALL_VIRAL_PRESETS } from './viralPresets'
import type { CompositorConfig } from './compositor'
import type { EditStyleId } from './editStyles'
import type { ColorSkinId } from './editStyles'

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface Segment {
  start: number
  end: number
  score: number
  label: string
}

export interface Beat {
  time: number
  intensity: number
  bpm?: number
}

export interface SilenceGap {
  start: number
  end: number
  duration: number
}

export interface TemplateProcessInput {
  videoDuration: number
  words: WordTimestamp[]
  rmsFrames?: number[]
  motionFrames?: number[]
  sceneFrames?: number[]
  vadFrames?: boolean[]
  fps?: number
  videoWidth?: number
  videoHeight?: number
}

export interface HookOverlay {
  text: string
  position: 'top' | 'center' | 'bottom'
  start: number
  end: number
  animation: string
  fontSize: number
}

export interface TemplateEngineResult {
  compositorConfig: CompositorConfig
  segments: Segment[]
  hooks: HookOverlay[]
  captionWords: TimedWord[]
  beatMap: Beat[]
  preset: ViralPreset
  metadata: {
    totalSegments: number
    avgSegmentLength: number
    estimatedBPM: number
    detectedSilences: number
    hookCount: number
  }
}

// ═══════════════════════════════════════════════════════════════
// BEAT DETECTION (from RMS energy)
// ═══════════════════════════════════════════════════════════════

function detectBeats(
  rmsFrames: number[],
  fps: number,
  minInterval: number = 0.3,
): Beat[] {
  if (rmsFrames.length === 0) return []

  const beats: Beat[] = []
  const threshold = computeRmsThreshold(rmsFrames)

  let lastBeatTime = -minInterval

  for (let i = 0; i < rmsFrames.length; i++) {
    const time = i / fps
    const rms = rmsFrames[i]

    if (rms >= threshold && time - lastBeatTime >= minInterval) {
      // Intensity: how far above threshold (0-1 normalized)
      const intensity = Math.min((rms - threshold) / (1 - threshold), 1)
      beats.push({ time, intensity })
      lastBeatTime = time
    }
  }

  // Estimate BPM from inter-beat intervals
  if (beats.length >= 2) {
    const intervals: number[] = []
    for (let i = 1; i < beats.length; i++) {
      intervals.push(beats[i].time - beats[i - 1].time)
    }
    intervals.sort((a, b) => a - b)
    const medianInterval = intervals[Math.floor(intervals.length / 2)]
    const bpm = medianInterval > 0 ? Math.round(60 / medianInterval) : 120

    // Attach BPM to all beats
    for (const beat of beats) {
      beat.bpm = bpm
    }
  }

  return beats
}

function computeRmsThreshold(rmsFrames: number[]): number {
  if (rmsFrames.length === 0) return 0.01

  const sorted = [...rmsFrames].sort((a, b) => a - b)
  // 75th percentile
  const p75 = sorted[Math.floor(sorted.length * 0.75)]
  // Median for baseline
  const median = sorted[Math.floor(sorted.length / 0.5)]
  // Ensure threshold is above median but not too high
  return Math.max(p75, median * 1.5, 0.01)
}

// ═══════════════════════════════════════════════════════════════
// SILENCE DETECTION (for jump cuts)
// ═══════════════════════════════════════════════════════════════

function detectSilences(
  rmsFrames: number[],
  fps: number,
  vadFrames: boolean[],
  minDuration: number = 0.3,
  maxDuration: number = 3,
): SilenceGap[] {
  if (rmsFrames.length === 0 || vadFrames.length === 0) return []

  const silences: SilenceGap[] = []
  let silenceStart = -1

  // Use combined signal: low RMS + no voice
  const combinedSignal = rmsFrames.map((rms, i) => {
    const rmsLow = rms < 0.02
    const noVoice = !vadFrames[i]
    return rmsLow || noVoice
  })

  for (let i = 0; i < combinedSignal.length; i++) {
    const time = i / fps
    if (combinedSignal[i]) {
      if (silenceStart === -1) silenceStart = time
    } else {
      if (silenceStart !== -1) {
        const dur = time - silenceStart
        if (dur >= minDuration && dur <= maxDuration) {
          silences.push({
            start: silenceStart,
            end: time,
            duration: dur,
          })
        }
        silenceStart = -1
      }
    }
  }

  return silences
}

// ═══════════════════════════════════════════════════════════════
// SEGMENT GENERATION
// ═══════════════════════════════════════════════════════════════

function generateSegments(
  preset: ViralPreset,
  videoDuration: number,
  beats: Beat[],
  silences: SilenceGap[],
): Segment[] {
  const { timing } = preset
  const segments: Segment[] = []

  // Strategy: cut at beats when available, fall back to silence gaps
  const cutPoints: number[] = [0]

  // Add cut points at beat positions
  for (const beat of beats) {
    if (cutPoints.length > 0) {
      const lastCut = cutPoints[cutPoints.length - 1]
      const interval = beat.time - lastCut
      // Only add if within cut interval range
      if (interval >= timing.cutInterval[0] && interval <= timing.cutInterval[1]) {
        cutPoints.push(beat.time)
      } else if (interval > timing.cutInterval[1]) {
        // Too long since last cut — add at minimum interval boundary
        cutPoints.push(lastCut + timing.cutInterval[1])
      }
    }
  }

  // Add silence-based cut points for gaps between beats
  for (const gap of silences) {
    const midpoint = (gap.start + gap.end) / 2
    const lastCut = cutPoints[cutPoints.length - 1]
    const interval = midpoint - lastCut

    if (interval >= timing.cutInterval[0] && interval <= timing.cutInterval[1]) {
      // Cut at silence midpoint (removing dead air)
      cutPoints.push(midpoint)
    }
  }

  // Add final cut point if needed
  if (cutPoints[cutPoints.length - 1] < videoDuration - 1) {
    cutPoints.push(Math.min(cutPoints[cutPoints.length - 1] + timing.cutInterval[1], videoDuration))
  }

  // Always end at video duration
  cutPoints.push(videoDuration)

  // Build segments from cut points
  for (let i = 0; i < cutPoints.length - 1; i++) {
    const start = cutPoints[i]
    const end = cutPoints[i + 1]
    const dur = end - start

    // Skip segments too short
    if (dur < 0.5) continue

    // Score based on beat density in this segment
    const beatCount = beats.filter(b => b.time >= start && b.time <= end).length
    const avgBeatIntensity = beats
      .filter(b => b.time >= start && b.time <= end)
      .reduce((sum, b) => sum + b.intensity, 0) / Math.max(beatCount, 1)

    segments.push({
      start,
      end,
      score: avgBeatIntensity,
      label: beatCount > 2 ? 'high-energy' : beatCount > 0 ? 'medium' : 'ambient',
    })
  }

  return segments
}

// ═══════════════════════════════════════════════════════════════
// CAPTION WORD MAPPING
// ═══════════════════════════════════════════════════════════════

function mapWordsForCaptions(
  words: WordTimestamp[],
  captionRules: CaptionRules,
): TimedWord[] {
  const { captionWordCount, captionTransitionMs } = {
    captionWordCount: [1, 3] as [number, number],
    captionTransitionMs: 80,
  }

  // Group words into caption frames based on word count range
  const grouped: TimedWord[] = []
  const [minWords, maxWords] = captionWordCount

  let i = 0
  while (i < words.length) {
    // Determine group size based on word emphasis detection
    let groupSize = minWords

    for (let size = minWords; size <= Math.min(maxWords, words.length - i); size++) {
      const group = words.slice(i, i + size)
      const hasEmphasis = group.some(w => {
        // Detect emphasis: short pause after, all caps, punctuation
        const isEmphasis = w.word === w.word.toUpperCase() && w.word.length > 2
          || w.word.endsWith('!')
          || w.word.endsWith('?')
        return isEmphasis
      })

      if (hasEmphasis || size === maxWords) {
        groupSize = size
        break
      }
    }

    const group = words.slice(i, i + groupSize)
    if (group.length > 0) {
      grouped.push({
        text: group.map(w => w.word).join(' '),
        start: group[0].start,
        end: group[group.length - 1].end,
      })
    }

    i += groupSize
  }

  return grouped
}

// ═══════════════════════════════════════════════════════════════
// HOOK GENERATION
// ═══════════════════════════════════════════════════════════════

function generateHooks(
  hookRules: HookRules[],
  videoDuration: number,
): HookOverlay[] {
  return hookRules.map((rule, idx) => {
    let text = rule.text

    // Replace placeholders (use first words from transcript if available)
    // These get filled in by the caller with actual transcript data
    text = text.replace('{topic}', 'Watch This')
      .replace('{result}', 'The Result')
      .replace('{number}', '0')

    return {
      text,
      position: rule.position,
      start: 0,
      end: Math.min(rule.duration, videoDuration, 3), // Cap at 3s
      animation: rule.animation,
      fontSize: rule.fontSize,
    }
  })
}

// ═══════════════════════════════════════════════════════════════
// AUDIO PARAMETER CALCULATION
// ═══════════════════════════════════════════════════════════════

function calculateAudioParams(
  audioRules: AudioRules,
  beats: Beat[],
): { duckingDb: number; musicDb: number } {
  let duckingDb = audioRules.duckingDb

  // Increase ducking during high-intensity beats
  const avgBeatIntensity = beats.length > 0
    ? beats.reduce((sum, b) => sum + b.intensity, 0) / beats.length
    : 0

  // More intense beats = more ducking
  if (avgBeatIntensity > 0.7) {
    duckingDb = Math.max(duckingDb - 2, -16)
  } else if (avgBeatIntensity < 0.3) {
    duckingDb = Math.min(duckingDb + 2, -6)
  }

  return { duckingDb, musicDb: audioRules.musicVolumeDb }
}

// ═══════════════════════════════════════════════════════════════
// MAIN TEMPLATE ENGINE
// ═══════════════════════════════════════════════════════════════

export function processTemplate(
  input: TemplateProcessInput,
  presetId: string,
  overrides?: Partial<TemplateProcessInput>,
): TemplateEngineResult | null {
  const preset = getPresetById(presetId)
  if (!preset) return null

  const {
    videoDuration,
    words,
    rmsFrames = [],
    motionFrames = [],
    vadFrames = [],
    fps = 30,
    videoWidth = 1080,
    videoHeight = 1920,
  } = { ...input, ...overrides }

  // 1. Detect beats from audio
  const beats = detectBeats(rmsFrames, fps)

  // 2. Detect silence gaps for jump cuts
  const silences = detectSilences(rmsFrames, fps, vadFrames)

  // 3. Generate segments (beat-synced cuts)
  const segments = generateSegments(preset, videoDuration, beats, silences)

  // 4. Map words to caption frames
  const captionWords = mapWordsForCaptions(words, preset.captions)

  // 5. Generate hook overlays
  const hooks = generateHooks(preset.hooks, videoDuration)

  // 6. Calculate audio parameters
  const audioParams = calculateAudioParams(preset.audio, beats)

  // 7. Map caption style ID from preset
  const captionStyleId = mapCaptionStyleId(preset.captions.style)

  // 8. Map edit style from preset
  const editStyle = preset.editStyle as EditStyleId

  // 9. Map color skin from preset
  const colorSkin = preset.color.skin as ColorSkinId

  // 10. Build CompositorConfig
  const compositorConfig: CompositorConfig = {
    clipDuration: videoDuration,
    words: captionWords,
    captionStyleId,
    editStyle,
    colorSkin,
    hooks: hooks.map(h => h.text),
    platform: preset.platforms[0] || 'tiktok',
    fadeDuration: preset.timing.fadeDuration,
    hookDuration: preset.timing.hookDuration,
    beatIntensity: beats.length > 0
      ? beats.reduce((sum, b) => sum + b.intensity, 0) / beats.length
      : 0,
    bpm: beats[0]?.bpm || 120,
  }

  // Metadata
  const avgSegmentLength = segments.length > 0
    ? segments.reduce((sum, s) => sum + (s.end - s.start), 0) / segments.length
    : videoDuration

  const estimatedBPM = beats[0]?.bpm || 0

  return {
    compositorConfig,
    segments,
    hooks,
    captionWords,
    beatMap: beats,
    preset,
    metadata: {
      totalSegments: segments.length,
      avgSegmentLength: Math.round(avgSegmentLength * 10) / 10,
      estimatedBPM,
      detectedSilences: silences.length,
      hookCount: hooks.length,
    },
  }
}

// ═══════════════════════════════════════════════════════════════
// CAPTION STYLE MAPPING
// ═══════════════════════════════════════════════════════════════

function mapCaptionStyleId(presetStyle: string): string {
  // Map preset caption styles to our caption style IDs
  const styleMap: Record<string, string> = {
    'hormozi': 'hormozi',
    'pop-classic': 'pop-classic',
    'pop-neon': 'pop-neon',
    'impact': 'impact',
    'gradient': 'gradient',
    'minimal': 'minimal',
    'comic': 'comic',
    'party': 'party',
  }

  return styleMap[presetStyle] || 'pop-classic'
}

// ═══════════════════════════════════════════════════════════════
// AUTO-SUGGEST TEMPLATE
// ═══════════════════════════════════════════════════════════════

export function autoSuggestPreset(
  transcriptText: string,
  audioIntensity: number, // 0-1
  videoDuration: number,
): ViralPreset {
  const text = transcriptText.toLowerCase()

  // Content-based detection
  if (text.match(/podcast|interview|conversation|talk|discussion|chat/)) {
    return getPresetById('podcast-talkshow')!
  }
  if (text.match(/game|play|win|kill|clutch|ace|round|frag|gg|lobby/)) {
    return getPresetById('gaming-action')!
  }
  if (text.match(/business|money|revenue|customer|sale|growth|hustle|entrepreneur|ceo/)) {
    return getPresetById('business-entrepreneur')!
  }
  if (text.match(/workout|gym|lift|muscle|gains|push|squat|deadlift|abs|fitness/)) {
    return getPresetById('fitness-transformation')!
  }
  if (text.match(/learn|explain|how|what|why|science|research|study|theory|lesson/)) {
    return getPresetById('educational-minimal')!
  }
  if (text.match(/react|wow|omg|no way|insane|that|this is|look at|watch/)) {
    return getPresetById('reaction-commentary')!
  }
  if (text.match(/music|sing|song|beat|rap|play|guitar|piano|drum|sound/)) {
    return getPresetById('music-performance')!
  }

  // Intensity-based fallback
  if (audioIntensity > 0.7) {
    return videoDuration <= 20
      ? getPresetById('gaming-action')!
      : getPresetById('fitness-transformation')!
  }

  // Default
  return getPresetById('storytelling-explainer')!
}

// ═══════════════════════════════════════════════════════════════
// EXPORT ALL PRESET IDS (for UI dropdowns)
// ═══════════════════════════════════════════════════════════════

export function getAllPresetIds(): string[] {
  return ALL_VIRAL_PRESETS.map(p => p.id)
}

export function getPresetSummaries(): Array<{ id: string; name: string; category: string; icon: string; description: string }> {
  return ALL_VIRAL_PRESETS.map(p => ({
    id: p.id,
    name: p.name,
    category: p.category,
    icon: p.icon,
    description: p.description,
  }))
}
