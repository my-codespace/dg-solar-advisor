// ── Step 1: Society Profile ────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-unused-vars
import React, { useState } from 'react';
import { Building2, MapPin, Zap, Fuel } from 'lucide-react';
import { InputField } from '../components/UI';
import { RoofMapPicker } from '../components/MapPicker';
import { useT } from '../i18n';
import type { SocietyProfile, Lang } from '../types';
import { NCR_CITIES } from '../constants';

interface Props {
  lang: Lang;
  initialData: Partial<SocietyProfile>;
  onNext: (data: SocietyProfile) => void;
}

export function ProfileStep({ lang, initialData, onNext }: Props) {
  const t = useT(lang);
  const [form, setForm] = useState<Partial<SocietyProfile>>(initialData);
  const [errors, setErrors] = useState<Partial<Record<keyof SocietyProfile, string>>>({});
  const [roofMode, setRoofMode] = useState<'manual' | 'map'>('manual');

  function update(field: keyof SocietyProfile, value: string | number) {
    setForm(f => ({ ...f, [field]: value }));
    setErrors(e => ({ ...e, [field]: undefined }));
  }

  function validate(): boolean {
    const errs: typeof errors = {};
    if (!form.societyName?.trim()) errs.societyName = 'Required';
    if (!form.city?.trim()) errs.city = 'Required';
    if (!form.numFlats || form.numFlats <= 0) errs.numFlats = 'Must be > 0';
    if (!form.dgCapacityKva || form.dgCapacityKva <= 0) errs.dgCapacityKva = 'Must be > 0';
    if (!form.roofAreaM2 || form.roofAreaM2 <= 0) errs.roofAreaM2 = 'Must be > 0';
    if (!form.gridTariffRsPerKwh || form.gridTariffRsPerKwh <= 0) errs.gridTariffRsPerKwh = 'Must be > 0';
    if (!form.dieselPriceRsPerL || form.dieselPriceRsPerL <= 0) errs.dieselPriceRsPerL = 'Must be > 0';
    if (!form.lat) errs.lat = 'Required (fill city or use map)';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  // Auto-fill lat/lon from known cities
  const CITY_COORDS: Record<string, [number, number]> = {
    'Noida': [28.5355, 77.3910],
    'Greater Noida': [28.4744, 77.5040],
    'Ghaziabad': [28.6692, 77.4538],
    'Gurugram': [28.4595, 77.0266],
    'Faridabad': [28.4089, 77.3178],
    'Delhi': [28.6139, 77.2090],
    'Meerut': [28.9845, 77.7064],
    'Sonipat': [28.9931, 77.0151],
    'Rohtak': [28.8955, 76.6066],
    'Panipat': [29.3909, 76.9635],
  };

  function handleCityChange(city: string) {
    update('city', city);
    const coords = CITY_COORDS[city];
    if (coords) {
      update('lat', coords[0]);
      update('lon', coords[1]);
    }
  }

  return (
    <div className="animate-fade-in space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-white mb-1">{t('step1')}</h2>
        <p className="text-slate-400 text-sm">Tell us about your housing society to get a personalised analysis.</p>
      </div>

      {/* Society basics */}
      <div className="glass p-6 space-y-5">
        <div className="flex items-center gap-2 text-solar-400 mb-2">
          <Building2 size={18} />
          <span className="font-semibold text-sm uppercase tracking-wider">Society Details</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="md:col-span-2">
            <InputField
              id="society-name"
              label={t('societyName')}
              value={form.societyName || ''}
              onChange={e => update('societyName', e.target.value)}
              placeholder="e.g. Sunrise Heights Apartments"
              error={errors.societyName}
            />
          </div>

          <div>
            <label className="input-label">
              <MapPin size={13} /> {t('city')}
            </label>
            <input
              id="city"
              list="city-options"
              className={`input-field ${errors.city ? 'border-red-400/60' : ''}`}
              value={form.city || ''}
              onChange={e => handleCityChange(e.target.value)}
              placeholder="e.g. Ghaziabad"
            />
            <datalist id="city-options">
              {NCR_CITIES.map(c => <option key={c} value={c} />)}
            </datalist>
            {errors.city && <p className="text-xs text-red-400 mt-1">{errors.city}</p>}
          </div>

          <InputField
            id="num-flats"
            label={t('numFlats')}
            type="number"
            min={1}
            value={form.numFlats || ''}
            onChange={e => update('numFlats', parseInt(e.target.value))}
            placeholder="200"
            error={errors.numFlats}
          />
        </div>
      </div>

      {/* DG & Electricity */}
      <div className="glass p-6 space-y-5">
        <div className="flex items-center gap-2 text-solar-400 mb-2">
          <Zap size={18} />
          <span className="font-semibold text-sm uppercase tracking-wider">Power Setup</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <InputField
            id="dg-capacity"
            label={t('dgCapacity')}
            type="number"
            min={1}
            value={form.dgCapacityKva || ''}
            onChange={e => update('dgCapacityKva', parseFloat(e.target.value))}
            placeholder="125"
            unit="kVA"
            error={errors.dgCapacityKva}
          />
          <InputField
            id="grid-tariff"
            label={t('gridTariff')}
            type="number"
            min={0.1}
            step={0.1}
            value={form.gridTariffRsPerKwh || ''}
            onChange={e => update('gridTariffRsPerKwh', parseFloat(e.target.value))}
            placeholder="8.5"
            unit="₹/kWh"
            error={errors.gridTariffRsPerKwh}
            hint="Check your latest electricity bill"
          />
          <InputField
            id="diesel-price"
            label={t('dieselPrice')}
            type="number"
            min={1}
            step={0.5}
            value={form.dieselPriceRsPerL || ''}
            onChange={e => update('dieselPriceRsPerL', parseFloat(e.target.value))}
            placeholder="92"
            unit="₹/L"
            error={errors.dieselPriceRsPerL}
          />
        </div>
      </div>

      {/* Roof Area */}
      <div className="glass p-6 space-y-5">
        <div className="flex items-center gap-2 text-solar-400 mb-2">
          <Fuel size={18} />
          <span className="font-semibold text-sm uppercase tracking-wider">Roof Area</span>
        </div>

        <div className="flex gap-3 mb-4">
          <button
            type="button"
            onClick={() => setRoofMode('manual')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${roofMode === 'manual' ? 'bg-solar-500/20 text-solar-300 border border-solar-400/40' : 'btn-ghost'}`}
          >
            Manual Entry
          </button>
          <button
            type="button"
            onClick={() => setRoofMode('map')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${roofMode === 'map' ? 'bg-solar-500/20 text-solar-300 border border-solar-400/40' : 'btn-ghost'}`}
          >
            Draw on Map
          </button>
        </div>

        {roofMode === 'manual' ? (
          <InputField
            id="roof-area"
            label={t('roofArea')}
            type="number"
            min={1}
            value={form.roofAreaM2 || ''}
            onChange={e => update('roofAreaM2', parseFloat(e.target.value))}
            placeholder="1200"
            unit="m²"
            hint={t('roofAreaHint')}
            error={errors.roofAreaM2}
          />
        ) : (
          <RoofMapPicker
            lat={form.lat || 28.64}
            lon={form.lon || 77.35}
            roofAreaM2={form.roofAreaM2 || 0}
            onAreaChange={a => update('roofAreaM2', a)}
            onLocationChange={(lat, lon) => {
              update('lat', lat);
              update('lon', lon);
            }}
          />
        )}

        {errors.roofAreaM2 && roofMode === 'map' && (
          <p className="text-xs text-red-400">Please draw a polygon on the map or switch to manual entry.</p>
        )}
      </div>

      <div className="flex justify-end">
        <button
          id="profile-next-btn"
          className="btn-primary text-base px-8"
          onClick={() => {
            if (validate()) onNext(form as SocietyProfile);
          }}
        >
          {t('next')}
        </button>
      </div>
    </div>
  );
}
