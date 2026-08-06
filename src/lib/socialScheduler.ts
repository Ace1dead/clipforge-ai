/**
 * Social Scheduler — Direct publish to TikTok, Instagram Reels, YouTube Shorts, LinkedIn, X.
 * Opus Clip feature parity — we do it free, they charge $29/mo.
 */

export interface SocialPost {
  videoBlob: Blob
  caption: string
  hashtags: string[]
  scheduledTime: Date
  thumbnail?: Blob
  location?: string
  mentions?: string[]
}

export interface PlatformConfig {
  platform: string
  maxCaptionLength: number
  maxHashtags: number
  supportedFormats: string[]
  maxDuration: number
  aspectRatio: string
}

export interface ScheduledPost extends SocialPost {
  id: string
  platform: string
  status: 'pending' | 'scheduled' | 'published' | 'failed'
  publishedUrl?: string
  error?: string
}

export interface PublishPayload {
  caption: string
  scheduledTime: string
  mediaType?: string
  title?: string
  description?: string
  privacyStatus?: string
  tags?: string[]
}

// ═══════════════════════════════════════════════════════════════
// PLATFORM CONFIGURATIONS
// ═══════════════════════════════════════════════════════════════

const PLATFORM_CONFIGS: Record<string, PlatformConfig> = {
  tiktok: {
    platform: 'tiktok',
    maxCaptionLength: 2200,
    maxHashtags: 30,
    supportedFormats: ['mp4', 'webm', 'mov'],
    maxDuration: 600,
    aspectRatio: '9:16',
  },
  instagram: {
    platform: 'instagram',
    maxCaptionLength: 2200,
    maxHashtags: 30,
    supportedFormats: ['mp4', 'webm'],
    maxDuration: 90,
    aspectRatio: '9:16',
  },
  youtube: {
    platform: 'youtube',
    maxCaptionLength: 5000,
    maxHashtags: 15,
    supportedFormats: ['mp4', 'webm', 'mov'],
    maxDuration: 60,
    aspectRatio: '9:16',
  },
  linkedin: {
    platform: 'linkedin',
    maxCaptionLength: 3000,
    maxHashtags: 5,
    supportedFormats: ['mp4'],
    maxDuration: 600,
    aspectRatio: '1:1',
  },
  x: {
    platform: 'x',
    maxCaptionLength: 280,
    maxHashtags: 10,
    supportedFormats: ['mp4'],
    maxDuration: 140,
    aspectRatio: '16:9',
  },
}

export function getPlatformConfig(platform: string): PlatformConfig | null {
  return PLATFORM_CONFIGS[platform] ?? null
}

// ═══════════════════════════════════════════════════════════════
// PAYLOAD GENERATORS
// ═══════════════════════════════════════════════════════════════

export function generateTikTokPayload(post: SocialPost): PublishPayload {
  const config = PLATFORM_CONFIGS.tiktok
  const fullCaption = [post.caption, ...post.hashtags.map(h => `#${h}`)].join(' ')
  return {
    caption: fullCaption.slice(0, config.maxCaptionLength),
    scheduledTime: post.scheduledTime.toISOString(),
    mediaType: 'VIDEO',
  }
}

export function generateInstagramPayload(post: SocialPost): PublishPayload {
  const config = PLATFORM_CONFIGS.instagram
  const fullCaption = [post.caption, ...post.hashtags.map(h => `#${h}`)].join(' ')
  return {
    caption: fullCaption.slice(0, config.maxCaptionLength),
    scheduledTime: post.scheduledTime.toISOString(),
    mediaType: 'REELS',
  }
}

export function generateYouTubePayload(post: SocialPost): PublishPayload {
  const config = PLATFORM_CONFIGS.youtube
  const title = post.caption.slice(0, 100).replace(/#/g, '').trim()
  const description = [post.caption, post.hashtags.map(h => `#${h}`).join(' ')].join('\n')
  return {
    caption: title,
    title,
    description: description.slice(0, config.maxCaptionLength),
    scheduledTime: post.scheduledTime.toISOString(),
    privacyStatus: 'private',
    tags: post.hashtags.slice(0, config.maxHashtags),
  }
}

export function generateLinkedInPayload(post: SocialPost): PublishPayload {
  const config = PLATFORM_CONFIGS.linkedin
  return {
    caption: post.caption.slice(0, config.maxCaptionLength),
    scheduledTime: post.scheduledTime.toISOString(),
    tags: post.hashtags.slice(0, config.maxHashtags),
  }
}

export function generateXPayload(post: SocialPost): PublishPayload {
  const config = PLATFORM_CONFIGS.x
  const hashtags = post.hashtags.slice(0, 3).map(h => `#${h}`).join(' ')
  const caption = `${post.caption.slice(0, config.maxCaptionLength - hashtags.length - 1)} ${hashtags}`
  return {
    caption: caption.trim(),
    scheduledTime: post.scheduledTime.toISOString(),
  }
}

// ═══════════════════════════════════════════════════════════════
// CAPTION VALIDATION
// ═══════════════════════════════════════════════════════════════

export function validateCaption(caption: string, platform: string): { valid: boolean; error?: string } {
  const config = PLATFORM_CONFIGS[platform]
  if (!config) return { valid: false, error: `Unknown platform: ${platform}` }

  if (caption.length > config.maxCaptionLength) {
    return { valid: false, error: `Caption exceeds ${config.maxCaptionLength} characters for ${platform}` }
  }

  return { valid: true }
}

// ═══════════════════════════════════════════════════════════════
// HASHTAG GENERATION
// ═══════════════════════════════════════════════════════════════

const TRENDING_HASHTAGS = ['fyp', 'viral', 'trending', 'foryou', 'explore']
const TOPIC_HASHTAGS: Record<string, string[]> = {
  gaming: ['gaming', 'gamer', 'gamingcommunity', 'esports', 'play'],
  tech: ['tech', 'technology', 'ai', 'coding', 'programming'],
  music: ['music', 'singer', 'songwriter', 'musician', 'newmusic'],
  fitness: ['fitness', 'workout', 'gym', 'motivation', 'health'],
  food: ['food', 'cooking', 'recipe', 'chef', 'foodie'],
  business: ['business', 'entrepreneur', 'startup', 'marketing', 'success'],
  education: ['education', 'learn', 'knowledge', 'tutorial', 'tips'],
}

export function generateHashtags(content: string): string[] {
  const lower = content.toLowerCase()
  const hashtags: string[] = [...TRENDING_HASHTAGS.slice(0, 3)]

  for (const [topic, tags] of Object.entries(TOPIC_HASHTAGS)) {
    if (lower.includes(topic) || lower.includes(topic.slice(0, 4))) {
      hashtags.push(...tags.slice(0, 2))
    }
  }

  // Add content-specific words as hashtags
  const words = lower.split(/\s+/).filter(w => w.length > 4)
  for (const word of words.slice(0, 3)) {
    if (!hashtags.includes(word) && word.length > 4) {
      hashtags.push(word)
    }
  }

  return hashtags.slice(0, 10)
}

// ═══════════════════════════════════════════════════════════════
// SCHEDULING
// ═══════════════════════════════════════════════════════════════

export function formatScheduledTime(date: Date, platform: string): string {
  switch (platform) {
    case 'tiktok':
      return date.toISOString()
    case 'instagram':
      return date.toISOString()
    case 'youtube':
      return date.toISOString()
    case 'linkedin':
      return date.toISOString()
    case 'x':
      return date.toISOString()
    default:
      return date.toISOString()
  }
}

// ═══════════════════════════════════════════════════════════════
// PUBLISH API (Client-side OAuth flow)
// ═══════════════════════════════════════════════════════════════

/**
 * Generates OAuth URL for platform authentication.
 * This is the client-side initiation — the actual publish
 * happens server-side or via platform SDK.
 */
export function generateOAuthUrl(platform: string, redirectUri: string): string {
  const oauthUrls: Record<string, string> = {
    tiktok: `https://www.tiktok.com/auth/authorize/?client_key=clipforge&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=video.upload`,
    instagram: `https://www.facebook.com/v18.0/dialog/oauth?client_id=clipforge&redirect_uri=${encodeURIComponent(redirectUri)}&scope=instagram_basic,instagram_content_publish`,
    youtube: `https://accounts.google.com/o/oauth2/v2/auth?client_id=clipforge&redirect_uri=${encodeURIComponent(redirectUri)}&scope=https://www.googleapis.com/auth/youtube.upload&response_type=code`,
    linkedin: `https://www.linkedin.com/oauth/v2/authorization?client_id=clipforge&redirect_uri=${encodeURIComponent(redirectUri)}&scope=w_member_social&response_type=code`,
    x: `https://twitter.com/i/oauth2/authorize?client_id=clipforge&redirect_uri=${encodeURIComponent(redirectUri)}&scope=tweet.write%20tweet.read%20users.read&response_type=code`,
  }

  return oauthUrls[platform] ?? ''
}

/**
 * Generates shareable download link with platform-optimized settings.
 */
export function generateShareLink(platform: string, videoUrl: string, caption: string): string {
  const shareUrls: Record<string, string> = {
    tiktok: `https://www.tiktok.com/upload?video_url=${encodeURIComponent(videoUrl)}&caption=${encodeURIComponent(caption)}`,
    instagram: `https://www.instagram.com/reels/upload/`,
    youtube: `https://studio.youtube.com/channel/upload`,
    x: `https://twitter.com/intent/tweet?text=${encodeURIComponent(caption)}&url=${encodeURIComponent(videoUrl)}`,
  }

  return shareUrls[platform] ?? videoUrl
}
