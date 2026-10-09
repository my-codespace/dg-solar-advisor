// ── Charts for Analysis Results (Recharts) ───────────────────────────────────

import React from 'react';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceLine, Legend, Cell,
} from 'recharts';
import { fmtCr, fmt } from '../i18n';

// ── Monthly DG Spend vs Solar Savings Bar Chart ──────────────────────────────
interface MonthlyData {
  month: string;
  dg_cost: number;
  solar_saving: number;
}

export function MonthlyComparisonChart({ data }: { data: MonthlyData[] }) {
  return (
    <div>
      <p className="text-sm text-slate-400 mb-4">Monthly DG Cost vs Estimated Solar Savings (₹)</p>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis dataKey="month" tick={{ fill: '#94a3b8', fontSize: 11 }} />
          <YAxis tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} tick={{ fill: '#94a3b8', fontSize: 11 }} />
          <Tooltip
            formatter={(v: number) => [`₹${fmt(v)}`, '']}
            contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
            labelStyle={{ color: '#e2e8f0' }}
          />
          <Legend wrapperStyle={{ fontSize: 12, color: '#94a3b8' }} />
          <Bar dataKey="dg_cost" name="DG Cost" fill="#ef4444" fillOpacity={0.8} radius={[4, 4, 0, 0]} />
          <Bar dataKey="solar_saving" name="Solar Saving" fill="#10b981" fillOpacity={0.8} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── Cumulative Cash Flow Chart ────────────────────────────────────────────────
export function CashFlowChart({ data, paybackYear }: { data: number[]; paybackYear: number }) {
  const chartData = data.map((v, i) => ({ year: i, value: v }));

  return (
    <div>
      <p className="text-sm text-slate-400 mb-4">Cumulative Cash Flow (₹) — Payback at year {paybackYear.toFixed(1)}</p>
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
          <defs>
            <linearGradient id="cfGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="cfNegGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis dataKey="year" tick={{ fill: '#94a3b8', fontSize: 11 }} label={{ value: 'Year', position: 'insideBottom', offset: -2, fill: '#64748b', fontSize: 11 }} />
          <YAxis tickFormatter={v => fmtCr(v).replace('₹', '')} tick={{ fill: '#94a3b8', fontSize: 11 }} />
          <Tooltip
            formatter={(v: number) => [fmtCr(v), 'Cash Flow']}
            contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
            labelFormatter={(l) => `Year ${l}`}
          />
          <ReferenceLine y={0} stroke="rgba(255,255,255,0.2)" strokeDasharray="4 4" />
          <ReferenceLine
            x={Math.round(paybackYear)}
            stroke="#fbbf24"
            strokeDasharray="4 4"
            label={{ value: 'Payback', fill: '#fbbf24', fontSize: 11 }}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke="#10b981"
            fill="url(#cfGradient)"
            strokeWidth={2}
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── Solar kWh By Year (degradation visible) ──────────────────────────────────
export function SolarYieldChart({ kwhByYear }: { kwhByYear: number[] }) {
  const data = kwhByYear.map((v, i) => ({ year: i + 1, kwh: v }));

  return (
    <div>
      <p className="text-sm text-slate-400 mb-4">Annual Solar Generation (kWh) — degradation effect</p>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis dataKey="year" tick={{ fill: '#94a3b8', fontSize: 11 }} label={{ value: 'Year', position: 'insideBottom', offset: -2, fill: '#64748b', fontSize: 11 }} />
          <YAxis tickFormatter={v => `${(v / 1000).toFixed(0)}k`} tick={{ fill: '#94a3b8', fontSize: 11 }} />
          <Tooltip
            formatter={(v: number) => [`${fmt(v)} kWh`, 'Solar Generation']}
            contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
            labelFormatter={(l) => `Year ${l}`}
          />
          <Line type="monotone" dataKey="kwh" stroke="#fbbf24" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── Cost per kWh Comparison (DG vs Solar vs Grid) ────────────────────────────
export function CostComparisonChart({ dg, solar, grid }: { dg: number; solar: number; grid: number }) {
  const data = [
    { name: 'Diesel\nGenerator', cost: dg, fill: '#ef4444' },
    { name: 'Grid\nElectricity', cost: grid, fill: '#f97316' },
    { name: 'Rooftop\nSolar (LCOE)', cost: solar, fill: '#10b981' },
  ];

  return (
    <div>
      <p className="text-sm text-slate-400 mb-4">Cost per kWh Comparison (₹)</p>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} layout="vertical" margin={{ top: 5, right: 40, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
          <XAxis type="number" tickFormatter={v => `₹${v}`} tick={{ fill: '#94a3b8', fontSize: 11 }} />
          <YAxis type="category" dataKey="name" tick={{ fill: '#94a3b8', fontSize: 10 }} width={80} />
          <Tooltip
            formatter={(v: number) => [`₹${v.toFixed(2)}/kWh`, 'Cost']}
            contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
          />
          <Bar dataKey="cost" radius={[0, 6, 6, 0]} label={{ position: 'right', formatter: (v: number) => `₹${v.toFixed(2)}`, fill: '#94a3b8', fontSize: 11 }}>
            {data.map((entry, i) => <Cell key={i} fill={entry.fill} fillOpacity={0.85} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
