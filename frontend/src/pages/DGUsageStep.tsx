// ── Step 2: DG Usage (Manual + Textract Upload) ──────────────────────────────

import React, { useState, useRef } from 'react';
import { Upload, FileText, AlertTriangle, CheckCircle2, RefreshCw } from 'lucide-react';
import { InputField, Banner } from '../components/UI';
import { useT } from '../i18n';
import type { DGUsage, ExtractResponse, Lang } from '../types';
import { DEFAULT_BATTERY_PARAMS } from '../constants';
import { getPresignedUrl, uploadToS3, extractLogbook } from '../api';

interface Props {
  lang: Lang;
  initialData: Partial<DGUsage>;
  batteryOutageHours: number;
  criticalLoadKw: number;
  onBatteryChange: (hours: number, kw: number) => void;
  onNext: (data: DGUsage) => void;
  onBack: () => void;
}

type EntryMode = 'choose' | 'upload' | 'manual';
type UploadState = 'idle' | 'uploading' | 'extracting' | 'review' | 'error';

export function DGUsageStep({ lang, initialData, batteryOutageHours, criticalLoadKw, onBatteryChange, onNext, onBack }: Props) {
  const t = useT(lang);
  const fileRef = useRef<HTMLInputElement>(null);

  const [mode, setMode] = useState<EntryMode>('choose');
  const [form, setForm] = useState<Partial<DGUsage>>(initialData);
  const [errors, setErrors] = useState<Partial<Record<keyof DGUsage, string>>>({});
  const [uploadState, setUploadState] = useState<UploadState>('idle');
  const [uploadError, setUploadError] = useState('');
  const [extractResult, setExtractResult] = useState<ExtractResponse | null>(null);
  const [editedTable, setEditedTable] = useState<Array<Array<string>>>([]);
  const [apiUnavailable, setApiUnavailable] = useState(false);

  function update(field: keyof DGUsage, value: number) {
    setForm(f => ({ ...f, [field]: value }));
    setErrors(e => ({ ...e, [field]: undefined }));
  }

  function validate(): boolean {
    const errs: typeof errors = {};
    if (!form.litresConsumed || form.litresConsumed <= 0) errs.litresConsumed = 'Required, must be > 0';
    if (!form.runningHours || form.runningHours <= 0) errs.runningHours = 'Required, must be > 0';
    if (!form.periodMonths || form.periodMonths <= 0) errs.periodMonths = 'Required, must be > 0';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  // ── Upload & Textract flow ─────────────────────────────────────────────────
  async function handleFileUpload(file: File) {
    setUploadError('');
    setUploadState('uploading');
    try {
      const { presignedPost, s3Key } = await getPresignedUrl(file.name, file.type);
      await uploadToS3(presignedPost, file);
      setUploadState('extracting');
      const result = await extractLogbook(s3Key);
      setExtractResult(result);
      // Populate editable table from first table
      if (result.tables.length > 0) {
        setEditedTable(result.tables[0].rows.map(row => row.map(cell => cell.text)));
      }
      setUploadState('review');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('fetch') || msg.includes('network') || msg.includes('500')) {
        setApiUnavailable(true);
        setUploadError(t('errorExtract'));
        setMode('manual');
      } else {
        setUploadError(msg || t('errorExtract'));
      }
      setUploadState('error');
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
  }

  function cellClass(lowConf: boolean) {
    return lowConf
      ? 'cell-low-confidence px-2 py-1 text-xs border border-red-500/40 rounded'
      : 'px-2 py-1 text-xs border border-white/10 rounded text-slate-200';
  }

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white mb-1">{t('step2')}</h2>
        <p className="text-slate-400 text-sm">Enter DG diesel consumption and running hours.</p>
      </div>

      {apiUnavailable && (
        <Banner variant="warning">
          {t('errorApi')} Switched to manual entry mode.
        </Banner>
      )}

      {/* Mode selector */}
      {mode === 'choose' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            id="upload-logbook-btn"
            onClick={() => setMode('upload')}
            className="glass p-6 text-left hover:border-solar-400/40 hover:bg-white/8 transition-all duration-200 group"
          >
            <Upload size={32} className="text-solar-400 mb-4 group-hover:scale-110 transition-transform" />
            <h3 className="text-base font-semibold text-white mb-2">{t('uploadPhoto')}</h3>
            <p className="text-xs text-slate-500">Upload a photo or PDF of your DG logbook or diesel bill. We use Amazon Textract to extract the data automatically.</p>
          </button>
          <button
            id="manual-entry-btn"
            onClick={() => setMode('manual')}
            className="glass p-6 text-left hover:border-solar-400/40 hover:bg-white/8 transition-all duration-200 group"
          >
            <FileText size={32} className="text-emerald-400 mb-4 group-hover:scale-110 transition-transform" />
            <h3 className="text-base font-semibold text-white mb-2">{t('manualEntry')}</h3>
            <p className="text-xs text-slate-500">Enter total litres consumed and running hours manually. Works without any cloud access.</p>
          </button>
        </div>
      )}

      {/* Upload mode */}
      {mode === 'upload' && uploadState === 'idle' && (
        <div className="space-y-4">
          <Banner variant="info">{t('uploadInstruction')}</Banner>
          <div
            className="border-2 border-dashed border-white/15 rounded-2xl p-12 text-center hover:border-solar-400/40 transition-colors cursor-pointer"
            onDrop={handleDrop}
            onDragOver={e => e.preventDefault()}
            onClick={() => fileRef.current?.click()}
          >
            <Upload size={40} className="text-slate-500 mx-auto mb-4" />
            <p className="text-slate-300 font-medium">Drop your logbook photo here</p>
            <p className="text-slate-500 text-sm mt-1">or click to browse · JPG, PNG, PDF up to 20MB</p>
            <input
              ref={fileRef}
              type="file"
              accept="image/*,.pdf"
              className="hidden"
              onChange={e => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
            />
          </div>
          <button onClick={() => setMode('manual')} className="btn-ghost text-sm">
            ← Use manual entry instead
          </button>
        </div>
      )}

      {/* Uploading / extracting */}
      {(uploadState === 'uploading' || uploadState === 'extracting') && (
        <div className="glass p-10 text-center">
          <RefreshCw size={36} className="text-solar-400 mx-auto mb-4 animate-spin" />
          <p className="text-white font-medium">
            {uploadState === 'uploading' ? 'Uploading to secure storage…' : t('extracting')}
          </p>
          <p className="text-slate-500 text-sm mt-1">Using Amazon Textract to read your document</p>
        </div>
      )}

      {/* Textract review */}
      {uploadState === 'review' && extractResult && (
        <div className="space-y-4 animate-fade-in">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">{t('reviewData')}</h3>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-slate-400">Total cells: {extractResult.totalCells}</span>
              {extractResult.lowConfidenceCells > 0 && (
                <span className="flex items-center gap-1 text-red-300">
                  <AlertTriangle size={13} /> {extractResult.lowConfidenceCells} low-confidence
                </span>
              )}
            </div>
          </div>

          {extractResult.lowConfidenceCells > 0 && (
            <Banner variant="warning">{t('lowConfNote')}</Banner>
          )}

          {extractResult.tables.map((table, ti) => (
            <div key={ti} className="glass p-4 overflow-x-auto">
              <p className="text-xs text-slate-500 mb-3">Table {ti + 1} — edit any cell before continuing</p>
              <table className="w-full border-collapse">
                <tbody>
                  {table.rows.map((row, ri) => (
                    <tr key={ri}>
                      {row.map((cell, ci) => (
                        <td key={ci} className="p-1">
                          <input
                            className={`w-full min-w-20 ${cellClass(cell.low_confidence)}`}
                            value={editedTable[ri]?.[ci] ?? cell.text}
                            onChange={e => {
                              const updated = editedTable.map(r => [...r]);
                              if (updated[ri]) updated[ri][ci] = e.target.value;
                              setEditedTable(updated);
                            }}
                            title={`Confidence: ${cell.confidence}%`}
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}

          <Banner variant="info">
            After reviewing, fill in the totals below before continuing.
          </Banner>
          <button
            onClick={() => setUploadState('idle')}
            className="btn-ghost text-sm flex items-center gap-1"
          >
            <RefreshCw size={13} /> Re-upload
          </button>
        </div>
      )}

      {/* Upload error */}
      {uploadState === 'error' && (
        <Banner variant="error">
          {uploadError} <button onClick={() => { setUploadState('idle'); setMode('manual'); }} className="underline ml-1">Enter manually →</button>
        </Banner>
      )}

      {/* Manual / confirmation form (always shown after upload review) */}
      {(mode === 'manual' || uploadState === 'review') && (
        <div className="glass p-6 space-y-5">
          <p className="text-sm text-slate-400">
            {mode === 'manual' ? 'Enter the totals from your DG records:' : 'Confirm or correct the totals extracted:'}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <InputField
              id="litres-consumed"
              label={t('litresConsumed')}
              type="number" min={1}
              value={form.litresConsumed || ''}
              onChange={e => update('litresConsumed', parseFloat(e.target.value))}
              placeholder="18000" unit="L"
              error={errors.litresConsumed}
            />
            <InputField
              id="running-hours"
              label={t('runningHours')}
              type="number" min={1}
              value={form.runningHours || ''}
              onChange={e => update('runningHours', parseFloat(e.target.value))}
              placeholder="1800" unit="hr"
              error={errors.runningHours}
            />
            <InputField
              id="period-months"
              label={t('periodMonths')}
              type="number" min={1} max={12}
              value={form.periodMonths || ''}
              onChange={e => update('periodMonths', parseFloat(e.target.value))}
              placeholder="12" unit="months"
              error={errors.periodMonths}
            />
          </div>

          <details className="group">
            <summary className="text-xs text-slate-500 cursor-pointer hover:text-slate-300 transition-colors list-none flex items-center gap-1">
              <span className="group-open:rotate-90 transition-transform inline-block">▶</span>
              Advanced DG parameters (load factor, power factor, maintenance)
            </summary>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <InputField
                id="load-factor"
                label={t('loadFactor')}
                type="number" min={0.1} max={1} step={0.05}
                value={form.loadFactor ?? 0.7}
                onChange={e => update('loadFactor', parseFloat(e.target.value))}
                hint="Typical 0.6–0.75 [ASSUMPTION]" assumption
              />
              <InputField
                id="power-factor"
                label={t('powerFactor')}
                type="number" min={0.5} max={1} step={0.05}
                value={form.powerFactor ?? 0.8}
                onChange={e => update('powerFactor', parseFloat(e.target.value))}
                hint="Typical 0.8 [ASSUMPTION]" assumption
              />
              <InputField
                id="maintenance-cost"
                label={t('maintenanceCost')}
                type="number" min={0}
                value={form.maintenanceRsPerHour ?? 15}
                onChange={e => update('maintenanceRsPerHour', parseFloat(e.target.value))}
                unit="₹/hr" hint="₹10–20/hr typical [ASSUMPTION]" assumption
              />
            </div>
          </details>
        </div>
      )}

      {/* Battery params */}
      {(mode === 'manual' || uploadState === 'review') && (
        <div className="glass p-6 space-y-5">
          <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Battery Backup Sizing</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <InputField
              id="outage-hours"
              label="Avg. outage hours/day"
              type="number" min={0.5} max={12} step={0.5}
              value={batteryOutageHours}
              onChange={e => onBatteryChange(parseFloat(e.target.value), criticalLoadKw)}
              unit="hr" hint="How many hours of power cut per day on average"
            />
            <InputField
              id="critical-load"
              label="Critical load (lights, lifts, pumps)"
              type="number" min={1}
              value={criticalLoadKw}
              onChange={e => onBatteryChange(batteryOutageHours, parseFloat(e.target.value))}
              unit="kW" hint="Essential load to keep running during outage"
            />
          </div>
        </div>
      )}

      {(mode === 'manual' || uploadState === 'review') && (
        <div className="flex justify-between">
          <button id="dg-back-btn" className="btn-secondary" onClick={onBack}>{t('back')}</button>
          <button
            id="dg-next-btn"
            className="btn-primary text-base px-8"
            onClick={() => {
              const filled: DGUsage = {
                litresConsumed: form.litresConsumed!,
                runningHours: form.runningHours!,
                periodMonths: form.periodMonths ?? 12,
                loadFactor: form.loadFactor ?? 0.7,
                powerFactor: form.powerFactor ?? 0.8,
                maintenanceRsPerHour: form.maintenanceRsPerHour ?? 15,
              };
              if (validate()) onNext(filled);
            }}
          >
            {t('analyze')}
          </button>
        </div>
      )}
    </div>
  );
}
