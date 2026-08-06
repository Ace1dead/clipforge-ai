import { describe, it, expect } from 'vitest'
import {
  generateTikTokPayload,
  generateInstagramPayload,
  generateYouTubePayload,
  generateLinkedInPayload,
  generateXPayload,
  formatScheduledTime,
  validateCaption,
  generateHashtags,
  type SocialPost,
  type PlatformConfig,
} from './socialScheduler'

describe('generateTikTokPayload', () => {
  it('generates valid TikTok payload', () => {
    const post: SocialPost = {
      videoBlob: new Blob(['test'], { type: 'video/mp4' }),
      caption: 'Check out this clip #viral',
      hashtags: ['fyp', 'viral'],
      scheduledTime: new Date('2026-08-10T14:00:00Z'),
    }
    const payload = generateTikTokPayload(post)
    expect(payload).toHaveProperty('caption')
    expect(payload).toHaveProperty('scheduledTime')
    expect(payload.caption).toContain('#fyp')
  })
})

describe('generateInstagramPayload', () => {
  it('generates valid Instagram payload', () => {
    const post: SocialPost = {
      videoBlob: new Blob(['test'], { type: 'video/mp4' }),
      caption: 'Amazing clip!',
      hashtags: ['reels', 'explore'],
      scheduledTime: new Date('2026-08-10T14:00:00Z'),
    }
    const payload = generateInstagramPayload(post)
    expect(payload).toHaveProperty('caption')
    expect(payload).toHaveProperty('mediaType', 'REELS')
  })
})

describe('generateYouTubePayload', () => {
  it('generates valid YouTube Shorts payload', () => {
    const post: SocialPost = {
      videoBlob: new Blob(['test'], { type: 'video/mp4' }),
      caption: 'Short clip',
      hashtags: ['shorts'],
      scheduledTime: new Date('2026-08-10T14:00:00Z'),
    }
    const payload = generateYouTubePayload(post)
    expect(payload).toHaveProperty('title')
    expect(payload).toHaveProperty('description')
    expect(payload).toHaveProperty('privacyStatus')
  })
})

describe('formatScheduledTime', () => {
  it('formats ISO date to platform string', () => {
    const result = formatScheduledTime(new Date('2026-08-10T14:00:00Z'), 'tiktok')
    expect(result).toBeDefined()
    expect(typeof result).toBe('string')
  })
})

describe('validateCaption', () => {
  it('validates TikTok caption length', () => {
    expect(validateCaption('short', 'tiktok').valid).toBe(true)
    expect(validateCaption('x'.repeat(2300), 'tiktok').valid).toBe(false)
  })

  it('validates Instagram caption length', () => {
    expect(validateCaption('short', 'instagram').valid).toBe(true)
    expect(validateCaption('x'.repeat(2300), 'instagram').valid).toBe(false)
  })

  it('validates YouTube description length', () => {
    expect(validateCaption('short', 'youtube').valid).toBe(true)
    expect(validateCaption('x'.repeat(6000), 'youtube').valid).toBe(false)
  })
})

describe('generateHashtags', () => {
  it('generates relevant hashtags from content', () => {
    const hashtags = generateHashtags('This gaming clip is insane!')
    expect(hashtags.length).toBeGreaterThan(0)
    expect(hashtags.some(h => h.includes('gaming'))).toBe(true)
  })

  it('includes trending hashtags', () => {
    const hashtags = generateHashtags('Check this out')
    expect(hashtags).toContain('fyp')
  })
})
