import { Gauge } from 'lucide-react';

interface Props {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
}

const PRESETS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 3, 4];

export function SpeedControl({ value, onChange, min = 0.25, max = 4, step = 0.25 }: Props) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <Gauge className="w-4 h-4 text-zinc-400" />
        <span className="text-sm text-zinc-300">Speed: {value}x</span>
      </div>
      <div className="flex flex-wrap gap-1">
        {PRESETS.filter(p => p >= min && p <= max).map(preset => (
          <button
            key={preset}
            onClick={() => onChange(preset)}
            className={`px-2 py-1 text-xs rounded transition-colors ${
              value === preset
                ? 'bg-violet-600 text-white'
                : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
            }`}
          >
            {preset}x
          </button>
        ))}
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        className="w-full accent-violet-500"
      />
    </div>
  );
}
