"""Unit tests for KPI mathematical formulas (MAE, RMSE, Bias) and capacity band segmentation."""

import pytest
import pandas as pd
import numpy as np

from app.services.analytics import calculate_kpis, calculate_capacity_band_breakdown, check_missing_settlement_data
from app.services.matcher import MatchedIntervalResult

def test_kpi_mathematical_precision():
    """Verify MAE, RMSE, and Bias calculations against exact analytical values."""
    # Test vectors:
    # Actuals:   [100, 200, 300, 400]
    # Forecasts: [110, 190, 320, 380]
    # Errors:    [+10, -10, +20, -20]
    # |Errors|:  [ 10,  10,  20,  20]
    # Errors^2:  [100, 100, 400, 400]
    # MAE = (10 + 10 + 20 + 20) / 4 = 60 / 4 = 15.0 MW
    # RMSE = sqrt((100 + 100 + 400 + 400) / 4) = sqrt(1000 / 4) = sqrt(250) ≈ 15.811 MW
    # Bias = (10 - 10 + 20 - 20) / 4 = 0.0 MW
    
    df = pd.DataFrame({
        "actualMw": [100.0, 200.0, 300.0, 400.0],
        "forecastMw": [110.0, 190.0, 320.0, 380.0],
    })
    
    mock_result = MatchedIntervalResult(
        matched_df=df,
        total_intervals=4,
        matched_intervals=4,
        unmatched_intervals=0,
        coverage_percent=100.0
    )
    
    kpis = calculate_kpis(mock_result)
    assert kpis["mae_mw"] == 15.0
    assert kpis["rmse_mw"] == round(np.sqrt(250), 2)
    assert kpis["forecast_bias_mw"] == 0.0
    assert kpis["matched_data_coverage_percent"] == 100.0
    assert kpis["total_settlement_periods"] == 4
    assert kpis["matched_periods"] == 4

def test_kpi_with_nonzero_bias():
    """Verify positive bias (persistent over-forecasting) is accurately computed."""
    df = pd.DataFrame({
        "actualMw": [1000.0, 2000.0],
        "forecastMw": [1100.0, 2200.0], # Errors: +100, +200
    })
    
    mock_result = MatchedIntervalResult(
        matched_df=df,
        total_intervals=2,
        matched_intervals=2,
        unmatched_intervals=0,
        coverage_percent=100.0
    )
    
    kpis = calculate_kpis(mock_result)
    assert kpis["mae_mw"] == 150.0
    assert kpis["forecast_bias_mw"] == 150.0
    assert kpis["rmse_mw"] == round(np.sqrt((100**2 + 200**2)/2), 2)

def test_capacity_band_breakdown():
    """Verify categorization into Low, Medium, High, Storm capacity bands."""
    df = pd.DataFrame({
        "actualMw": [3000.0, 7500.0, 12000.0, 16000.0],
        "forecastMw": [3200.0, 7800.0, 12500.0, 15500.0],
    })
    
    bands = calculate_capacity_band_breakdown(df)
    assert len(bands) == 4
    
    # Low Wind (< 5000 MW): actual 3000 -> count 1, bias +200, mae 200
    low = next(b for b in bands if "Low Wind" in b["category"])
    assert low["period_count"] == 1
    assert low["mean_error_mw"] == 200.0
    assert low["mae_mw"] == 200.0
    assert low["frequency_percent"] == 25.0
    
    # Extreme (> 15000 MW): actual 16000 -> count 1, error 15500 - 16000 = -500
    storm = next(b for b in bands if "Extreme" in b["category"])
    assert storm["period_count"] == 1
    assert storm["mean_error_mw"] == -500.0
    assert storm["mae_mw"] == 500.0

def test_missing_settlement_audit():
    """Verify check_missing_settlement_data flags missing settlement periods."""
    records = []
    # Day 1: complete (48 periods)
    for sp in range(1, 49):
        records.append({"settlementDate": "2026-01-01", "settlementPeriod": sp})
    # Day 2: incomplete (only 40 periods)
    for sp in range(1, 41):
        records.append({"settlementDate": "2026-01-02", "settlementPeriod": sp})

    audit = check_missing_settlement_data(records, expected_days=2)
    assert not audit["is_complete"]
    assert audit["total_received_periods"] == 88
    assert audit["total_expected_periods"] == 96
    assert audit["incomplete_dates_count"] == 1
    assert "2026-01-02" in audit["incomplete_dates_detail"]
    assert len(audit["incomplete_dates_detail"]["2026-01-02"]) == 8 # SP 41 to 48 missing
