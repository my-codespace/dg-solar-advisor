// ── Step 3: Analysis Results ──────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-unused-vars
import React, { useState } from 'react';
import {
  Zap, Leaf, TrendingUp, Sun, Battery, DollarSign,
  ChevronDown, ChevronUp, ExternalLink, Info,
} from 'lucide-react';
import {
  MetricCard, SectionHeader, Banner, SensitivitySlider, AssumptionNote,
} from '../components/UI';
import { MonthlyComparisonChart, CashFlowChart, SolarYieldChart, CostComparisonChart } from '../components/Charts';
import { useT, fmtCr, fmt } from '../i18n';
import type { AnalysisResponse, Lang } from '../types';
import { SENSITIVITY_SLIDERS } from '../constants';

interface Props {
  lang: Lang;
  results: AnalysisResponse;
  onSaveReport: () => void;
  onBack: () => void;
  saving: boolean;
  initialParams: Record<string, number>;
  onParamChange: (key: string, val: number) => void;
}

export function AnalysisStep({ lang, results, onSaveReport, onBack, saving, initialParams, onParamChange }: Props) {
  const t = useT(lang);
  const [showAssumptions, setShowAssumptions] = useState(false);
  const [showEmissions, setShowEmissions] = useState(false);

  const { dg, solar, battery, financials, irradiance } = results;

  // Monthly comparison data
  const monthlyData = dg.monthly_breakdown?.map(m => ({
    month: m.month,
    dg_cost: m.cost_rs,
    solar_saving: Math.round(m.kwh * (financials.solar_lcoe_rs_per_kwh || 2.5)),
  })) ?? [];

  return (
    <div className="animate-fade-in space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-white mb-1">{t('step3')}</h2>
        <p className="text-slate-400 text-sm">
          Analysis for <span className="text-solar-300 font-medium">{results.societyName}</span>, {results.city}
        </p>
      </div>

      {/* Irradiance source */}
      {irradiance.is_fallback && (
        <Banner variant="warning">
          Solar data: {irradiance.source} — {irradiance.confidence_note}
        </Banner>
      )}
      {!irradiance.is_fallback && (
        <Banner variant="info">
          Solar irradiance: <strong>{irradiance.annual_kwh_m2} kWh/m²/yr</strong> — {irradiance.confidence_note}
        </Banner>
      )}

      {/* ── DG Cost Section ─────────────────────────────────────────────────── */}
      <section>
        <SectionHeader title="💰 Real DG Cost" subtitle="What your diesel generator actually costs per unit" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricCard
            label={t('dgCostPerKwh')}
            value={`₹${dg.cost_per_kwh_rs}/kWh`}
            sub={`Grid tariff: ₹${financials.grid_cost_per_kwh_rs}/kWh`}
            variant="danger"
            icon={<Zap size={18} />}
          />
          <MetricCard
            label={t('annualDgSpend')}
            value={fmtCr(dg.annual_cost_rs)}
            sub="Including fuel + maintenance"
            variant="danger"
            icon={<DollarSign size={18} />}
          />
          <MetricCard
            label={`Annual Litres`}
            value={`${fmt(dg.annual_litres)} L`}
            sub={`₹${dg.total_fuel_cost_rs > 0 ? (dg.total_fuel_cost_rs / dg.annual_litres).toFixed(0) : '—'}/L est.`}
            icon={<Zap size={18} />}
          />
          <MetricCard
            label="DG kWh Generated"
            value={`${fmt(dg.kwh_generated)} kWh`}
            sub="in the reported period"
            icon={<Zap size={18} />}
          />
        </div>
      </section>

      {/* ── Emissions Section ────────────────────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <SectionHeader title="🌫️ DG Emissions" subtitle="Environmental cost of diesel backup power" />
          <button
            className="btn-ghost text-xs flex items-center gap-1"
            onClick={() => setShowEmissions(!showEmissions)}
          >
            {showEmissions ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            {showEmissions ? 'Hide sources' : 'Show sources'}
          </button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricCard label={t('annualCo2')} value={`${fmt(dg.co2_kg)} kg`} sub="CO₂/year" variant="danger" icon={<Leaf size={18} />} />
          <MetricCard label={t('annualPm25')} value={`${fmt(dg.pm25_kg * 1000, 0)} g`} sub="PM2.5/year" variant="danger" icon={<Leaf size={18} />} assumption />
          <MetricCard label="NOx" value={`${fmt(dg.nox_kg * 1000, 0)} g`} sub="NOx/year" variant="danger" icon={<Leaf size={18} />} assumption />
          <MetricCard label="SO₂" value={`${fmt(dg.so2_kg * 1000, 1)} g`} sub="SO₂/year" icon={<Leaf size={18} />} assumption />
        </div>
        {showEmissions && (
          <div className="mt-4 glass p-4 space-y-2">
            {Object.entries(dg.emission_factor_notes).map(([k, v]) => (
              <AssumptionNote key={k} text={v} />
            ))}
          </div>
        )}
      </section>

      {/* ── Solar Section ─────────────────────────────────────────────────────── */}
      <section>
        <SectionHeader title="☀️ Solar Potential" subtitle={`Based on ${irradiance.annual_kwh_m2} kWh/m²/yr irradiance`} />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <MetricCard label={t('solarCapacity')} value={`${fmt(financials.solar_capacity_kw, 1)} kWp`} sub={`${fmt(solar.usable_area_m2)} m² usable`} variant="solar" icon={<Sun size={18} />} />
          <MetricCard label={t('solarYearOne')} value={`${fmt(solar.year1_kwh)} kWh`} sub="Year 1 generation" variant="solar" icon={<Sun size={18} />} />
          <MetricCard label="25-Year Total" value={`${fmt(solar.lifetime_kwh)} kWh`} sub="After degradation" variant="solar" icon={<Sun size={18} />} />
          <MetricCard
            label="Battery Bank"
            value={`${fmt(battery.required_capacity_kwh, 0)} kWh`}
            sub={`₹${(battery.installed_cost_rs / 100000).toFixed(1)}L installed`}
            variant="solar"
            icon={<Battery size={18} />}
            assumption
          />
        </div>
        <div className="glass p-5">
          <SolarYieldChart kwhByYear={solar.kwh_by_year} />
        </div>
      </section>

      {/* ── Financial Section ─────────────────────────────────────────────────── */}
      <section>
        <SectionHeader title="💹 Financial Analysis" subtitle="After PM Surya Ghar subsidy" />
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
          <MetricCard label={t('grossCost')} value={fmtCr(financials.gross_installation_cost_rs)} icon={<DollarSign size={18} />} />
          <MetricCard label={t('subsidyAmount')} value={`− ${fmtCr(financials.subsidy_amount_rs)}`} variant="success" icon={<DollarSign size={18} />} />
          <MetricCard label={t('netCost')} value={fmtCr(financials.net_installation_cost_rs)} variant="solar" icon={<DollarSign size={18} />} />
          <MetricCard label={t('payback')} value={`${financials.payback_years} yrs`} variant="success" icon={<TrendingUp size={18} />} />
          <MetricCard label={t('npv')} value={fmtCr(financials.npv_rs)} variant="success" icon={<TrendingUp size={18} />} />
          <MetricCard label={t('savings25yr')} value={fmtCr(financials.year25_savings_rs)} variant="success" icon={<TrendingUp size={18} />} />
        </div>

        <div className="glass p-5 mb-4">
          <CashFlowChart data={financials.cumulative_cash_flow} paybackYear={financials.payback_years} />
        </div>

        <div className="glass p-5 mb-4">
          <CostComparisonChart
            dg={financials.dg_cost_per_kwh_rs}
            solar={financials.solar_lcoe_rs_per_kwh}
            grid={financials.grid_cost_per_kwh_rs}
          />
        </div>

        <div className="glass p-4 text-sm">
          <p className="flex items-start gap-2 text-amber-200">
            <Info size={14} className="mt-0.5 shrink-0" />
            {financials.subsidy_note}{' '}
            <a href="https://pmsuryaghar.gov.in" target="_blank" rel="noopener noreferrer" className="underline flex items-center gap-0.5">
              Verify current rates <ExternalLink size={11} />
            </a>
          </p>
        </div>
      </section>

      {/* ── Monthly Comparison Chart ─────────────────────────────────────────── */}
      {monthlyData.length > 0 && (
        <section>
          <SectionHeader title="📅 Monthly Breakdown" />
          <div className="glass p-5">
            <MonthlyComparisonChart data={monthlyData} />
          </div>
        </section>
      )}

      {/* ── CO₂ Impact ───────────────────────────────────────────────────────── */}
      <section>
        <SectionHeader title="🌱 Environmental Impact" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <MetricCard
            label={t('co2Avoided')}
            value={`${fmt(financials.co2_avoided_25yr_tonnes)} tonnes`}
            sub="CO₂ equivalent over 25 years"
            variant="success"
            icon={<Leaf size={18} />}
          />
          <MetricCard
            label="Equivalent trees planted"
            value={fmt(financials.co2_avoided_25yr_tonnes * 45)}
            sub="~22 kg CO₂/tree/yr over 25 yr [ASSUMPTION]"
            variant="success"
            icon={<Leaf size={18} />}
            assumption
          />
        </div>
      </section>

      {/* ── Sensitivity Panel ─────────────────────────────────────────────────── */}
      <section className="glass p-6">
        <SectionHeader
          title={t('sensitivityPanel')}
          subtitle={t('sensitivityHint')}
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
          {SENSITIVITY_SLIDERS.map(s => (
            <SensitivitySlider
              key={s.key}
              label={lang === 'hi' ? s.labelHi : s.label}
              value={initialParams[s.key] ?? s.defaultValue}
              min={s.min}
              max={s.max}
              step={s.step}
              unit={s.unit}
              onChange={v => onParamChange(s.key, v)}
              displayValue={
                s.key === 'tariffGrowthRate' || s.key === 'annualDegradationRate'
                  ? `${((initialParams[s.key] ?? s.defaultValue) * 100).toFixed(1)}%/yr`
                  : s.unit === '₹/L' || s.unit === '₹/kW'
                  ? `₹${fmt(initialParams[s.key] ?? s.defaultValue)}${s.unit.replace('₹', '').replace('/L', '/L').replace('/kW', '/kW')}`
                  : undefined
              }
            />
          ))}
        </div>
        <p className="text-xs text-slate-500 mt-4">
          Note: Sensitivity changes recalculate on the frontend using the same model. Re-run full analysis for updated irradiance data.
        </p>
      </section>

      {/* ── Assumptions ─────────────────────────────────────────────────────── */}
      <section>
        <button
          className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors"
          onClick={() => setShowAssumptions(!showAssumptions)}
        >
          {showAssumptions ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          {showAssumptions ? 'Hide' : 'Show'} all model assumptions
        </button>
        {showAssumptions && (
          <div className="mt-4 glass p-4 space-y-2 animate-fade-in">
            {solar.assumptions.map((a, i) => (
              <AssumptionNote key={i} text={a} />
            ))}
            <AssumptionNote text={battery.cost_note} />
          </div>
        )}
      </section>

      {/* Disclaimer */}
      <Banner variant="warning">{results.disclaimer}</Banner>
      <p className="text-xs text-slate-600">{t('noPrivacy')}</p>

      <div className="flex justify-between items-center">
        <button id="analysis-back-btn" className="btn-secondary" onClick={onBack}>{t('back')}</button>
        <button
          id="save-report-btn"
          className="btn-primary text-base px-8"
          onClick={onSaveReport}
          disabled={saving}
        >
          {saving ? 'Generating report…' : t('saveReport')}
        </button>
      </div>
    </div>
  );
}
