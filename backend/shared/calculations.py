"""
SunSwitch Calculation Engine
============================
Pure, side-effect-free functions for:
  - DG (diesel generator) cost & emissions
  - Solar energy yield
  - Battery sizing
  - Financial analysis (payback, NPV, savings)

Every emission factor is tagged with a source note.
Hardcoded values that lack an external citation are
explicitly marked ASSUMPTION so they are never silently
passed off as authoritative data.
"""

from __future__ import annotations

import math
from dataclasses import dataclass, field
from typing import Optional

# ---------------------------------------------------------------------------
# Emission factor registry
# Each entry: (value, unit, source_note)
# Mark unverified entries with "[ASSUMPTION – verify with source]"
# ---------------------------------------------------------------------------
EMISSION_FACTORS: dict[str, tuple[float, str, str]] = {
    # CO2 from diesel combustion
    # Source: IPCC 2006 Guidelines Vol. 2 Ch. 3, Table 3.2.2 & EF = 74.1 tCO2/TJ
    # Diesel density ~0.845 kg/L, calorific value ~43.1 MJ/kg → 3.187 MJ/L
    # EF ≈ 74.1e-3 tCO2/GJ × 3.187e-2 GJ/L ≈ 2.68 kgCO2/L ≈ 2.7 (rounded)
    "co2_kg_per_litre_diesel": (
        2.68,
        "kg CO₂ / litre diesel",
        "IPCC 2006 Guidelines Vol.2 Ch.3 Table 3.2.2 – net calorific value combustion",
    ),
    # PM2.5 from diesel gen-sets (uncontrolled, stationary)
    # Source: US EPA AP-42 Ch. 3.3 Table 3.3-1 (stationary diesel ICE)
    # Typical range 0.3–0.7 g/kWh; 0.5 used as central estimate
    "pm25_g_per_kwh_dg": (
        0.50,
        "g PM2.5 / kWh",
        "US EPA AP-42 Ch.3.3 Table 3.3-1 – stationary diesel ICE, central estimate [ASSUMPTION – verify with local CPCB data]",
    ),
    # NOx from diesel gen-sets
    # Source: US EPA AP-42 Ch. 3.3 Table 3.3-1
    "nox_g_per_kwh_dg": (
        9.0,
        "g NOx / kWh",
        "US EPA AP-42 Ch.3.3 Table 3.3-1 – stationary diesel ICE [ASSUMPTION]",
    ),
    # SO2 from diesel combustion (depends on sulphur content)
    # India BS-VI diesel max S = 10 ppm; older stock may be higher
    "so2_g_per_litre_diesel": (
        0.03,
        "g SO₂ / litre diesel",
        "BS-VI diesel ≤10 ppm sulphur – calculated [ASSUMPTION – actual depends on fuel batch]",
    ),
    # Grid CO2 intensity for India (CEA 2023-24 grid emission factor)
    # Source: CEA CO2 Baseline Database for Indian Power Sector 2023-24
    "co2_kg_per_kwh_grid": (
        0.706,
        "kg CO₂ / kWh (grid)",
        "CEA CO2 Baseline Database for Indian Power Sector, v17 (2023-24)",
    ),
}

# ---------------------------------------------------------------------------
# Dataclasses for inputs / outputs
# ---------------------------------------------------------------------------


@dataclass
class DGInputs:
    """Inputs describing a society's diesel generator usage."""

    # Fuel & engine
    litres_consumed: float  # actual diesel used (L)
    diesel_price_rs_per_l: float  # current pump price
    running_hours: float  # engine-on hours in the period
    capacity_kva: float  # nameplate capacity
    load_factor: float = 0.7  # fraction of rated capacity under typical load [ASSUMPTION 0.7]
    power_factor: float = 0.8  # typical DG power factor [ASSUMPTION 0.8]

    # Maintenance cost estimate
    maintenance_rs_per_hour: float = 15.0  # [ASSUMPTION Rs 15/hr – varies by contract]

    # Period (months) for annualisation
    period_months: float = 12.0


@dataclass
class DGResults:
    kwh_generated: float
    cost_per_kwh_rs: float
    total_fuel_cost_rs: float
    total_maintenance_cost_rs: float
    total_cost_rs: float
    annual_cost_rs: float
    annual_litres: float
    co2_kg: float
    pm25_kg: float
    nox_kg: float
    so2_kg: float
    emission_factor_notes: dict[str, str] = field(default_factory=dict)


@dataclass
class SolarInputs:
    """Inputs for solar energy yield calculation."""

    roof_area_m2: float  # gross roof area
    annual_irradiance_kwh_m2: float  # from NASA POWER or PVGIS
    panel_efficiency: float = 0.20  # monocrystalline, 2025 typical [ASSUMPTION 0.20]
    performance_ratio: float = 0.75  # accounts for wiring, inverter, dust losses [ASSUMPTION 0.75]
    usable_fraction: float = 0.60  # fraction of roof actually usable [ASSUMPTION 0.60]
    temperature_loss_factor: float = 0.95  # ~5% loss in Indian summer heat [ASSUMPTION 0.95]
    annual_degradation_rate: float = 0.005  # 0.5%/yr typical monocrystalline [ASSUMPTION 0.005]
    system_life_years: int = 25


@dataclass
class SolarResults:
    usable_area_m2: float
    year1_kwh: float
    lifetime_kwh: float  # sum over degradation schedule
    kwh_by_year: list[float]
    irradiance_source: str
    assumptions: list[str]


@dataclass
class BatteryInputs:
    avg_outage_hours_per_day: float
    critical_load_kw: float  # kW of essential loads during outage
    battery_dod: float = 0.80  # depth of discharge [ASSUMPTION 0.80 LFP]
    battery_cost_rs_per_kwh: float = 25_000.0  # installed cost [ASSUMPTION Rs 25k/kWh, 2025]
    battery_life_years: float = 10.0  # LFP battery life [ASSUMPTION 10 yr]
    replacement_cost_fraction: float = 0.70  # replacement vs new [ASSUMPTION 0.70]


@dataclass
class BatteryResults:
    required_capacity_kwh: float
    installed_cost_rs: float
    replacement_cost_rs: float
    replacement_year: int
    cost_note: str


@dataclass
class FinancialInputs:
    solar_installed_cost_rs_per_kw: float = 55_000.0  # incl. inverter, BoS [ASSUMPTION Rs 55k/kW, 2025]
    solar_capacity_kw: float = 0.0  # computed from solar results
    subsidy_rs_per_kw: float = 18_000.0  # PM Surya Ghar RWA/common facility rate
    subsidy_cap_kw: float = 500.0  # max subsidised capacity
    grid_tariff_rs_per_kwh: float = 8.0
    tariff_growth_rate: float = 0.04  # 4% per year [ASSUMPTION]
    discount_rate: float = 0.10  # 10% cost of capital [ASSUMPTION]
    annual_dg_cost_rs: float = 0.0
    annual_solar_kwh: float = 0.0
    battery_cost_rs: float = 0.0
    battery_replacement_cost_rs: float = 0.0
    battery_replacement_year: int = 10
    system_life_years: int = 25
    kwh_by_year: list[float] = field(default_factory=list)


@dataclass
class FinancialResults:
    solar_capacity_kw: float
    gross_installation_cost_rs: float
    subsidy_amount_rs: float
    net_installation_cost_rs: float
    payback_years: float
    npv_rs: float
    year10_savings_rs: float
    year25_savings_rs: float
    co2_avoided_25yr_tonnes: float
    solar_lcoe_rs_per_kwh: float
    dg_cost_per_kwh_rs: float
    grid_cost_per_kwh_rs: float
    annual_savings_rs: float
    cumulative_cash_flow: list[float]  # year 0..N
    subsidy_note: str


# ---------------------------------------------------------------------------
# Core calculation functions
# ---------------------------------------------------------------------------


def calculate_dg(inputs: DGInputs) -> DGResults:
    """
    Compute real DG cost per kWh, total spend, and emissions for a period.

    kWh generated = running_hours × capacity_kva × load_factor × power_factor
    (This is the standard method when a sub-meter is absent.)
    """
    kwh = inputs.running_hours * inputs.capacity_kva * inputs.load_factor * inputs.power_factor
    if kwh <= 0:
        raise ValueError("kWh generated must be positive – check running hours and DG capacity.")

    fuel_cost = inputs.litres_consumed * inputs.diesel_price_rs_per_l
    maint_cost = inputs.running_hours * inputs.maintenance_rs_per_hour
    total_cost = fuel_cost + maint_cost
    cost_per_kwh = total_cost / kwh

    # Annualise
    factor = 12.0 / inputs.period_months
    annual_cost = total_cost * factor
    annual_litres = inputs.litres_consumed * factor

    # Emissions (per-period)
    ef = EMISSION_FACTORS
    co2 = inputs.litres_consumed * ef["co2_kg_per_litre_diesel"][0]
    pm25 = (kwh * ef["pm25_g_per_kwh_dg"][0]) / 1000  # kg
    nox = (kwh * ef["nox_g_per_kwh_dg"][0]) / 1000
    so2 = (inputs.litres_consumed * ef["so2_g_per_litre_diesel"][0]) / 1000

    notes = {k: v[2] for k, v in ef.items() if "dg" in k or "diesel" in k}

    return DGResults(
        kwh_generated=round(kwh, 2),
        cost_per_kwh_rs=round(cost_per_kwh, 2),
        total_fuel_cost_rs=round(fuel_cost, 2),
        total_maintenance_cost_rs=round(maint_cost, 2),
        total_cost_rs=round(total_cost, 2),
        annual_cost_rs=round(annual_cost, 2),
        annual_litres=round(annual_litres, 2),
        co2_kg=round(co2, 2),
        pm25_kg=round(pm25, 4),
        nox_kg=round(nox, 4),
        so2_kg=round(so2, 4),
        emission_factor_notes=notes,
    )


def calculate_solar(inputs: SolarInputs) -> SolarResults:
    """
    Annual & lifetime solar yield using E = A_usable × G × eta × PR × T_loss.

    Applies per-year degradation to compute lifetime kWh.
    """
    usable_area = inputs.roof_area_m2 * inputs.usable_fraction

    def year_kwh(year: int) -> float:
        degradation = (1 - inputs.annual_degradation_rate) ** (year - 1)
        return (
            usable_area
            * inputs.annual_irradiance_kwh_m2
            * inputs.panel_efficiency
            * inputs.performance_ratio
            * inputs.temperature_loss_factor
            * degradation
        )

    kwh_by_year = [round(year_kwh(y), 1) for y in range(1, inputs.system_life_years + 1)]
    year1 = kwh_by_year[0]
    lifetime = round(sum(kwh_by_year), 1)

    assumptions = [
        f"Panel efficiency η = {inputs.panel_efficiency:.0%} (monocrystalline 2025 typical) [ASSUMPTION]",
        f"Performance ratio PR = {inputs.performance_ratio:.0%} (wiring, inverter, dust losses) [ASSUMPTION]",
        f"Usable roof fraction = {inputs.usable_fraction:.0%} [ASSUMPTION – verify on-site]",
        f"Temperature loss factor = {inputs.temperature_loss_factor:.0%} (Indian climate) [ASSUMPTION]",
        f"Degradation = {inputs.annual_degradation_rate:.1%}/yr [ASSUMPTION manufacturer datasheet]",
    ]

    return SolarResults(
        usable_area_m2=round(usable_area, 1),
        year1_kwh=round(year1, 1),
        lifetime_kwh=lifetime,
        kwh_by_year=kwh_by_year,
        irradiance_source="NASA POWER API (lat/lon query)",
        assumptions=assumptions,
    )


def size_battery(inputs: BatteryInputs) -> BatteryResults:
    """
    Size battery bank to cover daily outage hours for critical loads.

    Required capacity (kWh) = critical_load_kW × outage_hrs / DoD
    """
    required_kwh = (inputs.critical_load_kw * inputs.avg_outage_hours_per_day) / inputs.battery_dod
    installed_cost = required_kwh * inputs.battery_cost_rs_per_kwh
    replacement_cost = installed_cost * inputs.replacement_cost_fraction
    replacement_year = int(inputs.battery_life_years)

    note = (
        f"Battery sized for {inputs.avg_outage_hours_per_day}h outage × "
        f"{inputs.critical_load_kw}kW critical load at {inputs.battery_dod:.0%} DoD. "
        f"Cost: ₹{inputs.battery_cost_rs_per_kwh:,.0f}/kWh installed [ASSUMPTION]. "
        f"Replacement at year {replacement_year} for {inputs.replacement_cost_fraction:.0%} "
        f"of original cost [ASSUMPTION]."
    )
    return BatteryResults(
        required_capacity_kwh=round(required_kwh, 2),
        installed_cost_rs=round(installed_cost, 2),
        replacement_cost_rs=round(replacement_cost, 2),
        replacement_year=replacement_year,
        cost_note=note,
    )


def _solar_capacity_kw(solar_results: SolarResults, panel_efficiency: float, irradiance: float) -> float:
    """Estimate peak kW capacity from usable area and irradiance."""
    # Peak sun hours ≈ irradiance / 1000  (standard test condition 1 kW/m²)
    peak_sun_hours = irradiance / 1000  # not used for yield but for capacity
    # Installed kWp ≈ usable_area × panel_efficiency (kW per m² at STC)
    return solar_results.usable_area_m2 * panel_efficiency


def calculate_subsidy(capacity_kw: float, subsidy_rs_per_kw: float, cap_kw: float) -> float:
    """
    PM Surya Ghar subsidy for common facility / RWA installations.
    ₹18,000/kW up to 500 kW (subject to change – verify at pmsuryaghar.gov.in).
    """
    subsidised_kw = min(capacity_kw, cap_kw)
    return subsidised_kw * subsidy_rs_per_kw


def calculate_financials(inputs: FinancialInputs, solar_results: SolarResults) -> FinancialResults:
    """
    Full financial model: payback, NPV, 10/25-year savings, cumulative cash flow.

    Annual savings = DG cost avoided + grid units exported/self-consumed valued at tariff.
    Year-by-year analysis applies tariff growth and solar degradation.
    """
    # Installed kWp
    capacity_kw = inputs.solar_capacity_kw or (
        solar_results.usable_area_m2 * 0.20  # η=0.20 default
    )
    gross_cost = capacity_kw * inputs.solar_installed_cost_rs_per_kw
    subsidy = calculate_subsidy(capacity_kw, inputs.subsidy_rs_per_kw, inputs.subsidy_cap_kw)
    net_cost = gross_cost - subsidy + inputs.battery_cost_rs

    # Solar LCOE (simple, undiscounted)
    lifetime_kwh = solar_results.lifetime_kwh or 1
    total_cost_over_life = net_cost + inputs.battery_replacement_cost_rs
    solar_lcoe = total_cost_over_life / lifetime_kwh if lifetime_kwh > 0 else 0

    # Year-by-year cash flow
    cumulative: list[float] = [round(-net_cost, 2)]  # year 0 = capital outlay
    year10_savings = 0.0
    year25_savings = 0.0
    co2_avoided_kg = 0.0
    ef_grid = EMISSION_FACTORS["co2_kg_per_kwh_grid"][0]

    kwh_list = solar_results.kwh_by_year[: inputs.system_life_years]

    for yr in range(1, inputs.system_life_years + 1):
        tariff = inputs.grid_tariff_rs_per_kwh * ((1 + inputs.tariff_growth_rate) ** yr)
        kwh = kwh_list[yr - 1] if yr <= len(kwh_list) else 0

        # Solar replaces DG first, then grid
        dg_saving = min(kwh, inputs.annual_solar_kwh) / max(inputs.annual_solar_kwh, 1) * inputs.annual_dg_cost_rs
        grid_saving = kwh * tariff

        # Net annual benefit = grid value of solar (simpler conservative model)
        annual_benefit = kwh * tariff

        # Battery replacement
        battery_replacement = (
            inputs.battery_replacement_cost_rs if yr == inputs.battery_replacement_year else 0
        )

        net_annual = annual_benefit - battery_replacement
        cumulative.append(round(cumulative[-1] + net_annual, 2))
        co2_avoided_kg += kwh * ef_grid

        if yr == 10:
            year10_savings = round(cumulative[-1], 2)
        if yr == 25:
            year25_savings = round(cumulative[-1], 2)

    # Payback: first year cumulative cash flow goes positive
    payback = _find_payback(cumulative)

    # NPV
    npv = _calculate_npv(
        initial_investment=net_cost,
        kwh_by_year=kwh_list,
        grid_tariff=inputs.grid_tariff_rs_per_kwh,
        tariff_growth=inputs.tariff_growth_rate,
        discount_rate=inputs.discount_rate,
        battery_replacement_cost=inputs.battery_replacement_cost_rs,
        battery_replacement_year=inputs.battery_replacement_year,
        system_life_years=inputs.system_life_years,
    )

    # Annual savings (year 1)
    yr1_tariff = inputs.grid_tariff_rs_per_kwh * (1 + inputs.tariff_growth_rate)
    annual_savings = solar_results.year1_kwh * yr1_tariff

    subsidy_note = (
        f"PM Surya Ghar subsidy: ₹{inputs.subsidy_rs_per_kw:,.0f}/kW for RWA/common facilities, "
        f"up to {inputs.subsidy_cap_kw:.0f} kW. "
        f"Verify current rates at pmsuryaghar.gov.in – rules change periodically. "
        f"This is an estimate only."
    )

    return FinancialResults(
        solar_capacity_kw=round(capacity_kw, 2),
        gross_installation_cost_rs=round(gross_cost, 2),
        subsidy_amount_rs=round(subsidy, 2),
        net_installation_cost_rs=round(net_cost, 2),
        payback_years=round(payback, 1),
        npv_rs=round(npv, 2),
        year10_savings_rs=year10_savings,
        year25_savings_rs=year25_savings,
        co2_avoided_25yr_tonnes=round(co2_avoided_kg / 1000, 2),
        solar_lcoe_rs_per_kwh=round(solar_lcoe, 2),
        dg_cost_per_kwh_rs=0.0,  # filled by caller
        grid_cost_per_kwh_rs=round(inputs.grid_tariff_rs_per_kwh, 2),
        annual_savings_rs=round(annual_savings, 2),
        cumulative_cash_flow=cumulative,
        subsidy_note=subsidy_note,
    )


def _find_payback(cumulative: list[float]) -> float:
    """Linear interpolation between years when cumulative CF crosses zero."""
    for i in range(1, len(cumulative)):
        if cumulative[i] >= 0:
            # Interpolate
            prev = cumulative[i - 1]
            curr = cumulative[i]
            frac = abs(prev) / (abs(prev) + abs(curr)) if (abs(prev) + abs(curr)) > 0 else 0
            return (i - 1) + frac
    return float(len(cumulative))  # not paid back within system life


def _calculate_npv(
    initial_investment: float,
    kwh_by_year: list[float],
    grid_tariff: float,
    tariff_growth: float,
    discount_rate: float,
    battery_replacement_cost: float,
    battery_replacement_year: int,
    system_life_years: int,
) -> float:
    npv = -initial_investment
    for yr in range(1, system_life_years + 1):
        tariff = grid_tariff * ((1 + tariff_growth) ** yr)
        kwh = kwh_by_year[yr - 1] if yr <= len(kwh_by_year) else 0
        annual_benefit = kwh * tariff
        battery_cost = battery_replacement_cost if yr == battery_replacement_year else 0
        net = annual_benefit - battery_cost
        npv += net / ((1 + discount_rate) ** yr)
    return npv


def monthly_dg_breakdown(
    monthly_litres: list[float],
    monthly_hours: list[float],
    diesel_price: float,
    capacity_kva: float,
    load_factor: float = 0.7,
    power_factor: float = 0.8,
    maintenance_rs_per_hour: float = 15.0,
) -> list[dict]:
    """
    Per-month DG cost and kWh breakdown.
    Returns a list of 12 dicts with keys: month, litres, hours, kwh, cost_rs, cost_per_kwh.
    """
    months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
              "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    result = []
    for i, (litres, hours) in enumerate(zip(monthly_litres, monthly_hours)):
        kwh = hours * capacity_kva * load_factor * power_factor
        fuel = litres * diesel_price
        maint = hours * maintenance_rs_per_hour
        total = fuel + maint
        result.append({
            "month": months[i % 12],
            "litres": round(litres, 1),
            "hours": round(hours, 1),
            "kwh": round(kwh, 1),
            "cost_rs": round(total, 2),
            "cost_per_kwh": round(total / kwh, 2) if kwh > 0 else 0,
        })
    return result
