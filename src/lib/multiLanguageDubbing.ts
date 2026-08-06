/**
 * Multi-Language Dubbing — 26+ language translation and TTS.
 * Opus Clip charges for this. We do it free with user API keys.
 */

export interface Language {
  code: string
  name: string
  nativeName: string
  ttsVoice?: string
  direction: 'ltr' | 'rtl'
}

export interface DubRequest {
  text: string
  targetLanguage: string
  sourceLanguage?: string
  voiceId?: string
  speed?: number
}

export interface DubScript {
  original: string
  translated: string
  start: number
  end: number
  wordCount: number
}

// ═══════════════════════════════════════════════════════════════
// SUPPORTED LANGUAGES (26+)
// ═══════════════════════════════════════════════════════════════

const LANGUAGES: Language[] = [
  { code: 'en', name: 'English', nativeName: 'English', ttsVoice: 'en-US-Neural2-F', direction: 'ltr' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', ttsVoice: 'es-ES-Neural2-B', direction: 'ltr' },
  { code: 'fr', name: 'French', nativeName: 'Français', ttsVoice: 'fr-FR-Neural2-A', direction: 'ltr' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', ttsVoice: 'de-DE-Neural2-F', direction: 'ltr' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano', ttsVoice: 'it-IT-Neural2-A', direction: 'ltr' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português', ttsVoice: 'pt-BR-Neural2-A', direction: 'ltr' },
  { code: 'nl', name: 'Dutch', nativeName: 'Nederlands', ttsVoice: 'nl-NL-Neural2-A', direction: 'ltr' },
  { code: 'pl', name: 'Polish', nativeName: 'Polski', ttsVoice: 'pl-PL-Neural2-A', direction: 'ltr' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский', ttsVoice: 'ru-RU-Neural2-A', direction: 'ltr' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', ttsVoice: 'ja-JP-Neural2-B', direction: 'ltr' },
  { code: 'ko', name: 'Korean', nativeName: '한국어', ttsVoice: 'ko-KR-Neural2-A', direction: 'ltr' },
  { code: 'zh', name: 'Chinese (Mandarin)', nativeName: '中文', ttsVoice: 'cmn-CN-Neural2-A', direction: 'ltr' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', ttsVoice: 'hi-IN-Neural2-A', direction: 'ltr' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', ttsVoice: 'ar-XA-Neural2-A', direction: 'rtl' },
  { code: 'tr', name: 'Turkish', nativeName: 'Türkçe', ttsVoice: 'tr-TR-Neural2-A', direction: 'ltr' },
  { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt', ttsVoice: 'vi-VN-Neural2-A', direction: 'ltr' },
  { code: 'th', name: 'Thai', nativeName: 'ไทย', ttsVoice: 'th-TH-Neural2-A', direction: 'ltr' },
  { code: 'sv', name: 'Swedish', nativeName: 'Svenska', ttsVoice: 'sv-SE-Neural2-A', direction: 'ltr' },
  { code: 'no', name: 'Norwegian', nativeName: 'Norsk', ttsVoice: 'nb-NO-Neural2-A', direction: 'ltr' },
  { code: 'da', name: 'Danish', nativeName: 'Dansk', ttsVoice: 'da-DK-Neural2-A', direction: 'ltr' },
  { code: 'fi', name: 'Finnish', nativeName: 'Suomi', ttsVoice: 'fi-FI-Neural2-A', direction: 'ltr' },
  { code: 'el', name: 'Greek', nativeName: 'Ελληνικά', ttsVoice: 'el-GR-Neural2-A', direction: 'ltr' },
  { code: 'cs', name: 'Czech', nativeName: 'Čeština', ttsVoice: 'cs-CZ-Neural2-A', direction: 'ltr' },
  { code: 'ro', name: 'Romanian', nativeName: 'Română', ttsVoice: 'ro-RO-Neural2-A', direction: 'ltr' },
  { code: 'uk', name: 'Ukrainian', nativeName: 'Українська', ttsVoice: 'uk-UA-Neural2-A', direction: 'ltr' },
  { code: 'id', name: 'Indonesian', nativeName: 'Bahasa Indonesia', ttsVoice: 'id-ID-Neural2-A', direction: 'ltr' },
  { code: 'ms', name: 'Malay', nativeName: 'Bahasa Melayu', ttsVoice: 'ms-MY-Neural2-A', direction: 'ltr' },
  { code: 'tl', name: 'Filipino', nativeName: 'Filipino', ttsVoice: 'fil-PH-Neural2-A', direction: 'ltr' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা', ttsVoice: 'bn-IN-Neural2-A', direction: 'ltr' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்', ttsVoice: 'ta-IN-Neural2-A', direction: 'ltr' },
]

export function getSupportedLanguages(): Language[] {
  return [...LANGUAGES]
}

export function getLanguage(code: string): Language | undefined {
  return LANGUAGES.find(l => l.code === code)
}

// ═══════════════════════════════════════════════════════════════
// LANGUAGE DETECTION
// ═══════════════════════════════════════════════════════════════

const LANGUAGE_PATTERNS: Record<string, RegExp> = {
  en: /\b(the|is|are|was|were|have|has|been|will|would|could|should|may|might|can|shall|must|do|does|did|go|goes|went|come|came|take|took|make|made|get|got|know|knew|think|thought|see|saw|want|wanted|need|needed|use|used|find|found|tell|told|ask|asked|work|worked|seem|seemed|feel|felt|try|tried|leave|left|call|called|keep|kept|let|let|begin|began|show|showed|hear|heard|play|played|run|ran|move|moved|live|lived|believe|believed|hold|held|bring|brought|happen|happened|write|wrote|provide|provided|sit|sat|stand|stood|lose|lost|pay|paid|meet|met|include|included|continue|continued|set|set|learn|learned|change|changed|lead|led|understand|understood|watch|watched|follow|followed|stop|stopped|create|created|speak|spoke|read|read|allow|allowed|add|added|spend|spent|grow|grew|open|opened|walk|walked|win|won|offer|offered|remember|remembered|love|loved|consider|considered|appear|appeared|buy|bought|wait|waited|serve|served|die|died|send|sent|build|built|stay|stayed|fall|fell|cut|cut|reach|reached|kill|killed|remain|remained|suggest|suggested|raise|raised|pass|passed|sell|sold|require|required|report|reported|decide|decided|pull|pulled)\b/gi,
  es: /\b(el|la|los|las|un|una|de|del|en|es|son|está|están|tiene|tienen|ser|estar|haber|tener|hacer|poder|decir|ir|ver|dar|saber|querer|llegar|poner|creer|hablar|llevar|dejar|seguir|encontrar|llamar|venir|pensar|salir|volver|tomar|conocer|vivir|sentir|tratar|mirar|contar|empezar|esperar|buscar|existir|entrar|trabajar|escribir|perder|producir|ocurrir|morir|tener|parecer|quedar|creer|haber|deber|poner|parecer|quedar|seguir|encontrar|llamar|venir|pensar|salir|volver|tomar|conocer|vivir|sentir|tratar|mirar|contar|empezar|esperar|buscar|existir|entrar|trabajar|escribir|perder|producir|ocurrir|morir)\b/gi,
  fr: /\b(le|la|les|un|une|des|de|du|est|sont|a|ont|être|avoir|faire|pouvoir|dire|aller|voir|donner|savoir|vouloir|venir|prendre|croire|parler|passer|demander|travailler|rester|mettre|suivre|partir|revenir|tomber|courir|entendre|appeler|ouvrir|écrire|lire|finir|commencer|continuer|arrêter|essayer|réussir|échouer|perdre|gagner|acheter|vendre|payer|coûter|valoir|sembler|devenir|rester|paraître|exister|avoir|faire|pouvoir|vouloir|devoir|savoir|aller|venir|prendre|mettre|donner|partir|rester|tomber|courir|entendre|appeler|ouvrir|écrire|lire)\b/gi,
  de: /\b(der|die|das|ein|eine|ist|sind|hat|haben|sein|haben|werden|können|müssen|sollen|wollen|dürfen|mögen|lassen|gehen|kommen|sehen|geben|nehmen|finden|denken|sagen|fahren|laufen|stehen|liegen|sitzen|tragen|schreiben|lesen|sprechen|hören|lernen|arbeiten|spielen|leben|sterben|bleiben|fangen|halten|halten|bringen|ziehen|fallen|rufen|fliegen|laufen|sitzen|liegen|stehen|tragen|essen|trinken|schlafen|waschen|kaufen|verkaufen|bezahlen|kosten|heißen|glauben|wissen|meinen|denken|glauben|finden|suchen|fragen|antworten|erzählen|erklären|zeigen|zeigen|helfen|brauchen|verstehen|vergessen|denken|glauben|wissen)\b/gi,
  pt: /\b(o|a|os|as|um|uma|de|do|da|em|é|são|tem|têm|ser|estar|ter|fazer|poder|dizer|ir|ver|dar|saber|querer|chegar|por|crer|falar|carregar|deixar|seguir|encontrar|chamar|vir|pensar|sair|voltar|tomar|conhecer|viver|sentir|tratar|olhar|contar|começar|esperar|procurar|existir|entrar|trabalhar|escrever|perder|produzir|acontecer|morrer|ter|parecer|ficar|crer|haver|dever|pôr|parecer|ficar|seguir|encontrar|chamar|vir|pensar|sair|voltar|tomar|conhecer|viver|sentir|tratar|olhar|contar|começar|esperar|procurar|existir|entrar|trabalhar|escrever|perder|produzir|acontecer|morrer)\b/gi,
  ja: /[\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf]/g,
  ko: /[\uac00-\ud7af\u1100-\u11ff\u3130-\u318f]/g,
  zh: /[\u4e00-\u9fff\u3400-\u4dbf]/g,
  hi: /[\u0900-\u097f\ua8e0-\ua8ff]/g,
  ar: /[\u0600-\u06ff\u0750-\u077f]/g,
  th: /[\u0e00-\u0e7f]/g,
}

export function detectLanguage(text: string): string {
  const scores: Record<string, number> = {}

  for (const [lang, pattern] of Object.entries(LANGUAGE_PATTERNS)) {
    const matches = text.match(pattern)
    scores[lang] = matches?.length ?? 0
  }

  // Find best match
  let bestLang = 'en'
  let bestScore = 0
  for (const [lang, score] of Object.entries(scores)) {
    if (score > bestScore) {
      bestScore = score
      bestLang = lang
    }
  }

  return bestLang
}

// ═══════════════════════════════════════════════════════════════
// DUB SCRIPT GENERATION
// ═══════════════════════════════════════════════════════════════

export function generateDubScript(
  words: Array<{ text: string; start: number; end: number }>,
  targetLanguage: string,
): DubScript[] {
  // Group words into phrases (2-4 words each for natural dubbing)
  const phrases: DubScript[] = []
  let currentPhrase: typeof words = []

  for (const word of words) {
    currentPhrase.push(word)

    // Break at natural boundaries
    const isEndOfPhrase =
      currentPhrase.length >= 4 ||
      /[.!?]$/.test(word.text) ||
      (currentPhrase.length >= 2 && word.end - currentPhrase[0].start > 2)

    if (isEndOfPhrase) {
      const originalText = currentPhrase.map(function(w) { return w.text }).join(' ')
      phrases.push({
        original: originalText,
        translated: '',
        start: currentPhrase[0].start,
        end: currentPhrase[currentPhrase.length - 1].end,
        wordCount: currentPhrase.length,
      })
      currentPhrase = []
    }
  }

  // Handle remaining words
  if (currentPhrase.length > 0) {
    phrases.push({
      original: currentPhrase.map(function(w) { return w.text }).join(' '),
      translated: '',
      start: currentPhrase[0].start,
      end: currentPhrase[currentPhrase.length - 1].end,
      wordCount: currentPhrase.length,
    })
  }

  return phrases
}

// ═══════════════════════════════════════════════════════════════
// TRANSLATION API INTEGRATION
// ═══════════════════════════════════════════════════════════════

export async function translateText(
  text: string,
  targetLanguage: string,
  sourceLanguage: string = 'auto',
  apiKey?: string,
): Promise<string> {
  // Use Google Translate API if key provided, otherwise simple fallback
  if (apiKey) {
    try {
      const url = `https://translation.googleapis.com/language/translate/v2?key=${apiKey}`
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          q: text,
          target: targetLanguage,
          source: sourceLanguage === 'auto' ? undefined : sourceLanguage,
        }),
      })
      const data = await res.json()
      return data.data?.translations?.[0]?.translatedText ?? text
    } catch {
      return text
    }
  }

  // No API key — return original (user can configure their own key)
  return text
}
