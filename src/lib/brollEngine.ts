/**
 * AI B-Roll Engine — Automatic stock footage insertion at speech pauses.
 * Opus Clip charges $29/mo for AI B-Roll. We do it free with Pexels.
 */

export interface PausePoint {
  start: number
  end: number
  duration: number
  context: string
}

export interface BRollAsset {
  id: string
  query: string
  category: string
  url: string
  thumbnailUrl: string
  duration: number
}

export interface BRollSuggestion {
  query: string
  startTime: number
  endTime: number
  duration: number
  confidence: number
  category: string
}

// ═══════════════════════════════════════════════════════════════
// PAUSE DETECTION
// ═══════════════════════════════════════════════════════════════

export function detectPausePoints(
  words: Array<{ text: string; start: number; end: number }>,
  totalDuration: number,
  options: { minPauseDuration?: number; contextWindow?: number } = {},
): PausePoint[] {
  const { minPauseDuration = 1.0, contextWindow = 2 } = options
  const pauses: PausePoint[] = []

  // Check gap before first word
  if (words.length > 0 && words[0].start > minPauseDuration) {
    const context = words.slice(0, contextWindow).map(w => w.text).join(' ')
    pauses.push({
      start: 0,
      end: words[0].start,
      duration: words[0].start,
      context,
    })
  }

  // Check gaps between words
  for (let i = 1; i < words.length; i++) {
    const gap = words[i].start - words[i - 1].end
    if (gap >= minPauseDuration) {
      const contextStart = Math.max(0, i - contextWindow)
      const contextEnd = Math.min(words.length, i + contextWindow)
      const context = words.slice(contextStart, contextEnd).map(w => w.text).join(' ')

      pauses.push({
        start: words[i - 1].end,
        end: words[i].start,
        duration: gap,
        context,
      })
    }
  }

  // Check gap after last word
  if (words.length > 0) {
    const lastEnd = words[words.length - 1].end
    if (totalDuration - lastEnd > minPauseDuration) {
      const context = words.slice(-contextWindow).map(w => w.text).join(' ')
      pauses.push({
        start: lastEnd,
        end: totalDuration,
        duration: totalDuration - lastEnd,
        context,
      })
    }
  }

  return pauses
}

// ═══════════════════════════════════════════════════════════════
// TOPIC-BASED B-ROLL MATCHING
// ═══════════════════════════════════════════════════════════════

const TOPIC_QUERIES: Record<string, { category: string; queries: string[] }> = {
  technology: {
    category: 'technology',
    queries: ['computer coding', 'artificial intelligence', 'robot technology', 'data visualization', 'server room'],
  },
  business: {
    category: 'business',
    queries: ['office meeting', 'business team', 'financial chart', 'handshake', 'startup office'],
  },
  nature: {
    category: 'nature',
    queries: ['mountain landscape', 'ocean waves', 'sunset nature', 'forest path', 'flower blooming'],
  },
  city: {
    category: 'city',
    queries: ['city skyline', 'busy street', 'night city', 'office building', 'urban architecture'],
  },
  food: {
    category: 'food',
    queries: ['cooking kitchen', 'restaurant food', 'chef cooking', 'fresh ingredients', 'food plating'],
  },
  fitness: {
    category: 'fitness',
    queries: ['gym workout', 'running exercise', 'yoga fitness', 'personal training', 'healthy lifestyle'],
  },
  music: {
    category: 'music',
    queries: ['music concert', 'guitar playing', 'drum beat', 'singer microphone', 'studio recording'],
  },
  gaming: {
    category: 'gaming',
    queries: ['gaming setup', 'esports tournament', 'gamer controller', 'video game', 'gaming chair'],
  },
  education: {
    category: 'education',
    queries: ['classroom learning', 'student studying', 'library books', 'online course', 'whiteboard teaching'],
  },
  travel: {
    category: 'travel',
    queries: ['travel airplane', 'tourist destination', 'adventure hiking', 'beach vacation', 'world map'],
  },
}

function detectTopic(text: string): string | null {
  const lower = text.toLowerCase()
  for (const [topic, config] of Object.entries(TOPIC_QUERIES)) {
    if (lower.includes(topic) || lower.includes(topic.slice(0, 5))) {
      return topic
    }
  }
  // Fallback: check individual keywords with direct mapping
  const keywordMap: Record<string, string> = {
    'tech': 'technology', 'code': 'technology', 'codi': 'technology', 'algo': 'technology',
    'robot': 'technology', ' data': 'technology', ' ai': 'technology', 'computer': 'technology',
    'business': 'business', 'office': 'business', 'start': 'business', 'market': 'business',
    'nature': 'nature', 'mount': 'nature', 'landscape': 'nature', 'sunset': 'nature',
    'ocean': 'nature', 'forest': 'nature', 'river': 'nature', 'beach': 'nature',
    'city': 'city', 'urban': 'city', 'street': 'city', 'skyline': 'city',
    'food': 'food', 'cook': 'food', 'restaurant': 'food', 'chef': 'food',
    'gym': 'fitness', 'workout': 'fitness', 'exercise': 'fitness', 'yoga': 'fitness',
    'music': 'music', 'song': 'music', 'concert': 'music', 'guitar': 'music',
    'game': 'gaming', 'esport': 'gaming', 'gamer': 'gaming', 'play': 'gaming',
    'learn': 'education', 'edu': 'education', 'student': 'education', 'class': 'education',
    'travel': 'travel', 'tourist': 'travel', 'adventure': 'travel', 'hotel': 'travel',
  }
  for (const [kw, topic] of Object.entries(keywordMap)) {
    if (lower.includes(kw)) {
      return topic
    }
  }
  return null
}

export function matchBRollToTopic(text: string): BRollAsset | null {
  const topic = detectTopic(text)
  if (!topic) return null

  const config = TOPIC_QUERIES[topic]
  const query = config.queries[Math.floor(Math.random() * config.queries.length)]

  return {
    id: `broll-${topic}-${Date.now()}`,
    query,
    category: config.category,
    url: '', // Filled by Pexels API call
    thumbnailUrl: '',
    duration: 5,
  }
}

// ═══════════════════════════════════════════════════════════════
// B-ROLL SUGGESTIONS
// ═══════════════════════════════════════════════════════════════

export function suggestBRoll(
  pauses: PausePoint[],
  fullTranscript: string,
): BRollSuggestion[] {
  const suggestions: BRollSuggestion[] = []
  const topic = detectTopic(fullTranscript) ?? 'technology'

  for (const pause of pauses) {
    if (pause.duration < 1.5) continue // Too short for B-roll

    const queries = TOPIC_QUERIES[topic]?.queries ?? ['abstract background']
    const query = queries[Math.floor(Math.random() * queries.length)]

    suggestions.push({
      query,
      startTime: pause.start,
      endTime: pause.end,
      duration: Math.min(pause.duration, 5), // Cap at 5s
      confidence: Math.min(1, pause.duration / 3), // Higher confidence for longer pauses
      category: topic,
    })
  }

  return suggestions
}

// ═══════════════════════════════════════════════════════════════
// PEXELS API INTEGRATION
// ═══════════════════════════════════════════════════════════════

export async function searchPexelsBRoll(
  query: string,
  apiKey: string,
  count: number = 5,
): Promise<BRollAsset[]> {
  try {
    const url = `https://api.pexels.com/videos/search?query=${encodeURIComponent(query)}&per_page=${count}&size=medium`
    const res = await fetch(url, {
      headers: { Authorization: apiKey },
    })

    if (!res.ok) return []

    const data = await res.json()
    return (data.videos ?? []).map((v: any) => ({
      id: `pexels-${v.id}`,
      query,
      category: 'stock',
      url: v.video_files?.[0]?.link ?? '',
      thumbnailUrl: v.video_pictures?.[0]?.picture ?? '',
      duration: v.duration ?? 5,
    }))
  } catch {
    return []
  }
}
