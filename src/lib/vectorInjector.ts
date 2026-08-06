/**
 * Vector Injector — Topic-based SVG vector icon injection in captions.
 * Replaces contextual emojis (Submagic) with SVG vectors for templates.
 * Detects topics from transcript and injects matching vector icons.
 */

export interface VectorIcon {
  id: string
  svg: string
  color: string
  width: number
  height: number
}

export interface TimedWordWithVectors {
  text: string
  start: number
  end: number
  vector?: VectorIcon
}

// ═══════════════════════════════════════════════════════════════
// VECTOR ICON LIBRARY (SVG, not emojis)
// ═══════════════════════════════════════════════════════════════

const VECTOR_ICONS: Record<string, VectorIcon> = {
  money: {
    id: 'money',
    svg: '<path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>',
    color: '#22c55e',
    width: 24,
    height: 24,
  },
  tech: {
    id: 'tech',
    svg: '<rect x="2" y="3" width="20" height="14" rx="2" stroke="currentColor" stroke-width="2" fill="none"/><path d="M8 21h8M12 17v4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
    color: '#3b82f6',
    width: 24,
    height: 24,
  },
  fitness: {
    id: 'fitness',
    svg: '<path d="M6.5 6.5L17.5 17.5M6.5 17.5L17.5 6.5M2 12h4M18 12h4M12 2v4M12 18v4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
    color: '#ef4444',
    width: 24,
    height: 24,
  },
  food: {
    id: 'food',
    svg: '<path d="M12 2a7 7 0 017 7c0 5-7 13-7 13S5 14 5 9a7 7 0 017-7z" stroke="currentColor" stroke-width="2" fill="none"/><circle cx="12" cy="9" r="2.5" stroke="currentColor" stroke-width="2" fill="none"/>',
    color: '#f97316',
    width: 24,
    height: 24,
  },
  music: {
    id: 'music',
    svg: '<path d="M9 18V5l12-2v13" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/><circle cx="6" cy="18" r="3" stroke="currentColor" stroke-width="2" fill="none"/><circle cx="18" cy="16" r="3" stroke="currentColor" stroke-width="2" fill="none"/>',
    color: '#ec4899',
    width: 24,
    height: 24,
  },
  gaming: {
    id: 'gaming',
    svg: '<line x1="6" y1="12" x2="10" y2="12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="8" y1="10" x2="8" y2="14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="15" cy="11" r="1" fill="currentColor"/><circle cx="17" cy="13" r="1" fill="currentColor"/><path d="M2 8a2 2 0 012-2h16a2 2 0 012 2v8a4 4 0 01-4 4H6a4 4 0 01-4-4V8z" stroke="currentColor" stroke-width="2" fill="none"/>',
    color: '#8b5cf6',
    width: 24,
    height: 24,
  },
  science: {
    id: 'science',
    svg: '<path d="M9 3v11.5a4 4 0 108 0V3" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/><path d="M7 3h10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
    color: '#06b6d4',
    width: 24,
    height: 24,
  },
  business: {
    id: 'business',
    svg: '<rect x="2" y="7" width="20" height="14" rx="2" stroke="currentColor" stroke-width="2" fill="none"/><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2" stroke="currentColor" stroke-width="2"/>',
    color: '#eab308',
    width: 24,
    height: 24,
  },
  love: {
    id: 'love',
    svg: '<path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 000-7.78z" stroke="currentColor" stroke-width="2" fill="none"/>',
    color: '#f43f5e',
    width: 24,
    height: 24,
  },
  warning: {
    id: 'warning',
    svg: '<path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" stroke="currentColor" stroke-width="2" fill="none"/><line x1="12" y1="9" x2="12" y2="13" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="12" y1="17" x2="12.01" y2="17" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
    color: '#eab308',
    width: 24,
    height: 24,
  },
  star: {
    id: 'star',
    svg: '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" stroke="currentColor" stroke-width="2" fill="none"/>',
    color: '#fbbf24',
    width: 24,
    height: 24,
  },
  lightning: {
    id: 'lightning',
    svg: '<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" stroke="currentColor" stroke-width="2" fill="none"/>',
    color: '#facc15',
    width: 24,
    height: 24,
  },
  flame: {
    id: 'flame',
    svg: '<path d="M12 23c-3.5 0-8-2.5-8-8 0-5.5 4-9 6-12 1 2 3 3 4 3-1-3 1-7 4-9 0 3 2 5 3 8 2-2 4-4 4-8 3 4 5 8 5 13 0 6-5.5 11-8 11h-6z" stroke="currentColor" stroke-width="2" fill="none"/>',
    color: '#f97316',
    width: 24,
    height: 24,
  },
  check: {
    id: 'check',
    svg: '<polyline points="20 6 9 17 4 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>',
    color: '#22c55e',
    width: 24,
    height: 24,
  },
  target: {
    id: 'target',
    svg: '<circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" fill="none"/><circle cx="12" cy="12" r="6" stroke="currentColor" stroke-width="2" fill="none"/><circle cx="12" cy="12" r="2" stroke="currentColor" stroke-width="2" fill="none"/>',
    color: '#ef4444',
    width: 24,
    height: 24,
  },
  brain: {
    id: 'brain',
    svg: '<path d="M12 2a5 5 0 00-5 5c0 1.5.8 2.8 2 3.5V12h6V7.5c1.2-.7 2-2 2-3.5a5 5 0 00-5-5z" stroke="currentColor" stroke-width="2" fill="none"/><path d="M9 12v4a3 3 0 006 0v-4" stroke="currentColor" stroke-width="2" fill="none"/>',
    color: '#a78bfa',
    width: 24,
    height: 24,
  },
  rocket: {
    id: 'rocket',
    svg: '<path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 00-2.91-.09zM12 15l-3-3M22 2l-7.5 7.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/><path d="M15.5 7.5l-1-1a2.12 2.12 0 00-3 0L9 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>',
    color: '#3b82f6',
    width: 24,
    height: 24,
  },
}

// ═══════════════════════════════════════════════════════════════
// TOPIC DETECTION
// ═══════════════════════════════════════════════════════════════

const TOPIC_KEYWORDS: Record<string, string[]> = {
  money: ['money', 'cash', 'income', 'revenue', 'profit', 'rich', 'wealth', 'dollar', 'earn', 'affiliate', 'invest', 'crypto', 'stock'],
  tech: ['ai', 'robot', 'code', 'coding', 'program', 'software', 'app', 'computer', 'algorithm', 'data', 'machine learning', 'neural'],
  fitness: ['workout', 'gym', 'muscle', 'exercise', 'training', 'body', 'fit', 'health', 'diet', 'weight', 'abs', 'cardio'],
  food: ['recipe', 'cook', 'food', 'meal', 'eat', 'restaurant', 'chef', 'taste', 'delicious', 'ingredient'],
  music: ['music', 'song', 'sing', 'beat', 'rap', 'guitar', 'piano', 'drum', 'concert', 'album', 'melody'],
  gaming: ['game', 'play', 'win', 'kill', 'clutch', 'ace', 'round', 'frag', 'gg', 'lobby', 'fps', 'battle'],
  science: ['science', 'research', 'study', 'experiment', 'physics', 'chemistry', 'biology', 'discovery', 'theory'],
  business: ['business', 'startup', 'company', 'marketing', 'brand', 'customer', 'sale', 'entrepreneur', 'ceo'],
  love: ['love', 'heart', 'relationship', 'date', 'romance', 'crush', 'couple', 'together'],
  warning: ['danger', 'risk', 'warning', 'avoid', 'mistake', 'wrong', 'bad', 'terrible', 'horrible'],
  star: ['star', 'famous', 'celebrity', 'icon', 'legend', 'best', 'top', 'number one', 'champion'],
  lightning: ['fast', 'speed', 'quick', 'rapid', '瞬间', 'hurry', 'rush', 'sprint'],
  flame: ['fire', 'hot', 'trending', 'viral', 'lit', 'fire', 'blazing', 'heat'],
  brain: ['think', 'smart', 'genius', 'idea', 'brain', 'mind', 'clever', 'strategy', 'plan'],
  rocket: ['launch', 'growth', 'scale', 'expand', 'boost', 'accelerate', 'skyrocket', 'level up'],
}

/**
 * Detects topics from transcript text.
 * Returns matched topic IDs sorted by relevance.
 */
export function detectTopicVectors(text: string): VectorIcon[] {
  const lowerText = text.toLowerCase()
  const topicScores: Array<{ topic: string; score: number }> = []

  for (const [topic, keywords] of Object.entries(TOPIC_KEYWORDS)) {
    let score = 0
    for (const keyword of keywords) {
      if (lowerText.includes(keyword)) {
        score += keyword.length // Longer matches score higher
      }
    }
    if (score > 0) topicScores.push({ topic, score })
  }

  // Sort by score, return top 3 vectors
  return topicScores
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(t => VECTOR_ICONS[t.topic])
    .filter(Boolean)
}

/**
 * Gets a specific vector icon by topic ID.
 */
export function getVectorForTopic(topic: string): VectorIcon | null {
  return VECTOR_ICONS[topic] ?? null
}

// ═══════════════════════════════════════════════════════════════
// VECTOR INJECTION INTO WORDS
// ═══════════════════════════════════════════════════════════════

/**
 * Injects topic-relevant vectors into timed words.
 * A word gets a vector if it matches a detected topic keyword.
 */
export function injectVectorsIntoWords(
  words: Array<{ text: string; start: number; end: number }>,
  fullText: string,
): TimedWordWithVectors[] {
  const topics = detectTopicVectors(fullText)
  if (topics.length === 0) return words.map(w => ({ ...w }))

  // Build keyword → vector mapping
  const keywordMap = new Map<string, VectorIcon>()
  for (const vector of topics) {
    const topicEntry = Object.entries(TOPIC_KEYWORDS).find(([_, v]) => VECTOR_ICONS[_] === vector)
    if (topicEntry) {
      for (const keyword of topicEntry[1]) {
        keywordMap.set(keyword, vector)
      }
    }
  }

  return words.map(word => {
    const lower = word.text.toLowerCase().replace(/[^a-z0-9]/g, '')
    let vector: VectorIcon | undefined

    // Check exact match
    if (keywordMap.has(lower)) {
      vector = keywordMap.get(lower)
    } else {
      // Check partial match
      for (const [keyword, icon] of keywordMap) {
        if (lower.includes(keyword) || keyword.includes(lower)) {
          vector = icon
          break
        }
      }
    }

    return { ...word, vector }
  })
}

/**
 * Renders a vector icon to a canvas context at a given position.
 */
export function renderVectorToCanvas(
  ctx: CanvasRenderingContext2D,
  icon: VectorIcon,
  x: number,
  y: number,
  scale: number = 1,
): void {
  const size = icon.width * scale
  ctx.save()
  ctx.translate(x, y)

  // Create SVG path from the icon
  const path = new Path2D(`<svg xmlns="http://www.w3.org/2000/svg" width="${icon.width}" height="${icon.height}" viewBox="0 0 24 24">${icon.svg}</svg>`)
  ctx.fillStyle = icon.color
  ctx.fill(path)

  ctx.restore()
}
