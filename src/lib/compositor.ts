/**
 * Shared Compositor — Single source of truth for what the video output produces.
 * Used by both live preview (rAF loop) and export (renderComposition draw callback).
 */

import { drawCaptions, getStyle, type CaptionStyle, type TimedWord } from './captions'
import { composeEffects, createEffectContext, screenShake, chromaticAberration, vignette, filmGrain, type EffectFn, type EffectContext } from './effects'
import type { EditStyleId, ColorSkinId } from './editStyles'
import { EDIT_STYLES } from './editStyles'
import { COLOR_SKINS } from './effects'

export interface CompositorConfig {
  // Video
  clipDuration: number          // duration of this clip in seconds
  // Captions
  words?: TimedWord[]
  captionStyleId?: string
  // Effects
  editStyle?: EditStyleId
  colorSkin?: ColorSkinId
  // Overlays
  hooks?: string[]
  platform?: string             // 'tiktok' | 'reels' | 'shorts' | 'youtube'
  // Animation
  fadeDuration?: number         // seconds, default 0.5
  hookDuration?: number         // seconds, default 3
}

export interface DrawFrameInput {
  ctx: CanvasRenderingContext2D
  time: number                  // current time in seconds (relative to clip start)
  w: number                     // canvas width
  h: number                     // canvas height
  video?: HTMLVideoElement      // source video (for drawImage)
}

/**
 * Create a draw function that renders the full visual stack.
 * Compatible with both:
 *   - requestAnimationFrame loop (preview)
 *   - renderComposition() draw callback (export)
 */
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
  } = config

  // Pre-build effects pipeline
  const style = EDIT_STYLES[editStyle]
  const skin = COLOR_SKINS[colorSkin]
  const effects: EffectFn[] = []
  if (style) {
    if (style.screenShake.enabled) effects.push(screenShake(style.screenShake.intensity, style.screenShake.frequency))
    if (style.chromaticAberration.enabled) effects.push(chromaticAberration(style.chromaticAberration.offset))
    if (style.vignette.enabled) effects.push(vignette(style.vignette.strength, style.vignette.radius))
    if (style.filmGrain.enabled) effects.push(filmGrain(style.filmGrain.intensity))
  }
  const composedEffects = effects.length > 0 ? composeEffects(...effects) : null
  const captionDef = getStyle(captionStyleId)

  return function drawFrame({ ctx, time, w, h }: DrawFrameInput): void {
    // 1. Effects context (pre-draw)
    if (composedEffects) {
      const ec = createEffectContext(ctx, time, w, h, 0, 120)
      composedEffects(ec, () => drawLayers(ctx, time, w, h))
    } else {
      drawLayers(ctx, time, w, h)
    }

    function drawLayers(ctx: CanvasRenderingContext2D, time: number, w: number, h: number): void {
      // 2. Gradient overlay
      const grad = ctx.createLinearGradient(0, 0, 0, h)
      grad.addColorStop(0, 'rgba(0,0,0,0.15)')
      grad.addColorStop(0.3, 'rgba(0,0,0,0)')
      grad.addColorStop(0.7, 'rgba(0,0,0,0)')
      grad.addColorStop(1, 'rgba(0,0,0,0.3)')
      ctx.fillStyle = grad
      ctx.fillRect(0, 0, w, h)

      // 3. Color skin overlay
      if (skin) {
        // Apply color grade as subtle temperature/tint overlay
        const temp = skin.temperature
        if (temp > 0) {
          ctx.globalAlpha = temp * 0.08
          ctx.fillStyle = '#ff8800'
          ctx.fillRect(0, 0, w, h)
        } else if (temp < 0) {
          ctx.globalAlpha = Math.abs(temp) * 0.08
          ctx.fillStyle = '#0088ff'
          ctx.fillRect(0, 0, w, h)
        }
        const tint = skin.tint
        if (tint > 0) {
          ctx.globalAlpha = tint * 0.05
          ctx.fillStyle = '#ff00ff'
          ctx.fillRect(0, 0, w, h)
        } else if (tint < 0) {
          ctx.globalAlpha = Math.abs(tint) * 0.05
          ctx.fillStyle = '#00ff88'
          ctx.fillRect(0, 0, w, h)
        }
        ctx.globalAlpha = 1
      }

      // 4. Hook text (first N seconds)
      if (time < hookDuration && hooks[0]) {
        const alpha = time < 0.5 ? time * 2 : time > hookDuration - 0.5 ? (hookDuration - time) * 2 : 1
        const scale = time < 0.3 ? 0.5 + time * 1.67 : 1
        ctx.save()
        ctx.globalAlpha = Math.max(0, Math.min(1, alpha))
        ctx.translate(w / 2, h * 0.35)
        ctx.scale(scale, scale)
        const text = hooks[0]
        ctx.font = `bold ${Math.round(w * 0.065)}px "Inter", system-ui, sans-serif`
        const metrics = ctx.measureText(text)
        const pw = metrics.width + w * 0.06
        const ph = w * 0.09
        ctx.fillStyle = 'rgba(94, 106, 210, 0.85)'
        ctx.beginPath()
        ctx.roundRect(-pw / 2, -ph / 2, pw, ph, w * 0.02)
        ctx.fill()
        ctx.fillStyle = '#ffffff'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(text, 0, 0)
        ctx.restore()
      }

      // 5. Platform badge
      if (platform) {
        ctx.save()
        ctx.font = `bold ${Math.round(w * 0.028)}px "Inter", system-ui, sans-serif`
        const badge = platform.toUpperCase()
        const bm = ctx.measureText(badge)
        const bx = w * 0.04
        const by = h - w * 0.06
        ctx.fillStyle = 'rgba(94, 106, 210, 0.8)'
        ctx.beginPath()
        ctx.roundRect(bx - w * 0.01, by - w * 0.02, bm.width + w * 0.02, w * 0.035, w * 0.008)
        ctx.fill()
        ctx.fillStyle = '#ffffff'
        ctx.textAlign = 'left'
        ctx.textBaseline = 'middle'
        ctx.fillText(badge, bx, by)
        ctx.restore()
      }

      // 6. Captions
      if (words.length > 0) {
        drawCaptions(ctx, words, captionDef, time, w, h)
      }

      // 7. Fade in/out
      if (time < fadeDuration) {
        ctx.fillStyle = `rgba(0,0,0,${1 - time / fadeDuration})`
        ctx.fillRect(0, 0, w, h)
      } else if (time > clipDuration - fadeDuration) {
        ctx.fillStyle = `rgba(0,0,0,${(time - (clipDuration - fadeDuration)) / fadeDuration})`
        ctx.fillRect(0, 0, w, h)
      }
    }
  }
}

/**
 * Draw a single frame from a video element to a canvas (cover-fit).
 * Used by both preview and export to ensure identical frame rendering.
 */
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

/**
 * Render a full frame: black bg + video + compositor overlays.
 * Used by preview modal's rAF loop.
 */
export function renderPreviewFrame(
  ctx: CanvasRenderingContext2D,
  video: HTMLVideoElement | null,
  time: number,
  w: number,
  h: number,
  drawFrame: (input: DrawFrameInput) => void
): void {
  // Black background
  ctx.fillStyle = '#000'
  ctx.fillRect(0, 0, w, h)

  // Draw video frame (cover-fit)
  if (video && video.readyState >= 2) {
    drawVideoFrame(ctx, video, w, h)
  }

  // Apply compositor overlays
  drawFrame({ ctx, time, w, h, video: video ?? undefined })
}
