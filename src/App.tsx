import { lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'
import { ToolLayout } from './components/Layout'
import { Landing } from './pages/Landing'
import { Login } from './pages/Login'
import { NotFound } from './pages/NotFound'

const Pricing = lazy(() => import('./pages/Pricing').then(m => ({ default: m.Pricing })))
const Dashboard = lazy(() => import('./pages/Dashboard').then(m => ({ default: m.Dashboard })))
const Editor = lazy(() => import('./pages/Editor').then(m => ({ default: m.Editor })))
const AutoClip = lazy(() => import('./pages/AutoClip').then(m => ({ default: m.AutoClip })))
const SplitScreen = lazy(() => import('./pages/SplitScreen').then(m => ({ default: m.SplitScreen })))
const RedditStory = lazy(() => import('./pages/RedditStory').then(m => ({ default: m.RedditStory })))
const FakeText = lazy(() => import('./pages/FakeText').then(m => ({ default: m.FakeText })))
const Voiceover = lazy(() => import('./pages/Voiceover').then(m => ({ default: m.Voiceover })))
const AIImages = lazy(() => import('./pages/AIImages').then(m => ({ default: m.AIImages })))
const VoiceChanger = lazy(() => import('./pages/VoiceChanger').then(m => ({ default: m.VoiceChanger })))
const FaceSwap = lazy(() => import('./pages/FaceSwap').then(m => ({ default: m.FaceSwap })))
const IconGenerator = lazy(() => import('./pages/IconGenerator').then(m => ({ default: m.IconGenerator })))
const SpeechEnhancer = lazy(() => import('./pages/SpeechEnhancer').then(m => ({ default: m.SpeechEnhancer })))
const VideoCutter = lazy(() => import('./pages/VideoCutter').then(m => ({ default: m.VideoCutter })))
const VideoCrop = lazy(() => import('./pages/VideoCrop').then(m => ({ default: m.VideoCrop })))
const SubtitleRemover = lazy(() => import('./pages/SubtitleRemover').then(m => ({ default: m.SubtitleRemover })))
const RemoveBg = lazy(() => import('./pages/RemoveBg').then(m => ({ default: m.RemoveBg })))
const Downloader = lazy(() => import('./pages/Downloader').then(m => ({ default: m.Downloader })))
const AudioBalancer = lazy(() => import('./pages/AudioBalancer').then(m => ({ default: m.AudioBalancer })))
const VideoCompressor = lazy(() => import('./pages/VideoCompressor').then(m => ({ default: m.VideoCompressor })))
const Mp3Converter = lazy(() => import('./pages/Mp3Converter').then(m => ({ default: m.Mp3Converter })))
const Brainstorm = lazy(() => import('./pages/Brainstorm').then(m => ({ default: m.Brainstorm })))
const ViralScanner = lazy(() => import('./pages/ViralScanner').then(m => ({ default: m.ViralScanner })))
const Calculators = lazy(() => import('./pages/Calculators').then(m => ({ default: m.Calculators })))
const AISettings = lazy(() => import('./pages/AISettings').then(m => ({ default: m.AISettings })))
const StockMedia = lazy(() => import('./pages/StockMedia').then(m => ({ default: m.StockMedia })))
const BatchProcessor = lazy(() => import('./pages/BatchProcessor').then(m => ({ default: m.BatchProcessor })))
const Templates = lazy(() => import('./pages/Templates').then(m => ({ default: m.Templates })))
const Terms = lazy(() => import('./pages/Terms').then(m => ({ default: m.Terms })))
const Privacy = lazy(() => import('./pages/Privacy').then(m => ({ default: m.Privacy })))

function Spinner() {
  return (
    <div className="flex items-center justify-center h-[60vh]">
      <div className="w-8 h-8 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
    </div>
  )
}

function App() {
  return (
    <Suspense fallback={<Spinner />}>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/editor" element={<Editor />} />
        <Route path="/editor/:id" element={<Editor />} />
        <Route path="/calculators" element={<ToolLayout active="calculators"><Calculators /></ToolLayout>} />
        <Route path="/ai-settings" element={<ToolLayout active="ai-settings"><AISettings /></ToolLayout>} />
        <Route path="/tools/auto-clip" element={<ToolLayout active="auto-clip"><AutoClip /></ToolLayout>} />
        <Route path="/tools/split-screen" element={<ToolLayout active="split-screen"><SplitScreen /></ToolLayout>} />
        <Route path="/tools/reddit-story" element={<ToolLayout active="reddit-story"><RedditStory /></ToolLayout>} />
        <Route path="/tools/fake-text" element={<ToolLayout active="fake-text"><FakeText /></ToolLayout>} />
        <Route path="/tools/voiceover" element={<ToolLayout active="voiceover"><Voiceover /></ToolLayout>} />
        <Route path="/tools/ai-images" element={<ToolLayout active="ai-images"><AIImages /></ToolLayout>} />
        <Route path="/tools/voice-changer" element={<ToolLayout active="voice-changer"><VoiceChanger /></ToolLayout>} />
        <Route path="/tools/face-swap" element={<ToolLayout active="face-swap"><FaceSwap /></ToolLayout>} />
        <Route path="/tools/icon-generator" element={<ToolLayout active="icon-generator"><IconGenerator /></ToolLayout>} />
        <Route path="/tools/speech-enhancer" element={<ToolLayout active="speech-enhancer"><SpeechEnhancer /></ToolLayout>} />
        <Route path="/tools/video-cutter" element={<ToolLayout active="video-cutter"><VideoCutter /></ToolLayout>} />
        <Route path="/tools/video-crop" element={<ToolLayout active="video-crop"><VideoCrop /></ToolLayout>} />
        <Route path="/tools/subtitle-remover" element={<ToolLayout active="subtitle-remover"><SubtitleRemover /></ToolLayout>} />
        <Route path="/tools/remove-bg" element={<ToolLayout active="remove-bg"><RemoveBg /></ToolLayout>} />
        <Route path="/tools/downloader" element={<ToolLayout active="downloader"><Downloader /></ToolLayout>} />
        <Route path="/tools/audio-balancer" element={<ToolLayout active="audio-balancer"><AudioBalancer /></ToolLayout>} />
        <Route path="/tools/video-compressor" element={<ToolLayout active="video-compressor"><VideoCompressor /></ToolLayout>} />
        <Route path="/tools/mp3-converter" element={<ToolLayout active="mp3-converter"><Mp3Converter /></ToolLayout>} />
        <Route path="/tools/brainstorm" element={<ToolLayout active="brainstorm"><Brainstorm /></ToolLayout>} />
        <Route path="/tools/viral-scanner" element={<ToolLayout active="viral-scanner"><ViralScanner /></ToolLayout>} />
        <Route path="/tools/stock-media" element={<ToolLayout active="stock-media"><StockMedia /></ToolLayout>} />
        <Route path="/tools/batch" element={<ToolLayout active="batch"><BatchProcessor /></ToolLayout>} />
        <Route path="/tools/templates" element={<ToolLayout active="templates"><Templates /></ToolLayout>} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  )
}

export default App