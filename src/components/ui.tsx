import { useSyncExternalStore } from 'react'
import type { ReactNode, CSSProperties, ButtonHTMLAttributes, InputHTMLAttributes, TextareaHTMLAttributes, SelectHTMLAttributes } from 'react'
import { X, Check, Copy, Loader2, AlertCircle, Info, CheckCircle2, Zap } from 'lucide-react'

export function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(' ')
}

/* ---------------------------------- Logo ---------------------------------- */
export function Logo({ size = 30 }: { size?: number }) {
  return (
    <span className="inline-flex items-center gap-2 select-none">
      <span className="accent-gradient rounded-[10px] inline-flex items-center justify-center shadow-lg shadow-accent/20" style={{ width: size, height: size }}>
        <Zap size={size * 0.6} className="text-white" strokeWidth={2.5} />
      </span>
      <span className="font-extrabold tracking-tight text-[17px] leading-none">
        ClipForge <span className="text-accent">AI</span>
      </span>
    </span>
  )
}

/* --------------------------------- Button --------------------------------- */
type BtnVariant = 'primary' | 'secondary' | 'ghost' | 'outline' | 'danger' | 'soft'
type BtnSize = 'xs' | 'sm' | 'md' | 'lg'

const BTN_VARIANTS: Record<BtnVariant, string> = {
  primary: 'accent-gradient text-white font-semibold shadow-lg shadow-accent/25 hover:brightness-110',
  secondary: 'bg-elevated text-fg font-semibold hover:bg-raised border border-white/10',
  ghost: 'text-muted hover:text-fg hover:bg-white/5 font-medium',
  outline: 'border border-white/15 text-fg hover:bg-white/5 font-medium',
  danger: 'bg-red/15 text-red border border-red/25 font-semibold hover:bg-red/25',
  soft: 'bg-accent-soft text-accent font-semibold hover:bg-accent/25',
}
const BTN_SIZES: Record<BtnSize, string> = {
  xs: 'text-xs px-2 py-1 rounded-lg gap-1',
  sm: 'text-sm px-3 py-1.5 rounded-lg gap-1.5',
  md: 'text-sm px-4 py-2.5 rounded-xl gap-2',
  lg: 'text-base px-5 py-3 rounded-xl gap-2',
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: BtnVariant
  size?: BtnSize
  loading?: boolean
  icon?: ReactNode
}

export function Button({ variant = 'primary', size = 'md', loading, icon, className, children, disabled, ...rest }: ButtonProps) {
  return (
    <button
      className={cx('inline-flex items-center justify-center transition-all duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none', BTN_VARIANTS[variant], BTN_SIZES[size], className)}
      disabled={disabled || loading}
      {...rest}
    >
      {loading ? <Loader2 size={size === 'sm' ? 14 : 16} className="animate-spin" /> : icon}
      {children}
    </button>
  )
}

/* -------------------------------- Card ------------------------------------ */
export function Card({ className, children, style }: { className?: string; children: ReactNode; style?: CSSProperties }) {
  return <div className={cx('card', className)}>{children}</div>
}

export function CardHeader({ title, subtitle, icon, action }: { title: string; subtitle?: string; icon?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-4">
      <div className="flex items-start gap-3">
        {icon && <span className="mt-0.5 text-accent">{icon}</span>}
        <div>
          <h3 className="font-semibold text-[15px] leading-tight">{title}</h3>
          {subtitle && <p className="text-muted text-[13px] mt-1 max-w-md leading-relaxed">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  )
}

/* --------------------------------- Inputs --------------------------------- */
export function Input({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cx('w-full bg-elevated border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-fg placeholder:text-faint outline-none transition-colors focus:border-accent/60', className)}
      {...rest}
    />
  )
}

export function Textarea({ className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cx('w-full bg-elevated border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-fg placeholder:text-faint outline-none transition-colors focus:border-accent/60 resize-y min-h-[90px]', className)}
      {...rest}
    />
  )
}

export function Select({ className, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cx('w-full bg-elevated border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-fg outline-none transition-colors focus:border-accent/60 appearance-none cursor-pointer', className)}
      {...rest}
    >
      {children}
    </select>
  )
}

export function Slider({ label, value, min, max, step = 1, onChange, unit }: { label: string; value: number; min: number; max: number; step?: number; unit?: string; onChange: (v: number) => void }) {
  const pct = ((value - min) / (max - min)) * 100
  return (
    <label className="block">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[13px] text-muted">{label}</span>
        <span className="text-[13px] font-semibold text-fg tabular-nums">{value}{unit}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full range-accent cursor-pointer"
        style={{ ['--fill' as string]: `${pct}%` }}
      />
    </label>
  )
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)} className="flex items-center gap-2.5 cursor-pointer group">
      <span className={cx('w-10 h-6 rounded-full p-0.5 transition-colors duration-150', checked ? 'accent-gradient' : 'bg-raised border border-white/15')}>
        <span className={cx('block w-5 h-5 rounded-full bg-white shadow transition-transform duration-150', checked ? 'translate-x-4' : 'translate-x-0')} />
      </span>
      {label && <span className="text-sm text-fg">{label}</span>}
    </button>
  )
}

export function Tabs({ tabs, active, onChange }: { tabs: { id: string; label: string; icon?: ReactNode }[]; active: string; onChange: (id: string) => void }) {
  return (
    <div className="flex gap-1 bg-elevated/70 border border-white/10 rounded-xl p-1 overflow-x-auto">
      {tabs.map((t) => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className={cx('flex-1 whitespace-nowrap px-3 py-2 rounded-lg text-[13px] font-medium transition-all cursor-pointer flex items-center justify-center gap-1.5', active === t.id ? 'bg-raised text-fg shadow-sm' : 'text-muted hover:text-fg')}
        >
          {t.icon}
          {t.label}
        </button>
      ))}
    </div>
  )
}

export function SegmentedControl<T extends string>({ options, value, onChange }: { options: { value: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="flex gap-1 bg-elevated/70 border border-white/10 rounded-xl p-1">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={cx('px-3 py-1.5 rounded-lg text-[13px] font-medium transition-all cursor-pointer', value === o.value ? 'bg-raised text-fg shadow-sm' : 'text-muted hover:text-fg')}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

/* --------------------------------- Modal ----------------------------------- */
export function Modal({ open, onClose, title, children, footer, width = 'max-w-lg' }: { open: boolean; onClose: () => void; title: string; children: ReactNode; footer?: ReactNode; width?: string }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className={cx('relative card bg-surface anim-float-up w-full', width)}>
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-white/8">
          <h3 className="font-semibold text-[15px]">{title}</h3>
          <button onClick={onClose} className="text-muted hover:text-fg p-1 rounded-lg cursor-pointer" aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <div className="px-5 py-4 max-h-[70vh] overflow-y-auto">{children}</div>
        {footer && <div className="px-5 py-4 border-t border-white/8 flex justify-end gap-2">{footer}</div>}
      </div>
    </div>
  )
}

/* --------------------------------- Toasts ---------------------------------- */
export type ToastType = 'success' | 'error' | 'info'
export interface ToastItem { id: number; type: ToastType; title: string; message?: string }

let toastSeq = 0
let toastList: ToastItem[] = []
const toastListeners = new Set<() => void>()

function emitToasts() { toastListeners.forEach((l) => l()) }

export function toast(type: ToastType, title: string, message?: string): void {
  const id = ++toastSeq
  toastList = [...toastList, { id, type, title, message }]
  emitToasts()
  setTimeout(() => { toastList = toastList.filter((t) => t.id !== id); emitToasts() }, 4200)
}

function subscribeToasts(cb: () => void): () => void {
  toastListeners.add(cb)
  return () => toastListeners.delete(cb)
}

export function useToasts(): ToastItem[] {
  return useSyncExternalStore(subscribeToasts, () => toastList)
}

const TOAST_ICONS: Record<ToastType, ReactNode> = {
  success: <CheckCircle2 size={18} className="text-green shrink-0" />,
  error: <AlertCircle size={18} className="text-red shrink-0" />,
  info: <Info size={18} className="text-cyan shrink-0" />,
}

export function Toaster() {
  const toasts = useToasts()
  return (
    <div className="fixed bottom-5 right-5 z-[60] flex flex-col gap-2 w-[340px] max-w-[calc(100vw-40px)]">
      {toasts.map((t) => (
        <div key={t.id} className="anim-toast card bg-elevated/95 backdrop-blur-xl px-4 py-3 flex items-start gap-3 border border-white/10 shadow-2xl">
          {TOAST_ICONS[t.type]}
          <div className="min-w-0">
            <p className="text-[13px] font-semibold leading-snug">{t.title}</p>
            {t.message && <p className="text-[12px] text-muted mt-0.5 leading-relaxed">{t.message}</p>}
          </div>
          <button className="ml-auto text-faint hover:text-fg cursor-pointer" onClick={() => { toastList = toastList.filter((x) => x.id !== t.id); emitToasts() }} aria-label="Dismiss">
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  )
}

/* --------------------------------- Misc ------------------------------------ */
export function Badge({ children, tone = 'accent', className }: { children: ReactNode; tone?: 'accent' | 'green' | 'amber' | 'red' | 'neutral'; className?: string }) {
  const tones = {
    accent: 'bg-accent-soft text-accent border-accent/20',
    green: 'bg-green/10 text-green border-green/20',
    amber: 'bg-amber/10 text-amber border-amber/20',
    red: 'bg-red/10 text-red border-red/20',
    neutral: 'bg-white/5 text-muted border-white/10',
  }
  return <span className={cx('inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md border', tones[tone])}>{children}</span>
}

export function Spinner({ size = 20 }: { size?: number }) {
  return <Loader2 size={size} className="animate-spin text-accent" />
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cx('skeleton', className)} />
}

export function EmptyState({ icon, title, subtitle, action }: { icon: ReactNode; title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-12 px-6">
      <div className="w-14 h-14 rounded-2xl bg-elevated border border-white/10 flex items-center justify-center text-muted mb-4">{icon}</div>
      <h3 className="font-semibold text-[15px]">{title}</h3>
      {subtitle && <p className="text-muted text-[13px] mt-1.5 max-w-sm leading-relaxed">{subtitle}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

export function ProgressBar({ value, className }: { value: number; className?: string }) {
  return (
    <div className={cx('w-full h-2 bg-elevated rounded-full overflow-hidden', className)}>
      <div className="h-full accent-gradient rounded-full transition-[width] duration-150" style={{ width: `${Math.max(0, Math.min(100, value * 100))}%` }} />
    </div>
  )
}

export function Chip({ children, onClick, active }: { children: ReactNode; onClick?: () => void; active?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={cx('px-3 py-1.5 rounded-full text-[12px] font-medium border transition-all cursor-pointer', active ? 'bg-accent text-white border-accent' : 'bg-elevated text-muted border-white/10 hover:text-fg hover:border-white/25')}
    >
      {children}
    </button>
  )
}

export function CopyButton({ text, label = 'Copy' }: { text: string; label?: string }) {
  return (
    <Button
      variant="secondary"
      size="sm"
      icon={<Copy size={14} />}
      onClick={async () => {
        try { await navigator.clipboard.writeText(text); toast('success', 'Copied to clipboard') }
        catch { toast('error', 'Could not copy') }
      }}
    >
      {label}
    </Button>
  )
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[13px] font-medium text-fg mb-1.5">{label}</span>
      {children}
      {hint && <span className="block text-[12px] text-faint mt-1">{hint}</span>}
    </label>
  )
}

export function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="card px-4 py-3.5">
      <p className="text-[12px] text-muted mb-1">{label}</p>
      <p className={cx('text-xl font-bold tabular-nums', accent ? 'gradient-text' : '')}>{value}</p>
    </div>
  )
}

export function Divider({ label }: { label?: string }) {
  if (!label) return <div className="h-px bg-white/8 my-4" />
  return (
    <div className="flex items-center gap-3 my-4">
      <div className="h-px bg-white/8 flex-1" />
      <span className="text-[12px] text-faint uppercase tracking-wider">{label}</span>
      <div className="h-px bg-white/8 flex-1" />
    </div>
  )
}

export function Kbd({ children }: { children: ReactNode }) {
  return <kbd className="px-1.5 py-0.5 bg-elevated border border-white/15 rounded-md text-[11px] font-mono text-muted">{children}</kbd>
}

export function SectionHeading({ eyebrow, title, subtitle }: { eyebrow?: string; title: string; subtitle?: string }) {
  return (
    <div className="mb-8">
      {eyebrow && <p className="text-accent text-[13px] font-bold uppercase tracking-widest mb-2">{eyebrow}</p>}
      <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight">{title}</h2>
      {subtitle && <p className="text-muted mt-3 max-w-2xl leading-relaxed">{subtitle}</p>}
    </div>
  )
}

export function CheckItem({ children, size = 14, className }: { children: ReactNode; size?: number; className?: string }) {
  return (
    <li className="flex items-start gap-2.5 text-[14px] text-muted">
      <span className="mt-0.5 w-5 h-5 rounded-full bg-green/15 text-green flex items-center justify-center shrink-0"><Check size={12} strokeWidth={3} /></span>
      {children}
    </li>
  )
}