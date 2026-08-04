/** AI image generation: pollinations.ai (real free text-to-image) + offline procedural fallback. */

export async function generatePollinations(prompt: string, w: number, h: number, seed?: number): Promise<{ url: string; provider: string }> {
  const s = seed ?? Math.floor(Math.random() * 1_000_000)
  const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=${w}&height=${h}&seed=${s}&nologo=true&model=flux&enhance=true`
  const res = await fetch(url)
  if (!res.ok) throw new Error('Image model returned an error — try the offline generator')
  const blob = await res.blob()
  if (blob.size < 1000) throw new Error('Image model returned an empty result')
  return { url: URL.createObjectURL(blob), provider: 'pollinations-flux' }
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

interface Palette { sky: string; sky2: string; ground: string; ground2: string; accent: string; accent2: string; stars: boolean }

const PALETTES: Record<string, Palette> = {
  sunset: { sky: '#1e1b4b', sky2: '#f97316', ground: '#0c0a1d', ground2: '#7c2d12', accent: '#fbbf24', accent2: '#fb7185', stars: true },
  neon: { sky: '#050014', sky2: '#312e81', ground: '#02020a', ground2: '#1e1b4b', accent: '#22d3ee', accent2: '#ec4899', stars: true },
  forest: { sky: '#022c22', sky2: '#065f46', ground: '#052e16', ground2: '#166534', accent: '#4ade80', accent2: '#86efac', stars: false },
  ocean: { sky: '#082f49', sky2: '#0e7490', ground: '#04262f', ground2: '#155e75', accent: '#67e8f9', accent2: '#a5f3fc', stars: false },
  space: { sky: '#020617', sky2: '#1e1b4b', ground: '#000000', ground2: '#0f172a', accent: '#c4b5fd', accent2: '#f0abfc', stars: true },
  cyber: { sky: '#0b0218', sky2: '#4c1d95', ground: '#0b0218', ground2: '#2e1065', accent: '#22d3ee', accent2: '#f472b6', stars: true },
  pastel: { sky: '#fdf2f8', sky2: '#c7d2fe', ground: '#f8fafc', ground2: '#e0e7ff', accent: '#a78bfa', accent2: '#f472b6', stars: false },
  desert: { sky: '#fef3c7', sky2: '#fdba74', ground: '#78350f', ground2: '#b45309', accent: '#fcd34d', accent2: '#f97316', stars: false },
  snow: { sky: '#0f172a', sky2: '#334155', ground: '#f1f5f9', ground2: '#cbd5e1', accent: '#7dd3fc', accent2: '#e0f2fe', stars: true },
  lava: { sky: '#1c0505', sky2: '#7f1d1d', ground: '#0a0a0a', ground2: '#450a0a', accent: '#f97316', accent2: '#fde047', stars: false },
}

function styleFor(prompt: string): keyof typeof PALETTES {
  if (/(sunset|dusk|warm|golden)/i.test(prompt)) return 'sunset'
  if (/(neon|cyber|night city|glow)/i.test(prompt)) return 'neon'
  if (/(forest|nature|green|tree|mountain|jungle)/i.test(prompt)) return 'forest'
  if (/(ocean|sea|water|beach|wave|underwater)/i.test(prompt)) return 'ocean'
  if (/(space|galaxy|cosmos|stars|planet|nebula|universe)/i.test(prompt)) return 'space'
  if (/(cyberpunk|digital|circuit|futuristic|grid)/i.test(prompt)) return 'cyber'
  if (/(pastel|soft|minimal|gentle|dreamy)/i.test(prompt)) return 'pastel'
  if (/(desert|sand|dune|sahara)/i.test(prompt)) return 'desert'
  if (/(snow|ice|winter|frost|arctic)/i.test(prompt)) return 'snow'
  if (/(lava|fire|volcano|magma|ember)/i.test(prompt)) return 'lava'
  return 'neon'
}

function noise2d(rnd: () => number): number {
  let v = 0
  let amp = 0.5
  for (let i = 0; i < 3; i++) {
    v += rnd() * amp
    amp *= 0.5
  }
  return v / 0.875
}

/** Offline "diffusion-lite": seeded procedural scene from prompt keywords. Works fully offline. */
export function proceduralImage(prompt: string, w: number, h: number, seed: number): HTMLCanvasElement {
  const rnd = mulberry32(seed)
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!
  const pal = PALETTES[styleFor(prompt)]

  const sky = ctx.createLinearGradient(0, 0, 0, h)
  sky.addColorStop(0, pal.sky)
  sky.addColorStop(0.62, pal.sky2)
  sky.addColorStop(1, pal.ground2)
  ctx.fillStyle = sky
  ctx.fillRect(0, 0, w, h)

  // sun / moon disc
  const discX = w * (0.25 + rnd() * 0.5)
  const discY = h * (0.22 + rnd() * 0.2)
  const discR = Math.min(w, h) * (0.09 + rnd() * 0.06)
  const glow = ctx.createRadialGradient(discX, discY, 0, discX, discY, discR * 4)
  glow.addColorStop(0, pal.accent + '55')
  glow.addColorStop(1, 'transparent')
  ctx.fillStyle = glow
  ctx.fillRect(0, 0, w, h)
  ctx.beginPath()
  ctx.arc(discX, discY, discR, 0, Math.PI * 2)
  ctx.fillStyle = pal.accent
  ctx.fill()

  // ground silhouette
  ctx.beginPath()
  ctx.moveTo(0, h)
  for (let x = 0; x <= w; x += 8) {
    const y = h * (0.62 + 0.18 * Math.sin(x / (w * 0.09) + seed) + 0.08 * Math.sin(x / (w * 0.03)))
    ctx.lineTo(x, y)
  }
  ctx.lineTo(w, h)
  ctx.closePath()
  const g2 = ctx.createLinearGradient(0, h * 0.6, 0, h)
  g2.addColorStop(0, pal.ground2)
  g2.addColorStop(1, pal.ground)
  ctx.fillStyle = g2
  ctx.fill()

  // stars / particles
  if (pal.stars) {
    for (let i = 0; i < 90; i++) {
      ctx.globalAlpha = 0.25 + rnd() * 0.7
      ctx.fillStyle = i % 7 === 0 ? pal.accent2 : '#ffffff'
      const r = rnd() < 0.9 ? 1.2 : 2.5
      ctx.beginPath()
      ctx.arc(rnd() * w, rnd() * h * 0.5, r, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.globalAlpha = 1
  }

  // layered color washes (nebula feel)
  for (let i = 0; i < 4; i++) {
    const cx = rnd() * w
    const cy = rnd() * h * 0.6
    const rad = w * (0.2 + rnd() * 0.35)
    const wg = ctx.createRadialGradient(cx, cy, 0, cx, cy, rad)
    wg.addColorStop(0, (i % 2 ? pal.accent2 : pal.accent) + '33')
    wg.addColorStop(1, 'transparent')
    ctx.fillStyle = wg
    ctx.fillRect(0, 0, w, h)
  }

  // organic blobs (abstract "AI art")
  for (let i = 0; i < 6; i++) {
    const bx = rnd() * w
    const by = h * (0.4 + rnd() * 0.55)
    const br = Math.min(w, h) * (0.05 + rnd() * 0.16)
    ctx.beginPath()
    const segs = 24
    for (let s = 0; s <= segs; s++) {
      const a = (s / segs) * Math.PI * 2
      const rr = br * (0.7 + 0.3 * Math.sin(a * 3 + rnd() * 6))
      const px = bx + Math.cos(a) * rr
      const py = by + Math.sin(a) * rr * 0.72
      if (s === 0) ctx.moveTo(px, py)
      else ctx.lineTo(px, py)
    }
    ctx.closePath()
    ctx.fillStyle = (i % 2 ? pal.accent2 : pal.accent) + '2e'
    ctx.fill()
  }

  // grain
  const grain = ctx.createImageData(w, h)
  const d = grain.data
  for (let i = 0; i < d.length; i += 4) {
    const n = (noise2d(rnd) - 0.5) * 14
    d[i] = 128 + n
    d[i + 1] = 128 + n
    d[i + 2] = 128 + n
    d[i + 3] = 26
  }
  ctx.globalCompositeOperation = 'overlay'
  ctx.putImageData(grain, 0, 0)
  ctx.globalCompositeOperation = 'source-over'

  // vignette
  const vg = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.max(w, h) * 0.75)
  vg.addColorStop(0, 'transparent')
  vg.addColorStop(1, 'rgba(0,0,0,0.42)')
  ctx.fillStyle = vg
  ctx.fillRect(0, 0, w, h)

  return canvas
}