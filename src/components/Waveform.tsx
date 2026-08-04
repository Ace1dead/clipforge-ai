import { useEffect, useRef } from 'react'
import type { RefObject } from 'react'
import { getWaveform } from '../lib/audio'

export function Waveform({ buffer, color = '#5e6ad2', height = 64, onSeek }: { buffer: AudioBuffer; color?: string; height?: number; onSeek?: (t: number) => void }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const data = getWaveform(buffer, 160)
  const duration = buffer.duration

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const w = canvas.width
    const h = canvas.height
    ctx.clearRect(0, 0, w, h)
    const mid = h / 2
    const barW = w / data.length
    for (let i = 0; i < data.length; i++) {
      const bh = Math.max(1, data[i] * (h - 8))
      ctx.fillStyle = color
      ctx.globalAlpha = 0.35 + 0.65 * (i / data.length)
      const x = i * barW + barW * 0.18
      ctx.fillRect(x, mid - bh / 2, barW * 0.64, bh)
    }
    ctx.globalAlpha = 1
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, color, height])

  return (
    <canvas
      ref={ref}
      width={800}
      height={height}
      onClick={(e) => {
        if (!onSeek) return
        const rect = e.currentTarget.getBoundingClientRect()
        const ratio = (e.clientX - rect.left) / rect.width
        onSeek(ratio * duration)
      }}
      className="w-full cursor-pointer rounded-lg"
    />
  )
}