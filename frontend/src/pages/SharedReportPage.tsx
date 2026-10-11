// ── Shared Report Page — renders a saved report by ID from the URL ────────────
// Route: /report/:id

import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { ReportStep } from './ReportStep';
import { Banner } from '../components/UI';
import { getReport } from '../api';
import type { AnalysisResponse, Lang } from '../types';

export function SharedReportPage({ reportIdOverride }: { reportIdOverride?: string } = {}) {
  const { id: routeId } = useParams<{ id: string }>();
  const id = reportIdOverride || routeId;
  const [lang, setLang] = useState<Lang>('en');
  const [data, setData] = useState<(AnalysisResponse & { summaryEn: string; summaryHi: string }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    getReport(id)
      .then(setData)
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Could not load report.');
      })
      .finally(() => setLoading(false));
  }, [id]);

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Background gradients */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-solar-500/8 rounded-full blur-3xl" />
        <div className="absolute top-1/2 -left-40 w-80 h-80 bg-emerald-500/6 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-white/8 bg-slate-950/80 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/" className="btn-ghost flex items-center gap-2 text-sm">
              <ArrowLeft size={15} /> New Analysis
            </Link>
            <span className="text-slate-600">|</span>
            <span className="text-slate-400 text-sm">Shared Report</span>
          </div>
          <button
            onClick={() => setLang(l => l === 'en' ? 'hi' : 'en')}
            className="btn-ghost text-sm px-3 py-2"
          >
            {lang === 'en' ? 'हिंदी' : 'English'}
          </button>
        </div>
      </header>

      <main className="relative z-10 max-w-5xl mx-auto px-4 py-8">
        {loading && (
          <div className="flex flex-col items-center justify-center py-32 gap-4">
            <Loader2 size={40} className="text-solar-400 animate-spin" />
            <p className="text-slate-400">Loading report…</p>
          </div>
        )}

        {error && (
          <div className="py-16 space-y-4">
            <Banner variant="error">{error}</Banner>
            <p className="text-slate-500 text-sm text-center">
              This report may have expired (reports are kept for 90 days) or the ID is invalid.
            </p>
            <div className="text-center">
              <Link to="/" className="btn-primary inline-block">Start New Analysis</Link>
            </div>
          </div>
        )}

        {data && !loading && (
          <ReportStep
            lang={lang}
            results={((data as any).results ? { ...(data as any).results, summaryEn: data.summaryEn, summaryHi: data.summaryHi } : data) as AnalysisResponse}
            reportId={id ?? null}
            summaryEn={data.summaryEn}
            summaryHi={data.summaryHi}
            onBack={() => window.history.back()}
            onNewAnalysis={() => window.location.href = '/'}
          />
        )}
      </main>
    </div>
  );
}
