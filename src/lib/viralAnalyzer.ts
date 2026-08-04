import { decodeAudio, analyzeEnergy, speechSegments } from './audio'
import { pickHighlights } from './clipAnalyzer'
import type { Highlight } from './clipAnalyzer'

export interface ViralMoment {
  start: number
  end: number
  type: 'hook' | 'climax' | 'twist' | 'cta' | 'emotional' | 'controversy'
  intensity: number
  label: string
  suggestedHook: string
}

export interface ContentTheme {
  theme: string
  confidence: number
  keywords: string[]
}

export interface ViralAnalysis {
  duration: number
  overallScore: number
  highlights: Highlight[]
  viralMoments: ViralMoment[]
  themes: ContentTheme[]
  hooks: string[]
  clipSuggestions: ClipSuggestion[]
  energyProfile: number[]
  stats: {
    avgEnergy: number
    peakEnergy: number
    speechRatio: number
    pauseCount: number
    energySpikes: number
    dynamicRange: number
  }
}

export interface ClipSuggestion {
  start: number
  end: number
  score: number
  platform: 'tiktok' | 'reels' | 'shorts' | 'all'
  hook: string
  reason: string
}

// --- Energy pattern detection ---

function detectEnergySpikes(energy: number[], threshold = 1.8): number[] {
  if (energy.length < 3) return []
  const avg = energy.reduce((a, b) => a + b, 0) / energy.length
  const spikes: number[] = []
  for (let i = 1; i < energy.length - 1; i++) {
    const localAvg = (energy[i - 1] + energy[i] + energy[i + 1]) / 3
    if (energy[i] > avg * threshold && energy[i] > localAvg * 1.5) {
      spikes.push(i)
    }
  }
  return spikes
}

function detectPauses(energy: number[], minPauseLen = 3): { start: number; end: number }[] {
  const avg = energy.reduce((a, b) => a + b, 0) / energy.length
  const thresh = avg * 0.15
  const pauses: { start: number; end: number }[] = []
  let pauseStart = -1
  for (let i = 0; i < energy.length; i++) {
    if (energy[i] < thresh) {
      if (pauseStart === -1) pauseStart = i
    } else {
      if (pauseStart !== -1 && i - pauseStart >= minPauseLen) {
        pauses.push({ start: pauseStart, end: i })
      }
      pauseStart = -1
    }
  }
  return pauses
}

function detectRapidSpeech(energy: number[], windowSize = 6): number[] {
  const rapid: number[] = []
  for (let i = 0; i < energy.length - windowSize; i++) {
    const window = energy.slice(i, i + windowSize)
    const variance = window.reduce((a, b) => a + (b - window.reduce((s, v) => s + v, 0) / windowSize) ** 2, 0) / windowSize
    const avg = window.reduce((a, b) => a + b, 0) / windowSize
    const cv = avg > 0 ? Math.sqrt(variance) / avg : 0
    if (cv < 0.2 && avg > 0.05) rapid.push(i)
  }
  return rapid
}

function computeDynamicRange(energy: number[]): number {
  if (energy.length === 0) return 0
  const sorted = [...energy].sort((a, b) => a - b)
  const p10 = sorted[Math.floor(sorted.length * 0.1)] ?? 0
  const p90 = sorted[Math.floor(sorted.length * 0.9)] ?? 0
  return p90 - p10
}

// --- Theme detection from energy patterns ---

function inferThemes(energy: number[], segs: { start: number; end: number; score: number }[]): ContentTheme[] {
  const themes: ContentTheme[] = []
  const totalDur = energy.length * 0.5
  const avgEnergy = energy.reduce((a, b) => a + b, 0) / energy.length
  const peakEnergy = Math.max(...energy)
  const highEnergyRatio = energy.filter(e => e > avgEnergy * 1.5).length / energy.length

  if (highEnergyRatio > 0.3) {
    themes.push({ theme: 'High Energy / Hype', confidence: Math.min(0.95, 0.6 + highEnergyRatio * 0.5), keywords: ['excitement', 'hype', 'energy', 'viral'] })
  }
  if (peakEnergy > avgEnergy * 3) {
    themes.push({ theme: 'Dramatic Moments', confidence: 0.8, keywords: ['drama', 'surprise', 'shock', 'reveal'] })
  }
  const quietRatio = energy.filter(e => e < avgEnergy * 0.3).length / energy.length
  if (quietRatio > 0.2) {
    themes.push({ theme: 'Storytelling / Narrative', confidence: 0.7, keywords: ['story', 'journey', 'experience', 'narrative'] })
  }
  if (segs.length > 5 && totalDur > 30) {
    themes.push({ theme: 'Dense Information', confidence: 0.75, keywords: ['tips', 'facts', 'knowledge', 'educational'] })
  }
  if (themes.length === 0) {
    themes.push({ theme: 'General Content', confidence: 0.5, keywords: ['content', 'video', 'social'] })
  }
  return themes
}

// --- Hook generation ---

const HOOK_TEMPLATES: Record<string, string[]> = {
  'High Energy / Hype': [
    'Wait for it — this changes everything about {topic}',
    'You won\'t believe what happens next',
    'This is the most insane thing I\'ve seen today',
    'Watch till the end — the payoff is insane',
    'POV: you just discovered the best {topic} hack',
  ],
  'Dramatic Moments': [
    'Nobody expected this to happen...',
    'This moment broke the internet',
    'The plot twist nobody saw coming',
    'I can\'t believe this actually happened',
    'This is why you always watch till the end',
  ],
  'Storytelling / Narrative': [
    'Here\'s the story they don\'t want you to hear',
    'This changed my entire perspective',
    'The real story behind {topic}',
    'I lived through this — here\'s what happened',
    'The truth about {topic} that nobody talks about',
  ],
  'Dense Information': [
    'Save this — you\'ll need it later',
    'The {topic} tips that actually work',
    'Watch this before you make a mistake',
    'Everything you need to know in 60 seconds',
    'The {topic} guide nobody gave you',
  ],
  'General Content': [
    'You need to see this',
    'This is worth your time',
    'The {topic} moment that went viral',
    'Here\'s why this matters',
    'Watch this — it\'s important',
  ],
}

function generateHooks(themes: ContentTheme[], moments: ViralMoment[]): string[] {
  const hooks: string[] = []
  const used = new Set<string>()

  for (const theme of themes) {
    const templates = HOOK_TEMPLATES[theme.theme] || HOOK_TEMPLATES['General Content']
    for (const tpl of templates) {
      const keyword = theme.keywords[Math.floor(Math.random() * theme.keywords.length)] || 'content'
      const hook = tpl.replace('{topic}', keyword)
      if (!used.has(hook)) {
        used.add(hook)
        hooks.push(hook)
      }
    }
  }

  for (const moment of moments) {
    if (moment.suggestedHook && !used.has(moment.suggestedHook)) {
      used.add(moment.suggestedHook)
      hooks.push(moment.suggestedHook)
    }
  }

  return hooks.slice(0, 12)
}

// --- Viral moment classification ---

function classifyMoment(
  seg: { start: number; end: number; score: number },
  energy: number[],
  avgEnergy: number,
  windowSec: number
): ViralMoment {
  const ratio = avgEnergy > 0 ? seg.score / (avgEnergy * ((seg.end - seg.start) / windowSec)) : 1
  const startIdx = Math.floor(seg.start / windowSec)
  const endIdx = Math.min(energy.length - 1, Math.floor(seg.end / windowSec))
  const segEnergy = energy.slice(startIdx, endIdx + 1)
  const maxE = Math.max(...segEnergy)
  const dur = seg.end - seg.start

  let type: ViralMoment['type'] = 'hook'
  let intensity = Math.min(1, ratio * 0.5)
  let label = 'Opening Hook'
  let hook = 'You need to see this'

  if (ratio > 2.5) {
    type = 'climax'
    intensity = Math.min(1, ratio * 0.3)
    label = 'Peak Moment'
    hook = 'This is the most insane part'
  } else if (ratio > 1.8 && dur < 15) {
    type = 'twist'
    intensity = Math.min(1, ratio * 0.4)
    label = 'Plot Twist'
    hook = 'Wait for the twist'
  } else if (ratio < 0.6) {
    type = 'emotional'
    intensity = 0.5
    label = 'Emotional Beat'
    hook = 'This moment hits different'
  } else if (dur > 20 && ratio > 1.2) {
    type = 'cta'
    intensity = 0.6
    label = 'Engagement Peak'
    hook = 'Watch till the end'
  } else if (maxE > avgEnergy * 3) {
    type = 'controversy'
    intensity = Math.min(1, maxE / (avgEnergy * 4))
    label = 'Controversial Moment'
    hook = 'This is controversial but true'
  }

  return { start: seg.start, end: seg.end, type, intensity, label, suggestedHook: hook }
}

// --- Clip suggestions ---

function suggestClips(highlights: Highlight[], themes: ContentTheme[], duration: number): ClipSuggestion[] {
  const clips: ClipSuggestion[] = []
  const avgScore = highlights.reduce((a, h) => a + h.viralScore, 0) / Math.max(highlights.length, 1)

  for (const h of highlights) {
    let platform: ClipSuggestion['platform'] = 'all'
    const dur = h.end - h.start
    if (dur <= 30) platform = 'tiktok'
    else if (dur <= 60) platform = 'reels'
    else platform = 'shorts'

    const theme = themes[0]?.theme || 'General Content'
    const reason = h.viralScore >= 70
      ? `High energy (${Math.round(h.score)}), ${dur.toFixed(0)}s clip, ideal for ${platform}`
      : h.viralScore >= 40
        ? `Moderate energy, ${dur.toFixed(0)}s — consider tightening the edit`
        : `Lower energy segment — pair with a stronger hook`

    clips.push({
      start: h.start,
      end: h.end,
      score: h.viralScore,
      platform,
      hook: generateHooks([themes[0] || { theme: 'General Content', confidence: 0.5, keywords: ['content'] }], [])[0] || 'Watch this',
      reason,
    })
  }

  if (clips.length === 0 && duration > 10) {
    clips.push({
      start: 0,
      end: Math.min(30, duration),
      score: 30,
      platform: 'tiktok',
      hook: 'The best moment from this video',
      reason: 'No strong highlights detected — try a different video or adjust sensitivity',
    })
  }

  return clips.sort((a, b) => b.score - a.score)
}

// --- Main analysis ---

export async function analyzeViral(
  videoUrl: string,
  onProgress?: (p: number, stage: string) => void
): Promise<ViralAnalysis> {
  onProgress?.(0, 'Decoding audio...')
  const audioBuffer = await decodeAudio(videoUrl)
  const duration = audioBuffer.duration

  onProgress?.(15, 'Analyzing energy patterns...')
  const windowSec = 0.5
  const energy = analyzeEnergy(audioBuffer, windowSec)

  onProgress?.(30, 'Detecting speech segments...')
  const segs = speechSegments(audioBuffer, windowSec)

  onProgress?.(45, 'Finding viral moments...')
  const avgEnergy = energy.reduce((a, b) => a + b, 0) / energy.length
  const spikes = detectEnergySpikes(energy)
  const pauses = detectPauses(energy)
  const rapidSections = detectRapidSpeech(energy)

  const viralMoments: ViralMoment[] = []
  for (const seg of segs) {
    viralMoments.push(classifyMoment(seg, energy, avgEnergy, windowSec))
  }
  viralMoments.sort((a, b) => b.intensity - a.intensity)

  onProgress?.(60, 'Picking highlights...')
  const highlights = pickHighlights(segs, Math.min(8, Math.max(3, Math.ceil(duration / 30))))

  onProgress?.(75, 'Detecting content themes...')
  const themes = inferThemes(energy, segs)

  onProgress?.(85, 'Generating hooks...')
  const hooks = generateHooks(themes, viralMoments)

  onProgress?.(90, 'Suggesting clips...')
  const clipSuggestions = suggestClips(highlights, themes, duration)

  const speechSegs = segs.filter(s => s.end - s.start >= 0.5)
  const speechDur = speechSegs.reduce((a, s) => a + (s.end - s.start), 0)

  onProgress?.(100, 'Done!')
  return {
    duration,
    overallScore: Math.round(Math.min(100, avgEnergy * 200 + highlights.length * 5 + themes.length * 3)),
    highlights,
    viralMoments: viralMoments.slice(0, 10),
    themes,
    hooks,
    clipSuggestions,
    energyProfile: energy,
    stats: {
      avgEnergy: Math.round(avgEnergy * 1000) / 1000,
      peakEnergy: Math.round(Math.max(...energy) * 1000) / 1000,
      speechRatio: duration > 0 ? Math.round((speechDur / duration) * 100) : 0,
      pauseCount: pauses.length,
      energySpikes: spikes.length,
      dynamicRange: Math.round(computeDynamicRange(energy) * 1000) / 1000,
    },
  }
}
