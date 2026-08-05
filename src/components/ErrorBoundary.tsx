import { Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { Button, Card } from './ui'

interface Props { children: ReactNode; fallback?: ReactNode }
interface State { hasError: boolean; error: Error | null }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack)
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback
      return (
        <div className="flex items-center justify-center min-h-[400px] p-8">
          <Card className="max-w-md w-full p-6 text-center">
            <AlertTriangle size={40} className="mx-auto mb-3 text-amber" />
            <h2 className="text-lg font-bold mb-2">Something went wrong</h2>
            <p className="text-[13px] text-muted mb-4">
              {this.state.error?.message || 'An unexpected error occurred'}
            </p>
            <Button
              icon={<RefreshCw size={14} />}
              onClick={() => { this.setState({ hasError: false, error: null }); window.location.reload() }}
            >
              Reload Page
            </Button>
          </Card>
        </div>
      )
    }
    return this.props.children
  }
}
