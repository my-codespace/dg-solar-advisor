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

const CITY_COORDS: Record<string, [number, number]> = {
  'noida': [28.5355, 77.3910],
  'greater noida': [28.4744, 77.5040],
  'ghaziabad': [28.6692, 77.4538],
  'gurugram': [28.4595, 77.0266],
  'gurgaon': [28.4595, 77.0266],
  'faridabad': [28.4089, 77.3178],
  'delhi': [28.6139, 77.2090],
  'new delhi': [28.6139, 77.2090],
  'meerut': [28.9845, 77.7064],
  'sonipat': [28.9931, 77.0151],
  'rohtak': [28.8955, 76.6066],
  'panipat': [29.3909, 76.9635],
};

function getCoordsForCity(city: string): [number, number] {
  const normalized = city.trim().toLowerCase();
  for (const [name, coords] of Object.entries(CITY_COORDS)) {
    if (normalized.includes(name) || name.includes(normalized)) {
      return coords;
    }
  }
  return [28.6139, 77.2090]; // Delhi NCR default coordinates
}

const DEFAULT_PROFILE_VALUES: Partial<SocietyProfile> = {
  gridTariffRsPerKwh: 8.5,
  dieselPriceRsPerL: 92.0,
  lat: 28.6139,
  lon: 77.2090,
};

export function ProfileStep({ lang, initialData, onNext }: Props) {
  const t = useT(lang);
  const [form, setForm] = useState<Partial<SocietyProfile>>(() => ({
    ...DEFAULT_PROFILE_VALUES,
    ...initialData,
  }));
  const [errors, setErrors] = useState<Partial<Record<keyof SocietyProfile, string>>>({});
  const [roofMode, setRoofMode] = useState<'manual' | 'map'>('manual');

  function update(field: keyof SocietyProfile, value: string | number | undefined) {
    setForm(f => ({ ...f, [field]: value }));
    setErrors(e => ({ ...e, [field]: undefined }));
  }

  function handleCityChange(city: string) {
    update('city', city);
    const coords = getCoordsForCity(city);
    update('lat', coords[0]);
    update('lon', coords[1]);
  }

  function validate(): boolean {
    const errs: Partial<Record<keyof SocietyProfile, string>> = {};
    if (!form.societyName?.trim()) errs.societyName = 'Society name is required';
    if (!form.city?.trim()) errs.city = 'City is required';
    if (!form.numFlats || Number(form.numFlats) <= 0) errs.numFlats = 'Must be greater than 0';
    if (!form.dgCapacityKva || Number(form.dgCapacityKva) <= 0) errs.dgCapacityKva = 'Must be greater than 0';
    if (!form.roofAreaM2 || Number(form.roofAreaM2) <= 0) errs.roofAreaM2 = 'Must be greater than 0';
    if (!form.gridTariffRsPerKwh || Number(form.gridTariffRsPerKwh) <= 0) errs.gridTariffRsPerKwh = 'Must be greater than 0';
    if (!form.dieselPriceRsPerL || Number(form.dieselPriceRsPerL) <= 0) errs.dieselPriceRsPerL = 'Must be greater than 0';

    // Auto-resolve lat/lon if not yet set
    if (!form.lat || !form.lon) {
      const coords = getCoordsForCity(form.city || 'Delhi');
      form.lat = coords[0];
      form.lon = coords[1];
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
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
            value={form.numFlats ?? ''}
            onChange={e => update('numFlats', e.target.value === '' ? undefined : parseInt(e.target.value))}
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
            value={form.dgCapacityKva ?? ''}
            onChange={e => update('dgCapacityKva', e.target.value === '' ? undefined : parseFloat(e.target.value))}
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
            value={form.gridTariffRsPerKwh ?? ''}
            onChange={e => update('gridTariffRsPerKwh', e.target.value === '' ? undefined : parseFloat(e.target.value))}
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
            value={form.dieselPriceRsPerL ?? ''}
            onChange={e => update('dieselPriceRsPerL', e.target.value === '' ? undefined : parseFloat(e.target.value))}
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
            value={form.roofAreaM2 ?? ''}
            onChange={e => update('roofAreaM2', e.target.value === '' ? undefined : parseFloat(e.target.value))}
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

      <div className="flex flex-col items-end gap-3">
        {Object.keys(errors).length > 0 && (
          <p className="text-sm font-medium text-amber-300 bg-amber-500/10 border border-amber-500/30 px-4 py-2 rounded-xl">
            ⚠️ Please fill in all required fields highlighted above before proceeding.
          </p>
        )}
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
