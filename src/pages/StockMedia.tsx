import { useState, useCallback } from 'react'
import { Search, Film, Image, Download, Loader2, ExternalLink, Play, X, Grid, List, Filter } from 'lucide-react'
import { Button, Card, Input, Badge, toast } from '../components/ui'
import { fmtTime } from '../lib/format'

type MediaType = 'videos' | 'photos'
type Orientation = 'portrait' | 'landscape' | 'square'

interface StockVideo {
  id: number
  url: string
  preview: string
  duration: number
  width: number
  height: number
  quality: string
}

interface StockPhoto {
  id: number
  url: string
  preview: string
  width: number
  height: number
  alt: string
}

export function StockMedia() {
  const [query, setQuery] = useState('')
  const [mediaType, setMediaType] = useState<MediaType>('videos')
  const [orientation, setOrientation] = useState<Orientation>('portrait')
  const [results, setResults] = useState<(StockVideo | StockPhoto)[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedItem, setSelectedItem] = useState<(StockVideo | StockPhoto) | null>(null)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [totalResults, setTotalResults] = useState(0)

  const search = useCallback(async () => {
    if (!query.trim()) { toast('error', 'Enter a search term'); return }
    setLoading(true)
    try {
      const endpoint = mediaType === 'videos'
        ? `/api/proxy/pexels/search?query=${encodeURIComponent(query.trim())}&orientation=${orientation}&per_page=24`
        : `/api/proxy/pexels/photos?query=${encodeURIComponent(query.trim())}&orientation=${orientation}&per_page=24`

      const res = await fetch(endpoint)
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || `Search failed (${res.status})`)
      }
      const data = await res.json()

      if (mediaType === 'videos') {
        const videos: StockVideo[] = (data.videos || []).map((v: any) => ({
          id: v.id,
          url: v.url,
          preview: v.video_pictures?.[0]?.picture || '',
          duration: v.duration || 0,
          width: v.width || 0,
          height: v.height || 0,
          quality: v.video_files?.[0]?.quality || 'HD',
        }))
        setResults(videos)
        setTotalResults(data.total_results || videos.length)
      } else {
        const photos: StockPhoto[] = (data.photos || []).map((p: any) => ({
          id: p.id,
          url: p.src?.original || '',
          preview: p.src?.medium || p.src?.large || '',
          width: p.width || 0,
          height: p.height || 0,
          alt: p.alt || '',
        }))
        setResults(photos)
        setTotalResults(data.total_results || photos.length)
      }
    } catch (e) {
      toast('error', 'Search failed', e instanceof Error ? e.message : undefined)
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [query, mediaType, orientation])

  const downloadVideo = async (video: StockVideo) => {
    try {
      toast('info', 'Downloading video...')
      const res = await fetch(`/api/proxy/media?url=${encodeURIComponent(video.url)}`)
      if (!res.ok) throw new Error('Download failed')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `pexels-${video.id}.mp4`
      a.click()
      URL.revokeObjectURL(url)
      toast('success', 'Video downloaded')
    } catch (e) {
      toast('error', 'Download failed', e instanceof Error ? e.message : undefined)
    }
  }

  const downloadPhoto = (photo: StockPhoto) => {
    const a = document.createElement('a')
    a.href = photo.url
    a.download = `pexels-${photo.id}.jpg`
    a.target = '_blank'
    a.click()
    toast('success', 'Photo download started')
  }

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 anim-float-up">
      <div className="flex items-center gap-3 mb-2">
        <span className="w-10 h-10 rounded-xl accent-gradient flex items-center justify-center text-white"><Film size={20} /></span>
        <div>
          <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
            Stock Media Library
            <Badge tone="green">Free</Badge>
          </h1>
          <p className="text-[13px] text-muted">Search millions of free stock videos and photos from Pexels.</p>
        </div>
      </div>

      {/* Search Bar */}
      <Card className="p-4 mt-6">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') search() }}
              placeholder="Search for videos, photos, backgrounds..."
              className="w-full bg-elevated border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none focus:border-accent/60"
            />
          </div>
          <Button icon={<Search size={16} />} onClick={search} loading={loading}>Search</Button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4 mt-3">
          <div className="flex items-center gap-1">
            {(['videos', 'photos'] as MediaType[]).map(t => (
              <button
                key={t}
                onClick={() => setMediaType(t)}
                className={`px-3 py-1.5 rounded-lg text-[12px] font-medium border transition-colors ${
                  mediaType === t
                    ? 'bg-accent/20 border-accent/40 text-accent'
                    : 'bg-elevated border-white/10 text-muted hover:border-white/20'
                }`}
              >
                {t === 'videos' ? <Film size={12} className="inline mr-1" /> : <Image size={12} className="inline mr-1" />}
                {t === 'videos' ? 'Videos' : 'Photos'}
              </button>
            ))}
          </div>

          <select
            value={orientation}
            onChange={(e) => setOrientation(e.target.value as Orientation)}
            className="bg-elevated border border-white/10 rounded-lg px-2 py-1 text-[12px] text-fg outline-none focus:border-accent/40 cursor-pointer"
          >
            <option value="portrait">Portrait (9:16)</option>
            <option value="landscape">Landscape (16:9)</option>
            <option value="square">Square (1:1)</option>
          </select>

          <div className="flex items-center gap-1 ml-auto">
            <button onClick={() => setViewMode('grid')} className={`p-1.5 rounded ${viewMode === 'grid' ? 'bg-accent/20 text-accent' : 'text-faint'}`}>
              <Grid size={14} />
            </button>
            <button onClick={() => setViewMode('list')} className={`p-1.5 rounded ${viewMode === 'list' ? 'bg-accent/20 text-accent' : 'text-faint'}`}>
              <List size={14} />
            </button>
          </div>
        </div>

        {results.length > 0 && (
          <p className="text-[11px] text-faint mt-2">{totalResults.toLocaleString()} results — showing {results.length}</p>
        )}
      </Card>

      {/* Results Grid */}
      {loading ? (
        <div className="mt-8 text-center">
          <Loader2 size={32} className="animate-spin text-accent mx-auto mb-3" />
          <p className="text-[13px] text-muted">Searching...</p>
        </div>
      ) : results.length > 0 ? (
        <div className={viewMode === 'grid'
          ? 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mt-4'
          : 'space-y-2 mt-4'
        }>
          {results.map(item => {
            if (mediaType === 'videos') {
              const video = item as StockVideo
              return viewMode === 'grid' ? (
                <div key={video.id} className="group relative rounded-xl overflow-hidden bg-elevated border border-white/8 hover:border-accent/30 transition-all cursor-pointer" onClick={() => setSelectedItem(video)}>
                  {video.preview ? (
                    <img src={video.preview} alt="" className="w-full aspect-[9/16] object-cover" />
                  ) : (
                    <div className="w-full aspect-[9/16] bg-elevated flex items-center justify-center"><Film size={24} className="text-faint" /></div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="absolute bottom-0 left-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="flex items-center gap-2 text-[11px] text-white/80">
                      <span className="flex items-center gap-1"><Play size={10} /> {fmtTime(video.duration)}</span>
                      <span>{video.width}×{video.height}</span>
                    </div>
                    <div className="flex gap-1 mt-2">
                      <Button size="xs" variant="primary" icon={<Download size={10} />} onClick={(e) => { e.stopPropagation(); downloadVideo(video) }}>Use</Button>
                    </div>
                  </div>
                  <div className="absolute top-2 right-2">
                    <Badge tone="accent">{video.quality}</Badge>
                  </div>
                </div>
              ) : (
                <div key={video.id} className="flex items-center gap-3 p-3 rounded-xl bg-elevated/50 border border-white/8 hover:border-accent/30 transition-all">
                  <img src={video.preview} alt="" className="w-16 h-24 object-cover rounded-lg shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium truncate">Stock Video #{video.id}</p>
                    <p className="text-[11px] text-muted">{video.width}×{video.height} · {fmtTime(video.duration)}</p>
                  </div>
                  <Button size="sm" icon={<Download size={14} />} onClick={() => downloadVideo(video)}>Use</Button>
                </div>
              )
            } else {
              const photo = item as StockPhoto
              return viewMode === 'grid' ? (
                <div key={photo.id} className="group relative rounded-xl overflow-hidden bg-elevated border border-white/8 hover:border-accent/30 transition-all cursor-pointer" onClick={() => setSelectedItem(photo)}>
                  <img src={photo.preview} alt={photo.alt} className="w-full aspect-[9/16] object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="absolute bottom-0 left-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <p className="text-[11px] text-white/80 truncate">{photo.alt || 'Stock Photo'}</p>
                    <div className="flex gap-1 mt-2">
                      <Button size="xs" variant="primary" icon={<Download size={10} />} onClick={(e) => { e.stopPropagation(); downloadPhoto(photo) }}>Use</Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div key={photo.id} className="flex items-center gap-3 p-3 rounded-xl bg-elevated/50 border border-white/8 hover:border-accent/30 transition-all">
                  <img src={photo.preview} alt={photo.alt} className="w-16 h-24 object-cover rounded-lg shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium truncate">{photo.alt || 'Stock Photo'}</p>
                    <p className="text-[11px] text-muted">{photo.width}×{photo.height}</p>
                  </div>
                  <Button size="sm" icon={<Download size={14} />} onClick={() => downloadPhoto(photo)}>Use</Button>
                </div>
              )
            }
          })}
        </div>
      ) : (
        <div className="mt-12 text-center text-muted">
          <Film size={40} className="mx-auto mb-3 text-faint/50" />
          <p className="text-[14px] font-medium">Search for stock media</p>
          <p className="text-[12px] text-faint mt-1">Find videos, backgrounds, and images for your projects</p>
        </div>
      )}

      {/* Preview Modal */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setSelectedItem(null)} />
          <Card className="relative max-w-2xl w-full p-0 overflow-hidden anim-float-up">
            <button onClick={() => setSelectedItem(null)} className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-black/50 flex items-center justify-center text-white hover:bg-black/70">
              <X size={16} />
            </button>
            {'duration' in selectedItem ? (
              <div>
                <video src={(selectedItem as StockVideo).url} controls className="w-full max-h-[60vh] bg-black" />
                <div className="p-4">
                  <h3 className="font-semibold text-[14px]">Stock Video #{selectedItem.id}</h3>
                  <p className="text-[12px] text-muted mt-1">
                    {(selectedItem as StockVideo).width}×{(selectedItem as StockVideo).height} · {fmtTime((selectedItem as StockVideo).duration)}
                  </p>
                  <div className="flex gap-2 mt-3">
                    <Button icon={<Download size={14} />} onClick={() => downloadVideo(selectedItem as StockVideo)}>Download Video</Button>
                    <Button variant="secondary" icon={<ExternalLink size={14} />} onClick={() => window.open((selectedItem as StockVideo).url, '_blank')}>Open Original</Button>
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <img src={(selectedItem as StockPhoto).url} alt={(selectedItem as StockPhoto).alt} className="w-full max-h-[60vh] object-contain bg-black" />
                <div className="p-4">
                  <h3 className="font-semibold text-[14px]">{(selectedItem as StockPhoto).alt || 'Stock Photo'}</h3>
                  <p className="text-[12px] text-muted mt-1">
                    {(selectedItem as StockPhoto).width}×{(selectedItem as StockPhoto).height}
                  </p>
                  <div className="flex gap-2 mt-3">
                    <Button icon={<Download size={14} />} onClick={() => downloadPhoto(selectedItem as StockPhoto)}>Download Photo</Button>
                    <Button variant="secondary" icon={<ExternalLink size={14} />} onClick={() => window.open((selectedItem as StockPhoto).url, '_blank')}>Open Original</Button>
                  </div>
                </div>
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  )
}
