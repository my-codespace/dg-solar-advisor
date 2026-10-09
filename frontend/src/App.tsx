import React, { useState, useCallback } from 'react';
import { Sun, Zap, RefreshCw } from 'lucide-react';
import { ProfileStep } from './pages/ProfileStep';
import { DGUsageStep } from './pages/DGUsageStep';
import { AnalysisStep } from './pages/AnalysisStep';
import { ReportStep } from './pages/ReportStep';
import { Banner } from './components/UI';
import { analyze, saveReport } from './api';
import { useT } from './i18n';
import {
  DEMO_PROFILE, DEMO_DG_USAGE, DEMO_RESULTS,
  DEFAULT_SOLAR_PARAMS, DEFAULT_BATTERY_PARAMS, DEFAULT_FINANCIAL_PARAMS,
} from './constants';
import type {
  Step, Lang, SocietyProfile, DGUsage, AnalysisResponse, AnalysisRequest,
} from './types';

// ── Step Indicator ────────────────────────────────────────────────────────────
function StepIndicator({ current, lang }: { current: Step; lang: Lang }) {
  const t = useT(lang);
  const steps: Step[] = ['profile', 'dg-usage', 'analysis', 'report'];
  const labels = [t('step1'), t('step2'), t('step3'), t('step4')];
  const idx = steps.indexOf(current);
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {steps.map((s, i) => (
        <React.Fragment key={s}>
          <div className="flex items-center gap-2">
            <div className={`step-dot ${i < idx ? 'completed' : i === idx ? 'active' : 'pending'}`}>
              {i < idx ? '✓' : i + 1}
            </div>
            <span className={`text-xs font-medium hidden sm:block ${i === idx ? 'text-solar-300' : i < idx ? 'text-emerald-400' : 'text-slate-600'}`}>
              {labels[i]}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div className={`h-px flex-1 min-w-4 max-w-12 ${i < idx ? 'bg-emerald-500/50' : 'bg-white/10'}`} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────────────────────────
export default function App() {
  const [lang, setLang] = useState<Lang>('en');
  const [step, setStep] = useState<Step>('profile');
  const [profile, setProfile] = useState<Partial<SocietyProfile>>({});
  const [dgUsage, setDgUsage] = useState<Partial<DGUsage>>({});
  const [outageHours, setOutageHours] = useState(DEFAULT_BATTERY_PARAMS.avgOutageHoursPerDay);
  const [criticalLoadKw, setCriticalLoadKw] = useState(DEFAULT_BATTERY_PARAMS.criticalLoadKw);
  const [results, setResults] = useState<AnalysisResponse | null>(null);
  const [reportId, setReportId] = useState<string | null>(null);
  const [summaryEn, setSummaryEn] = useState('');
  const [summaryHi, setSummaryHi] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [apiWarn, setApiWarn] = useState('');

  // Sensitivity overrides (applied on top of results for sliders)
  const [sensitivityParams, setSensitivityParams] = useState<Record<string, number>>({
    dieselPriceRsPerL: 92,
    gridTariffRsPerKwh: 8.5,
    solarCostRsPerKw: 55000,
    tariffGrowthRate: 0.04,
    avgOutageHoursPerDay: 3,
    annualDegradationRate: 0.005,
  });

  const t = useT(lang);

  // ── Load demo ──────────────────────────────────────────────────────────────
  function loadDemo() {
    setProfile(DEMO_PROFILE);
    setDgUsage(DEMO_DG_USAGE);
    setOutageHours(3);
    setCriticalLoadKw(20);
    setResults(DEMO_RESULTS);
    setSummaryEn(DEMO_RESULTS.summaryEn || '');
    setSummaryHi(DEMO_RESULTS.summaryHi || '');
    setStep('analysis');
    setApiWarn('Demo mode: showing pre-computed results for Sunrise Heights Apartments, Ghaziabad.');
  }

  // ── Run analysis ────────────────────────────────────────────────────────────
  async function runAnalysis(dg: DGUsage) {
    setLoading(true);
    setError('');
    setApiWarn('');
    try {
      const req: AnalysisRequest = {
        ...(profile as SocietyProfile),
        ...dg,
        ...DEFAULT_SOLAR_PARAMS,
        ...DEFAULT_FINANCIAL_PARAMS,
        avgOutageHoursPerDay: outageHours,
        criticalLoadKw,
        batteryDod: DEFAULT_BATTERY_PARAMS.batteryDod,
        batteryCostRsPerKwh: DEFAULT_BATTERY_PARAMS.batteryCostRsPerKwh,
        batteryLifeYears: DEFAULT_BATTERY_PARAMS.batteryLifeYears,
        replacementCostFraction: DEFAULT_BATTERY_PARAMS.replacementCostFraction,
      };
      const res = await analyze(req);
      setResults(res);
      setStep('analysis');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      // Fallback to demo if API unreachable
      setApiWarn(t('errorApi'));
      setResults({
        ...DEMO_RESULTS,
        societyName: (profile as SocietyProfile).societyName || DEMO_RESULTS.societyName,
        city: (profile as SocietyProfile).city || DEMO_RESULTS.city,
      });
      setStep('analysis');
    } finally {
      setLoading(false);
    }
  }

  // ── Save report ─────────────────────────────────────────────────────────────
  async function handleSaveReport() {
    if (!results) return;
    setSaving(true);
    try {
      const r = await saveReport(results, lang);
      setReportId(r.id);
      setSummaryEn(r.summaryEn);
      setSummaryHi(r.summaryHi);
    } catch {
      // Still proceed to report page with local summaries
    } finally {
      setSaving(false);
      setStep('report');
    }
  }

  function resetAll() {
    setStep('profile');
    setProfile({});
    setDgUsage({});
    setResults(null);
    setReportId(null);
    setSummaryEn('');
    setSummaryHi('');
    setError('');
    setApiWarn('');
  }

  const handleParamChange = useCallback((key: string, val: number) => {
    setSensitivityParams(p => ({ ...p, [key]: val }));
  }, []);

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Background gradients */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-solar-500/8 rounded-full blur-3xl" />
        <div className="absolute top-1/2 -left-40 w-80 h-80 bg-emerald-500/6 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-1/4 w-64 h-64 bg-solar-400/5 rounded-full blur-3xl" />
      </div>

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <header className="relative z-10 border-b border-white/8 bg-slate-950/80 backdrop-blur-sm sticky top-0">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-solar-400 to-solar-600 flex items-center justify-center shadow-lg shadow-solar-500/30">
              <Sun size={20} className="text-slate-900" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white leading-none">SunSwitch</h1>
              <p className="text-xs text-slate-500 hidden sm:block">{t('appTagline')}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              id="load-demo-btn"
              onClick={loadDemo}
              className="btn-secondary text-sm flex items-center gap-1.5 py-2"
            >
              <Zap size={14} className="text-solar-400" />
              {t('loadDemo')}
            </button>
            <button
              id="lang-toggle-btn"
              onClick={() => setLang(l => l === 'en' ? 'hi' : 'en')}
              className="btn-ghost text-sm px-3 py-2"
            >
              {t('toggleLang')}
            </button>
          </div>
        </div>
      </header>

      {/* ── Main ────────────────────────────────────────────────────────────── */}
      <main className="relative z-10 max-w-5xl mx-auto px-4 py-8">

        {/* Step indicator */}
        {step !== 'report' && (
          <div className="mb-8">
            <StepIndicator current={step} lang={lang} />
          </div>
        )}

        {/* Warnings */}
        {apiWarn && (
          <div className="mb-6">
            <Banner variant="warning">{apiWarn}</Banner>
          </div>
        )}
        {error && (
          <div className="mb-6">
            <Banner variant="error">{error}</Banner>
          </div>
        )}

        {/* Loading overlay */}
        {loading && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm">
            <div className="glass-strong p-10 text-center max-w-xs">
              <RefreshCw size={40} className="text-solar-400 mx-auto mb-4 animate-spin" />
              <p className="text-white font-semibold text-lg">{t('calculating')}</p>
              <p className="text-slate-500 text-sm mt-2">Fetching solar data from NASA POWER API…</p>
            </div>
          </div>
        )}

        {/* Steps */}
        {step === 'profile' && (
          <ProfileStep
            lang={lang}
            initialData={profile}
            onNext={(p) => { setProfile(p); setStep('dg-usage'); }}
          />
        )}

        {step === 'dg-usage' && (
          <DGUsageStep
            lang={lang}
            initialData={dgUsage}
            batteryOutageHours={outageHours}
            criticalLoadKw={criticalLoadKw}
            onBatteryChange={(h, kw) => { setOutageHours(h); setCriticalLoadKw(kw); }}
            onNext={(dg) => { setDgUsage(dg); runAnalysis(dg); }}
            onBack={() => setStep('profile')}
          />
        )}

        {step === 'analysis' && results && (
          <AnalysisStep
            lang={lang}
            results={results}
            onSaveReport={handleSaveReport}
            onBack={() => setStep('dg-usage')}
            saving={saving}
            initialParams={sensitivityParams}
            onParamChange={handleParamChange}
          />
        )}

        {step === 'report' && results && (
          <ReportStep
            lang={lang}
            results={results}
            reportId={reportId}
            summaryEn={summaryEn}
            summaryHi={summaryHi}
            onBack={() => setStep('analysis')}
            onNewAnalysis={resetAll}
          />
        )}
      </main>

      {/* ── Footer ──────────────────────────────────────────────────────────── */}
      <footer className="relative z-10 border-t border-white/8 mt-20 py-6 text-center">
        <p className="text-xs text-slate-600">
          SunSwitch · Environmental Hacks x AWS Hackathon · MIT License ·{' '}
          <a href="https://github.com/my-codespace/dg-solar-advisor" target="_blank" rel="noopener noreferrer" className="hover:text-slate-400 transition-colors underline">GitHub</a>
        </p>
        <p className="text-xs text-slate-700 mt-1">
          Estimates only · Not engineering advice · No PII stored
        </p>
      </footer>
    </div>
  );
}
