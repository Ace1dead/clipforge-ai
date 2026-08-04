export type IconStyle = 'gradient' | 'flat' | 'glass' | 'neon' | 'pastel'

export const ICON_STYLES: { id: IconStyle; name: string }[] = [
  { id: 'gradient', name: 'Gradient' },
  { id: 'flat', name: 'Flat' },
  { id: 'glass', name: 'Glassmorphism' },
  { id: 'neon', name: 'Neon' },
  { id: 'pastel', name: 'Pastel' },
]

const EMOJI_MAP: [RegExp, string[]][] = [
  [/(rocket|launch|startup|space|growth)/i, ['🚀', '🛸', '⭐']],
  [/(money|finance|dollar|cash|invest|profit|rich)/i, ['💰', '💵', '📈', '🤑']],
  [/(heart|love|dating|romance)/i, ['❤️', '💖', '💘', '😍']],
  [/(gaming|game|play|esport)/i, ['🎮', '🕹️', '👾', '🎯']],
  [/(music|song|audio|beat|sound)/i, ['🎵', '🎧', '🎤', '🎶']],
  [/(video|film|camera|movie|edit)/i, ['🎬', '📹', '🎥', '📽️']],
  [/(photo|picture|image|art)/i, ['📸', '🖼️', '🎨']],
  [/(food|restaurant|eat|cook|pizza|burger)/i, ['🍕', '🍔', '🌮', '🍣', '🍩']],
  [/(fitness|gym|workout|health|sport)/i, ['💪', '🏋️', '🏃', '⚽']],
  [/(travel|trip|vacation|flight|world)/i, ['✈️', '🌍', '🗺️', '🏝️']],
  [/(ai|robot|tech|code|coding|developer|software)/i, ['🤖', '💻', '⚡', '🧠']],
  [/(shopping|store|shop|cart|fashion)/i, ['🛍️', '👟', '👗', '👜']],
  [/(education|learn|school|study|book)/i, ['📚', '🎓', '✏️', '📖']],
  [/(pet|dog|cat|animal)/i, ['🐶', '🐱', '🐾', '🦊']],
  [/(nature|plant|green|tree|flower|eco)/i, ['🌿', '🌻', '🌲', '🍀']],
  [/(crypto|bitcoin|blockchain|nft)/i, ['🪙', '₿', '🔗', '💎']],
  [/(cloud|weather|rain|sun)/i, ['☁️', '⛅', '🌈', '☀️']],
  [/(security|lock|protect|privacy)/i, ['🔒', '🛡️', '🔐']],
  [/(message|chat|social|talk|comment)/i, ['💬', '📱', '💭', '🗨️']],
  [/(star|celebrity|fame|winner)/i, ['⭐', '🏆', '🌟', '🥇']],
]

export function emojiFor(prompt: string): string {
  for (const [re, list] of EMOJI_MAP) {
    if (re.test(prompt)) return list[Math.floor(Math.random() * list.length)]
  }
  return ['✨', '🔥', '💡', '🎯'][Math.floor(Math.random() * 4)]
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

const STYLE_PALETTES: Record<IconStyle, [string, string]> = {
  gradient: ['#5e6ad2', '#8b5cf6'],
  flat: ['#1b1e27', '#2a2f3d'],
  glass: ['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.02)'],
  neon: ['#111827', '#111827'],
  pastel: ['#fde68a', '#f9a8d4'],
}

export function generateIcon(prompt: string, style: IconStyle, size = 512, seed = Math.floor(Math.random() * 1e9)): HTMLCanvasElement {
  const rnd = mulberry32(seed)
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  const S = size
  const r = S * 0.22

  ctx.save()
  ctx.beginPath()
  ctx.roundRect(0, 0, S, S, r)
  ctx.clip()

  if (style === 'glass') {
    const g = ctx.createLinearGradient(0, 0, S, S)
    g.addColorStop(0, 'rgba(255,255,255,0.16)')
    g.addColorStop(1, 'rgba(255,255,255,0.03)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, S, S)
    ctx.strokeStyle = 'rgba(255,255,255,0.25)'
    ctx.lineWidth = 2
    ctx.strokeRect(1, 1, S - 2, S - 2)
  } else {
    const [c1, c2] = STYLE_PALETTES[style]
    const g = ctx.createLinearGradient(0, 0, S, S)
    g.addColorStop(0, c1)
    g.addColorStop(1, c2)
    ctx.fillStyle = g
    ctx.fillRect(0, 0, S, S)
  }

  // decorative shapes
  if (style === 'neon') {
    for (let i = 0; i < 5; i++) {
      ctx.beginPath()
      ctx.arc(rnd() * S, rnd() * S, 4 + rnd() * 20, 0, Math.PI * 2)
      ctx.fillStyle = `hsla(${Math.floor(rnd() * 360)} 90% 60% / 0.5)`
      ctx.fill()
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.35)'
    ctx.lineWidth = 3
    ctx.strokeRect(1, 1, S - 2, S - 2)
  }
  if (style === 'gradient' || style === 'flat') {
    const ring = ctx.createRadialGradient(S * 0.2, S * 0.15, 0, S * 0.2, S * 0.15, S * 0.5)
    ring.addColorStop(0, 'rgba(255,255,255,0.25)')
    ring.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = ring
    ctx.fillRect(0, 0, S, S)
  }

  // emoji
  const emoji = emojiFor(prompt)
  ctx.font = `${S * 0.5}px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  if (style === 'neon') {
    ctx.shadowColor = '#22d3ee'
    ctx.shadowBlur = S * 0.12
  } else if (style === 'glass') {
    ctx.shadowColor = 'rgba(0,0,0,0.5)'
    ctx.shadowBlur = S * 0.05
    ctx.shadowOffsetY = S * 0.02
  }
  ctx.fillText(emoji, S / 2, S * 0.52)
  ctx.shadowColor = 'transparent'

  ctx.restore()

  // border
  ctx.strokeStyle = 'rgba(255,255,255,0.14)'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.roundRect(1, 1, S - 2, S - 2, r)
  ctx.stroke()
  return canvas
}