/**
 * Viral Preset Templates — Production-ready editing configurations
 * Based on 2025-2026 TikTok/Reels/Shorts research.
 * Each preset encodes exact timing, motion, caption, and audio parameters.
 */

export type ViralCategory = 'podcast' | 'gaming' | 'storytelling' | 'business' | 'fitness' | 'music' | 'educational' | 'reaction'

export interface TimingRules {
  hookDuration: number        // seconds: first 1-3s
  cutInterval: [number, number]  // min-max seconds between cuts
  captionWordCount: [number, number]  // words per caption frame
  captionTransitionMs: number  // ms for highlight transition
  fadeDuration: number        // seconds
  minClipLength: number       // seconds
  maxClipLength: number       // seconds
  loopOverlap: number         // seconds of visual loop overlap
}

export interface MotionRules {
  zoomPunchIn: number         // scale multiplier (1.0 = no zoom)
  zoomSpeed: number           // frames to reach full zoom
  panSpeed: number            // pixels per second for pan
  shakeOnBeat: boolean
  shakeIntensity: number      // 0-1
  shakeFrequency: number      // Hz
  motionBlur: boolean
}

export interface CaptionRules {
  style: string               // caption style ID from captions.ts
  fontFamily: string          // override
  fontSize: number            // relative to canvas height
  fontWeight: number
  uppercase: boolean
  highlightColor: string      // hex
  strokeColor: string
  strokeW: number             // relative to font size
  position: 'top' | 'middle' | 'bottom'
  offsetY: number             // relative offset
  lineHeight: number
  shadowEnabled: boolean
  shadowColor: string
  shadowBlur: number
  shadowY: number
  emphasisRule: 'every-word' | 'keywords' | 'end-of-phrase' | 'none'
  keywordDetection: 'volume' | 'pitch' | 'pause' | 'all'
}

export interface AudioRules {
  duckingDb: number           // how much to duck music under speech
  voicePeakDb: number         // target voice level
  musicVolumeDb: number       // background music level
  sfxOnTransitions: boolean
  sfxTypes: string[]          // 'whoosh' | 'riser' | 'hit' | 'click'
  silenceBeforePunchline: number  // seconds of pre-punchline silence
  normalizeTarget: number     // target LUFS
  noiseReduction: boolean
}

export interface ColorRules {
  skin: string                // color skin ID
  contrast: number            // multiplier
  saturation: number          // multiplier
  brightness: number          // multiplier
  temperature: number         // -1 to 1
}

export interface HookRules {
  type: 'text-overlay' | 'mid-action' | 'result-first' | 'question' | 'stakes' | 'reaction' | 'countdown'
  text: string                // template text (placeholders: {topic}, {result}, {number})
  position: 'top' | 'center' | 'bottom'
  duration: number            // seconds
  animation: 'pop' | 'slide' | 'fade' | 'scale' | 'typewriter'
  fontSize: number
}

export interface OverlayRules {
  progressBar: boolean
  progressBarPosition: 'top' | 'bottom'
  progressBarColor: string
  platformBadge: boolean
  chapterCards: boolean
  chapterInterval: number     // seconds between chapter markers
}

export interface ViralPreset {
  id: string
  name: string
  description: string
  category: ViralCategory
  icon: string
  platforms: ('tiktok' | 'reels' | 'shorts')[]
  timing: TimingRules
  motion: MotionRules
  captions: CaptionRules
  audio: AudioRules
  color: ColorRules
  hooks: HookRules[]
  overlays: OverlayRules
  editStyle: string           // editStyle ID
  triggers: {
    genres: string[]
    contentTypes: string[]
    targetDuration: [number, number]
    audienceAge: 'gen-z' | 'millennial' | 'all'
  }
}

// ═══════════════════════════════════════════════════════════════
// PODCAST / TALK-SHOW TEMPLATE
// Dynamic 9:16 auto-reframe, word-by-word karaoke, speaker tracking
// ═══════════════════════════════════════════════════════════════

export const PODCAST_TALKSHOW: ViralPreset = {
  id: 'podcast-talkshow',
  name: 'Podcast / Talk Show',
  description: 'Word-by-word karaoke captions, dynamic reframe, subtle zoom on speaker. Optimized for talking-head clips.',
  category: 'podcast',
  icon: '🎙️',
  platforms: ['tiktok', 'reels', 'shorts'],
  timing: {
    hookDuration: 2,
    cutInterval: [2, 4],
    captionWordCount: [2, 3],
    captionTransitionMs: 100,
    fadeDuration: 0.4,
    minClipLength: 15,
    maxClipLength: 45,
    loopOverlap: 1.5,
  },
  motion: {
    zoomPunchIn: 1.08,
    zoomSpeed: 12,
    panSpeed: 0,
    shakeOnBeat: false,
    shakeIntensity: 0,
    shakeFrequency: 0,
    motionBlur: false,
  },
  captions: {
    style: 'hormozi',
    fontFamily: '"Montserrat", "Inter", system-ui',
    fontSize: 0.065,
    fontWeight: 900,
    uppercase: true,
    highlightColor: '#FFD60A',
    strokeColor: '#000000',
    strokeW: 0.06,
    position: 'middle',
    offsetY: 0.02,
    lineHeight: 1.2,
    shadowEnabled: false,
    shadowColor: 'rgba(0,0,0,0.5)',
    shadowBlur: 0.02,
    shadowY: 0.01,
    emphasisRule: 'keywords',
    keywordDetection: 'all',
  },
  audio: {
    duckingDb: -10,
    voicePeakDb: -6,
    musicVolumeDb: -18,
    sfxOnTransitions: false,
    sfxTypes: [],
    silenceBeforePunchline: 0.3,
    normalizeTarget: -14,
    noiseReduction: true,
  },
  color: {
    skin: 'classic',
    contrast: 1.1,
    saturation: 1.0,
    brightness: 1.0,
    temperature: 0.1,
  },
  hooks: [
    {
      type: 'text-overlay',
      text: '{topic}',
      position: 'center',
      duration: 2.5,
      animation: 'pop',
      fontSize: 0.07,
    },
  ],
  overlays: {
    progressBar: true,
    progressBarPosition: 'top',
    progressBarColor: '#FFD60A',
    platformBadge: true,
    chapterCards: false,
    chapterInterval: 0,
  },
  editStyle: 'velocity',
  triggers: {
    genres: ['podcast', 'interview', 'talk-show', 'commentary'],
    contentTypes: ['talking-head', 'interview', 'monologue'],
    targetDuration: [20, 45],
    audienceAge: 'all',
  },
}

// ═══════════════════════════════════════════════════════════════
// HIGH-ENERGY GAMING / ACTION TEMPLATE
// Beat-synced jump cuts, screen shake, kinetic subtitles, fast pacing
// ═══════════════════════════════════════════════════════════════

export const GAMING_ACTION: ViralPreset = {
  id: 'gaming-action',
  name: 'Gaming / Action',
  description: 'Beat-synced jump cuts, screen shake on audio peaks, high-contrast kinetic subtitles. Designed for FPS, battle royale, and highlight reels.',
  category: 'gaming',
  icon: '🎮',
  platforms: ['tiktok', 'reels', 'shorts'],
  timing: {
    hookDuration: 1.5,
    cutInterval: [0.5, 1.5],
    captionWordCount: [1, 2],
    captionTransitionMs: 60,
    fadeDuration: 0.2,
    minClipLength: 8,
    maxClipLength: 30,
    loopOverlap: 2,
  },
  motion: {
    zoomPunchIn: 1.2,
    zoomSpeed: 6,
    panSpeed: 200,
    shakeOnBeat: true,
    shakeIntensity: 0.8,
    shakeFrequency: 35,
    motionBlur: false,
  },
  captions: {
    style: 'pop-neon',
    fontFamily: '"Impact", "Anton", system-ui',
    fontSize: 0.075,
    fontWeight: 900,
    uppercase: true,
    highlightColor: '#00FF88',
    strokeColor: '#000000',
    strokeW: 0.07,
    position: 'top',
    offsetY: 0.05,
    lineHeight: 1.1,
    shadowEnabled: true,
    shadowColor: 'rgba(0,255,136,0.4)',
    shadowBlur: 0.04,
    shadowY: 0.02,
    emphasisRule: 'every-word',
    keywordDetection: 'volume',
  },
  audio: {
    duckingDb: -12,
    voicePeakDb: -4,
    musicVolumeDb: -14,
    sfxOnTransitions: true,
    sfxTypes: ['whoosh', 'hit', 'click'],
    silenceBeforePunchline: 0.5,
    normalizeTarget: -14,
    noiseReduction: false,
  },
  color: {
    skin: 'edgy',
    contrast: 1.3,
    saturation: 1.2,
    brightness: 1.05,
    temperature: -0.2,
  },
  hooks: [
    {
      type: 'result-first',
      text: '{result}',
      position: 'center',
      duration: 1.5,
      animation: 'scale',
      fontSize: 0.09,
    },
    {
      type: 'stakes',
      text: '{number} lives remaining',
      position: 'top',
      duration: 3,
      animation: 'pop',
      fontSize: 0.05,
    },
  ],
  overlays: {
    progressBar: true,
    progressBarPosition: 'top',
    progressBarColor: '#00FF88',
    platformBadge: true,
    chapterCards: false,
    chapterInterval: 0,
  },
  editStyle: 'sports',
  triggers: {
    genres: ['gaming', 'fps', 'battle-royale', 'esports', 'speedrun'],
    contentTypes: ['gameplay', 'highlight', 'montage', 'clutch'],
    targetDuration: [8, 30],
    audienceAge: 'gen-z',
  },
}

// ═══════════════════════════════════════════════════════════════
// STORYTELLING / EXPLAINER TEMPLATE
// B-roll overlay triggers, progress bar, centered captions, sound hooks
// ═══════════════════════════════════════════════════════════════

export const STORYTELLING_EXPLAINER: ViralPreset = {
  id: 'storytelling-explainer',
  name: 'Storytelling / Explainer',
  description: 'B-roll overlay triggers, dynamic progress bar, centered animated captions. Perfect for educational, how-to, and narrative content.',
  category: 'storytelling',
  icon: '📖',
  platforms: ['tiktok', 'reels', 'shorts'],
  timing: {
    hookDuration: 2,
    cutInterval: [2, 3],
    captionWordCount: [3, 4],
    captionTransitionMs: 120,
    fadeDuration: 0.5,
    minClipLength: 20,
    maxClipLength: 60,
    loopOverlap: 1,
  },
  motion: {
    zoomPunchIn: 1.05,
    zoomSpeed: 15,
    panSpeed: 50,
    shakeOnBeat: false,
    shakeIntensity: 0,
    shakeFrequency: 0,
    motionBlur: false,
  },
  captions: {
    style: 'pop-classic',
    fontFamily: '"Inter", "Montserrat", system-ui',
    fontSize: 0.058,
    fontWeight: 800,
    uppercase: false,
    highlightColor: '#5e6ad2',
    strokeColor: '#000000',
    strokeW: 0.04,
    position: 'middle',
    offsetY: 0.02,
    lineHeight: 1.3,
    shadowEnabled: false,
    shadowColor: 'rgba(0,0,0,0.3)',
    shadowBlur: 0.01,
    shadowY: 0.005,
    emphasisRule: 'keywords',
    keywordDetection: 'pitch',
  },
  audio: {
    duckingDb: -8,
    voicePeakDb: -6,
    musicVolumeDb: -20,
    sfxOnTransitions: true,
    sfxTypes: ['whoosh', 'riser'],
    silenceBeforePunchline: 0.4,
    normalizeTarget: -16,
    noiseReduction: true,
  },
  color: {
    skin: 'classic',
    contrast: 1.05,
    saturation: 1.0,
    brightness: 1.02,
    temperature: 0.05,
  },
  hooks: [
    {
      type: 'question',
      text: '{topic}?',
      position: 'center',
      duration: 2.5,
      animation: 'typewriter',
      fontSize: 0.065,
    },
  ],
  overlays: {
    progressBar: true,
    progressBarPosition: 'bottom',
    progressBarColor: '#5e6ad2',
    platformBadge: true,
    chapterCards: true,
    chapterInterval: 8,
  },
  editStyle: 'kinetic_typography',
  triggers: {
    genres: ['educational', 'tutorial', 'how-to', 'explainer', 'documentary'],
    contentTypes: ['tutorial', 'explainer', 'storytime', 'educational'],
    targetDuration: [20, 60],
    audienceAge: 'all',
  },
}

// ═══════════════════════════════════════════════════════════════
// BUSINESS / ENTREPRENEUR (Hormozi Style)
// ALL-CAPS word-by-word, yellow highlights, bold condensed font
// ═══════════════════════════════════════════════════════════════

export const BUSINESS_ENTREPRENEUR: ViralPreset = {
  id: 'business-entrepreneur',
  name: 'Business / Entrepreneur',
  description: 'The Hormozi formula — ALL-CAPS word-by-word, yellow keyword highlights, bold condensed font. Maximum completion rate for talking-head business content.',
  category: 'business',
  icon: '💼',
  platforms: ['tiktok', 'reels', 'shorts'],
  timing: {
    hookDuration: 2,
    cutInterval: [2, 3],
    captionWordCount: [2, 3],
    captionTransitionMs: 80,
    fadeDuration: 0.3,
    minClipLength: 15,
    maxClipLength: 40,
    loopOverlap: 1.5,
  },
  motion: {
    zoomPunchIn: 1.06,
    zoomSpeed: 10,
    panSpeed: 0,
    shakeOnBeat: false,
    shakeIntensity: 0,
    shakeFrequency: 0,
    motionBlur: false,
  },
  captions: {
    style: 'hormozi',
    fontFamily: '"Montserrat", "Bebas Neue", system-ui',
    fontSize: 0.07,
    fontWeight: 900,
    uppercase: true,
    highlightColor: '#FFD60A',
    strokeColor: '#000000',
    strokeW: 0.065,
    position: 'middle',
    offsetY: 0.03,
    lineHeight: 1.15,
    shadowEnabled: false,
    shadowColor: 'rgba(0,0,0,0.4)',
    shadowBlur: 0.015,
    shadowY: 0.01,
    emphasisRule: 'keywords',
    keywordDetection: 'all',
  },
  audio: {
    duckingDb: -10,
    voicePeakDb: -5,
    musicVolumeDb: -20,
    sfxOnTransitions: false,
    sfxTypes: [],
    silenceBeforePunchline: 0.3,
    normalizeTarget: -14,
    noiseReduction: true,
  },
  color: {
    skin: 'classic',
    contrast: 1.15,
    saturation: 0.95,
    brightness: 1.0,
    temperature: 0,
  },
  hooks: [
    {
      type: 'text-overlay',
      text: '{topic}',
      position: 'center',
      duration: 2,
      animation: 'pop',
      fontSize: 0.08,
    },
  ],
  overlays: {
    progressBar: false,
    progressBarPosition: 'bottom',
    progressBarColor: '#FFD60A',
    platformBadge: true,
    chapterCards: false,
    chapterInterval: 0,
  },
  editStyle: 'velocity',
  triggers: {
    genres: ['business', 'entrepreneur', 'self-development', 'motivation', 'finance'],
    contentTypes: ['talking-head', 'advice', 'hot-take', 'storytime'],
    targetDuration: [15, 40],
    audienceAge: 'all',
  },
}

// ═══════════════════════════════════════════════════════════════
// FITNESS / TRANSFORMATION
// High-energy cuts, motivational captions, progress tracking
// ═══════════════════════════════════════════════════════════════

export const FITNESS_TRANSFORMATION: ViralPreset = {
  id: 'fitness-transformation',
  name: 'Fitness / Transformation',
  description: 'High-energy beat-synced cuts, motivational kinetic captions, before/after reveals. Designed for gym content, transformations, and workout clips.',
  category: 'fitness',
  icon: '💪',
  platforms: ['tiktok', 'reels', 'shorts'],
  timing: {
    hookDuration: 1.5,
    cutInterval: [1, 2],
    captionWordCount: [1, 3],
    captionTransitionMs: 70,
    fadeDuration: 0.3,
    minClipLength: 10,
    maxClipLength: 35,
    loopOverlap: 2,
  },
  motion: {
    zoomPunchIn: 1.15,
    zoomSpeed: 8,
    panSpeed: 100,
    shakeOnBeat: true,
    shakeIntensity: 0.6,
    shakeFrequency: 30,
    motionBlur: false,
  },
  captions: {
    style: 'impact',
    fontFamily: '"Impact", "Anton", system-ui',
    fontSize: 0.07,
    fontWeight: 900,
    uppercase: true,
    highlightColor: '#ef4444',
    strokeColor: '#000000',
    strokeW: 0.06,
    position: 'middle',
    offsetY: 0,
    lineHeight: 1.15,
    shadowEnabled: true,
    shadowColor: 'rgba(239,68,68,0.3)',
    shadowBlur: 0.03,
    shadowY: 0.015,
    emphasisRule: 'every-word',
    keywordDetection: 'volume',
  },
  audio: {
    duckingDb: -12,
    voicePeakDb: -4,
    musicVolumeDb: -12,
    sfxOnTransitions: true,
    sfxTypes: ['hit', 'whoosh'],
    silenceBeforePunchline: 0.4,
    normalizeTarget: -14,
    noiseReduction: false,
  },
  color: {
    skin: 'edgy',
    contrast: 1.25,
    saturation: 1.15,
    brightness: 1.05,
    temperature: -0.1,
  },
  hooks: [
    {
      type: 'result-first',
      text: '{result}',
      position: 'center',
      duration: 1.5,
      animation: 'scale',
      fontSize: 0.085,
    },
  ],
  overlays: {
    progressBar: true,
    progressBarPosition: 'top',
    progressBarColor: '#ef4444',
    platformBadge: true,
    chapterCards: false,
    chapterInterval: 0,
  },
  editStyle: 'raw_impact',
  triggers: {
    genres: ['fitness', 'gym', 'workout', 'bodybuilding', 'transformation'],
    contentTypes: ['workout', 'transformation', 'motivation', 'before-after'],
    targetDuration: [10, 35],
    audienceAge: 'gen-z',
  },
}

// ═══════════════════════════════════════════════════════════════
// MUSIC / PERFORMANCE
// Beat-synced cuts, color grade shifts, velocity ramps
// ═══════════════════════════════════════════════════════════════

export const MUSIC_PERFORMANCE: ViralPreset = {
  id: 'music-performance',
  name: 'Music / Performance',
  description: 'Beat-synced cuts with color grade shifts per section. Fast transitions on drops, slow on verses. Designed for music clips, covers, and performances.',
  category: 'music',
  icon: '🎵',
  platforms: ['tiktok', 'reels', 'shorts'],
  timing: {
    hookDuration: 1,
    cutInterval: [1, 2.5],
    captionWordCount: [2, 4],
    captionTransitionMs: 90,
    fadeDuration: 0.3,
    minClipLength: 10,
    maxClipLength: 30,
    loopOverlap: 2.5,
  },
  motion: {
    zoomPunchIn: 1.1,
    zoomSpeed: 10,
    panSpeed: 80,
    shakeOnBeat: true,
    shakeIntensity: 0.5,
    shakeFrequency: 25,
    motionBlur: true,
  },
  captions: {
    style: 'gradient',
    fontFamily: '"Inter", "Montserrat", system-ui',
    fontSize: 0.055,
    fontWeight: 800,
    uppercase: false,
    highlightColor: '#ec4899',
    strokeColor: 'rgba(0,0,0,0.5)',
    strokeW: 0.03,
    position: 'bottom',
    offsetY: -0.05,
    lineHeight: 1.3,
    shadowEnabled: false,
    shadowColor: 'rgba(0,0,0,0.3)',
    shadowBlur: 0.01,
    shadowY: 0.005,
    emphasisRule: 'end-of-phrase',
    keywordDetection: 'all',
  },
  audio: {
    duckingDb: -6,
    voicePeakDb: -4,
    musicVolumeDb: -8,
    sfxOnTransitions: true,
    sfxTypes: ['riser', 'hit'],
    silenceBeforePunchline: 0,
    normalizeTarget: -14,
    noiseReduction: false,
  },
  color: {
    skin: 'candy',
    contrast: 1.1,
    saturation: 1.3,
    brightness: 1.1,
    temperature: 0.15,
  },
  hooks: [
    {
      type: 'mid-action',
      text: '',
      position: 'center',
      duration: 1,
      animation: 'scale',
      fontSize: 0.06,
    },
  ],
  overlays: {
    progressBar: true,
    progressBarPosition: 'bottom',
    progressBarColor: '#ec4899',
    platformBadge: true,
    chapterCards: false,
    chapterInterval: 0,
  },
  editStyle: 'music_video',
  triggers: {
    genres: ['music', 'pop', 'hip-hop', 'rock', 'electronic', 'cover'],
    contentTypes: ['performance', 'cover', 'dance', 'music-video'],
    targetDuration: [10, 30],
    audienceAge: 'gen-z',
  },
}

// ═══════════════════════════════════════════════════════════════
// EDUCATIONAL / MINIMAL
// Clean captions, minimal effects, information-focused
// ═══════════════════════════════════════════════════════════════

export const EDUCATIONAL_MINIMAL: ViralPreset = {
  id: 'educational-minimal',
  name: 'Educational / Minimal',
  description: 'Clean, readable captions with minimal distractions. Optimized for knowledge-sharing, tips, and informational content.',
  category: 'educational',
  icon: '📚',
  platforms: ['tiktok', 'reels', 'shorts'],
  timing: {
    hookDuration: 2.5,
    cutInterval: [3, 5],
    captionWordCount: [3, 5],
    captionTransitionMs: 150,
    fadeDuration: 0.5,
    minClipLength: 15,
    maxClipLength: 60,
    loopOverlap: 1,
  },
  motion: {
    zoomPunchIn: 1.03,
    zoomSpeed: 20,
    panSpeed: 0,
    shakeOnBeat: false,
    shakeIntensity: 0,
    shakeFrequency: 0,
    motionBlur: false,
  },
  captions: {
    style: 'minimal',
    fontFamily: '"Inter", system-ui',
    fontSize: 0.048,
    fontWeight: 600,
    uppercase: false,
    highlightColor: '#22d3ee',
    strokeColor: 'rgba(0,0,0,0.7)',
    strokeW: 0.025,
    position: 'bottom',
    offsetY: -0.06,
    lineHeight: 1.5,
    shadowEnabled: false,
    shadowColor: 'rgba(0,0,0,0.2)',
    shadowBlur: 0.005,
    shadowY: 0.003,
    emphasisRule: 'keywords',
    keywordDetection: 'pause',
  },
  audio: {
    duckingDb: -8,
    voicePeakDb: -6,
    musicVolumeDb: -22,
    sfxOnTransitions: false,
    sfxTypes: [],
    silenceBeforePunchline: 0,
    normalizeTarget: -16,
    noiseReduction: true,
  },
  color: {
    skin: 'classic',
    contrast: 1.0,
    saturation: 0.95,
    brightness: 1.02,
    temperature: 0,
  },
  hooks: [
    {
      type: 'question',
      text: '{topic}',
      position: 'center',
      duration: 2.5,
      animation: 'fade',
      fontSize: 0.06,
    },
  ],
  overlays: {
    progressBar: true,
    progressBarPosition: 'bottom',
    progressBarColor: '#22d3ee',
    platformBadge: true,
    chapterCards: false,
    chapterInterval: 0,
  },
  editStyle: 'documentary',
  triggers: {
    genres: ['educational', 'science', 'tech', 'finance', 'life-hack'],
    contentTypes: ['tutorial', 'explainer', 'tips', 'facts'],
    targetDuration: [15, 60],
    audienceAge: 'all',
  },
}

// ═══════════════════════════════════════════════════════════════
// REACTION / COMMENTARY
// Face-cam first, reaction-driven, meme overlays
// ═══════════════════════════════════════════════════════════════

export const REACTION_COMMENTARY: ViralPreset = {
  id: 'reaction-commentary',
  name: 'Reaction / Commentary',
  description: 'Face-cam first, reaction-driven editing. Meme overlays, pop-in graphics, high-energy captions. Perfect for reaction content and hot takes.',
  category: 'reaction',
  icon: '😮',
  platforms: ['tiktok', 'reels', 'shorts'],
  timing: {
    hookDuration: 1.5,
    cutInterval: [1.5, 3],
    captionWordCount: [2, 3],
    captionTransitionMs: 80,
    fadeDuration: 0.3,
    minClipLength: 10,
    maxClipLength: 40,
    loopOverlap: 1.5,
  },
  motion: {
    zoomPunchIn: 1.12,
    zoomSpeed: 6,
    panSpeed: 0,
    shakeOnBeat: true,
    shakeIntensity: 0.4,
    shakeFrequency: 20,
    motionBlur: false,
  },
  captions: {
    style: 'comic',
    fontFamily: '"Impact", "Anton", system-ui',
    fontSize: 0.065,
    fontWeight: 800,
    uppercase: true,
    highlightColor: '#ef4444',
    strokeColor: '#ffffff',
    strokeW: 0.05,
    position: 'middle',
    offsetY: 0,
    lineHeight: 1.2,
    shadowEnabled: false,
    shadowColor: 'rgba(0,0,0,0.3)',
    shadowBlur: 0.01,
    shadowY: 0.005,
    emphasisRule: 'every-word',
    keywordDetection: 'volume',
  },
  audio: {
    duckingDb: -10,
    voicePeakDb: -4,
    musicVolumeDb: -18,
    sfxOnTransitions: true,
    sfxTypes: ['whoosh', 'hit', 'riser'],
    silenceBeforePunchline: 0.5,
    normalizeTarget: -14,
    noiseReduction: false,
  },
  color: {
    skin: 'candy',
    contrast: 1.15,
    saturation: 1.1,
    brightness: 1.05,
    temperature: 0.1,
  },
  hooks: [
    {
      type: 'reaction',
      text: '{topic}',
      position: 'center',
      duration: 1.5,
      animation: 'pop',
      fontSize: 0.075,
    },
  ],
  overlays: {
    progressBar: true,
    progressBarPosition: 'top',
    progressBarColor: '#ef4444',
    platformBadge: true,
    chapterCards: false,
    chapterInterval: 0,
  },
  editStyle: 'raw_impact',
  triggers: {
    genres: ['reaction', 'commentary', 'hot-take', 'drama', 'meme'],
    contentTypes: ['reaction', 'commentary', 'rant', 'hot-take'],
    targetDuration: [10, 40],
    audienceAge: 'gen-z',
  },
}

// ═══════════════════════════════════════════════════════════════
// EXPORT ALL PRESETS
// ═══════════════════════════════════════════════════════════════

export const ALL_VIRAL_PRESETS: ViralPreset[] = [
  PODCAST_TALKSHOW,
  GAMING_ACTION,
  STORYTELLING_EXPLAINER,
  BUSINESS_ENTREPRENEUR,
  FITNESS_TRANSFORMATION,
  MUSIC_PERFORMANCE,
  EDUCATIONAL_MINIMAL,
  REACTION_COMMENTARY,
]

export function getPresetById(id: string): ViralPreset | undefined {
  return ALL_VIRAL_PRESETS.find(p => p.id === id)
}

export function getPresetsForCategory(category: ViralCategory): ViralPreset[] {
  return ALL_VIRAL_PRESETS.filter(p => p.category === category)
}

export function getPresetsForPlatform(platform: 'tiktok' | 'reels' | 'shorts'): ViralPreset[] {
  return ALL_VIRAL_PRESETS.filter(p => p.platforms.includes(platform))
}
