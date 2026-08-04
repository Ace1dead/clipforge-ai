import { useEffect, useState } from 'react'
import { CAPTION_STYLES, renderStylePreview, getStyle, setStyleSize } from '../lib/captions'
import { cx } from './ui'

export function StylePicker({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  const [thumbs, setThumbs] = useState<Record<string, string>>({})
  const [loaded, setLoaded] = useState(false)
  const style = getStyle(value)

  useEffect(() => {
    const map: Record<string, string> = {}
    for (const s of CAPTION_STYLES) {
      const canvas = renderStylePreview(s, 220, 124)
      map[s.id] = canvas.toDataURL('image/png')
    }
    setThumbs(map)
    setLoaded(true)
  }, [])

  return (
    <div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-[320px] overflow-y-auto pr-1">
        {CAPTION_STYLES.map((s) => {
          const active = s.id === value
          return (
            <button
              key={s.id}
              onClick={() => onChange(s.id)}
              className={cx('relative rounded-xl overflow-hidden border-2 transition-all cursor-pointer group text-left', active ? 'border-accent ring-2 ring-accent/30' : 'border-white/10 hover:border-white/30')}
            >
              {loaded && thumbs[s.id] ? (
                <img src={thumbs[s.id]} alt={s.name} className="w-full aspect-[16/9] object-cover" />
              ) : (
                <div className="w-full aspect-[16/9] skeleton" />
              )}
              <span className="absolute bottom-0 left-0 right-0 px-2 py-1 bg-gradient-to-t from-black/90 to-transparent text-[11px] font-semibold">{s.name}</span>
              {active && <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-accent border-2 border-white" />}
            </button>
          )
        })}
      </div>
      <div className="mt-4 pt-4 border-t border-white/8">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[13px] text-muted">Font size</span>
          <span className="text-[13px] font-semibold tabular-nums">{Math.round(style.fontSize * 100)}%</span>
        </div>
        <input
          type="range" min={30} max={90} value={Math.round(style.fontSize * 1000)}
          onChange={(e) => setStyleSize(value, Number(e.target.value))}
          className="w-full range-accent cursor-pointer"
          style={{ ['--fill' as string]: `${((style.fontSize * 1000 - 30) / 60) * 100}%` }}
        />
      </div>
    </div>
  )
}