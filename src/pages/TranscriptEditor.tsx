import { useState, useRef, useCallback } from 'react'
import { ToolLayout } from '../components/Layout'
import { Button, Card, Input, Select } from '../components/ui'
import { transcribeAudio, type TranscriptResult } from '../lib/stt'
import { matchTextToTimestamps, selectTranscriptRange, buildTranscriptFromWords, highlightWordsInTranscript, formatTimestamp, type WordTimestamp, type ClipRange } from '../lib/editor/transcript'
import { applyTextEdit, findWordBySearch, type TextEditCommand } from '../lib/editor/textEditor'
import { toast } from '../components/ui'

export function TranscriptEditor() {
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [videoUrl, setVideoUrl] = useState<string>('')
  const [transcript, setTranscript] = useState<TranscriptResult | null>(null)
  const [words, setWords] = useState<WordTimestamp[]>([])
  const [searchText, setSearchText] = useState('')
  const [searchResults, setSearchResults] = useState<ClipRange[]>([])
  const [selectedRange, setSelectedRange] = useState<ClipRange | null>(null)
  const [selectedWordIndices, setSelectedWordIndices] = useState<number[]>([])
  const [editCommands, setEditCommands] = useState<TextEditCommand[]>([])
  const [transcribing, setTranscribing] = useState(false)
  const [language, setLanguage] = useState('en')
  const [currentTime, setCurrentTime] = useState(0)
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
    setTranscript(null)
    setWords([])
    setSelectedRange(null)
    setSelectedWordIndices([])
    setEditCommands([])
    setSearchResults([])
  }, [])

  const handleTranscribe = useCallback(async () => {
    if (!videoFile) return
    setTranscribing(true)
    try {
      const result = await transcribeAudio(videoFile, language)
      setTranscript(result)
      setWords(result.words)
      toast.success(`Transcribed ${result.words.length} words`)
    } catch (err) {
      toast.error('Transcription failed: ' + (err instanceof Error ? err.message : 'Unknown error'))
    } finally {
      setTranscribing(false)
    }
  }, [videoFile, language])

  const handleSearch = useCallback(() => {
    if (!searchText || words.length === 0) {
      setSearchResults([])
      return
    }
    const results = matchTextToTimestamps({ fullText: words.map(w => w.word).join(' '), segments: [], words, language, duration: 0 }, searchText)
    setSearchResults(results)
    if (results.length > 0) {
      setSelectedRange(results[0])
      const indices = highlightWordsInTranscript(words, results[0])
      setSelectedWordIndices(indices)
    }
  }, [searchText, words, language])

  const handleWordClick = useCallback((index: number, shiftKey: boolean) => {
    if (shiftKey && selectedWordIndices.length > 0) {
      const lastIdx = selectedWordIndices[selectedWordIndices.length - 1]
      const start = Math.min(lastIdx, index)
      const end = Math.max(lastIdx, index)
      const indices = Array.from({ length: end - start + 1 }, (_, i) => start + i)
      setSelectedWordIndices(indices)
      const range = selectTranscriptRange(words, start, end)
      setSelectedRange(range)
    } else {
      setSelectedWordIndices([index])
      const range = selectTranscriptRange(words, index, index)
      setSelectedRange(range)
    }
  }, [selectedWordIndices, words])

  const handleDeleteSelected = useCallback(() => {
    if (selectedWordIndices.length === 0) return
    const start = Math.min(...selectedWordIndices)
    const end = Math.max(...selectedWordIndices)
    const cmd: TextEditCommand = { type: 'delete', wordRange: [start, end] }
    setEditCommands(prev => [...prev, cmd])
    const newWords = applyTextEdit(words, [cmd])
    setWords(newWords)
    setSelectedWordIndices([])
    setSelectedRange(null)
    toast.info(`Deleted ${end - start + 1} words`)
  }, [selectedWordIndices, words])

  const handleDuplicateSelected = useCallback(() => {
    if (selectedWordIndices.length === 0) return
    const start = Math.min(...selectedWordIndices)
    const end = Math.max(...selectedWordIndices)
    const cmd: TextEditCommand = { type: 'duplicate', wordRange: [start, end] }
    setEditCommands(prev => [...prev, cmd])
    const newWords = applyTextEdit(words, [cmd])
    setWords(newWords)
    toast.info('Duplicated selected words')
  }, [selectedWordIndices, words])

  const handleSeek = useCallback((time: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = time
      setCurrentTime(time)
    }
  }, [])

  const handleVideoTimeUpdate = useCallback(() => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime)
    }
  }, [])

  const editedWords = words
  const wordCount = editedWords.length

  return (
    <ToolLayout active="transcript-editor">
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-text">Transcript Editor</h1>
          <p className="text-text-secondary mt-1">Edit video by editing text. Click words to select, search to find, delete to cut.</p>
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
            <div className="w-40">
              <label className="block text-xs font-medium text-text-secondary mb-1">Language</label>
              <Select value={language} onChange={(e) => setLanguage(e.target.value)}>
                <option value="en">English</option>
                <option value="es">Spanish</option>
                <option value="fr">French</option>
                <option value="de">German</option>
                <option value="ja">Japanese</option>
                <option value="zh">Chinese</option>
              </Select>
            </div>
            <Button
              onClick={handleTranscribe}
              disabled={!videoFile || transcribing}
              variant="primary"
              className="mt-5"
            >
              {transcribing ? 'Transcribing...' : 'Transcribe'}
            </Button>
          </div>
        </Card>

        {videoUrl && (
          <Card className="p-4">
            <video
              ref={videoRef}
              src={videoUrl}
              controls
              className="w-full max-h-64 rounded-lg"
              onTimeUpdate={handleVideoTimeUpdate}
            />
          </Card>
        )}

        {words.length > 0 && (
          <>
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <Input
                    placeholder="Search transcript text..."
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  />
                </div>
                <Button onClick={handleSearch} variant="secondary">Search</Button>
                <Button onClick={handleDeleteSelected} variant="danger" disabled={selectedWordIndices.length === 0}>
                  Delete ({selectedWordIndices.length})
                </Button>
                <Button onClick={handleDuplicateSelected} variant="secondary" disabled={selectedWordIndices.length === 0}>
                  Duplicate
                </Button>
              </div>
              {searchResults.length > 0 && (
                <div className="mt-2 text-xs text-text-secondary">
                  Found {searchResults.length} match{searchResults.length !== 1 ? 'es' : ''}
                  {searchResults.map((r, i) => (
                    <button key={i} onClick={() => { setSelectedRange(r); setSelectedWordIndices(highlightWordsInTranscript(words, r)) }} className="ml-2 text-accent hover:underline">
                      [{formatTimestamp(r.start)}-{formatTimestamp(r.end)}]
                    </button>
                  ))}
                </div>
              )}
            </Card>

            <Card className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-text">Transcript ({wordCount} words)</h3>
                {selectedRange && (
                  <span className="text-xs text-accent">
                    Selected: {formatTimestamp(selectedRange.start)} → {formatTimestamp(selectedRange.end)}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-1 leading-relaxed">
                {editedWords.map((w, i) => {
                  const isSelected = selectedWordIndices.includes(i)
                  const isPlaying = currentTime >= w.start && currentTime <= w.end
                  return (
                    <button
                      key={`${i}-${w.word}`}
                      onClick={(e) => handleWordClick(i, e.shiftKey)}
                      className={`px-1.5 py-0.5 rounded text-sm transition-colors ${
                        isSelected
                          ? 'bg-accent text-white'
                          : isPlaying
                            ? 'bg-accent/20 text-accent'
                            : 'text-text hover:bg-surface-hover'
                      }`}
                    >
                      {w.word}
                    </button>
                  )
                })}
              </div>
            </Card>

            {selectedRange && (
              <Card className="p-4">
                <h3 className="text-sm font-medium text-text mb-2">Selected Range Preview</h3>
                <div className="flex items-center gap-4">
                  <span className="text-xs text-text-secondary">
                    {formatTimestamp(selectedRange.start)} → {formatTimestamp(selectedRange.end)} ({(selectedRange.end - selectedRange.start).toFixed(1)}s)
                  </span>
                  <Button size="sm" variant="ghost" onClick={() => handleSeek(selectedRange.start)}>
                    Jump to Start
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => handleSeek(selectedRange.end)}>
                    Jump to End
                  </Button>
                </div>
              </Card>
            )}

            {editCommands.length > 0 && (
              <Card className="p-4">
                <h3 className="text-sm font-medium text-text mb-2">Edit History ({editCommands.length} edits)</h3>
                <div className="space-y-1">
                  {editCommands.map((cmd, i) => (
                    <div key={i} className="text-xs text-text-secondary">
                      {cmd.type.toUpperCase()} words [{cmd.wordRange[0]}..{cmd.wordRange[1]}]
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </>
        )}
      </div>
    </ToolLayout>
  )
}

export default TranscriptEditor
