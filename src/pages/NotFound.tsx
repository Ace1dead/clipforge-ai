import { Link } from 'react-router-dom'
import { Compass } from 'lucide-react'
import { Button, Card } from '../components/ui'

export function NotFound() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <Card className="p-10 text-center max-w-md">
        <span className="w-14 h-14 rounded-2xl accent-gradient text-white flex items-center justify-center mx-auto mb-5"><Compass size={26} /></span>
        <h1 className="text-2xl font-extrabold">Page not found</h1>
        <p className="text-muted text-[13px] mt-2">That page drifted off the grid. Let's get you back on track.</p>
        <Link to="/dashboard"><Button className="mt-6">Back to dashboard</Button></Link>
      </Card>
    </div>
  )
}