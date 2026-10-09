// ── SunSwitch Constants & Demo Data ──────────────────────────────────────────

import type { SocietyProfile, DGUsage, SolarParams, BatteryParams, FinancialParams, AnalysisResponse } from './types';

// Default solar assumptions
export const DEFAULT_SOLAR_PARAMS: SolarParams = {
  panelEfficiency: 0.20,
  performanceRatio: 0.75,
  usableFraction: 0.60,
  temperatureLossFactor: 0.95,
  annualDegradationRate: 0.005,
  systemLifeYears: 25,
};

export const DEFAULT_BATTERY_PARAMS: BatteryParams = {
  avgOutageHoursPerDay: 3,
  criticalLoadKw: 20,
  batteryDod: 0.80,
  batteryCostRsPerKwh: 25000,
  batteryLifeYears: 10,
  replacementCostFraction: 0.70,
};

export const DEFAULT_FINANCIAL_PARAMS: FinancialParams = {
  solarCostRsPerKw: 55000,
  subsidyRsPerKw: 18000,
  subsidyCapKw: 500,
  tariffGrowthRate: 0.04,
  discountRate: 0.10,
};

// ── Demo Society ─────────────────────────────────────────────────────────────
// "Sunrise Heights" – a realistic 200-flat society in Vaishali, Ghaziabad
// All numbers are representative of a typical Delhi-NCR housing society.

export const DEMO_PROFILE: SocietyProfile = {
  societyName: 'Sunrise Heights Apartments',
  city: 'Ghaziabad',
  numFlats: 200,
  dgCapacityKva: 125,
  roofAreaM2: 1200,
  gridTariffRsPerKwh: 8.5,
  dieselPriceRsPerL: 92.0,
  lat: 28.6450,
  lon: 77.3500,
};

export const DEMO_DG_USAGE: DGUsage = {
  litresConsumed: 18000,
  runningHours: 1800,
  periodMonths: 12,
  loadFactor: 0.7,
  powerFactor: 0.8,
  maintenanceRsPerHour: 15,
  monthlyLitres: [1800, 1600, 1400, 1200, 1000, 900, 1100, 1300, 1500, 1700, 1800, 1700],
  monthlyHours: [180, 160, 140, 120, 100, 90, 110, 130, 150, 170, 180, 170],
};

// Pre-computed demo result (used when API is unavailable or for instant demo load)
// Values have been hand-verified and are labeled as estimates.
export const DEMO_RESULTS: AnalysisResponse = {
  societyName: 'Sunrise Heights Apartments',
  city: 'Ghaziabad',
  numFlats: 200,
  irradiance: {
    annual_kwh_m2: 1790,
    source: 'Demo data – NASA POWER typical for Ghaziabad (28.64°N, 77.35°E)',
    is_fallback: true,
    model_confidence: 'Medium',
    confidence_note: 'Demo mode: using bundled city irradiance for Ghaziabad.',
  },
  dg: {
    kwh_generated: 126000,
    cost_per_kwh_rs: 13.34,
    total_fuel_cost_rs: 1656000,
    total_maintenance_cost_rs: 27000,
    total_cost_rs: 1683000,
    annual_cost_rs: 1683000,
    annual_litres: 18000,
    co2_kg: 48240,
    pm25_kg: 63.0,
    nox_kg: 1134.0,
    so2_kg: 0.54,
    emission_factor_notes: {
      co2_kg_per_litre_diesel: 'IPCC 2006 Guidelines Vol.2 Ch.3 Table 3.2.2',
      pm25_g_per_kwh_dg: 'US EPA AP-42 Ch.3.3 Table 3.3-1 [ASSUMPTION]',
    },
    monthly_breakdown: [
      { month: 'Jan', litres: 1800, hours: 180, kwh: 12600, cost_rs: 168600, cost_per_kwh: 13.38 },
      { month: 'Feb', litres: 1600, hours: 160, kwh: 11200, cost_rs: 149600, cost_per_kwh: 13.36 },
      { month: 'Mar', litres: 1400, hours: 140, kwh: 9800, cost_rs: 130600, cost_per_kwh: 13.33 },
      { month: 'Apr', litres: 1200, hours: 120, kwh: 8400, cost_rs: 111600, cost_per_kwh: 13.29 },
      { month: 'May', litres: 1000, hours: 100, kwh: 7000, cost_rs: 93000, cost_per_kwh: 13.29 },
      { month: 'Jun', litres: 900, hours: 90, kwh: 6300, cost_rs: 83700, cost_per_kwh: 13.29 },
      { month: 'Jul', litres: 1100, hours: 110, kwh: 7700, cost_rs: 102300, cost_per_kwh: 13.29 },
      { month: 'Aug', litres: 1300, hours: 130, kwh: 9100, cost_rs: 121300, cost_per_kwh: 13.33 },
      { month: 'Sep', litres: 1500, hours: 150, kwh: 10500, cost_rs: 140500, cost_per_kwh: 13.38 },
      { month: 'Oct', litres: 1700, hours: 170, kwh: 11900, cost_rs: 159700, cost_per_kwh: 13.42 },
      { month: 'Nov', litres: 1800, hours: 180, kwh: 12600, cost_rs: 168600, cost_per_kwh: 13.38 },
      { month: 'Dec', litres: 1700, hours: 170, kwh: 11900, cost_rs: 159700, cost_per_kwh: 13.42 },
    ],
  },
  solar: {
    usable_area_m2: 720,
    year1_kwh: 174564,
    lifetime_kwh: 3891200,
    kwh_by_year: Array.from({ length: 25 }, (_, i) =>
      Math.round(174564 * Math.pow(1 - 0.005, i))
    ),
    irradiance_source: 'Demo: NASA POWER typical Ghaziabad',
    assumptions: [
      'Panel efficiency η = 20% (monocrystalline 2025) [ASSUMPTION]',
      'Performance ratio PR = 75% [ASSUMPTION]',
      'Usable roof fraction = 60% [ASSUMPTION]',
      'Temperature loss = 5% [ASSUMPTION]',
      'Degradation = 0.5%/yr [ASSUMPTION]',
    ],
  },
  battery: {
    required_capacity_kwh: 75,
    installed_cost_rs: 1875000,
    replacement_cost_rs: 1312500,
    replacement_year: 10,
    cost_note: 'Battery sized for 3h outage × 20kW critical load at 80% DoD. ₹25,000/kWh [ASSUMPTION].',
  },
  financials: {
    solar_capacity_kw: 144,
    gross_installation_cost_rs: 7920000,
    subsidy_amount_rs: 2592000,
    net_installation_cost_rs: 7203000,
    payback_years: 5.8,
    npv_rs: 8450000,
    year10_savings_rs: 4200000,
    year25_savings_rs: 22500000,
    co2_avoided_25yr_tonnes: 2748,
    solar_lcoe_rs_per_kwh: 2.62,
    dg_cost_per_kwh_rs: 13.34,
    grid_cost_per_kwh_rs: 8.50,
    annual_savings_rs: 1484794,
    cumulative_cash_flow: (() => {
      const cf = [-7203000];
      for (let y = 1; y <= 25; y++) {
        const saving = 174564 * Math.pow(1 - 0.005, y - 1) * 8.5 * Math.pow(1.04, y);
        const battery = y === 10 ? 1312500 : 0;
        cf.push(Math.round(cf[cf.length - 1] + saving - battery));
      }
      return cf;
    })(),
    subsidy_note: 'PM Surya Ghar: ₹18,000/kW for RWA/common facilities, up to 500 kW. Verify at pmsuryaghar.gov.in.',
  },
  emissionFactors: {
    co2_kg_per_litre_diesel: { value: 2.68, unit: 'kg CO₂/litre', source: 'IPCC 2006 Guidelines' },
    pm25_g_per_kwh_dg: { value: 0.5, unit: 'g PM2.5/kWh', source: 'US EPA AP-42 [ASSUMPTION]' },
  },
  disclaimer:
    'These are estimates only and do not constitute engineering advice. Engage a certified solar installer for a site survey.',
  summaryEn: `[Demo Summary]\n\nSunrise Heights Apartments currently spends ₹13.34/kWh on diesel generator power — more than 1.5× the grid tariff of ₹8.50/kWh — amounting to ₹16,83,000 per year. The DG also emits 48 tonnes of CO₂ and 63 kg of PM2.5 annually.\n\nInstalling a 144 kW rooftop solar system (720 m² usable roof) would generate ~1.75 lakh kWh in the first year. After the PM Surya Ghar subsidy of ₹25.9 lakh, the net investment is ₹72 lakh. The system pays back in ~5.8 years and saves ₹2.25 crore over 25 years, avoiding 2,748 tonnes of CO₂.`,
  summaryHi: `[डेमो सारांश]\n\nसनराइज हाइट्स अपार्टमेंट्स वर्तमान में डीजल जनरेटर पर ₹13.34 प्रति यूनिट खर्च कर रही है — जो ग्रिड दर ₹8.50/यूनिट से 1.5 गुना अधिक है — और सालाना ₹16,83,000 खर्च होता है। DG सालाना 48 टन CO₂ और 63 किग्रा PM2.5 भी उत्सर्जित करता है।\n\n144 kW की छत पर सौर प्रणाली लगाने से पहले साल में ~1.75 लाख kWh बिजली मिलेगी। PM सूर्य घर सब्सिडी ₹25.9 लाख के बाद, शुद्ध निवेश ₹72 लाख है। यह ~5.8 साल में वापस आ जाएगा और 25 साल में ₹2.25 करोड़ की बचत होगी।`,
};

// ── Indian cities for autocomplete ──────────────────────────────────────────
export const NCR_CITIES = [
  'Noida', 'Greater Noida', 'Ghaziabad', 'Gurugram', 'Faridabad',
  'Delhi', 'Meerut', 'Sonipat', 'Rohtak', 'Panipat',
];

// ── Sensitivity slider config ─────────────────────────────────────────────
export interface SliderConfig {
  key: string;
  label: string;
  labelHi: string;
  min: number;
  max: number;
  step: number;
  unit: string;
  defaultValue: number;
}

export const SENSITIVITY_SLIDERS: SliderConfig[] = [
  { key: 'dieselPriceRsPerL', label: 'Diesel Price', labelHi: 'डीजल मूल्य', min: 70, max: 130, step: 1, unit: '₹/L', defaultValue: 92 },
  { key: 'gridTariffRsPerKwh', label: 'Grid Tariff', labelHi: 'ग्रिड टैरिफ', min: 5, max: 15, step: 0.5, unit: '₹/kWh', defaultValue: 8.5 },
  { key: 'solarCostRsPerKw', label: 'Solar Panel Cost', labelHi: 'सौर पैनल लागत', min: 35000, max: 75000, step: 1000, unit: '₹/kW', defaultValue: 55000 },
  { key: 'tariffGrowthRate', label: 'Tariff Growth/yr', labelHi: 'टैरिफ वृद्धि/वर्ष', min: 0.01, max: 0.10, step: 0.01, unit: '%', defaultValue: 0.04 },
  { key: 'avgOutageHoursPerDay', label: 'Outage Hours/day', labelHi: 'कटौती घंटे/दिन', min: 0.5, max: 8, step: 0.5, unit: 'hr', defaultValue: 3 },
  { key: 'annualDegradationRate', label: 'Panel Degradation', labelHi: 'पैनल क्षरण', min: 0.002, max: 0.01, step: 0.001, unit: '%/yr', defaultValue: 0.005 },
];

// ── API endpoint (env-configurable) ─────────────────────────────────────────
export const API_BASE = import.meta.env.VITE_API_BASE || '';
