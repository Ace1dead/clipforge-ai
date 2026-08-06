/**
 * Edit Style Definitions — The 6 editing architectures + 4 color skins.
 * Each style maps to a set of effect parameters and timeline rules.
 */

import type { ColorGrade } from './effects'
import { COLOR_SKINS } from './effects'

export type EditStyleId =
  | 'velocity'
  | 'raw_impact'
  | 'flow_match'
  | 'compositing'
  | 'mmv_kinetic'
  | 'kinetic_typography'
  | 'cinematic'
  | 'documentary'
  | 'music_video'
  | 'sports'

export type ColorSkinId = 'candy' | 'edgy' | 'lofi' | 'classic'

export interface EditStyle {
  id: EditStyleId
  name: string
  description: string
  icon: string
  // Effect parameters
  screenShake: { enabled: boolean; intensity: number; frequency: number }
  chromaticAberration: { enabled: boolean; offset: number }
  vignette: { enabled: boolean; strength: number; radius: number }
  filmGrain: { enabled: boolean; intensity: number }
  exposurePulse: { enabled: boolean; stops: number; decayFrames: number }
  scanlines: { enabled: boolean; density: number; opacity: number }
  glitch: { enabled: boolean; intensity: number }
  // Speed ramp parameters
  velocity: { enabled: boolean; fastSpeed: number; slowSpeed: number; slowDuration: number }
  // Audio-reactive parameters
  audioReactive: { beatShake: boolean; beatFlash: boolean; beatGlitch: boolean }
  // When to apply this style (AI selection hints)
  triggers: {
    genres: string[]
    audioMoods: string[]
    tempos: ('slow' | 'mid' | 'fast' | 'very_fast')[]
    minBPM?: number
    maxBPM?: number
  }
}

export const EDIT_STYLES: Record<EditStyleId, EditStyle> = {
  velocity: {
    id: 'velocity',
    name: 'Velocity Edit',
    description: 'Speed ramps between beats — fast between kicks, ultra slow-mo on drops. The signature TikTok edit.',
    icon: '⚡',
    screenShake: { enabled: false, intensity: 0, frequency: 0 },
    chromaticAberration: { enabled: true, offset: 2 },
    vignette: { enabled: true, strength: 0.2, radius: 0.7 },
    filmGrain: { enabled: false, intensity: 0 },
    exposurePulse: { enabled: false, stops: 0, decayFrames: 0 },
    scanlines: { enabled: false, density: 0, opacity: 0 },
    glitch: { enabled: false, intensity: 0 },
    velocity: { enabled: true, fastSpeed: 3.5, slowSpeed: 0.25, slowDuration: 0.12 },
    audioReactive: { beatShake: false, beatFlash: true, beatGlitch: false },
    triggers: {
      genres: ['pop', 'electronic', 'dance', 'hip-hop', 'phonk'],
      audioMoods: ['upbeat', 'aggressive', 'energetic'],
      tempos: ['mid', 'fast'],
      minBPM: 100,
      maxBPM: 160,
    },
  },

  raw_impact: {
    id: 'raw_impact',
    name: 'Raw / Impact',
    description: '1:1 raw clips with screen shake and exposure pulses on every bass drop. Pure intensity.',
    icon: '💥',
    screenShake: { enabled: true, intensity: 1.2, frequency: 35 },
    chromaticAberration: { enabled: false, offset: 0 },
    vignette: { enabled: true, strength: 0.3, radius: 0.6 },
    filmGrain: { enabled: true, intensity: 0.04 },
    exposurePulse: { enabled: true, stops: 1.5, decayFrames: 4 },
    scanlines: { enabled: false, density: 0, opacity: 0 },
    glitch: { enabled: false, intensity: 0 },
    velocity: { enabled: false, fastSpeed: 1, slowSpeed: 1, slowDuration: 0 },
    audioReactive: { beatShake: true, beatFlash: true, beatGlitch: false },
    triggers: {
      genres: ['rock', 'metal', 'phonk', 'drill', 'trap'],
      audioMoods: ['aggressive', 'intense', 'chaotic'],
      tempos: ['fast', 'very_fast'],
      minBPM: 120,
    },
  },

  flow_match: {
    id: 'flow_match',
    name: 'Flow & Match-Cut',
    description: 'Seamless transitions by matching motion vectors and geometric shapes between clips.',
    icon: '🌊',
    screenShake: { enabled: false, intensity: 0, frequency: 0 },
    chromaticAberration: { enabled: false, offset: 0 },
    vignette: { enabled: true, strength: 0.2, radius: 0.75 },
    filmGrain: { enabled: false, intensity: 0 },
    exposurePulse: { enabled: false, stops: 0, decayFrames: 0 },
    scanlines: { enabled: false, density: 0, opacity: 0 },
    glitch: { enabled: false, intensity: 0 },
    velocity: { enabled: true, fastSpeed: 1.5, slowSpeed: 0.8, slowDuration: 0.15 },
    audioReactive: { beatShake: false, beatFlash: true, beatGlitch: false },
    triggers: {
      genres: ['cinematic', 'ambient', 'lo-fi', 'classical'],
      audioMoods: ['calm', 'emotional', 'nostalgic'],
      tempos: ['slow', 'mid'],
    },
  },

  compositing: {
    id: 'compositing',
    name: 'Compositing & Masking',
    description: 'Subject isolation with foreground overlay on contrasting backgrounds. Parallax depth.',
    icon: '🎭',
    screenShake: { enabled: false, intensity: 0, frequency: 0 },
    chromaticAberration: { enabled: true, offset: 1.5 },
    vignette: { enabled: true, strength: 0.25, radius: 0.65 },
    filmGrain: { enabled: false, intensity: 0 },
    exposurePulse: { enabled: false, stops: 0, decayFrames: 0 },
    scanlines: { enabled: false, density: 0, opacity: 0 },
    glitch: { enabled: false, intensity: 0 },
    velocity: { enabled: false, fastSpeed: 1, slowSpeed: 1, slowDuration: 0 },
    audioReactive: { beatShake: false, beatFlash: false, beatGlitch: false },
    triggers: {
      genres: ['cinematic', 'music-video', 'commercial'],
      audioMoods: ['dramatic', 'epic'],
      tempos: ['mid', 'fast'],
    },
  },

  mmv_kinetic: {
    id: 'mmv_kinetic',
    name: 'MMV / Kinetic Motion',
    description: 'Manga-style motion with depth layer separation, puppet warping, and camera push-in.',
    icon: '📸',
    screenShake: { enabled: true, intensity: 0.4, frequency: 20 },
    chromaticAberration: { enabled: true, offset: 2.5 },
    vignette: { enabled: true, strength: 0.35, radius: 0.55 },
    filmGrain: { enabled: true, intensity: 0.06 },
    exposurePulse: { enabled: true, stops: 0.8, decayFrames: 3 },
    scanlines: { enabled: false, density: 0, opacity: 0 },
    glitch: { enabled: true, intensity: 0.3 },
    velocity: { enabled: true, fastSpeed: 2.0, slowSpeed: 0.5, slowDuration: 0.08 },
    audioReactive: { beatShake: true, beatFlash: true, beatGlitch: true },
    triggers: {
      genres: ['anime', 'j-pop', 'j-rock', 'ost'],
      audioMoods: ['energetic', 'dramatic', 'emotional'],
      tempos: ['mid', 'fast', 'very_fast'],
      minBPM: 90,
    },
  },

  kinetic_typography: {
    id: 'kinetic_typography',
    name: 'Kinetic Typography',
    description: '3D text synced to vocals — scales, shatters, slides with spoken syllables.',
    icon: '🔤',
    screenShake: { enabled: true, intensity: 0.3, frequency: 25 },
    chromaticAberration: { enabled: true, offset: 1 },
    vignette: { enabled: true, strength: 0.2, radius: 0.7 },
    filmGrain: { enabled: false, intensity: 0 },
    exposurePulse: { enabled: true, stops: 0.5, decayFrames: 3 },
    scanlines: { enabled: false, density: 0, opacity: 0 },
    glitch: { enabled: true, intensity: 0.2 },
    velocity: { enabled: false, fastSpeed: 1, slowSpeed: 1, slowDuration: 0 },
    audioReactive: { beatShake: true, beatFlash: false, beatGlitch: false },
    triggers: {
      genres: ['hip-hop', 'rap', 'pop', 'electronic'],
      audioMoods: ['upbeat', 'aggressive', 'energetic'],
      tempos: ['mid', 'fast'],
    },
  },

  cinematic: {
    id: 'cinematic',
    name: 'Cinematic',
    description: 'Widescreen letterbox, film grain, subtle vignette. Hollywood-grade color grade with teal/orange split.',
    icon: '🎞️',
    screenShake: { enabled: false, intensity: 0, frequency: 0 },
    chromaticAberration: { enabled: false, offset: 0 },
    vignette: { enabled: true, strength: 0.4, radius: 0.6 },
    filmGrain: { enabled: true, intensity: 0.06 },
    exposurePulse: { enabled: false, stops: 0, decayFrames: 0 },
    scanlines: { enabled: false, density: 0, opacity: 0 },
    glitch: { enabled: false, intensity: 0 },
    velocity: { enabled: false, fastSpeed: 1, slowSpeed: 1, slowDuration: 0 },
    audioReactive: { beatShake: false, beatFlash: false, beatGlitch: false },
    triggers: {
      genres: ['cinematic', 'ost', 'classical', 'ambient'],
      audioMoods: ['dramatic', 'emotional', 'epic', 'nostalgic'],
      tempos: ['slow', 'mid'],
    },
  },

  documentary: {
    id: 'documentary',
    name: 'Documentary',
    description: 'Clean, stable shots with subtle grain. Text overlays at bottom, minimal effects. Informational.',
    icon: '📹',
    screenShake: { enabled: false, intensity: 0, frequency: 0 },
    chromaticAberration: { enabled: false, offset: 0 },
    vignette: { enabled: true, strength: 0.15, radius: 0.8 },
    filmGrain: { enabled: true, intensity: 0.03 },
    exposurePulse: { enabled: false, stops: 0, decayFrames: 0 },
    scanlines: { enabled: false, density: 0, opacity: 0 },
    glitch: { enabled: false, intensity: 0 },
    velocity: { enabled: false, fastSpeed: 1, slowSpeed: 1, slowDuration: 0 },
    audioReactive: { beatShake: false, beatFlash: false, beatGlitch: false },
    triggers: {
      genres: ['documentary', 'news', 'educational', 'interview'],
      audioMoods: ['calm', 'informative', 'serious'],
      tempos: ['slow', 'mid'],
    },
  },

  music_video: {
    id: 'music_video',
    name: 'Music Video',
    description: 'Beat-synced cuts with color grade shifts per section. Fast transitions on drops, slow on verses.',
    icon: '🎵',
    screenShake: { enabled: true, intensity: 0.6, frequency: 30 },
    chromaticAberration: { enabled: true, offset: 1.5 },
    vignette: { enabled: true, strength: 0.25, radius: 0.65 },
    filmGrain: { enabled: false, intensity: 0 },
    exposurePulse: { enabled: true, stops: 1.0, decayFrames: 4 },
    scanlines: { enabled: false, density: 0, opacity: 0 },
    glitch: { enabled: true, intensity: 0.15 },
    velocity: { enabled: true, fastSpeed: 2.5, slowSpeed: 0.6, slowDuration: 0.1 },
    audioReactive: { beatShake: true, beatFlash: true, beatGlitch: false },
    triggers: {
      genres: ['music-video', 'pop', 'hip-hop', 'electronic', 'rock'],
      audioMoods: ['energetic', 'upbeat', 'dramatic'],
      tempos: ['mid', 'fast', 'very_fast'],
      minBPM: 90,
    },
  },

  sports: {
    id: 'sports',
    name: 'Sports / Hype',
    description: 'Aggressive shake, flash on impact, slow-mo replays. Designed for highlights and reaction clips.',
    icon: '🏆',
    screenShake: { enabled: true, intensity: 1.5, frequency: 40 },
    chromaticAberration: { enabled: true, offset: 3 },
    vignette: { enabled: true, strength: 0.35, radius: 0.55 },
    filmGrain: { enabled: true, intensity: 0.04 },
    exposurePulse: { enabled: true, stops: 2.0, decayFrames: 3 },
    scanlines: { enabled: false, density: 0, opacity: 0 },
    glitch: { enabled: true, intensity: 0.3 },
    velocity: { enabled: true, fastSpeed: 4.0, slowSpeed: 0.15, slowDuration: 0.15 },
    audioReactive: { beatShake: true, beatFlash: true, beatGlitch: true },
    triggers: {
      genres: ['sports', 'gaming', 'action', 'extreme'],
      audioMoods: ['intense', 'chaotic', 'aggressive', 'energetic'],
      tempos: ['fast', 'very_fast'],
      minBPM: 120,
    },
  },
}

export const COLOR_SKIN_OPTIONS: Record<ColorSkinId, { name: string; description: string; grade: ColorGrade; icon: string }> = {
  candy: {
    name: 'Candy Style',
    description: 'Pastel pinks, cyans, soft yellows. High exposure, low contrast, dreamy feel.',
    grade: COLOR_SKINS.candy,
    icon: '🍬',
  },
  edgy: {
    name: 'Edgy / Phonk',
    description: 'Crushed shadows, deep blues/greens, warm highlights. Chromatic aberration on drops.',
    grade: COLOR_SKINS.edgy,
    icon: '🖤',
  },
  lofi: {
    name: 'Sad / Lo-Fi',
    description: 'Warm, desaturated, vintage film look. Grain overlay, light leaks, letterbox.',
    grade: COLOR_SKINS.lofi,
    icon: '📼',
  },
  classic: {
    name: 'Classic',
    description: 'Neutral, balanced grading. Clean and professional.',
    grade: COLOR_SKINS.classic,
    icon: '🎬',
  },
}

/**
 * Select the best edit style based on video metadata and beat analysis.
 */
export function selectEditingStyle(
  genre: string,
  audioMood: string,
  bpm: number,
  tempo: 'slow' | 'mid' | 'fast' | 'very_fast'
): { style: EditStyle; colorSkin: ColorSkinId } {
  let bestStyle: EditStyle = EDIT_STYLES.velocity
  let bestScore = 0

  for (const style of Object.values(EDIT_STYLES)) {
    let score = 0
    const t = style.triggers

    // Genre match
    if (t.genres.some(g => genre.toLowerCase().includes(g))) score += 3
    // Mood match
    if (t.audioMoods.some(m => audioMood.toLowerCase().includes(m))) score += 2
    // Tempo match
    if (t.tempos.includes(tempo)) score += 1
    // BPM range
    if (t.minBPM && bpm >= t.minBPM) score += 0.5
    if (t.maxBPM && bpm <= t.maxBPM) score += 0.5

    if (score > bestScore) { bestScore = score; bestStyle = style }
  }

  // Select color skin based on genre/mood
  let colorSkin: ColorSkinId = 'classic'
  const g = genre.toLowerCase()
  const m = audioMood.toLowerCase()

  if (g.includes('phonk') || g.includes('drill') || g.includes('trap') || m.includes('aggressive')) {
    colorSkin = 'edgy'
  } else if (g.includes('lo-fi') || g.includes('lofi') || m.includes('nostalgic') || m.includes('sad')) {
    colorSkin = 'lofi'
  } else if (g.includes('pop') || g.includes('j-pop') || g.includes('k-pop') || m.includes('upbeat')) {
    colorSkin = 'candy'
  }

  return { style: bestStyle, colorSkin }
}
