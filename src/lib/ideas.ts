export interface ContentIdea { title: string; hook: string; angle: string; niche: string; platform: string; estimatedReach: string }

const NICHES = ['Gaming', 'Finance', 'Fitness', 'Tech', 'Food', 'Travel', 'Business', 'Self-improvement', 'Movies', 'AI', 'Fashion', 'Music', 'Pets', 'Science', 'History']

const HOOKS_BY_STYLE: Record<string, string[]> = {
  curiosity: [
    'Nobody talks about this {topic} secret',
    'What they don\'t tell you about {topic}',
    'The {topic} trick that took me years to learn',
    'I found something that changes everything about {topic}',
    'This {topic} hack is insane — watch this',
  ],
  challenge: [
    'Stop doing {topic} wrong — do THIS instead',
    'Why 99% of people fail at {topic}',
    'You\'re making a huge {topic} mistake',
    'Delete this {topic} habit immediately',
    'The {topic} myth that\'s ruining your results',
  ],
  story: [
    'I tried {topic} for 30 days — here\'s what happened',
    'The real story behind {topic} they don\'t want you to know',
    'I lived through this — here\'s the truth about {topic}',
    'This {topic} moment changed my life forever',
    'The {topic} journey nobody talks about',
  ],
  listicle: [
    '5 {topic} tips that actually work in 2026',
    'The only 3 {topic} rules you need to follow',
    '7 {topic} mistakes everyone makes',
    '10 {topic} hacks that will save you hours',
    'The {topic} checklist nobody gave you',
  ],
  reaction: [
    'This {topic} video broke the internet — here\'s why',
    'I can\'t believe this actually happened in {topic}',
    'Watch this {topic} moment — it\'s insane',
    'The {topic} moment that went viral for a reason',
    'This {topic} take is controversial but true',
  ],
  educational: [
    'Save this — you\'ll need it later for {topic}',
    'The {topic} guide nobody gave you',
    'Everything you need to know about {topic} in 60 seconds',
    'Watch this before you make a {topic} mistake',
    'The {topic} basics that actually matter',
  ],
}

const ANGLES = [
  { format: 'Day-in-the-life storytelling', platform: 'TikTok', reach: '10K-100K' },
  { format: 'Rage-bait myth vs reality', platform: 'TikTok', reach: '50K-500K' },
  { format: 'Beginner vs pro side-by-side', platform: 'Instagram Reels', reach: '5K-50K' },
  { format: 'Reaction + commentary over clips', platform: 'YouTube Shorts', reach: '10K-1M' },
  { format: 'Faceless voiceover with stock visuals', platform: 'TikTok', reach: '5K-100K' },
  { format: 'Reddit story narration with captions', platform: 'YouTube Shorts', reach: '10K-500K' },
  { format: '3-step tutorial with screen recording', platform: 'Instagram Reels', reach: '3K-30K' },
  { format: 'Hot take with evidence-based rebuttal', platform: 'TikTok', reach: '20K-200K' },
  { format: 'Timeline/lore explained in 60 seconds', platform: 'YouTube Shorts', reach: '10K-1M' },
  { format: 'POV skit with trending audio', platform: 'TikTok', reach: '50K-1M' },
  { format: 'Before/after transformation', platform: 'Instagram Reels', reach: '5K-100K' },
  { format: 'Duet/stitch with viral video', platform: 'TikTok', reach: '10K-500K' },
  { format: 'Green screen with text overlay', platform: 'TikTok', reach: '20K-200K' },
  { format: 'Tutorial with captions + B-roll', platform: 'YouTube Shorts', reach: '5K-50K' },
  { format: 'Storytime with animated text', platform: 'TikTok', reach: '10K-100K' },
]

const HOOK_STYLES = Object.keys(HOOKS_BY_STYLE)

export function generateIdeas(count = 6, niche?: string): ContentIdea[] {
  const out: ContentIdea[] = []
  const used = new Set<string>()
  const maxAttempts = count * 20
  let attempts = 0
  while (out.length < count && attempts < maxAttempts) {
    attempts++
    const n = niche ?? NICHES[Math.floor(Math.random() * NICHES.length)]
    const style = HOOK_STYLES[Math.floor(Math.random() * HOOK_STYLES.length)]
    const hooks = HOOKS_BY_STYLE[style]
    const hook = hooks[Math.floor(Math.random() * hooks.length)].replace('{topic}', n.toLowerCase())
    const angle = ANGLES[Math.floor(Math.random() * ANGLES.length)]
    const key = hook + angle.format
    if (used.has(key)) continue
    used.add(key)
    out.push({
      title: hook,
      hook,
      angle: `${angle.format} → ${angle.platform}`,
      niche: n,
      platform: angle.platform,
      estimatedReach: angle.reach,
    })
  }
  return out
}

export const CONTENT_REWARDS = [
  { threshold: 1000, reward: 'Starter Pack' },
  { threshold: 10000, reward: '1 month Pro' },
  { threshold: 50000, reward: '3 months Pro' },
  { threshold: 100000, reward: '1 year Pro' },
  { threshold: 1000000, reward: 'Lifetime Pro' },
]
