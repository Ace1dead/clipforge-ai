/**
 * Advanced Virality Scorer — Hook/emotion/value scoring.
 * Based on ai-clipping-comfyui's LLM virality framework + Opus Clip's scoring.
 * Pure client-side implementation using text analysis.
 */

export interface TranscriptSegment {
  text: string
  start: number
  end: number
  words: Array<{ text: string; start: number; end: number }>
}

export interface ClipViralityInput {
  hookText: string
  transcriptText: string
  duration: number
  wordCount: number
  hasQuestion: boolean
  exclamationCount: number
}

export interface ViralityScore {
  total: number
  hook: number
  emotional: number
  value: number
  pacing: number
  quotability: number
  breakdown: string[]
}

// ═══════════════════════════════════════════════════════════════
// HOOK STRENGTH DETECTION
// ═══════════════════════════════════════════════════════════════

const HOOK_PATTERNS = [
  // Number hooks (highest virality)
  { regex: /\b\d+\b/, score: 25, label: 'number hook' },
  // Question hooks
  { regex: /\?/, score: 20, label: 'question hook' },
  // Urgency hooks
  { regex: /\b(stop|never|always|secret|shocking|insane|crazy|unbelievable|nobody|everyone|mistake|wrong)\b/i, score: 22, label: 'urgency hook' },
  // Controversy hooks
  { regex: /\b(why|how|truth|lie|exposed|controversial|debate|problem)\b/i, score: 18, label: 'controversy hook' },
  // Emotional hooks
  { regex: /\b(amazing|incredible|beautiful|terrible|horrible|perfect|worst|best)\b/i, score: 15, label: 'emotional hook' },
  // Direct address
  { regex: /\b(you|your|yourself)\b/i, score: 10, label: 'direct address' },
]

/**
 * Detects hook strength in the first few seconds of a clip.
 * Based on ai-clipping-comfyui's hook detection criteria.
 */
export function detectHookStrength(text: string): number {
  let score = 0
  for (const pattern of HOOK_PATTERNS) {
    if (pattern.regex.test(text)) {
      score += pattern.score
    }
  }
  return Math.min(100, score)
}

// ═══════════════════════════════════════════════════════════════
// EMOTIONAL FLOW ANALYSIS
// ═══════════════════════════════════════════════════════════════

const EMOTION_WORDS = new Map<string, number>([
  // High arousal positive
  ['amazing', 8], ['incredible', 8], ['unbelievable', 8], ['insane', 9],
  ['perfect', 7], ['beautiful', 6], ['love', 6], ['best', 7],
  // High arousal negative
  ['terrible', 7], ['horrible', 7], ['worst', 8], ['hate', 6],
  ['disaster', 8], ['catastrophe', 8], ['nightmare', 7],
  // Medium arousal
  ['interesting', 4], ['surprising', 5], ['shocking', 6], ['weird', 4],
  ['funny', 5], ['sad', 4], ['angry', 5], ['excited', 5],
  // Low arousal (baseline)
  ['okay', 1], ['fine', 1], ['normal', 1], ['regular', 1],
])

/**
 * Computes emotional flow score based on word-level sentiment variation.
 * Higher score = more emotional variation = more engaging.
 * Based on ai-clipping-comfyui's emotional peak detection.
 */
export function computeEmotionalFlow(segments: TranscriptSegment[]): number {
  if (segments.length === 0) return 0

  const scores = segments.map(segment => {
    const words = segment.text.toLowerCase().split(/\s+/)
    let emotionSum = 0
    let emotionCount = 0

    for (const word of words) {
      const clean = word.replace(/[^a-z]/g, '')
      if (EMOTION_WORDS.has(clean)) {
        emotionSum += EMOTION_WORDS.get(clean)!
        emotionCount++
      }
    }

    return emotionCount > 0 ? emotionSum / emotionCount : 0
  })

  // Compute variance (higher = more emotional variation)
  const mean = scores.reduce((a, b) => a + b, 0) / scores.length
  const variance = scores.reduce((sum, s) => sum + (s - mean) ** 2, 0) / scores.length
  const stdDev = Math.sqrt(variance)

  // Also reward high emotion peaks
  const peakBonus = Math.max(...scores) * 0.5

  return Math.min(100, Math.round(stdDev * 10 + peakBonus))
}

// ═══════════════════════════════════════════════════════════════
// VALUE / PRACTICAL CONTENT DETECTION
// ═══════════════════════════════════════════════════════════════

const VALUE_INDICATORS = [
  // Educational value
  { regex: /\b(how to|step|guide|tutorial|learn|tip|trick|hack|method|way to)\b/i, score: 20, label: 'educational' },
  // Practical value
  { regex: /\b(save|earn|make money|free|discount|cheap|affordable)\b/i, score: 18, label: 'practical' },
  // Insight value
  { regex: /\b(why|because|reason|secret|hidden|unknown|rare)\b/i, score: 15, label: 'insight' },
  // Story value
  { regex: /\b(story|happened| experience| learned| realized| discovered)\b/i, score: 12, label: 'story' },
  // Social proof
  { regex: /\b(everyone|nobody|most people|majority|expert|pro)\b/i, score: 10, label: 'social proof' },
]

/**
 * Scores the practical value of a clip.
 * Based on ai-clipping-comfyui's "practical value" scoring dimension.
 */
export function detectValueScore(text: string): number {
  let score = 0
  for (const indicator of VALUE_INDICATORS) {
    if (indicator.regex.test(text)) {
      score += indicator.score
    }
  }
  return Math.min(100, score)
}

// ═══════════════════════════════════════════════════════════════
// PACING ANALYSIS
// ═══════════════════════════════════════════════════════════════

/**
 * Analyzes pacing based on word density and duration.
 * Optimal pacing: 2-3 words/sec for short-form, 3-4 for talking-head.
 */
export function analyzePacing(duration: number, wordCount: number): number {
  if (duration <= 0 || wordCount <= 0) return 0

  const wordsPerSecond = wordCount / duration
  const optimal = 2.5 // words/sec for viral short-form

  // Score peaks at optimal, drops off for too slow or too fast
  const deviation = Math.abs(wordsPerSecond - optimal)
  const score = Math.max(0, 100 - deviation * 30)

  return Math.round(score)
}

// ═══════════════════════════════════════════════════════════════
// QUOTABILITY DETECTION
// ═══════════════════════════════════════════════════════════════

/**
 * Detects if the clip contains quotable/memorable phrases.
 * Based on ai-clipping-comfyui's "quotable lines" dimension.
 */
export function detectQuotability(text: string): number {
  let score = 0

  // Short punchy sentences
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0)
  const shortSentences = sentences.filter(s => s.split(/\s+/).length <= 8)
  score += Math.min(30, shortSentences.length * 10)

  // All-caps emphasis (if detected)
  const capsWords = text.match(/\b[A-Z]{2,}\b/g) ?? []
  score += Math.min(20, capsWords.length * 5)

  // Repetition (memorable patterns)
  const words = text.toLowerCase().split(/\s+/)
  const uniqueWords = new Set(words)
  const repetition = 1 - uniqueWords.size / words.length
  score += Math.round(repetition * 30)

  // Rhetorical devices
  if (/\b(not .* but|never .* always|the more .* the more)\b/i.test(text)) {
    score += 20
  }

  return Math.min(100, score)
}

// ═══════════════════════════════════════════════════════════════
// MAIN SCORING FUNCTION
// ═══════════════════════════════════════════════════════════════

/**
 * Main virality scoring function.
 * Combines hook strength, emotional flow, value, pacing, and quotability.
 * Weighted to match ai-clipping-comfyui's LLM framework dimensions:
 * - Hook: 25%
 * - Emotional: 25%
 * - Value: 20%
 * - Pacing: 15%
 * - Quotability: 15%
 */
export function scoreClipVirality(input: ClipViralityInput): ViralityScore {
  const breakdown: string[] = []

  // Hook strength
  const hook = detectHookStrength(input.hookText)
  if (hook > 0) breakdown.push(`Hook: ${hook}`)

  // Emotional flow
  const segments: TranscriptSegment[] = [{
    text: input.transcriptText,
    start: 0,
    end: input.duration,
    words: [],
  }]
  const emotional = computeEmotionalFlow(segments)
  if (emotional > 0) breakdown.push(`Emotion: ${emotional}`)

  // Value
  const value = detectValueScore(input.transcriptText)
  if (value > 0) breakdown.push(`Value: ${value}`)

  // Pacing
  const pacing = analyzePacing(input.duration, input.wordCount)
  if (pacing > 0) breakdown.push(`Pacing: ${pacing}`)

  // Quotability
  const quotability = detectQuotability(input.transcriptText)
  if (quotability > 0) breakdown.push(`Quotability: ${quotability}`)

  // Bonus: question and exclamation marks
  let bonus = 0
  if (input.hasQuestion) bonus += 5
  if (input.exclamationCount > 0) bonus += Math.min(10, input.exclamationCount * 3)
  if (bonus > 0) breakdown.push(`Bonus: +${bonus}`)

  // Weighted total
  const total = Math.min(100, Math.round(
    hook * 0.25 +
    emotional * 0.25 +
    value * 0.20 +
    pacing * 0.15 +
    quotability * 0.15 +
    bonus,
  ))

  return { total, hook, emotional, value, pacing, quotability, breakdown }
}

// ═══════════════════════════════════════════════════════════════
// CLIP RANKING
// ═══════════════════════════════════════════════════════════════

export interface RankedClip {
  id: string
  score: ViralityScore
}

/**
 * Ranks clips by total virality score (descending).
 */
export function rankClips(clips: RankedClip[]): RankedClip[] {
  return [...clips].sort((a, b) => b.score.total - a.score.total)
}
