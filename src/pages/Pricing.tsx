import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, Zap, Star } from 'lucide-react'
import { Button, Card, Badge, CheckItem } from '../components/ui'

const PLANS = [
  {
    id: 'free', name: 'Free', price: 0, desc: 'Everything you need to start', credits: 3,
    cta: 'Start free', highlight: false,
    features: [
      'Access to the editor',
      'All 18+ caption styles',
      '3 free AI credits',
      'Split screen layouts',
      'Auto clip highlights',
      'All free editing tools',
      'Unlimited downloads',
    ],
  },
  {
    id: 'pro', name: 'Pro', price: 9.99, desc: 'For growing channels', credits: 75,
    cta: 'Upgrade to Pro', highlight: true,
    features: [
      'Everything in Free',
      '75 AI credits per month',
      'AI voiceovers (27 voices)',
      'AI image generator',
      'Background remover',
      'Face swap',
      'Faster processing',
      'Priority support',
    ],
  },
  {
    id: 'max', name: 'Max', price: 19.99, desc: 'For serious creators', credits: 250,
    cta: 'Go Max', highlight: false,
    features: [
      'Everything in Pro',
      '250 AI credits per month',
      'Unlimited video length',
      'Commercial license',
      'Batch processing',
      'Early access features',
      'Dedicated support',
    ],
  },
]

export function Pricing() {
  const [yearly, setYearly] = useState(true)

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-8 py-14 anim-float-up">
      <div className="text-center mb-10">
        <Badge tone="accent" className="mb-4"><Star size={11} /> Simple, transparent pricing</Badge>
        <h1 className="text-4xl font-black tracking-tight">Choose your plan</h1>
        <p className="text-muted mt-3">Free forever plan · Cancel anytime</p>
        <div className="inline-flex items-center gap-2 mt-6 bg-elevated rounded-full p-1 border border-white/10">
          <button className={`px-4 py-1.5 rounded-full text-[13px] font-semibold transition-colors cursor-pointer ${!yearly ? 'accent-gradient text-white' : 'text-muted hover:text-fg'}`} onClick={() => setYearly(false)}>Monthly</button>
          <button className={`px-4 py-1.5 rounded-full text-[13px] font-semibold transition-colors cursor-pointer ${yearly ? 'accent-gradient text-white' : 'text-muted hover:text-fg'}`} onClick={() => setYearly(true)}>Yearly <span className="text-[10px] opacity-80">−20%</span></button>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-5 items-stretch">
        {PLANS.map((p) => {
          const price = yearly ? Math.round(p.price * 0.8 * 100) / 100 : p.price
          return (
            <Card key={p.id} className={`p-7 flex flex-col ${p.highlight ? 'border-accent/50 bg-accent-soft/20 relative' : ''} ${p.highlight ? '' : 'card-hover'}`}>
              {p.highlight && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 accent-gradient text-white text-[11px] font-bold px-3 py-1 rounded-full">MOST POPULAR</span>
              )}
              <p className="font-bold text-[15px]">{p.name}</p>
              <p className="text-[12px] text-muted mt-1">{p.desc}</p>
              <div className="flex items-baseline gap-1.5 mt-5">
                <span className="text-4xl font-black">${price.toFixed(2)}</span>
                <span className="text-faint text-[13px]">/ mo</span>
              </div>
              <p className="text-[12px] text-faint mt-1">{p.credits} AI credits per {yearly ? 'month (billed yearly)' : 'month'}</p>
              <div className="flex-1 mt-6 space-y-2.5 mb-7">
                {p.features.map((f) => (
                  <CheckItem key={f} size={15} className="text-[13px]">{f}</CheckItem>
                ))}
              </div>
              <Link to="/login"><Button variant={p.highlight ? 'primary' : 'secondary'} className="w-full" icon={p.highlight ? <Zap size={15} /> : undefined}>{p.cta}</Button></Link>
            </Card>
          )
        })}
      </div>

      <div className="grid sm:grid-cols-3 gap-4 mt-10">
        {[
          ['Cancel anytime', 'No contracts or hidden fees.'],
          ['Credits never expire', 'They roll over to the next month.'],
          ['Secure payments', 'Industry-standard encrypted checkout.'],
        ].map(([t, d]) => (
          <Card key={t} className="p-4 flex items-start gap-3">
            <Check size={16} className="text-accent mt-0.5 shrink-0" />
            <div>
              <p className="text-[13px] font-semibold">{t}</p>
              <p className="text-[12px] text-muted mt-0.5">{d}</p>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}