"""
/analyze Lambda handler
Accepts society profile + DG usage data, runs full calculation,
returns structured JSON with all results and assumptions.
"""

from __future__ import annotations

import json
import os
import sys
import traceback
from typing import Any

# Allow importing from shared/ when running in Lambda (layer path)
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "shared"))

from calculations import (
    DGInputs,
    SolarInputs,
    BatteryInputs,
    FinancialInputs,
    calculate_dg,
    calculate_solar,
    size_battery,
    calculate_financials,
    monthly_dg_breakdown,
    EMISSION_FACTORS,
)
from irradiance import get_irradiance_with_confidence

CORS_HEADERS = {
    "Access-Control-Allow-Origin": os.environ.get("ALLOWED_ORIGIN", "*"),
    "Access-Control-Allow-Headers": "Content-Type,X-Amz-Date,Authorization,X-Api-Key",
    "Access-Control-Allow-Methods": "OPTIONS,POST",
    "Content-Type": "application/json",
}


def _resp(status: int, body: Any) -> dict:
    return {
        "statusCode": status,
        "headers": CORS_HEADERS,
        "body": json.dumps(body, default=str),
    }


def _validate(data: dict) -> list[str]:
    """Return list of validation error strings."""
    errors = []
    required = [
        "societyName", "city", "numFlats", "dgCapacityKva",
        "roofAreaM2", "gridTariffRsPerKwh", "dieselPriceRsPerL",
        "litresConsumed", "runningHours", "periodMonths",
        "avgOutageHoursPerDay", "criticalLoadKw",
        "lat", "lon",
    ]
    for field in required:
        if field not in data or data[field] is None or data[field] == "":
            errors.append(f"Missing required field: {field}")
    
    numeric_positive = [
        "numFlats", "dgCapacityKva", "roofAreaM2", "gridTariffRsPerKwh",
        "dieselPriceRsPerL", "litresConsumed", "runningHours", "periodMonths",
    ]
    for field in numeric_positive:
        if field in data:
            try:
                val = float(data[field])
                if val <= 0:
                    errors.append(f"{field} must be a positive number.")
            except (TypeError, ValueError):
                errors.append(f"{field} must be a number.")
    return errors


def handler(event: dict, context: Any) -> dict:
    # Handle CORS preflight
    if event.get("httpMethod") == "OPTIONS":
        return _resp(200, {})

    try:
        body = json.loads(event.get("body") or "{}")
    except json.JSONDecodeError:
        return _resp(400, {"error": "Invalid JSON body."})

    errors = _validate(body)
    if errors:
        return _resp(400, {"errors": errors})

    try:
        # --- Irradiance ---
        irr = get_irradiance_with_confidence(
            lat=float(body["lat"]),
            lon=float(body["lon"]),
            city=body.get("city"),
        )

        # --- DG Calculations ---
        dg_inputs = DGInputs(
            litres_consumed=float(body["litresConsumed"]),
            diesel_price_rs_per_l=float(body["dieselPriceRsPerL"]),
            running_hours=float(body["runningHours"]),
            capacity_kva=float(body["dgCapacityKva"]),
            load_factor=float(body.get("loadFactor", 0.7)),
            power_factor=float(body.get("powerFactor", 0.8)),
            maintenance_rs_per_hour=float(body.get("maintenanceRsPerHour", 15.0)),
            period_months=float(body["periodMonths"]),
        )
        dg_results = calculate_dg(dg_inputs)

        # Monthly breakdown (if provided)
        monthly_rows = None
        if body.get("monthlyLitres") and body.get("monthlyHours"):
            monthly_rows = monthly_dg_breakdown(
                monthly_litres=[float(x) for x in body["monthlyLitres"]],
                monthly_hours=[float(x) for x in body["monthlyHours"]],
                diesel_price=float(body["dieselPriceRsPerL"]),
                capacity_kva=float(body["dgCapacityKva"]),
                load_factor=float(body.get("loadFactor", 0.7)),
                power_factor=float(body.get("powerFactor", 0.8)),
            )

        # --- Solar ---
        solar_inputs = SolarInputs(
            roof_area_m2=float(body["roofAreaM2"]),
            annual_irradiance_kwh_m2=irr["annual_kwh_m2"],
            panel_efficiency=float(body.get("panelEfficiency", 0.20)),
            performance_ratio=float(body.get("performanceRatio", 0.75)),
            usable_fraction=float(body.get("usableFraction", 0.60)),
            temperature_loss_factor=float(body.get("temperatureLossFactor", 0.95)),
            annual_degradation_rate=float(body.get("annualDegradationRate", 0.005)),
            system_life_years=int(body.get("systemLifeYears", 25)),
        )
        solar_results = calculate_solar(solar_inputs)

        # --- Battery ---
        battery_inputs = BatteryInputs(
            avg_outage_hours_per_day=float(body["avgOutageHoursPerDay"]),
            critical_load_kw=float(body["criticalLoadKw"]),
            battery_dod=float(body.get("batteryDod", 0.80)),
            battery_cost_rs_per_kwh=float(body.get("batteryCostRsPerKwh", 25_000)),
            battery_life_years=float(body.get("batteryLifeYears", 10)),
            replacement_cost_fraction=float(body.get("replacementCostFraction", 0.70)),
        )
        battery_results = size_battery(battery_inputs)

        # Estimate solar kWp
        solar_kw = solar_results.usable_area_m2 * float(body.get("panelEfficiency", 0.20))

        # --- Financials ---
        fin_inputs = FinancialInputs(
            solar_installed_cost_rs_per_kw=float(body.get("solarCostRsPerKw", 55_000)),
            solar_capacity_kw=solar_kw,
            subsidy_rs_per_kw=float(body.get("subsidyRsPerKw", 18_000)),
            subsidy_cap_kw=float(body.get("subsidyCapKw", 500)),
            grid_tariff_rs_per_kwh=float(body["gridTariffRsPerKwh"]),
            tariff_growth_rate=float(body.get("tariffGrowthRate", 0.04)),
            discount_rate=float(body.get("discountRate", 0.10)),
            annual_dg_cost_rs=dg_results.annual_cost_rs,
            annual_solar_kwh=solar_results.year1_kwh,
            battery_cost_rs=battery_results.installed_cost_rs,
            battery_replacement_cost_rs=battery_results.replacement_cost_rs,
            battery_replacement_year=battery_results.replacement_year,
            system_life_years=int(body.get("systemLifeYears", 25)),
            kwh_by_year=solar_results.kwh_by_year,
        )
        fin_results = calculate_financials(fin_inputs, solar_results)
        fin_results.dg_cost_per_kwh_rs = dg_results.cost_per_kwh_rs

        # Build response
        response = {
            "societyName": body["societyName"],
            "city": body["city"],
            "numFlats": body["numFlats"],
            "irradiance": {
                "annual_kwh_m2": irr["annual_kwh_m2"],
                "source": irr["source"],
                "is_fallback": irr.get("is_fallback", False),
                "model_confidence": irr.get("model_confidence"),
                "confidence_note": irr.get("confidence_note"),
                "pvgis_annual_kwh_m2": irr.get("pvgis_annual_kwh_m2"),
            },
            "dg": {
                "kwh_generated": dg_results.kwh_generated,
                "cost_per_kwh_rs": dg_results.cost_per_kwh_rs,
                "total_fuel_cost_rs": dg_results.total_fuel_cost_rs,
                "total_maintenance_cost_rs": dg_results.total_maintenance_cost_rs,
                "total_cost_rs": dg_results.total_cost_rs,
                "annual_cost_rs": dg_results.annual_cost_rs,
                "annual_litres": dg_results.annual_litres,
                "co2_kg": dg_results.co2_kg,
                "pm25_kg": dg_results.pm25_kg,
                "nox_kg": dg_results.nox_kg,
                "so2_kg": dg_results.so2_kg,
                "emission_factor_notes": dg_results.emission_factor_notes,
                "monthly_breakdown": monthly_rows,
            },
            "solar": {
                "usable_area_m2": solar_results.usable_area_m2,
                "year1_kwh": solar_results.year1_kwh,
                "lifetime_kwh": solar_results.lifetime_kwh,
                "kwh_by_year": solar_results.kwh_by_year,
                "irradiance_source": solar_results.irradiance_source,
                "assumptions": solar_results.assumptions,
            },
            "battery": {
                "required_capacity_kwh": battery_results.required_capacity_kwh,
                "installed_cost_rs": battery_results.installed_cost_rs,
                "replacement_cost_rs": battery_results.replacement_cost_rs,
                "replacement_year": battery_results.replacement_year,
                "cost_note": battery_results.cost_note,
            },
            "financials": {
                "solar_capacity_kw": fin_results.solar_capacity_kw,
                "gross_installation_cost_rs": fin_results.gross_installation_cost_rs,
                "subsidy_amount_rs": fin_results.subsidy_amount_rs,
                "net_installation_cost_rs": fin_results.net_installation_cost_rs,
                "payback_years": fin_results.payback_years,
                "npv_rs": fin_results.npv_rs,
                "year10_savings_rs": fin_results.year10_savings_rs,
                "year25_savings_rs": fin_results.year25_savings_rs,
                "co2_avoided_25yr_tonnes": fin_results.co2_avoided_25yr_tonnes,
                "solar_lcoe_rs_per_kwh": fin_results.solar_lcoe_rs_per_kwh,
                "dg_cost_per_kwh_rs": fin_results.dg_cost_per_kwh_rs,
                "grid_cost_per_kwh_rs": fin_results.grid_cost_per_kwh_rs,
                "annual_savings_rs": fin_results.annual_savings_rs,
                "cumulative_cash_flow": fin_results.cumulative_cash_flow,
                "subsidy_note": fin_results.subsidy_note,
            },
            "emissionFactors": {k: {"value": v[0], "unit": v[1], "source": v[2]}
                                for k, v in EMISSION_FACTORS.items()},
            "disclaimer": (
                "These are estimates only and do not constitute engineering advice. "
                "Engage a certified solar installer for a site survey and detailed proposal. "
                "No personally identifiable information is stored."
            ),
        }

        return _resp(200, response)

    except ValueError as exc:
        return _resp(400, {"error": str(exc)})
    except Exception as exc:
        print(traceback.format_exc())
        return _resp(500, {"error": "Internal server error. Please try again.", "detail": str(exc)})
