"""
NASA POWER API + PVGIS client for solar irradiance data.
Both APIs are free and require no API key.
"""

from __future__ import annotations

import json
import urllib.request
import urllib.error
from typing import Optional


# Default irradiance for major Indian cities (fallback if API unavailable)
# Source: NASA POWER typical values; used ONLY as labeled fallback
CITY_IRRADIANCE_FALLBACK: dict[str, float] = {
    "Delhi": 1800.0,
    "Noida": 1790.0,
    "Ghaziabad": 1785.0,
    "Gurugram": 1795.0,
    "Faridabad": 1780.0,
    "Greater Noida": 1785.0,
    "Mumbai": 1750.0,
    "Pune": 1900.0,
    "Bengaluru": 1850.0,
    "Chennai": 1950.0,
    "Hyderabad": 1950.0,
    "Kolkata": 1650.0,
    "Jaipur": 2000.0,
    "Ahmedabad": 1980.0,
    "Lucknow": 1720.0,
    "Chandigarh": 1750.0,
}

NASA_POWER_TIMEOUT = 8  # seconds
PVGIS_TIMEOUT = 8


def fetch_nasa_power_irradiance(lat: float, lon: float) -> dict:
    """
    Fetch annual horizontal irradiance from NASA POWER API.
    Parameter: ALLSKY_SFC_SW_DWN (all-sky surface shortwave downward irradiance)
    Returns dict with keys: annual_kwh_m2, monthly_kwh_m2 (list of 12), source, lat, lon.
    Raises RuntimeError on failure so caller can use fallback.
    """
    url = (
        f"https://power.larc.nasa.gov/api/temporal/climatology/point"
        f"?parameters=ALLSKY_SFC_SW_DWN"
        f"&community=RE"
        f"&longitude={lon}"
        f"&latitude={lat}"
        f"&format=JSON"
    )
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "SunSwitch-HackathonApp/1.0"})
        with urllib.request.urlopen(req, timeout=NASA_POWER_TIMEOUT) as resp:
            data = json.loads(resp.read().decode())

        monthly_raw = data["properties"]["parameter"]["ALLSKY_SFC_SW_DWN"]
        # NASA POWER returns monthly keys "01".."12" and "ANN"
        monthly_kwh = []
        for m in range(1, 13):
            key = f"{m:02d}"
            daily_kwh = monthly_raw.get(key, 0)
            # Convert daily kWh/m²/day → monthly: multiply by days in month
            days_in_month = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
            monthly_kwh.append(round(daily_kwh * days_in_month[m - 1], 1))

        annual = monthly_raw.get("ANN", sum(monthly_kwh) / 12)
        # ANN from NASA POWER is daily average → × 365
        annual_kwh = round(annual * 365, 1)

        return {
            "annual_kwh_m2": annual_kwh,
            "monthly_kwh_m2": monthly_kwh,
            "source": f"NASA POWER API (lat={lat}, lon={lon})",
            "lat": lat,
            "lon": lon,
            "api": "NASA_POWER",
            "is_fallback": False,
        }
    except Exception as exc:
        raise RuntimeError(f"NASA POWER API failed: {exc}") from exc


def fetch_pvgis_irradiance(lat: float, lon: float) -> dict:
    """
    Fetch annual horizontal irradiance from PVGIS API (EU Joint Research Centre).
    Free, no key needed.
    Returns same shape as fetch_nasa_power_irradiance.
    """
    url = (
        f"https://re.jrc.ec.europa.eu/api/v5_2/MRseries"
        f"?lat={lat}&lon={lon}"
        f"&outputformat=json"
        f"&browser=0"
    )
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "SunSwitch-HackathonApp/1.0"})
        with urllib.request.urlopen(req, timeout=PVGIS_TIMEOUT) as resp:
            data = json.loads(resp.read().decode())

        # PVGIS monthly radiation: "H(h)_m" in kWh/m²/month
        monthly_data = data.get("outputs", {}).get("monthly", [])
        monthly_kwh = [round(m.get("H(h)_m", 0), 1) for m in monthly_data[:12]]
        annual_kwh = round(sum(monthly_kwh), 1)

        return {
            "annual_kwh_m2": annual_kwh,
            "monthly_kwh_m2": monthly_kwh,
            "source": f"PVGIS API v5.2 (lat={lat}, lon={lon})",
            "lat": lat,
            "lon": lon,
            "api": "PVGIS",
            "is_fallback": False,
        }
    except Exception as exc:
        raise RuntimeError(f"PVGIS API failed: {exc}") from exc


def get_irradiance_with_confidence(lat: float, lon: float, city: Optional[str] = None) -> dict:
    """
    Fetch irradiance from NASA POWER. Optionally cross-check with PVGIS.
    Returns the NASA value as primary, with a confidence note.
    Falls back to city-based lookup, then to Delhi default.
    """
    nasa_data = None
    pvgis_data = None
    nasa_error = None
    pvgis_error = None

    try:
        nasa_data = fetch_nasa_power_irradiance(lat, lon)
    except RuntimeError as e:
        nasa_error = str(e)

    try:
        pvgis_data = fetch_pvgis_irradiance(lat, lon)
    except RuntimeError as e:
        pvgis_error = str(e)

    if nasa_data and pvgis_data:
        nasa_val = nasa_data["annual_kwh_m2"]
        pvgis_val = pvgis_data["annual_kwh_m2"]
        diff_pct = abs(nasa_val - pvgis_val) / max(pvgis_val, 1) * 100
        confidence = "High" if diff_pct < 5 else ("Medium" if diff_pct < 10 else "Low")
        return {
            **nasa_data,
            "pvgis_annual_kwh_m2": pvgis_val,
            "model_agreement_pct": round(diff_pct, 1),
            "model_confidence": confidence,
            "confidence_note": (
                f"NASA POWER and PVGIS differ by {diff_pct:.1f}%. "
                f"Confidence: {confidence}. Using NASA POWER value."
            ),
        }
    elif nasa_data:
        return {
            **nasa_data,
            "pvgis_annual_kwh_m2": None,
            "model_confidence": "Medium",
            "confidence_note": f"Only NASA POWER available (PVGIS error: {pvgis_error}). Cross-check unavailable.",
        }
    elif pvgis_data:
        return {
            **pvgis_data,
            "model_confidence": "Medium",
            "confidence_note": f"Only PVGIS available (NASA error: {nasa_error}). Using PVGIS value.",
        }
    else:
        # Full fallback
        fallback_val = CITY_IRRADIANCE_FALLBACK.get(city or "", 1800.0)
        fallback_city = city if city in CITY_IRRADIANCE_FALLBACK else "Delhi (default)"
        return {
            "annual_kwh_m2": fallback_val,
            "monthly_kwh_m2": [fallback_val / 12] * 12,
            "source": f"Bundled city average for {fallback_city} [LABELED FALLBACK – APIs unavailable]",
            "lat": lat,
            "lon": lon,
            "api": "FALLBACK",
            "is_fallback": True,
            "model_confidence": "Low",
            "confidence_note": (
                f"Both NASA POWER and PVGIS APIs failed. "
                f"Using bundled city average ({fallback_val} kWh/m²/yr) for {fallback_city}. "
                f"Errors – NASA: {nasa_error}; PVGIS: {pvgis_error}"
            ),
        }
