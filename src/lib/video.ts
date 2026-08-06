import { getAudioCtx } from './audio'
import { clamp } from './format'
import { webmToMp4, loadFFmpeg, isFFmpegSupported, concatSegments } from './ffmpeg'

export interface VideoMeta { duration: number; width: number; height: number }

export function videoMeta(url: string): Promise<VideoMeta> {
  return new Promise((resolve, reject) => {
    const v = document.createElement('video')
    v.preload = 'metadata'
    v.muted = true
    v.onloadedmetadata = () => resolve({ duration: v.duration || 0, width: v.videoWidth || 0, height: v.videoHeight || 0 })
    v.onerror = () => reject(new Error('Could not read this media file'))
    v.src = url
  })
}

export function pickMimeType(): string {
  if (typeof MediaRecorder === 'undefined') throw new Error('Video recording is not supported in this browser')
  const candidates = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm;codecs=avc1', 'video/mp4']
  for (const m of candidates) {
    try { if (MediaRecorder.isTypeSupported(m)) return m } catch { /* ignore */ }
  }
  return ''
}

export interface RenderCompositionOpts {
  sources: { url: string; cell?: { x: number; y: number; w: number; h: number }; fit?: 'cover' | 'contain'; offsetY?: number }[]
  outW: number
  outH: number
  fps?: number
  bitrate?: number
  trim?: { start: number; end: number }
  draw?: (ctx: CanvasRenderingContext2D, time: number, w: number, h: number) => void
  audioLayers?: { url: string; gain?: number }[]
  videoGain?: number
  muteVideoAudio?: boolean
  onProgress?: (p: number) => void
  signal?: AbortSignal
}

export async function renderComposition(opts: RenderCompositionOpts): Promise<Blob> {
  if (!opts.sources.length) throw new Error('No video sources provided')
  const fps = opts.fps ?? 30
  const canvas = document.createElement('canvas')
  canvas.width = opts.outW
  canvas.height = opts.outH
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas unavailable')

  const videos = opts.sources.map((s) => {
    const v = document.createElement('video')
    v.src = s.url
    v.crossOrigin = 'anonymous'
    v.preload = 'auto'
    v.muted = true
    return v
  })

  await Promise.all(videos.map((v) => new Promise<void>((res, rej) => {
    const onOk = () => { v.removeEventListener('error', onErr); res() }
    const onErr = () => { v.removeEventListener('loadeddata', onOk); rej(new Error('Could not load video')) }
    v.addEventListener('loadeddata', onOk)
    v.addEventListener('error', onErr)
  })))

  const audioCtx = getAudioCtx()
  const dest = audioCtx.createMediaStreamDestination()

  if (!opts.muteVideoAudio) {
    for (const v of videos) {
      try {
        const src = audioCtx.createMediaElementSource(v)
        const g = audioCtx.createGain()
        g.gain.value = opts.videoGain ?? 1
        src.connect(g)
        g.connect(dest)
      } catch { /* video has no audio */ }
    }
  }

  const layerEls: HTMLAudioElement[] = []
  for (const layer of opts.audioLayers ?? []) {
    const el = new Audio(layer.url)
    el.crossOrigin = 'anonymous'
    el.preload = 'auto'
    try {
      const src = audioCtx.createMediaElementSource(el)
      const g = audioCtx.createGain()
      g.gain.value = layer.gain ?? 1
      src.connect(g)
      g.connect(dest)
    } catch { /* ignore */ }
    layerEls.push(el)
  }

  const stream = canvas.captureStream(fps)
  if (dest.stream.getAudioTracks().length) stream.addTrack(dest.stream.getAudioTracks()[0])
  const mime = pickMimeType()
  const recorder = new MediaRecorder(stream, {
    mimeType: mime || undefined,
    videoBitsPerSecond: opts.bitrate ?? 8_000_000,
    audioBitsPerSecond: 192_000,
  })

  const chunks: BlobPart[] = []
  recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data) }
  const stopped = new Promise<Blob>((resolve) => {
    recorder.onstop = () => resolve(new Blob(chunks, { type: mime || 'video/webm' }))
  })

  const trim = opts.trim ?? { start: 0, end: Infinity }
  const master = videos[0]

  const seekTo = (v: HTMLVideoElement, t: number): Promise<void> => new Promise((resolve) => {
    const timer = setTimeout(() => resolve(), 1500)
    const onSeek = () => { clearTimeout(timer); v.removeEventListener('seeked', onSeek); resolve() }
    v.addEventListener('seeked', onSeek)
    if (Math.abs(v.currentTime - t) < 0.002 && v.readyState >= 2) {
      clearTimeout(timer)
      v.removeEventListener('seeked', onSeek)
      resolve()
      return
    }
    v.currentTime = t
  })

  const playAll = async () => {
    for (const v of videos) await seekTo(v, trim.start)
    for (const el of layerEls) el.currentTime = 0
    const started: Promise<unknown>[] = []
    for (const v of videos) started.push(v.play().catch(() => undefined))
    for (const el of layerEls) started.push(el.play().catch(() => undefined))
    await Promise.all(started)
    for (const v of videos) v.muted = false
  }

  recorder.start(200)
  let cancelled = false
  const abort = () => { cancelled = true }
  opts.signal?.addEventListener('abort', abort, { once: true })

  await playAll()
  const duration = isFinite(trim.end) ? trim.end - trim.start : Math.max(0.05, master.duration - trim.start)
  const endTime = trim.start + duration

  let stoppedDone = false
  const stop = () => {
    if (stoppedDone) return
    stoppedDone = true
    for (const v of videos) { try { v.pause() } catch { /* */ } }
    for (const el of layerEls) { try { el.pause() } catch { /* */ } }
    recorder.stop()
  }

  const tick = () => {
    if (cancelled) { stop(); return }
    const t = master.currentTime
    ctx.save()
    ctx.fillStyle = '#000'
    ctx.fillRect(0, 0, opts.outW, opts.outH)
    for (let i = 0; i < opts.sources.length; i++) {
      const src = opts.sources[i]
      const cell = src.cell ?? { x: 0, y: 0, w: opts.outW, h: opts.outH }
      drawFrame(ctx, videos[i], cell, src.fit ?? 'cover', src.offsetY ?? 0)
    }
    opts.draw?.(ctx, Math.max(0, t - trim.start), opts.outW, opts.outH)
    ctx.restore()
    opts.onProgress?.(clamp((t - trim.start) / Math.max(duration, 0.01), 0, 1))
    if (t >= endTime - 0.05 || master.ended) { stop(); return }
    requestAnimationFrame(tick)
  }

  requestAnimationFrame(tick)
  try {
    const blob = await stopped
    opts.signal?.removeEventListener('abort', abort)
    // Cleanup: release video/audio elements
    for (const v of videos) { v.src = ''; v.load() }
    for (const el of layerEls) { el.src = ''; el.load() }
    return blob
  } catch {
    opts.signal?.removeEventListener('abort', abort)
    // Cleanup on error too
    for (const v of videos) { v.src = ''; v.load() }
    for (const el of layerEls) { el.src = ''; el.load() }
    throw new Error('Export failed')
  }
}

function drawFrame(ctx: CanvasRenderingContext2D, video: HTMLVideoElement, cell: { x: number; y: number; w: number; h: number }, fit: 'cover' | 'contain', offsetY = 0): void {
  const vw = video.videoWidth || 16
  const vh = video.videoHeight || 9
  const cw = cell.w
  const ch = cell.h
  if (fit === 'contain') {
    const scale = Math.min(cw / vw, ch / vh)
    const dw = vw * scale
    const dh = vh * scale
    ctx.drawImage(video, cell.x + (cw - dw) / 2, cell.y + (ch - dh) / 2, dw, dh)
    return
  }
  const scale = Math.max(cw / vw, ch / vh)
  const dw = vw * scale
  const dh = vh * scale
  let dy = cell.y + (ch - dh) / 2
  if (offsetY !== 0) {
    const maxOff = Math.max(0, (dh - ch) / 2)
    dy = dy - offsetY * maxOff * 2
  }
  ctx.drawImage(video, cell.x + (cw - dw) / 2, dy, dw, dh)
}

export type ExportFormat = 'webm' | 'mp4';

export interface ExportOptions {
  format?: ExportFormat;
  onProgress?: (p: number) => void;
  signal?: AbortSignal;
}

export async function exportVideo(
  renderOpts: RenderCompositionOpts,
  exportOpts: ExportOptions = {}
): Promise<Blob> {
  const webmBlob = await renderComposition(renderOpts);
  if (exportOpts.format === 'mp4' && isFFmpegSupported()) {
    exportOpts.onProgress?.(0.5);
    const mp4Blob = await webmToMp4(webmBlob, (p) => exportOpts.onProgress?.(0.5 + p * 0.5));
    return mp4Blob;
  }
  return webmBlob;
}

export async function preloadFFmpeg(): Promise<void> {
  if (isFFmpegSupported()) {
    await loadFFmpeg();
  }
}

export interface JumpCutOpts extends RenderCompositionOpts {
  /** Ordered kept sub-ranges to render & concatenate. */
  segments: { start: number; end: number }[]
  /** Output format (mp4 requires ffmpeg). */
  format?: ExportFormat
  /** Clip-start (the source timestamp that maps to clip-local time 0), so the
   *  `draw` callback stays aligned to the original clip timeline across cuts. */
  timeBase?: number
}

/**
 * Render a clip that has had silences jump-cut out. Each surviving range is
 * rendered separately (so playback skips the removed dead-air), then stitched
 * back together with ffmpeg's concat demuxer. Falls back to a single render
 * when ffmpeg is unavailable.
 */
export async function renderJumpCut(opts: JumpCutOpts): Promise<Blob> {
  const clipBase = opts.timeBase ?? opts.trim?.start ?? 0
  const effective = opts.segments.length > 0
    ? opts.segments
    : [{ start: clipBase, end: clipBase + (opts.trim?.end ?? Infinity) }]

  const baseDraw = opts.draw
  const blobs: Blob[] = []
  for (const seg of effective) {
    // Segment-local draw time -> original clip-local time.
    const bias = seg.start - clipBase
    const draw = (ctx: CanvasRenderingContext2D, local: number, w: number, h: number) =>
      baseDraw?.(ctx, local + bias, w, h)
    const part = await renderComposition({
      ...opts,
      trim: seg,
      draw,
      signal: undefined,
    } as RenderCompositionOpts)
    blobs.push(part)
  }

  if (blobs.length > 1 && isFFmpegSupported()) {
    const joined = await concatSegments(blobs, opts.onProgress)
    if (opts.format === 'mp4') return webmToMp4(joined, opts.onProgress)
    return joined
  }
  if (opts.format === 'mp4' && isFFmpegSupported()) return webmToMp4(blobs[0], opts.onProgress)
  return blobs[0]
}