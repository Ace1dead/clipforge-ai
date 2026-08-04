import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Card } from '../components/ui'

export function Privacy() {
  return (
    <div className="max-w-3xl mx-auto px-4 md:px-8 py-10">
      <Link to="/" className="inline-flex items-center gap-1.5 text-[13px] text-muted hover:text-fg mb-6"><ArrowLeft size={14} /> Back</Link>
      <h1 className="text-2xl font-extrabold tracking-tight mb-6">Privacy Policy</h1>
      <Card className="p-6 space-y-4 text-[13px] text-muted leading-relaxed">
        <p><strong className="text-fg">1. Overview.</strong> ClipForge AI is a browser-based application. All media processing occurs locally on your device. We do not upload, store, or transmit your video, audio, or image files to any server.</p>
        <p><strong className="text-fg">2. Local Storage.</strong> Your projects, settings, and preferences are stored in your browser's localStorage. This data never leaves your device unless you explicitly export it.</p>
        <p><strong className="text-fg">3. API Keys.</strong> If you configure third-party API keys (e.g., Pexels, OpenAI), those keys are stored in your browser's localStorage and sent only to the respective third-party services. They are never sent to our servers.</p>
        <p><strong className="text-fg">4. Analytics.</strong> We may collect anonymous usage statistics (page views, feature usage) to improve the application. No personal data or media content is collected.</p>
        <p><strong className="text-fg">5. Authentication.</strong> If you create an account, your email and hashed password are stored on our server. We never see or store your plaintext password.</p>
        <p><strong className="text-fg">6. Third-Party Services.</strong> Voiceover generation uses the StreamElements API. Stock media uses the Pexels API. These services receive only the data necessary to fulfill your request.</p>
        <p><strong className="text-fg">7. Data Retention.</strong> Your local data remains in your browser until you clear it. Server-side account data is retained until you request deletion.</p>
        <p><strong className="text-fg">8. Contact.</strong> For privacy-related inquiries, contact us at support@clipforge.ai.</p>
        <p className="text-faint text-[12px] mt-4">Last updated: August 2026</p>
      </Card>
    </div>
  )
}
