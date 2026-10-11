// ── SunSwitch Type Definitions ─────────────────────────────────────────────

export interface SocietyProfile {
  societyName: string;
  city: string;
  numFlats: number;
  dgCapacityKva: number;
  roofAreaM2: number;
  gridTariffRsPerKwh: number;
  dieselPriceRsPerL: number;
  lat: number;
  lon: number;
}

export interface DGUsage {
  litresConsumed: number;
  runningHours: number;
  periodMonths: number;
  loadFactor: number;
  powerFactor: number;
  maintenanceRsPerHour: number;
  monthlyLitres?: number[];
  monthlyHours?: number[];
}

export interface SolarParams {
  panelEfficiency: number;
  performanceRatio: number;
  usableFraction: number;
  temperatureLossFactor: number;
  annualDegradationRate: number;
  systemLifeYears: number;
}

export interface BatteryParams {
  avgOutageHoursPerDay: number;
  criticalLoadKw: number;
  batteryDod: number;
  batteryCostRsPerKwh: number;
  batteryLifeYears: number;
  replacementCostFraction: number;
}

export interface FinancialParams {
  solarCostRsPerKw: number;
  subsidyRsPerKw: number;
  subsidyCapKw: number;
  tariffGrowthRate: number;
  discountRate: number;
}

export interface AnalysisRequest extends SocietyProfile, DGUsage, SolarParams, BatteryParams, FinancialParams {}

// ── API Response Types ───────────────────────────────────────────────────────

export interface IrradianceData {
  annual_kwh_m2: number;
  source: string;
  is_fallback: boolean;
  model_confidence: 'High' | 'Medium' | 'Low';
  confidence_note: string;
  pvgis_annual_kwh_m2?: number;
}

export interface DGResults {
  kwh_generated: number;
  cost_per_kwh_rs: number;
  total_fuel_cost_rs: number;
  total_maintenance_cost_rs: number;
  total_cost_rs: number;
  annual_cost_rs: number;
  annual_litres: number;
  co2_kg: number;
  pm25_kg: number;
  nox_kg: number;
  so2_kg: number;
  emission_factor_notes: Record<string, string>;
  monthly_breakdown?: Array<{
    month: string;
    litres: number;
    hours: number;
    kwh: number;
    cost_rs: number;
    cost_per_kwh: number;
  }>;
}

export interface SolarResults {
  usable_area_m2: number;
  year1_kwh: number;
  lifetime_kwh: number;
  kwh_by_year: number[];
  irradiance_source: string;
  assumptions: string[];
}

export interface BatteryResults {
  required_capacity_kwh: number;
  installed_cost_rs: number;
  replacement_cost_rs: number;
  replacement_year: number;
  cost_note: string;
}

export interface FinancialResults {
  solar_capacity_kw: number;
  gross_installation_cost_rs: number;
  subsidy_amount_rs: number;
  net_installation_cost_rs: number;
  payback_years: number;
  npv_rs: number;
  year10_savings_rs: number;
  year25_savings_rs: number;
  co2_avoided_25yr_tonnes: number;
  solar_lcoe_rs_per_kwh: number;
  dg_cost_per_kwh_rs: number;
  grid_cost_per_kwh_rs: number;
  annual_savings_rs: number;
  cumulative_cash_flow: number[];
  subsidy_note: string;
}

export interface AnalysisResponse {
  societyName: string;
  city: string;
  numFlats: number;
  irradiance: IrradianceData;
  dg: DGResults;
  solar: SolarResults;
  battery: BatteryResults;
  financials: FinancialResults;
  emissionFactors: Record<string, { value: number; unit: string; source: string }>;
  disclaimer: string;
  summaryEn?: string;
  summaryHi?: string;
}

export interface TextractCell {
  text: string;
  confidence: number;
  row: number;
  col: number;
  low_confidence: boolean;
}

export interface TextractTable {
  rows: TextractCell[][];
  num_rows: number;
}

export interface ExtractResponse {
  tables: TextractTable[];
  keyValues: Array<{ key: string; value: string; key_confidence: number; value_confidence: number; low_confidence: boolean }>;
  numTables: number;
  totalCells: number;
  lowConfidenceCells: number;
  confidenceThreshold: number;
  previewUrl?: string;
  totalLitres?: number;
  totalHours?: number;
  periodMonths?: number;
  extractedBy?: string;
  note: string;
}

// ── App State ────────────────────────────────────────────────────────────────

export type Step = 'profile' | 'dg-usage' | 'analysis' | 'report';
export type Lang = 'en' | 'hi';

export interface AppState {
  step: Step;
  lang: Lang;
  profile: Partial<SocietyProfile>;
  dgUsage: Partial<DGUsage>;
  solarParams: SolarParams;
  batteryParams: Partial<BatteryParams>;
  financialParams: FinancialParams;
  results: AnalysisResponse | null;
  reportId: string | null;
  loading: boolean;
  error: string | null;
}
