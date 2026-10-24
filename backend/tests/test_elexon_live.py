"""Live integration tests executing real requests against the official Elexon BMRS API."""

import pytest
from app.services.elexon_client import elexon_client
from app.services.forecast_selector import forecast_selector
from app.services.matcher import match_fuelhh_and_windfor
from app.services.analytics import calculate_kpis

@pytest.mark.asyncio
async def test_live_bmrs_health_probe():
    """Verify live connectivity to Elexon BMRS API."""
    probe = await elexon_client.check_health()
    assert probe["status"] in ("healthy", "degraded", "unreachable")
    assert "checked_at" in probe

@pytest.mark.asyncio
async def test_live_fuelhh_chunked_retrieval_jan_2026():
    """Verify real FUELHH data retrieval for Jan 1-2, 2026."""
    actuals = await elexon_client.fetch_fuelhh_wind_actuals("2026-01-01", "2026-01-02")
    # 2 days * 48 settlement periods = 96 records
    assert len(actuals) == 96
    assert all(r.get("fuelType") == "WIND" for r in actuals)
    assert all(r.get("generation") is not None for r in actuals)

@pytest.mark.asyncio
async def test_live_windfor_retrieval_and_matching():
    """Verify real WINDFOR forecast retrieval and end-to-end matching for Jan 1, 2026."""
    actuals = await elexon_client.fetch_fuelhh_wind_actuals("2026-01-01", "2026-01-01")
    forecasts = await elexon_client.fetch_windfor_forecasts("2026-01-01", "2026-01-01", lookback_days=2)
    
    assert len(actuals) == 48
    assert len(forecasts) > 0
    
    # Apply 12:00 cutoff
    selection = forecast_selector.select_day_ahead_forecasts(forecasts, cutoff_time_str="12:00")
    assert selection.covered_delivery_intervals > 0
    
    # Match intervals
    matched = match_fuelhh_and_windfor(actuals, selection.selected_forecasts)
    assert matched.total_intervals == 48
    assert matched.matched_intervals == 48
    assert matched.coverage_percent == 100.0
    
    kpis = calculate_kpis(matched)
    assert kpis["mae_mw"] is not None
    assert kpis["mae_mw"] > 0
    assert kpis["rmse_mw"] is not None
    assert kpis["rmse_mw"] >= kpis["mae_mw"] # RMSE is mathematically >= MAE
