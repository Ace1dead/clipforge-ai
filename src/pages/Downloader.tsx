import { useState } from 'react'
import { Download, Link2, ExternalLink, Check } from 'lucide-react'
import { Button, Card, Field, Badge, CopyButton, toast } from '../components/ui'
import { downloadBlob, downloadUrl, fmtBytes } from '../lib/format'

interface Meta { title?: string; thumbnail_url?: string; author_name?: string; provider_name?: string; type?: string; url?: string }

export function Downloader() {
  const [url, setUrl] = useState('')
  const [meta, setMeta] = useState<Meta | null>(null)
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(false)

  const isDirectMedia = (u: string) => /\.(mp4|webm|mov|mp3|m4a|wav)(\?|#|$)/i.test(u)

  const fetchMeta = async () => {
    if (!url.trim()) return
    setFetching(true)
    setMeta(null)
    try {
      const res = await fetch(`https://noembed.com/embed?url=${encodeURIComponent(url)}`)
      const text = await res.text()
      try { const json = JSON.parse(text) as Meta; setMeta(json) } catch { setMeta({ title: 'Could not fetch metadata', url }) }
    } catch {
      setMeta({ title: 'Could not fetch metadata', url })
    } finally { setFetching(false) }
  }

  const download = async () => {
    if (!url.trim()) return
    setLoading(true)
    try {
      // Use server proxy to avoid CORS issues
      const proxyUrl = `/api/proxy/media?url=${encodeURIComponent(url)}`
      const res = await fetch(proxyUrl)
      if (!res.ok) {
        const text = await res.text()
        let msg = `Server responded ${res.status}`
        try { msg = JSON.parse(text).error || msg } catch { /* use default */ }
        throw new Error(msg)
      }
      const blob = await res.blob()
      const ext = blob.type.includes('mp4') ? 'mp4' : blob.type.includes('webm') ? 'webm' : blob.type.includes('mp3') ? 'mp3' : 'media'
      downloadBlob(blob, `download.${ext}`)
      toast('success', 'Download started', fmtBytes(blob.size))
    } catch (e) {
      toast('error', 'Download failed', e instanceof Error ? e.message : 'This URL may be blocked. Try yt-dlp in the terminal.')
    } finally { setLoading(false) }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 md:px-8 py-8 anim-float-up">
      <div className="flex items-center gap-3 mb-2">
        <span className="w-10 h-10 rounded-xl accent-gradient flex items-center justify-center text-white"><Download size={20} /></span>
        <div>
          <h1 className="text-xl font-bold tracking-tight">Social Downloader</h1>
          <p className="text-[13px] text-muted">Download videos from YouTube, TikTok, Instagram and direct media links.</p>
        </div>
      </div>

      <Card className="p-5 mt-6">
        <Field label="Paste a link">
          <input value={url} onChange={(e) => setUrl(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') void fetchMeta() }} placeholder="https://youtube.com/watch?v=…" className="w-full bg-elevated border border-white/10 rounded-xl px-3.5 py-3 text-sm outline-none focus:border-accent/60" />
        </Field>
        <div className="flex gap-2 mt-3">
          <Button variant="secondary" loading={fetching} onClick={() => void fetchMeta()}>Fetch info</Button>
          <Button loading={loading} icon={<Download size={15} />} onClick={() => void download()}>Download</Button>
        </div>

        {meta && (
          <div className="mt-5 anim-float-up card bg-elevated/60 p-4">
            <div className="flex items-center gap-4">
              {meta.thumbnail_url && <img src={meta.thumbnail_url} alt="thumb" className="w-28 h-16 rounded-lg object-cover" />}
              <div className="min-w-0">
                <p className="text-[14px] font-semibold leading-snug line-clamp-2">{meta.title ?? 'Unknown media'}</p>
                <div className="flex gap-2 mt-2">
                  <Badge>{meta.provider_name ?? 'web'}</Badge>
                  {isDirectMedia(url) && <Badge tone="green">Direct link ✓</Badge>}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="mt-6 pt-4 border-t border-white/8">
          <p className="text-[12px] text-faint mb-2 font-semibold uppercase tracking-wide">Terminal power users — yt-dlp command</p>
          <div className="flex items-center gap-2 bg-black/50 rounded-xl p-3 border border-white/10">
            <code className="text-[12px] text-green flex-1 break-all">yt-dlp -f "bv*+ba/b" -o "%(title)s.%(ext)s" {url || '<url>'}</code>
            <CopyButton text={`yt-dlp -f "bv*+ba/b" -o "%(title)s.%(ext)s" ${url}`} />
          </div>
        </div>
      </Card>
    </div>
  )
}