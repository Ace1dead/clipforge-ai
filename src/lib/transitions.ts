export type TransitionType =
  | 'cut'
  | 'crossfade'
  | 'glitch'
  | 'zoom_in'
  | 'zoom_out'
  | 'wipe_left'
  | 'wipe_right'
  | 'slide_left'
  | 'slide_right'
  | 'blur'

export interface TransitionConfig {
  type: TransitionType
  duration: number
  intensity?: number
}

export interface TransitionFrame {
  progress: number
  drawA: (ctx: CanvasRenderingContext2D, w: number, h: number) => void
  drawB: (ctx: CanvasRenderingContext2D, w: number, h: number) => void
}

function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
}

export function createTransitionRenderer(config: TransitionConfig) {
  const { type, duration, intensity = 1.0 } = config

  return function renderTransition(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    progress: number,
    drawA: (ctx: CanvasRenderingContext2D, w: number, h: number) => void,
    drawB: (ctx: CanvasRenderingContext2D, w: number, h: number) => void,
  ): void {
    const t = Math.max(0, Math.min(1, progress))

    switch (type) {
      case 'cut':
        if (t < 0.5) drawA(ctx, w, h)
        else drawB(ctx, w, h)
        break

      case 'crossfade': {
        drawA(ctx, w, h)
        ctx.globalAlpha = t
        drawB(ctx, w, h)
        ctx.globalAlpha = 1
        break
      }

      case 'glitch': {
        const eased = easeInOut(t)
        if (eased < 0.4) {
          drawA(ctx, w, h)
        } else if (eased > 0.6) {
          drawB(ctx, w, h)
        } else {
          const glitchProgress = (eased - 0.4) / 0.2
          const sliceCount = Math.floor(8 * intensity)
          for (let i = 0; i < sliceCount; i++) {
            const sliceH = h / sliceCount
            const offset = (Math.random() - 0.5) * 40 * intensity * glitchProgress
            ctx.save()
            ctx.beginPath()
            ctx.rect(0, i * sliceH, w, sliceH)
            ctx.clip()
            ctx.translate(offset, 0)
            if (Math.random() > 0.5) {
              drawB(ctx, w, h)
            } else {
              drawA(ctx, w, h)
            }
            ctx.restore()
          }
        }
        break
      }

      case 'zoom_in': {
        const eased = easeInOut(t)
        ctx.save()
        const scale = 1 + eased * 0.3 * intensity
        ctx.translate(w / 2, h / 2)
        ctx.scale(scale, scale)
        ctx.translate(-w / 2, -h / 2)
        if (t < 0.5) drawA(ctx, w, h)
        else drawB(ctx, w, h)
        ctx.restore()
        break
      }

      case 'zoom_out': {
        const eased = easeInOut(t)
        ctx.save()
        const scale = 1.3 * intensity - eased * 0.3 * intensity
        ctx.translate(w / 2, h / 2)
        ctx.scale(scale, scale)
        ctx.translate(-w / 2, -h / 2)
        if (t < 0.5) drawA(ctx, w, h)
        else drawB(ctx, w, h)
        ctx.restore()
        break
      }

      case 'wipe_left': {
        const eased = easeInOut(t)
        const clipX = w * (1 - eased)
        ctx.save()
        ctx.beginPath()
        ctx.rect(0, 0, clipX, h)
        ctx.clip()
        drawA(ctx, w, h)
        ctx.restore()
        ctx.save()
        ctx.beginPath()
        ctx.rect(clipX, 0, w - clipX, h)
        ctx.clip()
        drawB(ctx, w, h)
        ctx.restore()
        break
      }

      case 'wipe_right': {
        const eased = easeInOut(t)
        const clipX = w * eased
        ctx.save()
        ctx.beginPath()
        ctx.rect(0, 0, clipX, h)
        ctx.clip()
        drawB(ctx, w, h)
        ctx.restore()
        ctx.save()
        ctx.beginPath()
        ctx.rect(clipX, 0, w - clipX, h)
        ctx.clip()
        drawA(ctx, w, h)
        ctx.restore()
        break
      }

      case 'slide_left': {
        const eased = easeInOut(t)
        ctx.save()
        ctx.translate(-w * eased, 0)
        drawA(ctx, w, h)
        ctx.restore()
        ctx.save()
        ctx.translate(w * (1 - eased), 0)
        drawB(ctx, w, h)
        ctx.restore()
        break
      }

      case 'slide_right': {
        const eased = easeInOut(t)
        ctx.save()
        ctx.translate(w * eased, 0)
        drawA(ctx, w, h)
        ctx.restore()
        ctx.save()
        ctx.translate(-w * (1 - eased), 0)
        drawB(ctx, w, h)
        ctx.restore()
        break
      }

      case 'blur': {
        const eased = easeInOut(t)
        if (t < 0.5) {
          ctx.save()
          const blurAmount = eased * 20 * intensity
          ctx.filter = `blur(${blurAmount}px)`
          drawA(ctx, w, h)
          ctx.restore()
        } else {
          ctx.save()
          const blurAmount = (1 - eased) * 20 * intensity
          ctx.filter = `blur(${blurAmount}px)`
          drawB(ctx, w, h)
          ctx.restore()
        }
        break
      }
    }
  }
}

export function getTransitionDuration(config: TransitionConfig): number {
  return config.duration
}

export function applyTransitionsToTimeline(
  clips: Array<{ start: number; end: number }>,
  transitions: TransitionConfig[],
): Array<{
  clipStart: number
  clipEnd: number
  transitionStart: number
  transitionEnd: number
  transitionType: TransitionType
} | { clipStart: number; clipEnd: number }> {
  const result: Array<{
    clipStart: number
    clipEnd: number
    transitionStart?: number
    transitionEnd?: number
    transitionType?: TransitionType
  }> = []

  for (let i = 0; i < clips.length; i++) {
    const clip = clips[i]
    const transition = transitions[i] || transitions[transitions.length - 1] || { type: 'cut' as TransitionType, duration: 0 }

    result.push({
      clipStart: clip.start,
      clipEnd: clip.end,
    })

    if (i < clips.length - 1 && transition.duration > 0) {
      const overlap = transition.duration / 2
      result.push({
        clipStart: clip.end - overlap,
        clipEnd: clip.end + overlap,
        transitionStart: clip.end - overlap,
        transitionEnd: clip.end + overlap,
        transitionType: transition.type,
      })
    }
  }

  return result
}
