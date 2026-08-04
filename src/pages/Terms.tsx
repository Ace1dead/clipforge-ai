import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Card } from '../components/ui'

export function Terms() {
  return (
    <div className="max-w-3xl mx-auto px-4 md:px-8 py-10">
      <Link to="/" className="inline-flex items-center gap-1.5 text-[13px] text-muted hover:text-fg mb-6"><ArrowLeft size={14} /> Back</Link>
      <h1 className="text-2xl font-extrabold tracking-tight mb-6">Terms of Service</h1>
      <Card className="p-6 space-y-4 text-[13px] text-muted leading-relaxed">
        <p><strong className="text-fg">1. Acceptance of Terms.</strong> By accessing or using ClipForge AI, you agree to be bound by these Terms.</p>
        <p><strong className="text-fg">2. Description of Service.</strong> ClipForge AI is a browser-based video editing toolkit. All processing happens locally in your browser. No media is uploaded to our servers.</p>
        <p><strong className="text-fg">3. User Content.</strong> You retain full ownership of all content you create with ClipForge AI. We claim no rights over your outputs.</p>
        <p><strong className="text-fg">4. Credits &amp; Payments.</strong> Free credits are provided for premium AI features. Purchased credits are non-refundable once used. See our Refund Policy for details.</p>
        <p><strong className="text-fg">5. Acceptable Use.</strong> You may not use ClipForge AI to create content that is illegal, harmful, or violates the terms of service of third-party platforms.</p>
        <p><strong className="text-fg">6. Availability.</strong> ClipForge AI is provided as-is with no guarantee of uptime or availability. We may modify or discontinue features at any time.</p>
        <p><strong className="text-fg">7. Limitation of Liability.</strong> ClipForge AI shall not be liable for any indirect, incidental, or consequential damages arising from your use of the service.</p>
        <p><strong className="text-fg">8. Changes to Terms.</strong> We may update these Terms at any time. Continued use after changes constitutes acceptance of the new Terms.</p>
        <p className="text-faint text-[12px] mt-4">Last updated: August 2026</p>
      </Card>
    </div>
  )
}
