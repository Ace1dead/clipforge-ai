/**
 * AI Video Analysis & Clip Engine
 * Core intelligence for automated clip creation, viral analysis, and content generation.
 * Uses client-side AI with auto-fallback to heuristics.
 */

import { generateAI } from './aiService';

// ============================================================
// TYPES
// ============================================================

export interface VideoAnalysis {
  duration: number;
  totalScore: number;
  viralPotential: 'low' | 'medium' | 'high' | 'viral';
  segments: VideoSegment[];
  hooks: Hook[];
  moments: ViralMoment[];
  metadata: VideoMetadata;
  suggestions: string[];
}

export interface VideoSegment {
  id: string;
  start: number;
  end: number;
  duration: number;
  score: number;
  type: 'hook' | 'climax' | 'punchline' | 'reveal' | 'emotional' | 'educational' | 'controversial' | 'quiet';
  description: string;
  transcript: string;
  platform: { tiktok: number; reels: number; shorts: number };
  suggestedCaptions: string[];
}

export interface Hook {
  text: string;
  type: 'question' | 'statement' | 'challenge' | 'shock' | 'curiosity' | 'emotional';
  score: number;
  platform: string;
  estimatedReach: string;
}

export interface ViralMoment {
  timestamp: number;
  type: 'high_energy' | 'emotional_peak' | 'surprise' | 'humor' | 'controversy' | 'inspiration';
  intensity: number;
  description: string;
  suggestedClipStart: number;
  suggestedClipEnd: number;
}

export interface VideoMetadata {
  hasSpeech: boolean;
  language: string;
  speakerCount: number;
  audioEnergy: number;
  visualComplexity: number;
  pacingScore: number;
  emotionalRange: number;
}

export interface ClipResult {
  id: string;
  title: string;
  description: string;
  start: number;
  end: number;
  duration: number;
  viralScore: number;
  platform: 'tiktok' | 'reels' | 'shorts';
  hooks: string[];
  hashtags: string[];
  thumbnailTimestamp: number;
  captionStyle: string;
  transitions: TransitionSuggestion[];
  musicMood: string;
}

export interface TransitionSuggestion {
  type: 'cut' | 'fade' | 'zoom' | 'glitch' | 'swipe';
  timestamp: number;
  reason: string;
}

export interface ContentPackage {
  title: string;
  description: string;
  hooks: string[];
  hashtags: string[];
  captions: string[];
  bestClip: ClipResult;
  allClips: ClipResult[];
  thumbnailSuggestions: number[];
}

// ============================================================
// AI VIDEO ANALYSIS
// ============================================================

/**
 * Analyze a video for viral potential, hooks, and optimal clip points.
 * Takes video metadata (duration, transcript, audio energy) and returns full analysis.
 */
export async function analyzeVideo(input: {
  duration: number;
  transcript?: string;
  audioEnergyProfile?: number[];
  title?: string;
  description?: string;
}): Promise<VideoAnalysis> {
  const { duration, transcript, title, description } = input;

  const systemPrompt = `You are a world-class viral content analyst for short-form video platforms (TikTok, Instagram Reels, YouTube Shorts).

Analyze the given video and provide:
1. VIRAL POTENTIAL (low/medium/high/viral) with score 0-100
2. BEST SEGMENTS - Identify 3-8 optimal clip segments (15-60 seconds each)
3. HOOKS - Generate 5 viral hooks for the best clip
4. MOMENTS - Identify peak engagement moments
5. SUGGESTIONS - 3-5 ways to make clips more viral

RULES:
- Clips must be 15-60 seconds for short-form platforms
- Hooks must grab attention in first 1-3 seconds
- Consider pacing, emotional arcs, and surprise factor
- Score each segment 0-100 for viral potential
- Platform scores: TikTok (entertainment), Reels (aesthetic), Shorts (educational)

Respond in valid JSON only. No markdown.`;

  const avgEnergy = input.audioEnergyProfile && input.audioEnergyProfile.length > 0
    ? (input.audioEnergyProfile.reduce((a, b) => a + b, 0) / input.audioEnergyProfile.length * 100).toFixed(1)
    : 'N/A';

  const userPrompt = `Analyze this video for viral clip creation:

Title: ${title || 'Untitled'}
Duration: ${formatTime(duration)}
Description: ${description || 'N/A'}
Audio Energy: ${avgEnergy}%
Transcript: ${transcript || 'No transcript available'}

Provide full JSON analysis with segments, hooks, moments, and suggestions.`;

  try {
    const response = await generateAI({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      maxTokens: 3000,
      temperature: 0.7,
    });

    return parseAnalysisResponse(response.content, duration, input.audioEnergyProfile);
  } catch (e) {
    throw new Error(`AI video analysis failed: ${e instanceof Error ? e.message : 'Unknown error'}. Configure an API key in AI Settings.`);
  }
}

function parseAnalysisResponse(content: string, duration: number, energyProfile?: number[]): VideoAnalysis {
  try {
    // Try to extract JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('AI response was not valid JSON. Retry the analysis.');

    const data = JSON.parse(jsonMatch[0]);

    return {
      duration,
      totalScore: clampNumber(data.totalScore ?? data.total_score ?? 50, 0, 100),
      viralPotential: data.viralPotential ?? data.viral_potential ?? 'medium',
      segments: (data.segments ?? []).map((s: any, i: number) => ({
        id: `seg-${i}`,
        start: clampNumber(s.start ?? 0, 0, duration),
        end: clampNumber(s.end ?? duration, 0, duration),
        duration: clampNumber(s.duration != null ? s.duration : (s.end != null && s.start != null ? s.end - s.start : 30), 1, 120),
        score: clampNumber(s.score ?? 50, 0, 100),
        type: s.type ?? 'hook',
        description: s.description ?? '',
        transcript: s.transcript ?? '',
        platform: s.platform ?? { tiktok: 50, reels: 50, shorts: 50 },
        suggestedCaptions: s.suggestedCaptions ?? s.captions ?? [],
      })),
      hooks: (data.hooks ?? []).map((h: any) => ({
        text: h.text ?? '',
        type: h.type ?? 'curiosity',
        score: clampNumber(h.score ?? 50, 0, 100),
        platform: h.platform ?? 'TikTok',
        estimatedReach: h.estimatedReach ?? '10K-50K',
      })),
      moments: (data.moments ?? data.viral_moments ?? []).map((m: any) => ({
        timestamp: clampNumber(m.timestamp ?? 0, 0, duration),
        type: m.type ?? 'high_energy',
        intensity: clampNumber(m.intensity ?? 0.5, 0, 1),
        description: m.description ?? '',
        suggestedClipStart: clampNumber(m.suggestedClipStart ?? Math.max(0, (m.timestamp ?? 0) - 15), 0, duration),
        suggestedClipEnd: clampNumber(m.suggestedClipEnd ?? Math.min(duration, (m.timestamp ?? 0) + 15), 0, duration),
      })),
      metadata: data.metadata ?? {
        hasSpeech: true,
        language: 'en',
        speakerCount: 1,
        audioEnergy: 0.5,
        visualComplexity: 0.5,
        pacingScore: 0.5,
        emotionalRange: 0.5,
      },
      suggestions: data.suggestions ?? [],
    };
  } catch (e) {
    throw new Error(`Failed to parse AI analysis: ${e instanceof Error ? e.message : 'Invalid response format'}. Retry the analysis.`);
  }
}

// ============================================================
// AI CLIP EXTRACTION
// ============================================================

/**
 * Extract the best clips from a long-form video.
 * Returns ranked clips with titles, descriptions, and platform optimization.
 */
export async function extractClips(input: {
  duration: number;
  transcript?: string;
  analysis?: VideoAnalysis;
  targetPlatforms?: ('tiktok' | 'reels' | 'shorts')[];
  clipCount?: number;
  maxDuration?: number;
}): Promise<ClipResult[]> {
  const { duration, transcript, targetPlatforms = ['tiktok', 'reels', 'shorts'], clipCount = 5, maxDuration = 60 } = input;

  // If we have an analysis with segments, build clips from segments first,
  // then optionally call AI for titles/hooks/hashtags.
  if (input.analysis && input.analysis.segments.length > 0) {
    const topSegments = input.analysis.segments
      .filter(s => s.duration >= 10 && s.duration <= maxDuration)
      .sort((a, b) => b.score - a.score)
      .slice(0, clipCount);

    const baseClips: ClipResult[] = topSegments.map((seg, i) => ({
      id: `clip-${i}`,
      title: seg.description || `Clip ${i + 1}: ${formatTime(seg.start)}`,
      description: `Viral clip from ${formatTime(seg.start)} to ${formatTime(seg.end)} (${seg.type})`,
      start: seg.start,
      end: seg.end,
      duration: seg.duration,
      viralScore: seg.score,
      platform: targetPlatforms[i % targetPlatforms.length] as 'tiktok' | 'reels' | 'shorts',
      hooks: input.analysis!.hooks.slice(0, 2).map(h => h.text),
      hashtags: ['#viral', '#trending', '#fyp'],
      thumbnailTimestamp: seg.start + seg.duration * 0.3,
      captionStyle: 'pop-classic',
      transitions: [],
      musicMood: 'energetic',
    }));

    // Try AI enhancement for titles/hooks/hashtags
    try {
      const segmentSummary = baseClips.map(c =>
        `"${c.title}" (${c.start.toFixed(1)}-${c.end.toFixed(1)}s, ${c.platform}, score ${c.viralScore})`
      ).join('\n');

      const response = await generateAI({
        messages: [
          {
            role: 'system',
            content: `You are a viral clip editor. Given pre-selected segments, generate catchy titles, hooks, and hashtags for each.
Return a JSON array matching the segments. Each item: { "title": "...", "hooks": ["..."], "hashtags": ["..."] }
No markdown. Valid JSON only.`,
          },
          {
            role: 'user',
            content: `Enhance these ${clipCount} clips for ${targetPlatforms.join(', ')}:\n\n${segmentSummary}\n\nOriginal title: ${input.analysis!.segments[0]?.description || 'Untitled'}`,
          },
        ],
        maxTokens: 2000,
        temperature: 0.8,
      });

      const jsonMatch = response.content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const enhancements = JSON.parse(jsonMatch[0]);
        for (let i = 0; i < Math.min(baseClips.length, enhancements.length); i++) {
          const e = enhancements[i];
          if (e.title) baseClips[i].title = e.title;
          if (e.hooks?.length) baseClips[i].hooks = e.hooks;
          if (e.hashtags?.length) baseClips[i].hashtags = e.hashtags;
        }
      }
    } catch (e) {
      // AI enhancement failed — use base clips with a warning
      console.warn('AI clip enhancement failed, using base analysis:', e);
    }

    return baseClips;
  }

  // No analysis available — full AI call to generate clips from scratch
  const systemPrompt = `You are an expert viral clip editor for short-form video platforms.

Given a video, extract the BEST clips that will go viral.

RULES:
- Each clip must be 15-60 seconds
- Start with a strong hook (first 1-3 seconds)
- End with a satisfying conclusion or loop point
- Optimize for the specified platforms
- Generate unique, clickable titles for each clip
- Include hashtags and hooks for each clip
- Score each clip 0-100 for viral potential

Respond in valid JSON array. No markdown.`;

  const userPrompt = `Extract ${clipCount} best clips from this ${formatTime(duration)} video:

Platforms: ${targetPlatforms.join(', ')}
Max clip duration: ${maxDuration} seconds
${transcript ? `Transcript preview: ${transcript.slice(0, 500)}` : 'No transcript available'}

Generate optimized clips with titles, hooks, hashtags, and platform scores.`;

  try {
    const response = await generateAI({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      maxTokens: 4000,
      temperature: 0.8,
    });

    return parseClipsResponse(response.content, duration, targetPlatforms);
  } catch (e) {
    throw new Error(`AI clip extraction failed: ${e instanceof Error ? e.message : 'Unknown error'}. Configure an API key in AI Settings.`);
  }
}

function parseClipsResponse(content: string, duration: number, platforms: string[]): ClipResult[] {
  try {
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return [];

    const data = JSON.parse(jsonMatch[0]);
    return data.map((clip: any, i: number) => ({
      id: `clip-${i}`,
      title: clip.title ?? `Clip ${i + 1}`,
      description: clip.description ?? '',
      start: clampNumber(clip.start ?? 0, 0, duration),
      end: clampNumber(clip.end ?? duration, 0, duration),
      duration: clampNumber(clip.duration ?? 30, 15, 60),
      viralScore: clampNumber(clip.viralScore ?? clip.viral_score ?? 50, 0, 100),
      platform: clip.platform ?? platforms[0] ?? 'tiktok',
      hooks: clip.hooks ?? [],
      hashtags: clip.hashtags ?? [],
      thumbnailTimestamp: clip.thumbnailTimestamp ?? clip.thumbnail ?? 0,
      captionStyle: clip.captionStyle ?? 'pop-classic',
      transitions: (clip.transitions ?? []).map((t: any) => ({
        type: t.type ?? 'cut',
        timestamp: t.timestamp ?? 0,
        reason: t.reason ?? '',
      })),
      musicMood: clip.musicMood ?? clip.music_mood ?? 'energetic',
    }));
  } catch {
    return [];
  }
}

// ============================================================
// AI CONTENT GENERATION
// ============================================================

/**
 * Generate a complete content package for a clip.
 * Includes title, description, hooks, hashtags, and platform-specific optimizations.
 */
export async function generateContentPackage(input: {
  clipTitle?: string;
  transcript?: string;
  duration: number;
  platform: 'tiktok' | 'reels' | 'shorts';
  niche?: string;
}): Promise<ContentPackage> {
  const { duration, platform, niche, clipTitle } = input;

  const systemPrompt = `You are a viral content strategist specializing in ${platform}.

Generate a complete content package for a short-form video clip.

Include:
1. TITLE - Clickable, curiosity-driven (max 80 chars)
2. DESCRIPTION - Engaging with CTA (max 200 chars)
3. HOOKS - 3 hooks for the first 1-3 seconds
4. HASHTAGS - 5-8 trending + niche hashtags
5. CAPTIONS - 3 caption options for the video
6. MUSIC MOOD - Suggested music vibe

RULES:
- Use power words, emojis, and urgency
- Match ${platform} content style
- Include a call-to-action
- Make hooks stop the scroll

Respond in valid JSON only. No markdown.`;

  const userPrompt = `Generate content package for:
Title: ${clipTitle || 'Untitled clip'}
Duration: ${formatTime(duration)}
Platform: ${platform}
Niche: ${niche || 'General'}
${input.transcript ? `Transcript: ${input.transcript.slice(0, 300)}` : ''}

Create a complete viral content package.`;

  try {
    const response = await generateAI({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      maxTokens: 1500,
      temperature: 0.9,
    });

    return parseContentPackage(response.content, platform, duration);
  } catch (e) {
    throw new Error(`AI content generation failed: ${e instanceof Error ? e.message : 'Unknown error'}. Configure an API key in AI Settings.`);
  }
}

function parseContentPackage(content: string, platform: string, duration: number): ContentPackage {
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('no json');
    const data = JSON.parse(jsonMatch[0]);

    return {
      title: data.title ?? 'Viral Clip',
      description: data.description ?? '',
      hooks: data.hooks ?? [],
      hashtags: data.hashtags ?? [],
      captions: data.captions ?? [],
      bestClip: {
        id: 'best-clip',
        title: data.title ?? 'Viral Clip',
        description: data.description ?? '',
        start: 0,
        end: Math.min(duration, 60),
        duration: Math.min(duration, 60),
        viralScore: 70,
        platform: platform as any,
        hooks: data.hooks ?? [],
        hashtags: data.hashtags ?? [],
        thumbnailTimestamp: 2,
        captionStyle: 'pop-classic',
        transitions: [],
        musicMood: data.musicMood ?? 'energetic',
      },
      allClips: [],
      thumbnailSuggestions: [1, 3, Math.floor(duration / 2)],
    };
  } catch (e) {
    throw new Error(`Failed to parse AI content package: ${e instanceof Error ? e.message : 'Invalid response format'}. Retry the generation.`);
  }
}

// ============================================================
// AI VIRAL PREDICTOR
// ============================================================

/**
 * Predict viral potential and suggest improvements before posting.
 */
export async function predictViralScore(input: {
  title: string;
  description?: string;
  hashtags?: string[];
  platform: string;
  duration: number;
  thumbnail?: string;
}): Promise<{
  score: number;
  grade: 'A+' | 'A' | 'B+' | 'B' | 'C' | 'D';
  breakdown: { title: number; description: number; hashtags: number; timing: number; format: number };
  improvements: string[];
  bestPostingTime: string;
}> {
  const systemPrompt = `You are a viral content analyst. Score this content package for viral potential.

Respond in JSON with:
- score: 0-100
- grade: A+/A/B+/B/C/D
- breakdown: { title: 0-100, description: 0-100, hashtags: 0-100, timing: 0-100, format: 0-100 }
- improvements: array of specific improvements
- bestPostingTime: suggested posting time

Be strict but fair. Respond in valid JSON only.`;

  const userPrompt = `Score this for viral potential:

Title: ${input.title}
Description: ${input.description || 'N/A'}
Hashtags: ${input.hashtags?.join(', ') || 'None'}
Platform: ${input.platform}
Duration: ${formatTime(input.duration)}

Provide detailed scoring and improvements.`;

  try {
    const response = await generateAI({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      maxTokens: 1000,
      temperature: 0.5,
    });

    const jsonMatch = response.content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const data = JSON.parse(jsonMatch[0]);
      return {
        score: typeof data.score === 'number' ? Math.max(0, Math.min(100, data.score)) : 50,
        grade: ['A+', 'A', 'B+', 'B', 'C', 'D'].includes(data.grade) ? data.grade : 'C',
        breakdown: {
          title: typeof data.breakdown?.title === 'number' ? data.breakdown.title : 50,
          description: typeof data.breakdown?.description === 'number' ? data.breakdown.description : 50,
          hashtags: typeof data.breakdown?.hashtags === 'number' ? data.breakdown.hashtags : 50,
          timing: typeof data.breakdown?.timing === 'number' ? data.breakdown.timing : 50,
          format: typeof data.breakdown?.format === 'number' ? data.breakdown.format : 50,
        },
        improvements: Array.isArray(data.improvements) ? data.improvements : [],
        bestPostingTime: typeof data.bestPostingTime === 'string' ? data.bestPostingTime : '7-9 PM EST',
      };
    }
    throw new Error('AI response was not valid JSON');
  } catch (e) {
    throw new Error(`AI viral scoring failed: ${e instanceof Error ? e.message : 'Unknown error'}. Configure an API key in AI Settings.`);
  }
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function clampNumber(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

// ============================================================
// AI STYLE SELECTION & TIMELINE GENERATION
// ============================================================

export interface StyleAnalysisInput {
  duration: number
  title?: string
  description?: string
  audioEnergyProfile?: number[]
  bpm?: number
  tempo?: 'slow' | 'mid' | 'fast' | 'very_fast'
  detectedGenre?: string
  audioMood?: string
}

export interface StyleAnalysisResult {
  primaryStyle: string
  colorSkin: string
  justification: string
  detectedGenre: string
  dominantAudioMood: string
  calculatedTempoBPM: number
}

export interface TimelineEvent {
  timestampStartMs: number
  timestampEndMs: number
  actionType: 'time_remap' | 'cut' | 'shake' | 'exposure_pulse' | 'chromatic_aberration' | 'typography' | 'color_grade' | 'vignette'
  parameters: Record<string, any>
}

export interface EditTimeline {
  analyzedMetadata: {
    detectedGenre: string
    dominantAudioMood: string
    calculatedTempoBPM: number
  }
  selectedEditArchitecture: {
    primaryStyle: string
    aestheticColorSkin: string
    styleJustification: string
  }
  editExecutionTimeline: TimelineEvent[]
  youtubeContentSuggestions: {
    searchString: string
    purpose: string
    insertAtMs: number
  }[]
}

/**
 * AI-powered style selection — analyzes video metadata and recommends
 * the best edit architecture and color skin.
 */
export async function selectEditingStyleAI(input: StyleAnalysisInput): Promise<StyleAnalysisResult> {
  const prompt = `You are an expert AI video editor. Analyze this video and select the best edit style.

Video Info:
- Duration: ${input.duration}s
- Title: ${input.title || 'Unknown'}
- Description: ${input.description || 'None'}
- BPM: ${input.bpm || 'Unknown'}
- Tempo: ${input.tempo || 'Unknown'}
- Audio energy avg: ${input.audioEnergyProfile ? (input.audioEnergyProfile.reduce((a,b)=>a+b,0)/input.audioEnergyProfile.length).toFixed(3) : 'Unknown'}

Available Edit Styles:
1. Velocity — Speed ramps between beats (for mid-high tempo music, pop/electronic/phonk)
2. Raw/Impact — Screen shake + exposure pulses on drops (for high-intensity action, rock/metal/phonk)
3. Flow/Match-Cut — Seamless transitions matching motion vectors (for cinematic/ambient/lofi)
4. Compositing — Subject isolation with parallax overlay (for cinematic/music-video)
5. MMV/Kinetic — Manga-style motion with depth layers (for anime/j-pop/j-rock)
6. Kinetic Typography — 3D text synced to vocals (for hip-hop/rap/pop)

Color Skins:
- Candy: Pastel, high exposure, dreamy (pop, upbeat)
- Edgy/Phonk: Crushed shadows, chromatic, dark (phonk, aggressive)
- LoFi: Warm, desaturated, grain, vintage (lofi, nostalgic)
- Classic: Neutral, balanced (default)

Respond with JSON:
{
  "detectedGenre": "string",
  "dominantAudioMood": "string",
  "calculatedTempoBPM": number,
  "primaryStyle": "Velocity|Raw/Impact|Flow/Match-Cut|Compositing|MMV/Kinetic|Kinetic Typography",
  "colorSkin": "Candy|Edgy|LoFi|Classic",
  "justification": "Why this style fits the video"
}`;

  try {
    const res = await generateAI({
      messages: [
        { role: 'system', content: 'You are an expert AI video editor and content strategist. Always respond with valid JSON only.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.3,
      maxTokens: 500,
    });

    const parsed = parseStyleResponse(res.content)
    if (parsed) return parsed
    throw new Error('AI response was not valid JSON')
  } catch (e) {
    throw new Error(`AI style selection failed: ${e instanceof Error ? e.message : 'Unknown error'}. Configure an API key in AI Settings.`);
  }
}

function parseStyleResponse(text: string): StyleAnalysisResult | null {
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return null
    const data = JSON.parse(jsonMatch[0])
    return {
      primaryStyle: data.primaryStyle || data.primary_style || 'Velocity',
      colorSkin: data.colorSkin || data.color_skin || data.aesthetic_color_skin || 'Classic',
      justification: data.justification || data.style_justification || '',
      detectedGenre: data.detectedGenre || data.detected_genre || 'Unknown',
      dominantAudioMood: data.dominantAudioMood || data.dominant_audio_mood || 'Unknown',
      calculatedTempoBPM: data.calculatedTempoBPM || data.calculated_tempo_bpm || 120,
    }
  } catch { return null }
}

/**
 * Generate a full edit timeline with frame-by-frame events.
 */
export function generateEditTimeline(
  duration: number,
  beatTimes: number[],
  bpm: number,
  style: { primaryStyle: string; colorSkin: string },
  audioEnergyProfile?: number[],
  transcript?: string
): EditTimeline {
  const events: TimelineEvent[] = []
  const beatInterval = 60 / bpm * 1000 // ms

  for (let i = 0; i < beatTimes.length; i++) {
    const tMs = beatTimes[i] * 1000
    const nextMs = i < beatTimes.length - 1 ? beatTimes[i + 1] * 1000 : tMs + beatInterval

    // Velocity: speed ramp
    if (style.primaryStyle === 'Velocity') {
      events.push({
        timestampStartMs: tMs,
        timestampEndMs: tMs + 120,
        actionType: 'time_remap',
        parameters: { speed: 0.25, curve: 'ease-in' },
      })
      events.push({
        timestampStartMs: tMs + 120,
        timestampEndMs: nextMs,
        actionType: 'time_remap',
        parameters: { speed: 3.5, curve: 'ease-out' },
      })
    }

    // Raw/Impact: shake + flash on beat
    if (style.primaryStyle === 'Raw/Impact') {
      events.push({
        timestampStartMs: tMs,
        timestampEndMs: tMs + 150,
        actionType: 'shake',
        parameters: { intensity: 1.2, frequency: 35 },
      })
      events.push({
        timestampStartMs: tMs,
        timestampEndMs: tMs + 120,
        actionType: 'exposure_pulse',
        parameters: { stops: 1.5, decayFrames: 4 },
      })
    }

    // MMV: shake + glitch on beat
    if (style.primaryStyle === 'MMV/Kinetic') {
      events.push({
        timestampStartMs: tMs,
        timestampEndMs: tMs + 80,
        actionType: 'shake',
        parameters: { intensity: 0.4, frequency: 20 },
      })
      events.push({
        timestampStartMs: tMs,
        timestampEndMs: tMs + 60,
        actionType: 'chromatic_aberration',
        parameters: { offset: 2.5 },
      })
    }

    // Kinetic Typography: text event on beat
    if (style.primaryStyle === 'Kinetic Typography') {
      events.push({
        timestampStartMs: tMs,
        timestampEndMs: tMs + 300,
        actionType: 'typography',
        parameters: { scale: 1.5, animation: 'bounce', syncTo: 'beat' },
      })
    }
  }

  // Global color grade
  events.push({
    timestampStartMs: 0,
    timestampEndMs: duration * 1000,
    actionType: 'color_grade',
    parameters: { skin: style.colorSkin },
  })

  // Vignette throughout
  events.push({
    timestampStartMs: 0,
    timestampEndMs: duration * 1000,
    actionType: 'vignette',
    parameters: { strength: 0.25, radius: 0.65 },
  })

  // Generate YouTube content suggestions
  const suggestions = generateYouTubeSuggestions(style.primaryStyle, duration, beatTimes, transcript)

  return {
    analyzedMetadata: {
      detectedGenre: style.primaryStyle,
      dominantAudioMood: style.colorSkin,
      calculatedTempoBPM: bpm,
    },
    selectedEditArchitecture: {
      primaryStyle: style.primaryStyle,
      aestheticColorSkin: style.colorSkin,
      styleJustification: `Auto-selected based on ${beatTimes.length} beats at ${bpm} BPM`,
    },
    editExecutionTimeline: events.sort((a, b) => a.timestampStartMs - b.timestampStartMs),
    youtubeContentSuggestions: suggestions,
  }
}

function generateYouTubeSuggestions(
  style: string,
  duration: number,
  beatTimes: number[],
  transcript?: string
): EditTimeline['youtubeContentSuggestions'] {
  const suggestions: EditTimeline['youtubeContentSuggestions'] = []

  // Transcript-aware B-roll detection
  if (transcript && transcript.length > 20) {
    const nouns = extractContextualNouns(transcript)
    for (const noun of nouns.slice(0, 5)) {
      suggestions.push({
        searchString: `${noun} cinematic b-roll`,
        purpose: `Contextual B-roll for "${noun}"`,
        insertAtMs: 0,  // Will be placed by the timeline generator
      })
    }
  }

  // Style-based suggestions
  if (style === 'Velocity' || style === 'Raw/Impact') {
    suggestions.push({
      searchString: 'glitch overlay green screen transparent',
      purpose: 'Overlay transition element',
      insertAtMs: beatTimes.length > 0 ? beatTimes[Math.floor(beatTimes.length / 2)] * 1000 : 0,
    })
    suggestions.push({
      searchString: 'particle effects overlay black background',
      purpose: 'B-roll enhancement',
      insertAtMs: duration * 500,
    })
  }

  if (style === 'Flow/Match-Cut') {
    suggestions.push({
      searchString: 'cinematic landscape slow motion 4k',
      purpose: 'B-roll enhancement',
      insertAtMs: duration * 300,
    })
  }

  if (style === 'MMV/Kinetic') {
    suggestions.push({
      searchString: 'anime style flash frame overlay',
      purpose: 'Overlay transition element',
      insertAtMs: beatTimes.length > 2 ? beatTimes[2] * 1000 : 0,
    })
  }

  return suggestions
}

/** Extract key nouns from transcript for contextual B-roll */
function extractContextualNouns(transcript: string): string[] {
  // Simple heuristic: extract capitalized words and common nouns
  const words = transcript.split(/\s+/)
  const nounCandidates = new Map<string, number>()

  // Common B-roll-worthy concepts
  const brollKeywords = [
    'money', 'cash', 'profit', 'revenue', 'business', 'startup', 'office',
    'car', 'house', 'travel', 'beach', 'mountain', 'city', 'night',
    'food', 'cooking', 'gym', 'workout', 'music', 'concert', 'festival',
    'technology', 'computer', 'phone', 'social', 'media', 'internet',
    'love', 'heart', 'smile', 'laugh', 'cry', 'anger', 'fear',
    'education', 'school', 'university', 'book', 'knowledge', 'wisdom',
    'nature', 'ocean', 'forest', 'animal', 'dog', 'cat',
    'fashion', 'style', 'art', 'design', 'color', 'light',
  ]

  for (const word of words) {
    const clean = word.toLowerCase().replace(/[^a-z]/g, '')
    if (clean.length < 3) continue

    // Check if it matches known B-roll concepts
    if (brollKeywords.includes(clean)) {
      nounCandidates.set(clean, (nounCandidates.get(clean) ?? 0) + 1)
    }

    // Also check capitalized words (likely proper nouns / important concepts)
    if (word[0] === word[0]?.toUpperCase() && word[0] !== word[0]?.toLowerCase()) {
      nounCandidates.set(clean, (nounCandidates.get(clean) ?? 0) + 2) // Weight higher
    }
  }

  // Sort by frequency, return top nouns
  return Array.from(nounCandidates.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([noun]) => noun)
}

// ============================================================
// AI SCRIPT GENERATOR
// ============================================================

export interface ScriptRequest {
  topic: string
  platform?: 'tiktok' | 'reels' | 'shorts' | 'youtube' | 'general'
  style?: 'viral' | 'educational' | 'entertaining' | 'emotional' | 'promotional'
  duration?: number // target duration in seconds
  tone?: string
}

export interface ScriptLine {
  text: string
  startSec: number
  endSec: number
  emphasis?: 'normal' | 'shout' | 'whisper' | 'question'
  emotion?: string
}

export interface ScriptResult {
  lines: ScriptLine[]
  fullText: string
  hooks: string[]
  cta: string
  hashtags: string[]
}

/**
 * AI-powered script generator — creates caption scripts from a topic.
 */
export async function generateScriptAI(request: ScriptRequest): Promise<ScriptResult> {
  const { topic, platform = 'general', style = 'viral', duration = 30, tone } = request

  const prompt = `You are an expert short-form video scriptwriter. Generate a script for:

Topic: ${topic}
Platform: ${platform}
Style: ${style}
Target Duration: ${duration} seconds${tone ? `\nTone: ${tone}` : ''}

Requirements:
- Short, punchy sentences (max 8 words each)
- Hook viewers in the first 2 seconds
- Include emotional triggers
- End with a strong call-to-action
- Each line should be one caption/phrase

Respond with JSON:
{
  "lines": [
    { "text": "string", "emphasis": "normal|shout|whisper|question", "emotion": "string" }
  ],
  "hooks": ["3 powerful hook options"],
  "cta": "call to action text",
  "hashtags": ["relevant", "hashtags"]
}`;

  try {
    const res = await generateAI({
      messages: [
        { role: 'system', content: 'You are an expert short-form video scriptwriter. Always respond with valid JSON only.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.7,
      maxTokens: 800,
    })

    const parsed = parseScriptResponse(res.content, duration)
    if (parsed) return parsed
    throw new Error('AI response was not valid JSON')
  } catch (e) {
    throw new Error(`AI script generation failed: ${e instanceof Error ? e.message : 'Unknown error'}. Configure an API key in AI Settings.`);
  }
}

function parseScriptResponse(text: string, duration: number): ScriptResult | null {
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return null
    const data = JSON.parse(jsonMatch[0])

    const lines: ScriptLine[] = (data.lines || []).map((l: any, i: number, arr: ScriptLine[]) => {
      const lineDuration = duration / Math.max(arr.length, 1)
      return {
        text: l.text || l,
        startSec: i * lineDuration,
        endSec: (i + 1) * lineDuration,
        emphasis: l.emphasis || 'normal',
        emotion: l.emotion || '',
      }
    })

    const fullText = lines.map(l => l.text).join(' ')

    return {
      lines,
      fullText,
      hooks: data.hooks || [],
      cta: data.cta || '',
      hashtags: data.hashtags || [],
    }
  } catch { return null }
}
