import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Zap, Shield } from 'lucide-react'
import { Button, Card, Input, Field, Logo, toast } from '../components/ui'
import { apiRegister, apiLogin, apiAdminLogin, getApiUser } from '../lib/api'

export function Login() {
  const [mode, setMode] = useState<'login' | 'signup' | 'admin'>('signup')
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [adminKey, setAdminKey] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const submit = async () => {
    if (!email.includes('@')) { toast('error', 'Enter a valid email'); return }
    if (mode === 'admin') {
      if (!adminKey) { toast('error', 'Enter admin key'); return }
      setLoading(true)
      try {
        await apiAdminLogin(email, adminKey)
        toast('success', 'Admin access granted!', 'Pro plan + unlimited credits')
        navigate('/dashboard')
      } catch (e: any) {
        toast('error', 'Admin login failed', e.message)
      } finally { setLoading(false) }
      return
    }
    if (password.length < 4) { toast('error', 'Password must be 4+ characters'); return }
    setLoading(true)
    try {
      if (mode === 'signup') {
        await apiRegister(email, password, name || undefined)
        toast('success', 'Account created!', '100 free credits added')
      } else {
        await apiLogin(email, password)
        toast('success', 'Welcome back!')
      }
      navigate('/dashboard')
    } catch (e: any) {
      toast('error', mode === 'signup' ? 'Signup failed' : 'Login failed', e.message)
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-8"><Link to="/"><Logo size={38} /></Link></div>
        <Card className="p-7">
          <h1 className="text-xl font-bold text-center mb-1">
            {mode === 'admin' ? 'Admin Access' : mode === 'signup' ? 'Create your account' : 'Welcome back'}
          </h1>
          <p className="text-[13px] text-muted text-center mb-6">
            {mode === 'admin' ? 'Use master key for instant pro access' : mode === 'signup' ? 'Free plan · 100 credits to start' : 'Sign in to continue editing'}
          </p>
          <div className="space-y-4">
            {mode === 'signup' && (
              <Field label="Name">
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
              </Field>
            )}
            <Field label="Email">
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
            </Field>
            {mode === 'admin' ? (
              <Field label="Admin Key">
                <Input type="password" value={adminKey} onChange={(e) => setAdminKey(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') submit() }} placeholder="Paste your admin key" />
              </Field>
            ) : (
              <Field label="Password">
                <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') submit() }} placeholder="••••••••" />
              </Field>
            )}
            <Button className="w-full" size="lg" icon={mode === 'admin' ? <Shield size={16} /> : <Zap size={16} />} onClick={submit} loading={loading}>
              {mode === 'admin' ? 'Unlock Premium' : mode === 'signup' ? 'Create free account' : 'Sign in'}
            </Button>
          </div>
          <div className="flex flex-col gap-2 mt-5">
            {mode !== 'admin' && (
              <p className="text-center text-[13px] text-muted">
                {mode === 'signup' ? 'Already have an account?' : 'New to ClipForge?'}{' '}
                <button className="text-accent font-semibold hover:underline cursor-pointer" onClick={() => setMode(mode === 'signup' ? 'login' : 'signup')}>
                  {mode === 'signup' ? 'Sign in' : 'Create account'}
                </button>
              </p>
            )}
            <button
              className="text-center text-[12px] text-faint hover:text-muted cursor-pointer"
              onClick={() => setMode(mode === 'admin' ? 'signup' : 'admin')}
            >
              {mode === 'admin' ? '← Back to login' : 'Admin? Use master key →'}
            </button>
          </div>
        </Card>
        <p className="text-center text-[11px] text-faint mt-4">Backend auth with JWT · Credits system</p>
      </div>
    </div>
  )
}
