/**
 * Auto Censor — Detect and bleep/blur curse words in captions and audio.
 * Opus Clip doesn't even have this. We're ahead.
 */

export interface CensorResult {
  word: string
  index: number
  start: number
  end: number
  severity: 'mild' | 'moderate' | 'severe'
}

export interface CensorOptions {
  method: 'asterisk' | 'beep' | 'blur' | 'replace'
  customReplacement?: string
  preserveFirstLast?: boolean
}

export interface BleepTiming {
  start: number
  end: number
  frequency: number
  amplitude: number
}

// ═══════════════════════════════════════════════════════════════
// CURSE WORD DETECTION
// ═══════════════════════════════════════════════════════════════

const SEVERE_CURSES = [
  /\bf+u+c+k+\w*/gi,
  /\bs+h+i+t+\w*/gi,
  /\ba+s+s+h+o+l+e+\w*/gi,
  /\bb+i+t+c+h+\w*/gi,
  /\bd+a+m+n+\w*/gi,
  /\bh+e+l+l\b/gi,
  /\bc+r+a+p+\w*/gi,
  /\bd+a+m+n+i+t+\w*/gi,
  /\bf+u+c+k+i+n+g+\w*/gi,
  /\bf+u+c+k+e+d+\w*/gi,
  /\bs+h+i+t+t+y+\w*/gi,
]

const MODERATE_CURSES = [
  /\bd+a+m+n+\w*/gi,
  /\bh+e+l+l\b/gi,
  /\ba+s+s+\w*/gi,
  /\bb+a+s+t+a+r+d+\w*/gi,
  /\bd+i+c+k+\w*/gi,
  /\bp+i+s+s+\w*/gi,
  /\bc+r+a+p+\w*/gi,
]

const MILD_CURSES = [
  /\bd+a+m+n+\w*/gi,
  /\bh+e+l+l\b/gi,
  /\bg+o+d+\s*d+a+m+n+\w*/gi,
]

function isCurseWord(word: string): CensorResult | null {
  const clean = word.replace(/[^a-zA-Z]/g, '').toLowerCase()

  for (const pattern of SEVERE_CURSES) {
    pattern.lastIndex = 0
    if (pattern.test(clean)) {
      return { word, index: -1, start: 0, end: 0, severity: 'severe' }
    }
  }

  for (const pattern of MODERATE_CURSES) {
    pattern.lastIndex = 0
    if (pattern.test(clean)) {
      return { word, index: -1, start: 0, end: 0, severity: 'moderate' }
    }
  }

  for (const pattern of MILD_CURSES) {
    pattern.lastIndex = 0
    if (pattern.test(clean)) {
      return { word, index: -1, start: 0, end: 0, severity: 'mild' }
    }
  }

  return null
}

export function detectCurseWords(text: string): CensorResult[] {
  const words = text.split(/\s+/)
  const results: CensorResult[] = []

  words.forEach((word, index) => {
    const curse = isCurseWord(word)
    if (curse) {
      curse.index = index
      curse.start = text.indexOf(word)
      curse.end = curse.start + word.length
      results.push(curse)
    }
  })

  return results
}

// ═══════════════════════════════════════════════════════════════
// TEXT CENSORING
// ═══════════════════════════════════════════════════════════════

export function censorText(text: string, options: CensorOptions): string {
  const { method, customReplacement, preserveFirstLast = true } = options
  const curses = detectCurseWords(text)

  if (curses.length === 0) return text

  let result = text
  // Process from end to start to preserve indices
  for (let i = curses.length - 1; i >= 0; i--) {
    const curse = curses[i]
    const word = curse.word

    let replacement: string
    switch (method) {
      case 'asterisk':
        if (preserveFirstLast && word.length > 2) {
          replacement = word[0] + '*'.repeat(word.length - 2) + word[word.length - 1]
        } else {
          replacement = '*'.repeat(word.length)
        }
        break
      case 'replace':
        replacement = customReplacement ?? '[CENSORED]'
        break
      case 'beep':
        replacement = '[BLEEP]'
        break
      case 'blur':
        replacement = '[BLUR]'
        break
      default:
        replacement = '*'.repeat(word.length)
    }

    result = result.slice(0, curse.start) + replacement + result.slice(curse.end)
  }

  return result
}

// ═══════════════════════════════════════════════════════════════
// BLEEP TIMING GENERATION
// ═══════════════════════════════════════════════════════════════

export function generateBleepTimings(
  words: Array<{ text: string; start: number; end: number }>,
): BleepTiming[] {
  const bleeps: BleepTiming[] = []

  for (const word of words) {
    const curse = isCurseWord(word.text)
    if (curse) {
      // Bleep frequency based on severity
      const frequency = curse.severity === 'severe' ? 1000
        : curse.severity === 'moderate' ? 800
        : 600

      bleeps.push({
        start: word.start,
        end: word.end,
        frequency,
        amplitude: 0.8,
      })
    }
  }

  return bleeps
}

// ═══════════════════════════════════════════════════════════════
// AUTO-CENSOR INTEGRATION (for compositor)
// ═══════════════════════════════════════════════════════════════

export function applyAutoCensor(
  words: Array<{ text: string; start: number; end: number }>,
  enabled: boolean = true,
): Array<{ text: string; start: number; end: number; censored: boolean }> {
  if (!enabled) return words.map(w => ({ ...w, censored: false }))

  return words.map(w => {
    const curse = isCurseWord(w.text)
    if (curse) {
      const clean = w.text.replace(/[^a-zA-Z]/g, '')
      const censored = clean[0] + '*'.repeat(Math.max(0, clean.length - 2)) + (clean.length > 1 ? clean[clean.length - 1] : '')
      return { ...w, text: censored, censored: true }
    }
    return { ...w, censored: false }
  })
}
