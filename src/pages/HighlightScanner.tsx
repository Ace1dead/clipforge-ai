import { useState, useRef, useCallback } from 'react'
import { ToolLayout } from '../components/Layout'
import { Button, Card, Select } from '../components/ui'
import { decodeAudio } from '../lib/audio'
import { analyzeVideoHybrid, type HybridAnalysisResult, type HighlightSegment } from '../lib/audioAnalyzer'
import { rankHighlightsByVirality, getScoreColor, type ViralityScore } from '../lib/viralityScorer'
import { formatTimestamp } from '../lib/editor/transcript'
import { toast } from '../components/ui'

export function HighlightScanner() {
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [videoUrl, setVideoUrl] = useState<string>('')
  const [analyzing, setAnalyzing] = useState(false)
  const [result, setResult] = useState<HybridAnalysisResult | null>(null)
  const [highlights, setHighlights] = useState<HighlightSegment[]>([])
  const [selectedHighlight, setSelectedHighlight] = useState<number>(0)
  const [sensitivity, setSensitivity] = useState(2)
  const [minClipSec, setMinClipSec] = useState(15)
  const [maxClipSec, setMaxClipSec] = useState(60)
  const videoRef = useRef<HTMLVideoElement>(null)

  const handleFileSelect = useCallback((files: File[]) => {
    const file = files[0]
    if (!file) return
    if (!file.type.startsWith('video/')) {
      toast.error('Please select a video file')
      return
    }
    if (file.size > 500 * 1024 * 1024) {
      toast.error('File exceeds 500MB limit')
      return
    }
    if (videoUrl) URL.revokeObjectURL(videoUrl)
    setVideoFile(file)
    const url = URL.createObjectURL(file)
    setVideoUrl(url)
    setResult(null)
    setHighlights([])
  }, [])

  const handleAnalyze = useCallback(async () => {
    if (!videoFile) return
    setAnalyzing(true)
    try {
      const audioBuffer = await decodeAudio(videoFile)
      const sampleRate = audioBuffer.sampleRate
      const channelData = audioBuffer.getChannelData(0)

      const windowSize = Math.floor(sampleRate * 0.5)
      const totalWindows = Math.ceil(channelData.length / windowSize)

      const rmsFrames: number[] = []
      const motionFrames: number[] = []
      const sceneFrames: number[] = []
      const vadFrames: boolean[] = []

      let prevRms = 0
      for (let i = 0; i < totalWindows; i++) {
        const start = i * windowSize
        const end = Math.min(start + windowSize, channelData.length)
        const chunk = channelData.slice(start, end)

        let sum = 0
        for (let j = 0; j < chunk.length; j++) sum += chunk[j] * chunk[j]
        const rms = Math.sqrt(sum / chunk.length)
        rmsFrames.push(rms)

        const motion = Math.abs(rms - prevRms) * 5
        motionFrames.push(Math.min(motion, 1))
        prevRms = rms

        const sceneChange = rms > 0.1 && Math.abs(rms - prevRms) > 0.05 ? 0.8 : 0
        sceneFrames.push(sceneChange)
        vadFrames.push(rms > 0.02)
      }

      const analysisResult = analyzeVideoHybrid(rmsFrames, motionFrames, sceneFrames, vadFrames, 2, {
        sensitivity,
        minClipSec,
        maxClipSec,
      })

      setResult(analysisResult)
      setHighlights(analysisResult.highlights)
      toast.success(`Found ${analysisResult.highlights.length} highlights`)
    } catch (err) {
      toast.error('Analysis failed: ' + (err instanceof Error ? err.message : 'Unknown error'))
    } finally {
      setAnalyzing(false)
    }
  }, [videoFile, sensitivity, minClipSec, maxClipSec])

  const handleSeekHighlight = useCallback((highlight: HighlightSegment) => {
    if (videoRef.current) {
      videoRef.current.currentTime = highlight.start
    }
  }, [])

  const getHighlightVirality = useCallback((highlight: HighlightSegment): ViralityScore => {
    if (!result) return { total: 0, factors: [], tier: 'low', label: 'No data' }
    return rankHighlightsByVirality(result.windows, highlight.start, highlight.end)
  }, [result])

  return (
    <ToolLayout active="highlight-scanner">
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-text">Highlight Scanner</h1>
          <p className="text-text-secondary mt-1">Hybrid audio analysis: RMS energy + motion + scene change detection with virality scoring.</p>
        </div>

        <Card className="p-4">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label className="block text-xs font-medium text-text-secondary mb-1">Video File</label>
              <input
                type="file"
                accept="video/*"
                onChange={(e) => handleFileSelect(Array.from(e.target.files || []))}
                className="w-full text-sm text-text-secondary file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-accent/10 file:text-accent hover:file:bg-accent/20"
              />
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <h3 className="text-sm font-medium text-text mb-3">Analysis Settings</h3>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-text-secondary mb-1">Sensitivity: {sensitivity}</label>
              <input type="range" min="0.5" max="4" step="0.5" value={sensitivity} onChange={(e) => setSensitivity(Number(e.target.value))} className="w-full" />
            </div>
            <div>
              <label className="block text-xs text-text-secondary mb-1">Min Clip: {minClipSec}s</label>
              <input type="range" min="5" max="30" step="5" value={minClipSec} onChange={(e) => setMinClipSec(Number(e.target.value))} className="w-full" />
            </div>
            <div>
              <label className="block text-xs text-text-secondary mb-1">Max Clip: {maxClipSec}s</label>
              <input type="range" min="20" max="120" step="10" value={maxClipSec} onChange={(e) => setMaxClipSec(Number(e.target.value))} className="w-full" />
            </div>
          </div>
          <Button onClick={handleAnalyze} disabled={!videoFile || analyzing} variant="primary" className="mt-4">
            {analyzing ? 'Analyzing...' : 'Analyze Highlights'}
          </Button>
        </Card>

        {videoUrl && (
          <Card className="p-4">
            <video ref={videoRef} src={videoUrl} controls className="w-full max-h-64 rounded-lg" />
          </Card>
        )}

        {highlights.length > 0 && (
          <Card className="p-4">
            <h3 className="text-sm font-medium text-text mb-3">Detected Highlights ({highlights.length})</h3>
            <div className="space-y-2">
              {highlights.map((h, i) => {
                const virality = getHighlightVirality(h)
                return (
                  <div
                    key={i}
                    onClick={() => { setSelectedHighlight(i); handleSeekHighlight(h) }}
                    className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                      selectedHighlight === i ? 'bg-accent/10 border border-accent/30' : 'bg-surface hover:bg-surface-hover'
                    }`}
                  >
                    <div className="w-16 text-center">
                      <div className="text-lg font-bold" style={{ color: getScoreColor(virality.total) }}>
                        {virality.total}
                      </div>
                      <div className="text-[10px] text-text-secondary">score</div>
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-medium text-text">{h.label}</div>
                      <div className="text-xs text-text-secondary">
                        {formatTimestamp(h.start)} → {formatTimestamp(h.end)} ({(h.end - h.start).toFixed(1)}s)
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-medium" style={{ color: getScoreColor(virality.total) }}>
                        {virality.label}
                      </div>
                      <div className="text-[10px] text-text-secondary">
                        Score: {virality.score.toFixed(1)}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>
        )}

        {result && (
          <Card className="p-4">
            <h3 className="text-sm font-medium text-text mb-3">Analysis Summary</h3>
            <div className="grid grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-text">{result.highlights.length}</div>
                <div className="text-xs text-text-secondary">Highlights</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-text">{result.peaks.length}</div>
                <div className="text-xs text-text-secondary">Peak Moments</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-text">{result.windows.length}</div>
                <div className="text-xs text-text-secondary">Analysis Windows</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-text">{result.highlights.reduce((sum, h) => sum + (h.end - h.start), 0).toFixed(0)}s</div>
                <div className="text-xs text-text-secondary">Total Duration</div>
              </div>
            </div>
          </Card>
        )}
      </div>
    </ToolLayout>
  )
}

export default HighlightScanner
