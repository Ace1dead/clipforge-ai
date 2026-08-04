import { useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Sparkles, Download, RotateCcw, MonitorPlay, FileVideo } from 'lucide-react'
import { MediaDropzone, FilePill } from './MediaDropzone'
import type { Picked } from './MediaDropzone'
import { Button, Card, CardHeader, ProgressBar, Spinner, cx, toast } from './ui'
import { downloadBlob, fmtBytes, fmtTime, extensionFromType } from '../lib/format'
import type { ExportFormat } from '../lib/video'

export interface ToolCtx { onProgress: (pct: number) => void; signal: AbortSignal; exportFormat: ExportFormat }
export interface ToolResult { blob: Blob; filename: string; kind: 'video' | 'audio' | 'image'; meta?: string; extra?: ReactNode }

interface Props {
  title: string
  subtitle: string
  icon: ReactNode
  dropType?: 'video' | 'audio' | 'image' | 'any'
  dropLabel?: string
  acceptUrl?: boolean
  urlPlaceholder?: string
  onUrlLoad?: (url: string, name: string) => Promise<void>
  onPicked?: (p: Picked) => Promise<void> | void
  config?: ReactNode | ((p: Picked) => ReactNode)
  process: (p: Picked, ctx: ToolCtx) => Promise<ToolResult>
  processLabel?: string
  premium?: boolean
  showFormatSelect?: boolean
}

export function MediaToolShell({ title, subtitle, icon, dropType = 'video', dropLabel, acceptUrl, urlPlaceholder, onUrlLoad, onPicked, config, process, processLabel = 'Process', premium, showFormatSelect }: Props) {
  const [picked, setPicked] = useState<Picked | null>(null)
  const [processing, setProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState<ToolResult | null>(null)
  const [resultUrl, setResultUrl] = useState<string | null>(null)
  const [showUrl, setShowUrl] = useState(false)
  const [busyUrl, setBusyUrl] = useState(false)
  const [exportFormat, setExportFormat] = useState<ExportFormat>('webm')
  const abortRef = useRef<AbortController | null>(null)
  const startRef = useRef(0)

  const run = async () => {
    if (!picked || processing) return
    setProcessing(true)
    setProgress(0)
    setResult(null)
    if (resultUrl) { URL.revokeObjectURL(resultUrl); setResultUrl(null) }
    const ctrl = new AbortController()
    abortRef.current = ctrl
    startRef.current = performance.now()
    try {
      const r = await process(picked, { onProgress: setProgress, signal: ctrl.signal, exportFormat })
      const url = URL.createObjectURL(r.blob)
      setResult(r)
      setResultUrl(url)
      toast('success', 'Done!', `${r.filename} (${fmtBytes(r.blob.size)})`)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Processing failed'
      toast('error', 'Processing failed', msg)
    } finally {
      setProcessing(false)
      abortRef.current = null
    }
  }

  const cancel = () => abortRef.current?.abort()

  const reset = () => {
    abortRef.current?.abort()
    if (picked) URL.revokeObjectURL(picked.url)
    if (resultUrl) URL.revokeObjectURL(resultUrl)
    setPicked(null)
    setResult(null)
    setResultUrl(null)
    setProgress(0)
    setShowUrl(false)
  }

  const elapsed = () => {
    const s = Math.round((performance.now() - startRef.current) / 1000)
    return fmtTime(s)
  }

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-8 py-8 anim-float-up">
      <div className="flex items-center gap-3 mb-2">
        <span className="w-10 h-10 rounded-xl accent-gradient flex items-center justify-center text-white shadow-lg shadow-accent/25">{icon}</span>
        <div>
          <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">{title} {premium && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber/15 text-amber border border-amber/25">PREMIUM</span>}</h1>
          <p className="text-[13px] text-muted">{subtitle}</p>
        </div>
      </div>

      {!picked && (
        <div className="mt-6 grid gap-5">
          <MediaDropzone type={dropType} label={dropLabel} onPicked={(p) => { setPicked(p); setResult(null); void onPicked?.(p) }} />
          {acceptUrl && (
            <div className="text-center">
              {!showUrl ? (
                <button onClick={() => setShowUrl(true)} className="text-[13px] text-accent hover:underline cursor-pointer inline-flex items-center gap-1">
                  <MonitorPlay size={14} /> or load from a link
                </button>
              ) : (
                <UrlForm placeholder={urlPlaceholder} onCancel={() => setShowUrl(false)} onLoad={async (url) => {
                  setBusyUrl(true)
                  try {
                    const name = url.split('/').pop()?.split('?')[0] || 'media'
                    await onUrlLoad?.(url, name)
                    setShowUrl(false)
                  } catch (e) {
                    toast('error', 'Could not load that link', e instanceof Error ? e.message : undefined)
                  } finally { setBusyUrl(false) }
                }} busy={busyUrl} />
              )}
            </div>
          )}
        </div>
      )}

      {picked && !result && (
        <div className="mt-6 grid lg:grid-cols-[1fr_360px] gap-5 items-start">
          <Card className="p-4">
            <FilePill file={picked.file} onClear={processing ? cancel : reset} />
            <div className="mt-4 rounded-xl overflow-hidden bg-black/60">
              <MediaPreview url={picked.url} file={picked.file} />
            </div>
          </Card>
          <Card className="p-5">
            {processing ? (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Spinner size={18} />
                  <p className="text-sm font-semibold">Processing… <span className="text-faint font-normal tabular-nums">({elapsed()})</span></p>
                </div>
                <ProgressBar value={progress} />
                <p className="text-[12px] text-faint mt-2">{Math.round(progress * 100)}%</p>
                <Button variant="ghost" size="sm" className="mt-4" onClick={cancel}>Cancel</Button>
              </div>
            ) : (
              <>
                <div className="mb-4">{typeof config === 'function' ? config(picked) : config}</div>
                {showFormatSelect && (
                  <div className="mb-4">
                    <label className="text-xs text-muted mb-1.5 block">Export Format</label>
                    <div className="flex gap-2">
                      {(['webm', 'mp4'] as ExportFormat[]).map(fmt => (
                        <button
                          key={fmt}
                          onClick={() => setExportFormat(fmt)}
                          className={cx(
                            'flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border transition-colors',
                            exportFormat === fmt
                              ? 'border-violet-500 bg-violet-500/15 text-violet-300'
                              : 'border-zinc-700 bg-zinc-800 text-zinc-400 hover:border-zinc-500'
                          )}
                        >
                          <FileVideo size={13} />
                          {fmt.toUpperCase()}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <Button className="w-full" size="lg" icon={<Sparkles size={17} />} onClick={run} disabled={!picked}>
                  {processLabel}
                </Button>
              </>
            )}
          </Card>
        </div>
      )}

      {result && resultUrl && (
        <div className="mt-6 anim-float-up">
          <Card className="p-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold flex items-center gap-2"><Download size={16} className="text-green" /> Ready to download</h3>
                <p className="text-[12px] text-muted mt-0.5">{result.meta ?? `${fmtBytes(result.blob.size)} · ${extensionFromType(result.blob.type).toUpperCase()}`}</p>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" icon={<RotateCcw size={14} />} onClick={reset}>New file</Button>
                <Button size="sm" icon={<Download size={14} />} onClick={() => downloadBlob(result.blob, result.filename)}>Download</Button>
              </div>
            </div>
            <div className="rounded-xl overflow-hidden bg-black/60">
              {result.kind === 'video' && <video src={resultUrl} controls className="w-full max-h-[480px]" />}
              {result.kind === 'audio' && (
                <div className="p-8 flex flex-col items-center gap-4">
                  <span className="w-16 h-16 rounded-2xl bg-accent/15 text-accent flex items-center justify-center"><AudioGlyph /></span>
                  <audio src={resultUrl} controls className="w-full max-w-md" />
                </div>
              )}
              {result.kind === 'image' && <img src={resultUrl} alt="result" className="w-full max-h-[480px] object-contain" />}
            </div>
            {result.extra && <div className="mt-4">{result.extra}</div>}
          </Card>
        </div>
      )}
    </div>
  )
}

function AudioGlyph() {
  return <span className="text-2xl">🎧</span>
}

function MediaPreview({ url, file }: { url: string; file: File }) {
  if (file.type.startsWith('video/')) return <video src={url} muted className="w-full max-h-[380px]" />
  if (file.type.startsWith('image/')) return <img src={url} alt="preview" className="w-full max-h-[380px] object-contain" />
  return (
    <div className="p-8">
      <audio src={url} controls className="w-full" />
    </div>
  )
}

function UrlForm({ placeholder, onCancel, onLoad, busy }: { placeholder?: string; onCancel: () => void; onLoad: (url: string) => Promise<void>; busy: boolean }) {
  const [v, setV] = useState('')
  return (
    <div className="flex gap-2 max-w-xl mx-auto">
      <input
        value={v}
        onChange={(e) => setV(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter' && v.trim() && !busy) void onLoad(v.trim()) }}
        placeholder={placeholder ?? 'Paste a link…'}
        className="flex-1 bg-elevated border border-white/10 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-accent/60"
      />
      <Button size="sm" disabled={!v.trim() || busy} loading={busy} onClick={() => void onLoad(v.trim())}>Load</Button>
      <Button variant="ghost" size="sm" onClick={onCancel} className={cx('')}>Cancel</Button>
    </div>
  )
}