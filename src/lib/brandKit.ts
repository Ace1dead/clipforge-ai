/**
 * Brand Kit — Custom logos, fonts, colors, intro/outro templates.
 * Opus Clip charges for this on Business tier. We do it free.
 */

export interface BrandKit {
  name: string
  colors: {
    primary: string
    secondary: string
    accent: string
    background: string
    text: string
  }
  fonts: {
    heading: string
    body: string
    accent: string
  }
  logo?: {
    url: string
    width: number
    height: number
  }
  intro?: BrandTemplate
  outro?: BrandTemplate
}

export interface BrandTemplate {
  type: 'intro' | 'outro' | 'lower-third' | 'end-card'
  duration: number
  elements: BrandElement[]
}

export interface BrandElement {
  type: 'text' | 'logo' | 'shape' | 'image' | 'cta'
  content?: string
  x: number
  y: number
  width: number
  height: number
  fontSize?: number
  fontFamily?: string
  color?: string
  opacity?: number
  animation?: 'fade' | 'slide' | 'pop' | 'none'
}

// ═══════════════════════════════════════════════════════════════
// BRAND KIT CREATION
// ═══════════════════════════════════════════════════════════════

export function createBrandKit(name: string): BrandKit {
  return {
    name,
    colors: {
      primary: '#5e6ad2',
      secondary: '#22d3ee',
      accent: '#fbbf24',
      background: '#000000',
      text: '#ffffff',
    },
    fonts: {
      heading: 'Montserrat',
      body: 'Inter',
      accent: 'Bebas Neue',
    },
  }
}

export function createBrandKitWithPreset(
  name: string,
  preset: 'corporate' | 'creative' | 'minimal' | 'bold' | 'neon',
): BrandKit {
  const presets: Record<string, BrandKit['colors']> = {
    corporate: { primary: '#1e40af', secondary: '#3b82f6', accent: '#f59e0b', background: '#ffffff', text: '#111827' },
    creative: { primary: '#ec4899', secondary: '#8b5cf6', accent: '#06b6d4', background: '#1a1a2e', text: '#ffffff' },
    minimal: { primary: '#374151', secondary: '#6b7280', accent: '#111827', background: '#ffffff', text: '#111827' },
    bold: { primary: '#ef4444', secondary: '#f97316', accent: '#eab308', background: '#000000', text: '#ffffff' },
    neon: { primary: '#00ff88', secondary: '#00d4ff', accent: '#ff0080', background: '#0a0a0a', text: '#ffffff' },
  }

  return {
    name,
    colors: presets[preset],
    fonts: {
      heading: 'Montserrat',
      body: 'Inter',
      accent: 'Bebas Neue',
    },
  }
}

// ═══════════════════════════════════════════════════════════════
// INTRO/OUTRO TEMPLATES
// ═══════════════════════════════════════════════════════════════

export function generateIntroTemplate(kit: BrandKit, duration: number = 3): BrandTemplate {
  return {
    type: 'intro',
    duration,
    elements: [
      // Background
      {
        type: 'shape',
        x: 0, y: 0, width: 1080, height: 1920,
        color: kit.colors.background,
        opacity: 1,
      },
      // Logo (centered)
      ...(kit.logo ? [{
        type: 'logo' as const,
        x: 540 - kit.logo.width / 2,
        y: 860 - kit.logo.height / 2,
        width: kit.logo.width,
        height: kit.logo.height,
        animation: 'pop' as const,
      }] : []),
      // Brand name
      {
        type: 'text',
        content: kit.name,
        x: 540, y: kit.logo ? 860 + (kit.logo?.height ?? 0) / 2 + 40 : 960,
        width: 800, height: 60,
        fontSize: 36,
        fontFamily: kit.fonts.heading,
        color: kit.colors.primary,
        animation: 'slide',
      },
    ],
  }
}

export function generateOutroTemplate(kit: BrandKit, duration: number = 3): BrandTemplate {
  return {
    type: 'outro',
    duration,
    elements: [
      // Background
      {
        type: 'shape',
        x: 0, y: 0, width: 1080, height: 1920,
        color: kit.colors.background,
        opacity: 1,
      },
      // CTA button
      {
        type: 'cta',
        content: 'Follow for more',
        x: 540, y: 900,
        width: 400, height: 60,
        fontSize: 24,
        fontFamily: kit.fonts.body,
        color: kit.colors.primary,
        animation: 'pop',
      },
      // Logo
      ...(kit.logo ? [{
        type: 'logo' as const,
        x: 540 - kit.logo.width / 2,
        y: 760 - kit.logo.height / 2,
        width: kit.logo.width,
        height: kit.logo.height,
        animation: 'fade' as const,
      }] : []),
      // Handle
      {
        type: 'text',
        content: `@${kit.name.toLowerCase().replace(/\s+/g, '')}`,
        x: 540, y: 1000,
        width: 600, height: 40,
        fontSize: 20,
        fontFamily: kit.fonts.body,
        color: kit.colors.secondary,
        animation: 'fade',
      },
    ],
  }
}

// ═══════════════════════════════════════════════════════════════
// CANVAS RENDERING
// ═══════════════════════════════════════════════════════════════

export function applyBrandToCanvas(
  ctx: CanvasRenderingContext2D,
  kit: BrandKit,
  width: number,
  height: number,
  time: number,
): void {
  // Background
  ctx.fillStyle = kit.colors.background
  ctx.fillRect(0, 0, width, height)

  // Accent line
  ctx.fillStyle = kit.colors.primary
  ctx.fillRect(width * 0.1, height * 0.48, width * 0.8, 4)

  // Brand name
  const animProgress = Math.min(1, time / 0.5)
  const slideOffset = (1 - animProgress) * 50
  ctx.globalAlpha = animProgress
  ctx.fillStyle = kit.colors.text
  ctx.font = `bold ${Math.round(width * 0.04)}px ${kit.fonts.heading}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(kit.name, width / 2, height / 2 + slideOffset)
  ctx.globalAlpha = 1
}
