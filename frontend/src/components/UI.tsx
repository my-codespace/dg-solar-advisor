// ── Shared UI Components ──────────────────────────────────────────────────────

import React from 'react';
import { AlertTriangle, Info, CheckCircle2, ExternalLink } from 'lucide-react';

// ── Metric Card ──────────────────────────────────────────────────────────────
interface MetricCardProps {
  label: string;
  value: string;
  sub?: string;
  icon?: React.ReactNode;
  variant?: 'default' | 'solar' | 'danger' | 'success';
  assumption?: boolean;
}

export function MetricCard({ label, value, sub, icon, variant = 'default', assumption }: MetricCardProps) {
  const borderColor = {
    default: 'border-white/10',
    solar: 'border-solar-400/30',
    danger: 'border-red-400/30',
    success: 'border-emerald-400/30',
  }[variant];

  const valueColor = {
    default: 'text-white',
    solar: 'text-solar-300',
    danger: 'text-red-300',
    success: 'text-emerald-300',
  }[variant];

  return (
    <div className={`glass p-5 border ${borderColor} hover:border-opacity-60 transition-all duration-200 hover:-translate-y-0.5`}>
      {icon && <div className="mb-3 text-slate-400">{icon}</div>}
      <p className="text-xs text-slate-400 uppercase tracking-wider font-medium mb-1">{label}</p>
      <p className={`text-2xl font-bold ${valueColor}`}>{value}</p>
      {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
      {assumption && (
        <span className="assumption-tag mt-2 inline-flex">
          <AlertTriangle size={10} /> ASSUMPTION
        </span>
      )}
    </div>
  );
}

// ── Section Header ────────────────────────────────────────────────────────────
export function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-6">
      <h2 className="text-xl font-bold text-white">{title}</h2>
      {subtitle && <p className="text-sm text-slate-400 mt-1">{subtitle}</p>}
    </div>
  );
}

// ── Input Field ────────────────────────────────────────────────────────────────
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: string;
  unit?: string;
  assumption?: boolean;
}

export function InputField({ label, error, hint, unit, assumption, className = '', ...props }: InputProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="input-label">
        {label}
        {assumption && <span className="assumption-tag text-xs"><AlertTriangle size={9} /> Est.</span>}
      </label>
      <div className="relative">
        <input
          className={`input-field ${error ? 'border-red-400/60 focus:border-red-400' : ''} ${unit ? 'pr-14' : ''} ${className}`}
          {...props}
        />
        {unit && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500 font-medium pointer-events-none">
            {unit}
          </span>
        )}
      </div>
      {hint && !error && <p className="text-xs text-slate-500">{hint}</p>}
      {error && <p className="text-xs text-red-400 flex items-center gap-1"><AlertTriangle size={10} />{error}</p>}
    </div>
  );
}

// ── Select Field ──────────────────────────────────────────────────────────────
interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  error?: string;
  options: Array<{ value: string; label: string }>;
}

export function SelectField({ label, error, options, className = '', ...props }: SelectProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="input-label">{label}</label>
      <select
        className={`input-field ${error ? 'border-red-400/60' : ''} ${className}`}
        {...props}
      >
        {options.map(o => (
          <option key={o.value} value={o.value} className="bg-slate-800">
            {o.label}
          </option>
        ))}
      </select>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}

// ── Banner / Alert ────────────────────────────────────────────────────────────
type BannerVariant = 'info' | 'warning' | 'success' | 'error';

interface BannerProps {
  variant?: BannerVariant;
  children: React.ReactNode;
}

export function Banner({ variant = 'info', children }: BannerProps) {
  const styles: Record<BannerVariant, string> = {
    info: 'bg-blue-500/10 border-blue-400/30 text-blue-200',
    warning: 'bg-amber-500/10 border-amber-400/30 text-amber-200',
    success: 'bg-emerald-500/10 border-emerald-400/30 text-emerald-200',
    error: 'bg-red-500/10 border-red-400/30 text-red-200',
  };
  const icons: Record<BannerVariant, React.ReactNode> = {
    info: <Info size={16} />,
    warning: <AlertTriangle size={16} />,
    success: <CheckCircle2 size={16} />,
    error: <AlertTriangle size={16} />,
  };
  return (
    <div className={`flex items-start gap-3 p-4 rounded-xl border text-sm ${styles[variant]}`}>
      <span className="mt-0.5 shrink-0">{icons[variant]}</span>
      <span>{children}</span>
    </div>
  );
}

// ── Loading Skeleton ──────────────────────────────────────────────────────────
export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`shimmer rounded-xl ${className}`} />;
}

export function CardSkeleton() {
  return (
    <div className="glass p-5 space-y-3">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="h-8 w-32" />
      <Skeleton className="h-3 w-20" />
    </div>
  );
}

// ── Assumption Source Note ─────────────────────────────────────────────────────
export function AssumptionNote({ text, source, link }: { text: string; source?: string; link?: string }) {
  return (
    <div className="text-xs text-slate-500 flex items-start gap-1.5 mt-1">
      <Info size={11} className="mt-0.5 shrink-0 text-amber-400" />
      <span>
        {text}
        {source && (
          <> — Source: {link ? (
            <a href={link} target="_blank" rel="noopener noreferrer" className="underline text-slate-400 hover:text-white inline-flex items-center gap-0.5">
              {source} <ExternalLink size={10} />
            </a>
          ) : source}</>
        )}
      </span>
    </div>
  );
}

// ── Sensitivity Slider ─────────────────────────────────────────────────────────
interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  onChange: (v: number) => void;
  displayValue?: string;
}

export function SensitivitySlider({ label, value, min, max, step, unit, onChange, displayValue }: SliderProps) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <span className="text-sm text-slate-300">{label}</span>
        <span className="text-sm font-semibold text-solar-300">
          {displayValue ?? `${unit === '%' ? (value * 100).toFixed(1) : value}${unit}`}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        className="w-full"
        style={{
          accentColor: '#fbbf24',
        }}
      />
      <div className="flex justify-between text-xs text-slate-600">
        <span>{min}{unit}</span>
        <span>{max}{unit}</span>
      </div>
    </div>
  );
}

// ── Tooltip ───────────────────────────────────────────────────────────────────
export function Tooltip({ content, children }: { content: string; children: React.ReactNode }) {
  return (
    <span className="group relative inline-flex">
      {children}
      <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 text-xs
                       bg-slate-700 text-white rounded-lg whitespace-nowrap opacity-0
                       group-hover:opacity-100 transition-opacity pointer-events-none z-50">
        {content}
      </span>
    </span>
  );
}
