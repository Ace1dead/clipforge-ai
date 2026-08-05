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
  } catch {
    // AI failed — fall through to heuristic analysis
  }

  return generateHeuristicAnalysis(duration, input.audioEnergyProfile);
}

function parseAnalysisResponse(content: string, duration: number, energyProfile?: number[]): VideoAnalysis {
  try {
    // Try to extract JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return generateHeuristicAnalysis(duration, energyProfile);

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
  } catch {
    return generateHeuristicAnalysis(duration, energyProfile);
  }
}

/**
 * Generate analysis using heuristics when AI is unavailable.
 */
function generateHeuristicAnalysis(duration: number, energyProfile?: number[]): VideoAnalysis {
  const segments: VideoSegment[] = [];
  const segCount = Math.max(2, Math.min(6, Math.floor(duration / 30)));

  for (let i = 0; i < segCount; i++) {
    const start = (duration / segCount) * i;
    const end = Math.min(start + 30, duration);
    const energy = energyProfile ? averageSlice(energyProfile, start, end, duration) : Math.random();
    segments.push({
      id: `seg-${i}`,
      start,
      end,
      duration: end - start,
      score: Math.round(energy * 100),
      type: i === 0 ? 'hook' : i === segCount - 1 ? 'punchline' : 'emotional',
      description: `Segment ${i + 1}: ${Math.round(energy * 100)}% energy`,
      transcript: '',
      platform: { tiktok: Math.round(energy * 80 + 20), reels: Math.round(energy * 70 + 30), shorts: Math.round(energy * 60 + 40) },
      suggestedCaptions: [],
    });
  }

  const sortedSegments = [...segments].sort((a, b) => b.score - a.score);

  return {
    duration,
    totalScore: Math.round(segments.reduce((s, seg) => s + seg.score, 0) / segments.length),
    viralPotential: 'medium',
    segments: sortedSegments,
    hooks: [
      { text: 'Wait for it...', type: 'curiosity', score: 65, platform: 'TikTok', estimatedReach: '10K-50K' },
      { text: 'This changes everything', type: 'shock', score: 60, platform: 'Reels', estimatedReach: '50K-100K' },
      { text: 'You won\'t believe what happens next', type: 'curiosity', score: 55, platform: 'Shorts', estimatedReach: '10K-50K' },
      { text: 'Nobody talks about this', type: 'statement', score: 50, platform: 'TikTok', estimatedReach: '50K-100K' },
      { text: 'Watch until the end', type: 'challenge', score: 45, platform: 'Reels', estimatedReach: '10K-50K' },
    ],
    moments: sortedSegments.slice(0, 3).map(seg => ({
      timestamp: seg.start + seg.duration / 2,
      type: 'high_energy' as const,
      intensity: seg.score / 100,
      description: seg.description,
      suggestedClipStart: seg.start,
      suggestedClipEnd: seg.end,
    })),
    metadata: {
      hasSpeech: true,
      language: 'en',
      speakerCount: 1,
      audioEnergy: 0.5,
      visualComplexity: 0.5,
      pacingScore: 0.5,
      emotionalRange: 0.5,
    },
    suggestions: [
      'Add captions for silent viewers',
      'Use a strong hook in the first 2 seconds',
      'Keep clips under 30 seconds for maximum engagement',
      'Add trending audio or music for discoverability',
      'End with a call-to-action or loop',
    ],
  };
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
    } catch {
      // AI enhancement unavailable — use base clips as-is
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
  } catch {
    return generateFallbackClips(duration, input.analysis, targetPlatforms, clipCount);
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

function generateFallbackClips(
  duration: number,
  analysis: VideoAnalysis | undefined,
  platforms: string[],
  count: number
): ClipResult[] {
  const clips: ClipResult[] = [];
  const segments = analysis?.segments ?? [];
  const topSegments = segments.slice(0, count);

  for (let i = 0; i < Math.max(count, topSegments.length); i++) {
    const seg = topSegments[i];
    const start = seg?.start ?? (duration / count) * i;
    const end = seg?.end ?? Math.min(start + 30, duration);
    const platform = platforms[i % platforms.length] as 'tiktok' | 'reels' | 'shorts';

    clips.push({
      id: `clip-${i}`,
      title: seg?.description ?? `Clip ${i + 1}: ${formatTime(start)}`,
      description: `Auto-extracted clip from ${formatTime(start)} to ${formatTime(end)}`,
      start,
      end,
      duration: end - start,
      viralScore: seg?.score ?? Math.round(40 + Math.random() * 30),
      platform,
      hooks: analysis?.hooks?.slice(0, 2).map(h => h.text) ?? ['Watch this!'],
      hashtags: ['#viral', '#trending', '#fyp'],
      thumbnailTimestamp: start + (end - start) * 0.3,
      captionStyle: 'pop-classic',
      transitions: [],
      musicMood: 'energetic',
    });
  }

  return clips;
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
  } catch {
    // AI failed — fall through to fallback
  }

  return generateFallbackPackage(clipTitle, platform, duration);
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
  } catch {
    return generateFallbackPackage(undefined, platform, duration);
  }
}

function generateFallbackPackage(title: string | undefined, platform: string, duration: number): ContentPackage {
  const hooks = [
    `${title || 'This'} will change your perspective! 🤯`,
    `Wait for it... ${title ? `"${title}"` : 'the ending is insane'}`,
    `Nobody is talking about this 👀`,
  ];

  const hashtags = platform === 'tiktok'
    ? ['#fyp', '#foryou', '#viral', '#trending', '#mindset', '#life']
    : platform === 'reels'
    ? ['#reels', '#viral', '#explore', '#trending', '#instagood']
    : ['#shorts', '#youtube', '#viral', '#trending', '#subscribe'];

  return {
    title: title || 'You need to see this 🤯',
    description: `Wait for the ending! Like & follow for more. ${hashtags.slice(0, 3).join(' ')}`,
    hooks,
    hashtags,
    captions: hooks.map(h => h),
    bestClip: {
      id: 'best-clip',
      title: title || 'Viral Clip',
      description: '',
      start: 0,
      end: Math.min(duration, 60),
      duration: Math.min(duration, 60),
      viralScore: 65,
      platform: platform as any,
      hooks,
      hashtags,
      thumbnailTimestamp: 2,
      captionStyle: 'pop-classic',
      transitions: [],
      musicMood: 'energetic',
    },
    allClips: [],
    thumbnailSuggestions: [1, 3, Math.floor(duration / 2)],
  };
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
    if (jsonMatch) return JSON.parse(jsonMatch[0]);
  } catch {
    // AI failed — fall through to default
  }

  return {
    score: 55,
    grade: 'B',
    breakdown: { title: 50, description: 50, hashtags: 60, timing: 55, format: 55 },
    improvements: [
      'Add a stronger hook in the first 2 seconds',
      'Use more specific hashtags for your niche',
      'Add a clear call-to-action',
    ],
    bestPostingTime: '7-9 PM EST',
  };
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

function averageSlice(arr: number[], start: number, end: number, totalDuration: number): number {
  const startIdx = Math.floor((start / totalDuration) * arr.length);
  const endIdx = Math.floor((end / totalDuration) * arr.length);
  const slice = arr.slice(startIdx, endIdx);
  if (slice.length === 0) return 0.5;
  return slice.reduce((s, v) => s + v, 0) / slice.length;
}
