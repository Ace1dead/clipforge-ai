/**
 * Shared Compositor — Single source of truth for what the video output produces.
 * Used by both live preview (rAF loop) and export (renderComposition draw callback).
 * Upgraded: all editStyle effects wired, beatIntensity passed, colorGrade used, smoothstep fades.
 */

import { drawCaptions, getStyle, type CaptionStyle, type TimedWord } from './captions'
import {
  composeEffects, createEffectContext, screenShake, chromaticAberration,
  vignette, filmGrain, exposurePulse, scanlines, glitchEffect, colorGrade,
  type EffectFn, type EffectContext
} from './effects'
import type { EditStyleId, ColorSkinId } from './editStyles'
import { EDIT_STYLES } from './editStyles'
import { COLOR_SKINS } from './effects'

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
    // Base effects — always applied when enabled
    const baseShake = style.screenShake.enabled
    const baseGlitch = style.glitch.enabled

    if (baseShake) effects.push(screenShake(style.screenShake.intensity, style.screenShake.frequency))
    if (style.chromaticAberration.enabled) effects.push(chromaticAberration(style.chromaticAberration.offset))
    if (style.vignette.enabled) effects.push(vignette(style.vignette.strength, style.vignette.radius))
    if (style.filmGrain.enabled) effects.push(filmGrain(style.filmGrain.intensity))
    if (style.exposurePulse.enabled) effects.push(exposurePulse(style.exposurePulse.stops, style.exposurePulse.decayFrames))
    if (style.scanlines.enabled) effects.push(scanlines(style.scanlines.density, style.scanlines.opacity))
    if (baseGlitch) effects.push(glitchEffect(style.glitch.intensity))

    // Audio-reactive effects — only add if not already present from base effects
    if (style.audioReactive.beatShake && beatIntensity > 0.1 && !baseShake) {
      effects.push(screenShake(style.screenShake.intensity || 0.8, style.screenShake.frequency || 30))
    }
    if (style.audioReactive.beatGlitch && beatIntensity > 0.3 && !baseGlitch) {
      effects.push(glitchEffect(style.glitch.intensity || 0.4))
    }
  }

  // Apply color grade as an effect
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
      // Gradient overlay
      const grad = ctx.createLinearGradient(0, 0, 0, h)
      grad.addColorStop(0, 'rgba(0,0,0,0.12)')
      grad.addColorStop(0.25, 'rgba(0,0,0,0)')
      grad.addColorStop(0.75, 'rgba(0,0,0,0)')
      grad.addColorStop(1, 'rgba(0,0,0,0.25)')
      ctx.fillStyle = grad
      ctx.fillRect(0, 0, w, h)

      // Hook text (first N seconds)
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

        // Background pill with glass effect
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

        // Text
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

      // Fade in/out (smoothstep for smooth curves)
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

export function drawVideoFrame(
  ctx: CanvasRenderingContext2D,
  video: HTMLVideoElement,
  w: number,
  h: number
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
  drawFrame: (input: DrawFrameInput) => void
): void {
  ctx.fillStyle = '#000'
  ctx.fillRect(0, 0, w, h)
  if (video && video.readyState >= 2) {
    drawVideoFrame(ctx, video, w, h)
  }
  drawFrame({ ctx, time, w, h, video: video ?? undefined })
}
