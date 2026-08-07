/**
 * Multi-Track Compositor — Renders a full timeline with tracks, clips, transitions,
 * chroma key, masking, color grading, text layers, and adjustment layers.
 * Replaces the single-video compositor with a full NLE rendering pipeline.
 */

import { drawCaptions, getStyle, type TimedWord } from './captions'
import {
  composeEffects, createEffectContext, screenShake, chromaticAberration,
  vignette, filmGrain, exposurePulse, scanlines, glitchEffect, colorGrade,
  type EffectFn, type EffectContext
} from './effects'
import type { EditStyleId, ColorSkinId } from './editStyles'
import { EDIT_STYLES } from './editStyles'
import { COLOR_SKINS } from './effects'
import { createTransitionRenderer, type TransitionConfig } from './transitions'
import {
  resolveLayerProperties,
  type KeyframedLayer,
} from './keyframe'
import type {
  Timeline,
  Clip,
  Track,
  TextClipConfig,
  ChromaKeyConfig,
  MaskConfig,
  ColorGradeConfig,
  AdjustmentClipConfig,
} from './timeline'
import {
  applyChromaKey,
} from './chromaKey'

// ── Compositor config ──────────────────────────────────────────────

export interface CompositorConfig {
  clipDuration: number
  words?: TimedWord[]
  captionStyleId?: string
  editStyle?: EditStyleId
  colorSkin?: ColorSkinId
  hooks?: string[]
  platform?: string
  fadeDuration?: number
  hookDuration?: number
  beatIntensity?: number
  bpm?: number

  // Multi-track
  timeline?: Timeline
  videoSources?: Map<string, HTMLVideoElement>
  textLayers?: KeyframedLayer[]
  audioDucking?: { enabled: boolean; sourceTrackId: string; targetTrackId: string }
}

export interface DrawFrameInput {
  ctx: CanvasRenderingContext2D
  time: number
  w: number
  h: number
  video?: HTMLVideoElement
}

function smoothstep(t: number): number {
  const c = Math.max(0, Math.min(1, t))
  return c * c * (3 - 2 * c)
}

// ── Single-track compositor (backward-compatible) ──────────────────

export function createDrawFrame(config: CompositorConfig) {
  const {
    clipDuration,
    words = [],
    captionStyleId = 'pop-classic',
    editStyle = 'velocity',
    colorSkin = 'candy',
    hooks = [],
    platform,
    fadeDuration = 0.5,
    hookDuration = 3,
    beatIntensity = 0,
    bpm = 120,
  } = config

  const style = EDIT_STYLES[editStyle]
  const skin = COLOR_SKINS[colorSkin]
  const effects: EffectFn[] = []

  if (style) {
    const baseShake = style.screenShake.enabled
    const baseGlitch = style.glitch.enabled

    if (baseShake) effects.push(screenShake(style.screenShake.intensity, style.screenShake.frequency))
    if (style.chromaticAberration.enabled) effects.push(chromaticAberration(style.chromaticAberration.offset))
    if (style.vignette.enabled) effects.push(vignette(style.vignette.strength, style.vignette.radius))
    if (style.filmGrain.enabled) effects.push(filmGrain(style.filmGrain.intensity))
    if (style.exposurePulse.enabled) effects.push(exposurePulse(style.exposurePulse.stops, style.exposurePulse.decayFrames))
    if (style.scanlines.enabled) effects.push(scanlines(style.scanlines.density, style.scanlines.opacity))
    if (baseGlitch) effects.push(glitchEffect(style.glitch.intensity))

    if (style.audioReactive.beatShake && beatIntensity > 0.1 && !baseShake) {
      effects.push(screenShake(style.screenShake.intensity || 0.8, style.screenShake.frequency || 30))
    }
    if (style.audioReactive.beatGlitch && beatIntensity > 0.3 && !baseGlitch) {
      effects.push(glitchEffect(style.glitch.intensity || 0.4))
    }
  }

  if (skin) {
    effects.push(colorGrade(skin))
  }

  const composedEffects = effects.length > 0 ? composeEffects(...effects) : null
  const captionDef = getStyle(captionStyleId)

  return function drawFrame({ ctx, time, w, h }: DrawFrameInput): void {
    if (composedEffects) {
      const ec = createEffectContext(ctx, time, w, h, beatIntensity, bpm)
      composedEffects(ec, () => drawLayers(ctx, time, w, h))
    } else {
      drawLayers(ctx, time, w, h)
    }

    function drawLayers(ctx: CanvasRenderingContext2D, time: number, w: number, h: number): void {
      const grad = ctx.createLinearGradient(0, 0, 0, h)
      grad.addColorStop(0, 'rgba(0,0,0,0.12)')
      grad.addColorStop(0.25, 'rgba(0,0,0,0)')
      grad.addColorStop(0.75, 'rgba(0,0,0,0)')
      grad.addColorStop(1, 'rgba(0,0,0,0.25)')
      ctx.fillStyle = grad
      ctx.fillRect(0, 0, w, h)

      if (time < hookDuration && hooks[0]) {
        const alpha = time < 0.3 ? smoothstep(time / 0.3) : time > hookDuration - 0.5 ? smoothstep((hookDuration - time) / 0.5) : 1
        const scale = time < 0.3 ? 0.6 + smoothstep(time / 0.3) * 0.4 : 1
        ctx.save()
        ctx.globalAlpha = Math.max(0, Math.min(1, alpha))
        ctx.translate(w / 2, h * 0.35)
        ctx.scale(scale, scale)
        const text = hooks[0]
        const fontSize = Math.round(w * 0.065)
        ctx.font = `800 ${fontSize}px "Inter", system-ui, sans-serif`
        const metrics = ctx.measureText(text)
        const pw = metrics.width + w * 0.06
        const ph = fontSize * 1.4
        ctx.fillStyle = 'rgba(94, 106, 210, 0.85)'
        ctx.beginPath()
        const rr = w * 0.02
        ctx.moveTo(-pw / 2 + rr, -ph / 2)
        ctx.arcTo(pw / 2, -ph / 2, pw / 2, ph / 2, rr)
        ctx.arcTo(pw / 2, ph / 2, -pw / 2, ph / 2, rr)
        ctx.arcTo(-pw / 2, ph / 2, -pw / 2, -ph / 2, rr)
        ctx.arcTo(-pw / 2, -ph / 2, pw / 2, -ph / 2, rr)
        ctx.closePath()
        ctx.fill()
        ctx.fillStyle = '#ffffff'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(text, 0, 0)
        ctx.restore()
      }

      if (platform) {
        ctx.save()
        const badgeFontSize = Math.round(w * 0.028)
        ctx.font = `700 ${badgeFontSize}px "Inter", system-ui, sans-serif`
        const badge = platform.toUpperCase()
        const bm = ctx.measureText(badge)
        const bx = w * 0.04
        const by = h - w * 0.06
        const bw = bm.width + w * 0.025
        const bh = badgeFontSize * 1.5
        ctx.fillStyle = 'rgba(94, 106, 210, 0.8)'
        ctx.beginPath()
        const brr = w * 0.008
        ctx.moveTo(bx - w * 0.01 + brr, by - bh / 2)
        ctx.arcTo(bx - w * 0.01 + bw, by - bh / 2, bx - w * 0.01 + bw, by + bh / 2, brr)
        ctx.arcTo(bx - w * 0.01 + bw, by + bh / 2, bx - w * 0.01, by + bh / 2, brr)
        ctx.arcTo(bx - w * 0.01, by + bh / 2, bx - w * 0.01, by - bh / 2, brr)
        ctx.arcTo(bx - w * 0.01, by - bh / 2, bx - w * 0.01 + bw, by - bh / 2, brr)
        ctx.closePath()
        ctx.fill()
        ctx.fillStyle = '#ffffff'
        ctx.textAlign = 'left'
        ctx.textBaseline = 'middle'
        ctx.fillText(badge, bx, by)
        ctx.restore()
      }

      if (words.length > 0) {
        drawCaptions(ctx, words, captionDef, time, w, h)
      }

      if (time < fadeDuration) {
        ctx.fillStyle = `rgba(0,0,0,${1 - smoothstep(time / fadeDuration)})`
        ctx.fillRect(0, 0, w, h)
      } else if (time > clipDuration - fadeDuration) {
        ctx.fillStyle = `rgba(0,0,0,${smoothstep((time - (clipDuration - fadeDuration)) / fadeDuration)})`
        ctx.fillRect(0, 0, w, h)
      }
    }
  }
}

// ── Multi-track timeline compositor ────────────────────────────────

function getClipAtTime(clips: Clip[], time: number): Clip | undefined {
  return clips.find(c => time >= c.timelineStart && time < c.timelineEnd)
}

function getVideoAtTime(tracks: Track[], time: number): Clip | undefined {
  const track = tracks.find(t => t.type === 'video' && !t.muted)
  if (!track) return undefined
  return getClipAtTime(track.clips, time)
}

function getTransitionsAtTime(
  clip: Clip,
  time: number,
): { type: 'in' | 'out'; progress: number; config: TransitionConfig } | undefined {
  if (!clip.transitionIn && !clip.transitionOut) return undefined
  const dur = clip.timelineEnd - clip.timelineStart

  if (clip.transitionIn && time >= clip.timelineStart && time < clip.timelineStart + clip.transitionIn.duration) {
    const progress = (time - clip.timelineStart) / clip.transitionIn.duration
    return { type: 'in', progress, config: clip.transitionIn }
  }
  if (clip.transitionOut && time > clip.timelineEnd - clip.transitionOut.duration && time < clip.timelineEnd) {
    const progress = (time - (clip.timelineEnd - clip.transitionOut.duration)) / clip.transitionOut.duration
    return { type: 'out', progress, config: clip.transitionOut }
  }
  return undefined
}

function applyChromaKeyEffect(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  config: ChromaKeyConfig,
): void {
  if (!config.enabled) return
  applyChromaKey(ctx, w, h, {
    color: config.color || '#00ff00',
    similarity: config.similarity || 0.35,
    smoothness: config.smoothness || 0.15,
    spillReduction: config.spillReduction || 0.5,
  })
}

function applyMaskEffect(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  config: MaskConfig,
): void {
  if (!config.enabled) return

  if (config.type === 'rect' && config.x != null && config.y != null && config.width != null && config.height != null) {
    ctx.save()
    ctx.beginPath()
    ctx.rect(config.x * w, config.y * h, config.width * w, config.height * h)
    ctx.clip()
  } else if (config.type === 'ellipse' && config.cx != null && config.cy != null && config.rx != null && config.ry != null) {
    ctx.save()
    ctx.beginPath()
    ctx.ellipse(config.cx * w, config.cy * h, config.rx * w, config.ry * h, 0, 0, Math.PI * 2)
    ctx.clip()
  } else if (config.type === 'linear' && config.x != null && config.width != null) {
    ctx.save()
    ctx.beginPath()
    ctx.rect(config.x * w, 0, config.width * w, h)
    ctx.clip()
  }
}

function applyColorGradeEffect(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  config: ColorGradeConfig,
): void {
  if (!config.enabled) return
  const imageData = ctx.getImageData(0, 0, w, h)
  const data = imageData.data

  for (let i = 0; i < data.length; i += 4) {
    let r = data[i]
    let g = data[i + 1]
    let b = data[i + 2]

    // Brightness
    r += config.brightness * 255
    g += config.brightness * 255
    b += config.brightness * 255

    // Contrast
    r = ((r / 255 - 0.5) * config.contrast + 0.5) * 255
    g = ((g / 255 - 0.5) * config.contrast + 0.5) * 255
    b = ((b / 255 - 0.5) * config.contrast + 0.5) * 255

    // Saturation
    const gray = 0.2989 * r + 0.587 * g + 0.114 * b
    r = gray + (r - gray) * config.saturation
    g = gray + (g - gray) * config.saturation
    b = gray + (b - gray) * config.saturation

    data[i] = Math.max(0, Math.min(255, r))
    data[i + 1] = Math.max(0, Math.min(255, g))
    data[i + 2] = Math.max(0, Math.min(255, b))
  }

  ctx.putImageData(imageData, 0, 0)
}

function drawTextClip(
  ctx: CanvasRenderingContext2D,
  clip: Clip,
  time: number,
  w: number,
  h: number,
): void {
  const textConfig = clip.textConfig
  if (!textConfig) return

  const timeRelative = time - clip.timelineStart
  const textValue = textConfig.text
  const fontSize = textConfig.fontSize || Math.round(w * 0.06)
  const fontFamily = textConfig.fontFamily || 'Inter, system-ui, sans-serif'

  ctx.save()

  // Position based on align/valign
  const x = textConfig.align === 'left' ? w * 0.1 : textConfig.align === 'right' ? w * 0.9 : w * 0.5
  const y = textConfig.valign === 'top' ? h * 0.1 : textConfig.valign === 'bottom' ? h * 0.9 : h * 0.5
  ctx.translate(x, y)

  const fontWeight = textConfig.fontWeight || 800
  ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`
  ctx.textAlign = textConfig.align || 'center'
  ctx.textBaseline = 'middle'

  // Background
  if (textConfig.backgroundColor) {
    const metrics = ctx.measureText(textValue)
    const padding = textConfig.padding || fontSize * 0.3
    const radius = textConfig.backgroundRadius || 0
    ctx.fillStyle = textConfig.backgroundColor
    if (radius > 0) {
      const bw = metrics.width + padding * 2
      const bh = fontSize + padding * 2
      ctx.beginPath()
      ctx.roundRect(-bw / 2, -bh / 2, bw, bh, radius)
      ctx.fill()
    } else {
      ctx.fillRect(
        -metrics.width / 2 - padding,
        -fontSize / 2 - padding,
        metrics.width + padding * 2,
        fontSize + padding * 2,
      )
    }
  }

  // Stroke
  if (textConfig.stroke) {
    ctx.strokeStyle = textConfig.stroke.color
    ctx.lineWidth = textConfig.stroke.width
    ctx.strokeText(textValue, 0, 0)
  }

  // Shadow
  if (textConfig.shadow) {
    ctx.shadowColor = textConfig.shadow.color
    ctx.shadowBlur = textConfig.shadow.blur
    ctx.shadowOffsetX = textConfig.shadow.x
    ctx.shadowOffsetY = textConfig.shadow.y
  }

  // Text
  const displayText = textConfig.uppercase ? textValue.toUpperCase() : textValue
  ctx.fillStyle = textConfig.color || '#ffffff'
  ctx.fillText(displayText, 0, 0)

  ctx.restore()
}

function drawAdjustmentLayer(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  config: AdjustmentClipConfig,
): void {
  if (config.colorGrade) {
    applyColorGradeEffect(ctx, w, h, config.colorGrade)
  }
}

/**
 * Creates a multi-track drawFrame function that renders a full timeline.
 */
export function createTimelineDrawFrame(config: CompositorConfig) {
  const {
    clipDuration,
    words = [],
    captionStyleId = 'pop-classic',
    editStyle = 'velocity',
    colorSkin = 'candy',
    hooks = [],
    platform,
    fadeDuration = 0.5,
    hookDuration = 3,
    beatIntensity = 0,
    bpm = 120,
    timeline,
    videoSources = new Map(),
    textLayers = [],
  } = config

  const style = EDIT_STYLES[editStyle]
  const skin = COLOR_SKINS[colorSkin]
  const effects: EffectFn[] = []

  if (style) {
    const baseShake = style.screenShake.enabled
    const baseGlitch = style.glitch.enabled

    if (baseShake) effects.push(screenShake(style.screenShake.intensity, style.screenShake.frequency))
    if (style.chromaticAberration.enabled) effects.push(chromaticAberration(style.chromaticAberration.offset))
    if (style.vignette.enabled) effects.push(vignette(style.vignette.strength, style.vignette.radius))
    if (style.filmGrain.enabled) effects.push(filmGrain(style.filmGrain.intensity))
    if (style.exposurePulse.enabled) effects.push(exposurePulse(style.exposurePulse.stops, style.exposurePulse.decayFrames))
    if (style.scanlines.enabled) effects.push(scanlines(style.scanlines.density, style.scanlines.opacity))
    if (baseGlitch) effects.push(glitchEffect(style.glitch.intensity))

    if (style.audioReactive.beatShake && beatIntensity > 0.1 && !baseShake) {
      effects.push(screenShake(style.screenShake.intensity || 0.8, style.screenShake.frequency || 30))
    }
    if (style.audioReactive.beatGlitch && beatIntensity > 0.3 && !baseGlitch) {
      effects.push(glitchEffect(style.glitch.intensity || 0.4))
    }
  }

  if (skin) {
    effects.push(colorGrade(skin))
  }

  const composedEffects = effects.length > 0 ? composeEffects(...effects) : null
  const captionDef = getStyle(captionStyleId)

  return function drawFrame({ ctx, time, w, h, video }: DrawFrameInput): void {
    // Black background
    ctx.fillStyle = '#000'
    ctx.fillRect(0, 0, w, h)

    if (timeline) {
      drawTimeline(ctx, time, w, h)
    } else if (video && video.readyState >= 2) {
      drawVideoFrame(ctx, video, w, h)
    }

    // Global effects
    if (composedEffects) {
      const ec = createEffectContext(ctx, time, w, h, beatIntensity, bpm)
      composedEffects(ec, () => {})
    }

    // Overlays (captions, hooks, badges)
    drawOverlays(ctx, time, w, h)

    // Fades
    if (time < fadeDuration) {
      ctx.fillStyle = `rgba(0,0,0,${1 - smoothstep(time / fadeDuration)})`
      ctx.fillRect(0, 0, w, h)
    } else if (time > clipDuration - fadeDuration) {
      ctx.fillStyle = `rgba(0,0,0,${smoothstep((time - (clipDuration - fadeDuration)) / fadeDuration)})`
      ctx.fillRect(0, 0, w, h)
    }
  }

  function drawTimeline(ctx: CanvasRenderingContext2D, time: number, w: number, h: number): void {
    if (!timeline) return

    // Render video tracks sorted by index (lower index = background)
    const videoTracks = timeline.tracks
      .filter(t => t.type === 'video')
      .sort((a, b) => a.index - b.index)

    for (const track of videoTracks) {
      if (track.muted) continue

      for (const clip of track.clips) {
        if (time < clip.timelineStart || time >= clip.timelineEnd) continue

        const video = videoSources.get(clip.sourceUrl || '')

        // Check for transitions
        const transition = getTransitionsAtTime(clip, time)

        if (transition && video && video.readyState >= 2) {
          const renderer = createTransitionRenderer(transition.config)
          const drawFn = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
            drawVideoFrame(ctx, video, w, h)
          }
          const emptyDraw = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
            ctx.fillStyle = '#000'
            ctx.fillRect(0, 0, w, h)
          }

          if (transition.type === 'out') {
            renderer(ctx, w, h, transition.progress, drawFn, emptyDraw)
          } else {
            renderer(ctx, w, h, transition.progress, emptyDraw, drawFn)
          }
        } else if (video && video.readyState >= 2) {
          drawVideoFrame(ctx, video, w, h)
        }

        // Apply chroma key
        if (clip.chromaKey) {
          applyChromaKeyEffect(ctx, w, h, clip.chromaKey)
        }

        // Apply mask
        if (clip.mask) {
          applyMaskEffect(ctx, w, h, clip.mask)
          ctx.restore()
        }

        // Draw text overlay for this clip
        if (clip.textConfig && clip.type === 'text') {
          drawTextClip(ctx, clip, time, w, h)
        }

        // Adjustment layer
        if (clip.type === 'adjustment' && clip.adjustmentConfig) {
          drawAdjustmentLayer(ctx, w, h, clip.adjustmentConfig)
        }
      }
    }

    // Draw keyframed text layers
    for (const textLayer of textLayers) {
      if (time < textLayer.startTime || time >= textLayer.endTime) continue
      const props = resolveLayerProperties(textLayer, time)
      const alpha = (props as Record<string, unknown>).opacity ?? 1
      const layerX = (props as Record<string, unknown>).x ?? 0.5
      const layerY = (props as Record<string, unknown>).y ?? 0.5
      const scale = (props as Record<string, unknown>).scale ?? 1
      const rotation = (props as Record<string, unknown>).rotation ?? 0

      ctx.save()
      ctx.globalAlpha = Number(alpha)
      ctx.translate(Number(layerX) * w, Number(layerY) * h)
      ctx.rotate(Number(rotation) * Math.PI / 180)
      ctx.scale(Number(scale), Number(scale))
      ctx.fillStyle = '#fff'
      ctx.font = '24px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(textLayer.name, 0, 0)
      ctx.restore()
    }
  }

  function drawOverlays(ctx: CanvasRenderingContext2D, time: number, w: number, h: number): void {
    // Gradient overlay
    const grad = ctx.createLinearGradient(0, 0, 0, h)
    grad.addColorStop(0, 'rgba(0,0,0,0.12)')
    grad.addColorStop(0.25, 'rgba(0,0,0,0)')
    grad.addColorStop(0.75, 'rgba(0,0,0,0)')
    grad.addColorStop(1, 'rgba(0,0,0,0.25)')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, w, h)

    // Hook text
    if (time < hookDuration && hooks[0]) {
      const alpha = time < 0.3 ? smoothstep(time / 0.3) : time > hookDuration - 0.5 ? smoothstep((hookDuration - time) / 0.5) : 1
      const scale = time < 0.3 ? 0.6 + smoothstep(time / 0.3) * 0.4 : 1
      ctx.save()
      ctx.globalAlpha = Math.max(0, Math.min(1, alpha))
      ctx.translate(w / 2, h * 0.35)
      ctx.scale(scale, scale)
      const text = hooks[0]
      const fontSize = Math.round(w * 0.065)
      ctx.font = `800 ${fontSize}px "Inter", system-ui, sans-serif`
      const metrics = ctx.measureText(text)
      const pw = metrics.width + w * 0.06
      const ph = fontSize * 1.4
      ctx.fillStyle = 'rgba(94, 106, 210, 0.85)'
      ctx.beginPath()
      const rr = w * 0.02
      ctx.moveTo(-pw / 2 + rr, -ph / 2)
      ctx.arcTo(pw / 2, -ph / 2, pw / 2, ph / 2, rr)
      ctx.arcTo(pw / 2, ph / 2, -pw / 2, ph / 2, rr)
      ctx.arcTo(-pw / 2, ph / 2, -pw / 2, -ph / 2, rr)
      ctx.arcTo(-pw / 2, -ph / 2, pw / 2, -ph / 2, rr)
      ctx.closePath()
      ctx.fill()
      ctx.fillStyle = '#ffffff'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(text, 0, 0)
      ctx.restore()
    }

    // Platform badge
    if (platform) {
      ctx.save()
      const badgeFontSize = Math.round(w * 0.028)
      ctx.font = `700 ${badgeFontSize}px "Inter", system-ui, sans-serif`
      const badge = platform.toUpperCase()
      const bm = ctx.measureText(badge)
      const bx = w * 0.04
      const by = h - w * 0.06
      const bw = bm.width + w * 0.025
      const bh = badgeFontSize * 1.5
      ctx.fillStyle = 'rgba(94, 106, 210, 0.8)'
      ctx.beginPath()
      const brr = w * 0.008
      ctx.moveTo(bx - w * 0.01 + brr, by - bh / 2)
      ctx.arcTo(bx - w * 0.01 + bw, by - bh / 2, bx - w * 0.01 + bw, by + bh / 2, brr)
      ctx.arcTo(bx - w * 0.01 + bw, by + bh / 2, bx - w * 0.01, by + bh / 2, brr)
      ctx.arcTo(bx - w * 0.01, by + bh / 2, bx - w * 0.01, by - bh / 2, brr)
      ctx.arcTo(bx - w * 0.01, by - bh / 2, bx - w * 0.01 + bw, by - bh / 2, brr)
      ctx.closePath()
      ctx.fill()
      ctx.fillStyle = '#ffffff'
      ctx.textAlign = 'left'
      ctx.textBaseline = 'middle'
      ctx.fillText(badge, bx, by)
      ctx.restore()
    }

    // Captions
    if (words.length > 0) {
      drawCaptions(ctx, words, captionDef, time, w, h)
    }
  }
}

// ── Shared utilities ───────────────────────────────────────────────

export function drawVideoFrame(
  ctx: CanvasRenderingContext2D,
  video: HTMLVideoElement,
  w: number,
  h: number,
): void {
  const vw = video.videoWidth || w
  const vh = video.videoHeight || h
  const scale = Math.max(w / vw, h / vh)
  const sw = vw * scale
  const sh = vh * scale
  ctx.drawImage(video, (w - sw) / 2, (h - sh) / 2, sw, sh)
}

export function renderPreviewFrame(
  ctx: CanvasRenderingContext2D,
  video: HTMLVideoElement | null,
  time: number,
  w: number,
  h: number,
  drawFrame: (input: DrawFrameInput) => void,
): void {
  ctx.fillStyle = '#000'
  ctx.fillRect(0, 0, w, h)
  if (video && video.readyState >= 2) {
    drawVideoFrame(ctx, video, w, h)
  }
  drawFrame({ ctx, time, w, h, video: video ?? undefined })
}
