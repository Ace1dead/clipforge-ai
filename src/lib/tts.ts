export interface TtsVoice { id: string; name: string; lang: string; gender: 'male' | 'female' | 'other'; provider: 'streamelements' | 'browser' }

export const STREAMELEMENTS_VOICES: TtsVoice[] = [
  { id: 'Brian', name: 'Brian', lang: 'en-US', gender: 'male', provider: 'streamelements' },
  { id: 'Amy', name: 'Amy', lang: 'en-US', gender: 'female', provider: 'streamelements' },
  { id: 'Joey', name: 'Joey', lang: 'en-US', gender: 'male', provider: 'streamelements' },
  { id: 'Esmeralda', name: 'Esmeralda', lang: 'en-US', gender: 'female', provider: 'streamelements' },
  { id: 'Emma', name: 'Emma', lang: 'en-GB', gender: 'female', provider: 'streamelements' },
  { id: 'Guy', name: 'Guy', lang: 'en-GB', gender: 'male', provider: 'streamelements' },
  { id: 'Russell', name: 'Russell', lang: 'en-AU', gender: 'male', provider: 'streamelements' },
  { id: 'Geraint', name: 'Geraint', lang: 'en-GB', gender: 'male', provider: 'streamelements' },
  { id: 'Salli', name: 'Salli', lang: 'en-US', gender: 'female', provider: 'streamelements' },
  { id: 'Joanna', name: 'Joanna', lang: 'en-US', gender: 'female', provider: 'streamelements' },
  { id: 'Matthew', name: 'Matthew', lang: 'en-US', gender: 'male', provider: 'streamelements' },
  { id: 'Justin', name: 'Justin', lang: 'en-US', gender: 'male', provider: 'streamelements' },
  { id: 'Ivy', name: 'Ivy', lang: 'en-US', gender: 'female', provider: 'streamelements' },
  { id: 'Kendra', name: 'Kendra', lang: 'en-US', gender: 'female', provider: 'streamelements' },
  { id: 'Kimberly', name: 'Kimberly', lang: 'en-US', gender: 'female', provider: 'streamelements' },
  { id: 'Miguel', name: 'Miguel', lang: 'es-MX', gender: 'male', provider: 'streamelements' },
  { id: 'Penelope', name: 'Penelope', lang: 'es-US', gender: 'female', provider: 'streamelements' },
  { id: 'Celine', name: 'Celine', lang: 'fr-FR', gender: 'female', provider: 'streamelements' },
  { id: 'Mathieu', name: 'Mathieu', lang: 'fr-FR', gender: 'male', provider: 'streamelements' },
  { id: 'Hans', name: 'Hans', lang: 'de-DE', gender: 'male', provider: 'streamelements' },
  { id: 'Marlene', name: 'Marlene', lang: 'de-DE', gender: 'female', provider: 'streamelements' },
  { id: 'Carla', name: 'Carla', lang: 'it-IT', gender: 'female', provider: 'streamelements' },
  { id: 'Giorgio', name: 'Giorgio', lang: 'it-IT', gender: 'male', provider: 'streamelements' },
  { id: 'Tatyana', name: 'Tatyana', lang: 'ru-RU', gender: 'female', provider: 'streamelements' },
  { id: 'Mia', name: 'Mia', lang: 'da-DK', gender: 'female', provider: 'streamelements' },
  { id: 'Filiz', name: 'Filiz', lang: 'tr-TR', gender: 'female', provider: 'streamelements' },
  { id: 'Vicki', name: 'Vicki', lang: 'en-GB', gender: 'female', provider: 'streamelements' },
]

const SE_BASE = 'https://api.streamelements.com/kappa/v2/speech'

export async function synthesizeStreamElements(text: string, voiceId: string): Promise<Blob> {
  const url = `${SE_BASE}?voice=${encodeURIComponent(voiceId)}&text=${encodeURIComponent(text)}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Voice service error (${res.status})`)
  const blob = await res.blob()
  if (blob.size < 100) throw new Error('Voice service returned empty audio')
  return blob
}

export function getBrowserVoices(): TtsVoice[] {
  if (typeof speechSynthesis === 'undefined') return []
  return speechSynthesis
    .getVoices()
    .filter((v) => v.lang && v.lang.toLowerCase().startsWith('en'))
    .map((v) => ({
      id: v.voiceURI,
      name: v.name,
      lang: v.lang,
      gender: v.name.toLowerCase().includes('female') ? 'female' as const : 'male' as const,
      provider: 'browser' as const,
    }))
}

export async function speakBrowser(text: string, voiceUri: string, rate: number, pitch: number): Promise<{ duration: number; cancel: () => void }> {
  const utter = new SpeechSynthesisUtterance(text)
  const all = speechSynthesis.getVoices()
  const match = all.find((v) => v.voiceURI === voiceUri)
  if (match) utter.voice = match
  utter.rate = rate
  utter.pitch = pitch
  const start = performance.now()
  let duration = 0
  await new Promise<void>((resolve) => {
    utter.onend = () => { duration = (performance.now() - start) / 1000; resolve() }
    utter.onerror = () => { duration = (performance.now() - start) / 1000; resolve() }
    speechSynthesis.speak(utter)
  })
  return { duration, cancel: () => speechSynthesis.cancel() }
}

export function estimateSpeakingTime(text: string, wpm = 165): number {
  const words = text.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return 0
  const pauses = (text.match(/[.!?…]/g) ?? []).length * 0.28
  return (words.length / wpm) * 60 + pauses
}

export interface TimedWord { text: string; start: number; end: number }

/** Distribute word timings proportionally to character length across a known total duration. */
export function estimateWordTiming(text: string, totalSeconds: number): TimedWord[] {
  const words = text.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return []
  const weights = words.map((w) => {
    let wgt = w.length + 1.4
    if (/[.,!?;:]$/.test(w)) wgt += 0.9
    return wgt
  })
  const totalWeight = weights.reduce((a, b) => a + b, 0)
  const wordsPerSecond = 2.4
  let t = 0
  const out: TimedWord[] = []
  const available = Math.max(0.5, totalSeconds)
  for (let i = 0; i < words.length; i++) {
    const dur = (weights[i] / totalWeight) * available
    // keep within a plausible spoken pace
    const minDur = 1 / wordsPerSecond
    const d = Math.max(minDur * 0.7, dur)
    out.push({ text: words[i], start: t, end: t + d })
    t += d
  }
  const scale = Math.min(1, available / Math.max(t, 0.001))
  return out.map((w) => ({ text: w.text, start: w.start * scale, end: w.end * scale }))
}

/** Caps script into ~N segments at sentence boundaries for clean per-line captions. */
export function splitScriptIntoLines(text: string, maxWords = 3): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let cur: string[] = []
  for (const w of words) {
    cur.push(w)
    if (cur.length >= maxWords || /[.!?…]$/.test(w)) {
      lines.push(cur.join(' '))
      cur = []
    }
  }
  if (cur.length) lines.push(cur.join(' '))
  return lines.length ? lines : ['']
}