export interface Transition {
  type: 'fade' | 'dissolve' | 'zoom' | 'slide-left' | 'slide-right' | 'glitch' | 'wipe' | 'blur';
  duration: number;
}

export function applyTransition(
  ctx: CanvasRenderingContext2D,
  fromFrame: ImageData,
  toFrame: ImageData,
  progress: number,
  transition: Transition,
  width: number,
  height: number
): void {
  const t = Math.min(1, Math.max(0, progress));

  switch (transition.type) {
    case 'fade':
      fadeTransition(ctx, fromFrame, toFrame, t, width, height);
      break;
    case 'dissolve':
      dissolveTransition(ctx, fromFrame, toFrame, t, width, height);
      break;
    case 'zoom':
      zoomTransition(ctx, fromFrame, toFrame, t, width, height);
      break;
    case 'slide-left':
      slideTransition(ctx, fromFrame, toFrame, t, width, height, 'left');
      break;
    case 'slide-right':
      slideTransition(ctx, fromFrame, toFrame, t, width, height, 'right');
      break;
    case 'glitch':
      glitchTransition(ctx, fromFrame, toFrame, t, width, height);
      break;
    case 'wipe':
      wipeTransition(ctx, fromFrame, toFrame, t, width, height);
      break;
    case 'blur':
      blurTransition(ctx, fromFrame, toFrame, t, width, height);
      break;
  }
}

function fadeTransition(
  ctx: CanvasRenderingContext2D,
  from: ImageData,
  to: ImageData,
  t: number,
  w: number,
  h: number
): void {
  const out = ctx.createImageData(w, h);
  for (let i = 0; i < out.data.length; i += 4) {
    out.data[i] = from.data[i] * (1 - t) + to.data[i] * t;
    out.data[i + 1] = from.data[i + 1] * (1 - t) + to.data[i + 1] * t;
    out.data[i + 2] = from.data[i + 2] * (1 - t) + to.data[i + 2] * t;
    out.data[i + 3] = 255;
  }
  ctx.putImageData(out, 0, 0);
}

function dissolveTransition(
  ctx: CanvasRenderingContext2D,
  from: ImageData,
  to: ImageData,
  t: number,
  w: number,
  h: number
): void {
  const out = ctx.createImageData(w, h);
  for (let i = 0; i < out.data.length; i += 4) {
    const noise = Math.random();
    if (noise < t) {
      out.data[i] = to.data[i];
      out.data[i + 1] = to.data[i + 1];
      out.data[i + 2] = to.data[i + 2];
    } else {
      out.data[i] = from.data[i];
      out.data[i + 1] = from.data[i + 1];
      out.data[i + 2] = from.data[i + 2];
    }
    out.data[i + 3] = 255;
  }
  ctx.putImageData(out, 0, 0);
}

function zoomTransition(
  ctx: CanvasRenderingContext2D,
  from: ImageData,
  to: ImageData,
  t: number,
  w: number,
  h: number
): void {
  const eased = t * t * (3 - 2 * t);
  // Draw from frame at full size
  ctx.putImageData(from, 0, 0);
  // Draw to frame with alpha and scale using drawImage on a temp canvas
  const temp = document.createElement('canvas');
  temp.width = w;
  temp.height = h;
  const tctx = temp.getContext('2d')!;
  tctx.putImageData(to, 0, 0);
  ctx.save();
  ctx.globalAlpha = t;
  const scale = 1 + eased * 0.3;
  ctx.translate(w / 2, h / 2);
  ctx.scale(scale, scale);
  ctx.translate(-w / 2, -h / 2);
  ctx.drawImage(temp, 0, 0);
  ctx.restore();
}

function slideTransition(
  ctx: CanvasRenderingContext2D,
  from: ImageData,
  to: ImageData,
  t: number,
  w: number,
  h: number,
  direction: 'left' | 'right'
): void {
  const offset = direction === 'left' ? -t * w : t * w;
  // Draw from frame
  ctx.putImageData(from, 0, 0);
  // Draw to frame on temp canvas, then draw with translate
  const temp = document.createElement('canvas');
  temp.width = w;
  temp.height = h;
  const tctx = temp.getContext('2d')!;
  tctx.putImageData(to, 0, 0);
  ctx.save();
  ctx.translate(offset, 0);
  ctx.drawImage(temp, 0, 0);
  ctx.restore();
}

function glitchTransition(
  ctx: CanvasRenderingContext2D,
  from: ImageData,
  to: ImageData,
  t: number,
  w: number,
  h: number
): void {
  const out = ctx.createImageData(w, h);
  const sliceCount = Math.floor(10 * (1 - Math.abs(t - 0.5) * 2));
  for (let y = 0; y < h; y++) {
    const slice = Math.floor(y / (h / sliceCount));
    const offset = slice % 2 === 0 ? Math.floor(Math.random() * 20 * (1 - t)) : 0;
    const srcY = Math.min(h - 1, Math.max(0, y + offset));
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const si = (srcY * w + x) * 4;
      if (t < 0.5) {
        out.data[i] = from.data[si];
        out.data[i + 1] = from.data[si + 1];
        out.data[i + 2] = from.data[si + 2];
      } else {
        out.data[i] = to.data[si];
        out.data[i + 1] = to.data[si + 1];
        out.data[i + 2] = to.data[si + 2];
      }
      out.data[i + 3] = 255;
    }
  }
  ctx.putImageData(out, 0, 0);
}

function wipeTransition(
  ctx: CanvasRenderingContext2D,
  from: ImageData,
  to: ImageData,
  t: number,
  w: number,
  h: number
): void {
  const out = ctx.createImageData(w, h);
  const wipeX = t * w;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      if (x < wipeX) {
        out.data[i] = to.data[i];
        out.data[i + 1] = to.data[i + 1];
        out.data[i + 2] = to.data[i + 2];
      } else {
        out.data[i] = from.data[i];
        out.data[i + 1] = from.data[i + 1];
        out.data[i + 2] = from.data[i + 2];
      }
      out.data[i + 3] = 255;
    }
  }
  ctx.putImageData(out, 0, 0);
}

function blurTransition(
  ctx: CanvasRenderingContext2D,
  from: ImageData,
  to: ImageData,
  t: number,
  w: number,
  h: number
): void {
  const out = ctx.createImageData(w, h);
  const blur = Math.sin(t * Math.PI) * 10;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const mix = t;
      if (blur > 1) {
        out.data[i] = from.data[i] * (1 - mix) + to.data[i] * mix;
        out.data[i + 1] = from.data[i + 1] * (1 - mix) + to.data[i + 1] * mix;
        out.data[i + 2] = from.data[i + 2] * (1 - mix) + to.data[i + 2] * mix;
      } else {
        out.data[i] = from.data[i] * (1 - t) + to.data[i] * t;
        out.data[i + 1] = from.data[i + 1] * (1 - t) + to.data[i + 1] * t;
        out.data[i + 2] = from.data[i + 2] * (1 - t) + to.data[i + 2] * t;
      }
      out.data[i + 3] = 255;
    }
  }
  ctx.putImageData(out, 0, 0);
}

export const TRANSITION_PRESETS: { type: Transition['type']; label: string; icon: string }[] = [
  { type: 'fade', label: 'Fade', icon: ' fadeInOut' },
  { type: 'dissolve', label: 'Dissolve', icon: '✨' },
  { type: 'zoom', label: 'Zoom', icon: '🔍' },
  { type: 'slide-left', label: 'Slide Left', icon: '⬅️' },
  { type: 'slide-right', label: 'Slide Right', icon: '➡️' },
  { type: 'glitch', label: 'Glitch', icon: '⚡' },
  { type: 'wipe', label: 'Wipe', icon: '➡' },
  { type: 'blur', label: 'Blur', icon: '🌫️' },
];
