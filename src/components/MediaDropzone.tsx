import { useRef, useState } from 'react'
import type { DragEvent } from 'react'
import { UploadCloud, FileVideo, FileAudio, FileImage, Film, Link2 } from 'lucide-react'
import { cx, toast } from './ui'
import { fmtBytes } from '../lib/format'

export type DropType = 'video' | 'audio' | 'image' | 'any'

const ACCEPT: Record<DropType, string> = {
  video: 'video/*',
  audio: 'audio/*',
  image: 'image/*',
  any: '',
}

export interface Picked { file: File; url: string }

export function MediaDropzone({ type = 'video', label, onPicked, height = 'h-44' }: { type?: DropType; label?: string; onPicked: (p: Picked) => void; height?: string }) {
  const [drag, setDrag] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFiles = (files: FileList | null) => {
    const f = files?.[0]
    if (!f) return
    if (type === 'video' && !f.type.startsWith('video/')) { toast('error', 'Please choose a video file'); return }
    if (type === 'audio' && !f.type.startsWith('audio/')) { toast('error', 'Please choose an audio file'); return }
    if (type === 'image' && !f.type.startsWith('image/')) { toast('error', 'Please choose an image file'); return }
    onPicked({ file: f, url: URL.createObjectURL(f) })
  }

  const onDrop = (e: DragEvent) => {
    e.preventDefault()
    setDrag(false)
    handleFiles(e.dataTransfer.files)
  }

  const Icon = type === 'video' ? FileVideo : type === 'audio' ? FileAudio : type === 'image' ? FileImage : Film

  return (
    <div
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setDrag(true) }}
      onDragLeave={() => setDrag(false)}
      onDrop={onDrop}
      className={cx('relative border-2 border-dashed rounded-2xl flex flex-col items-center justify-center text-center cursor-pointer transition-all select-none group', height, drag ? 'border-accent bg-accent-soft' : 'border-white/12 hover:border-white/25 hover:bg-white/[0.02]')}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); inputRef.current?.click() } }}
    >
      <input ref={inputRef} type="file" accept={ACCEPT[type]} className="hidden" onChange={(e) => handleFiles(e.target.files)} />
      <span className={cx('w-12 h-12 rounded-2xl flex items-center justify-center mb-3 transition-colors', drag ? 'bg-accent text-white' : 'bg-elevated text-muted group-hover:text-accent')}>
        <UploadCloud size={22} />
      </span>
      <p className="text-sm font-semibold">{label ?? 'Drop a file here'}</p>
      <p className="text-[12px] text-faint mt-1">or click to browse</p>
      <span className="absolute bottom-3 left-0 right-0 flex items-center justify-center gap-1 text-[11px] text-faint">
        <Icon size={12} /> {type === 'any' ? 'Video · Audio · Image' : `${type} files`}
      </span>
    </div>
  )
}

export function FilePill({ file, onClear }: { file: File; onClear: () => void }) {
  const Icon = file.type.startsWith('video/') ? FileVideo : file.type.startsWith('audio/') ? FileAudio : FileImage
  return (
    <div className="flex items-center gap-3 bg-elevated border border-white/10 rounded-xl px-3.5 py-2.5">
      <Icon size={18} className="text-accent shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-medium truncate">{file.name}</p>
        <p className="text-[11px] text-faint">{fmtBytes(file.size)}</p>
      </div>
      <button onClick={onClear} className="text-faint hover:text-red text-[12px] font-medium cursor-pointer shrink-0">Remove</button>
    </div>
  )
}

export function UrlInput({ placeholder = 'Paste a link…', onSubmit, onCancel, disabled }: { placeholder?: string; onSubmit: (url: string) => void; onCancel: () => void; disabled?: boolean }) {
  const [v, setV] = useState('')
  return (
    <div className="flex gap-2">
      <div className="relative flex-1">
        <Link2 size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
        <input
          value={v}
          onChange={(e) => setV(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && v.trim()) onSubmit(v.trim()) }}
          placeholder={placeholder}
          className="w-full bg-elevated border border-white/10 rounded-xl pl-9 pr-3 py-2.5 text-sm outline-none focus:border-accent/60"
        />
      </div>
      <button
        disabled={!v.trim() || disabled}
        onClick={() => onSubmit(v.trim())}
        className="px-3.5 py-2 rounded-xl bg-elevated border border-white/10 text-sm font-medium hover:bg-raised disabled:opacity-40 cursor-pointer"
      >
        Load
      </button>
      <button onClick={onCancel} className="px-2.5 py-2 rounded-xl text-muted hover:text-fg text-sm cursor-pointer">Cancel</button>
    </div>
  )
}