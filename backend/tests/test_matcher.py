"""Unit tests for half-hourly to hourly interval matching between FUELHH and WINDFOR."""

import pytest
import pandas as pd
import numpy as np

from app.services.matcher import match_fuelhh_and_windfor

def test_matching_half_hourly_actuals_to_hourly_forecast():
    """Verify that SP 1 (00:00) and SP 2 (00:30) correctly inherit the 00:00 hour forecast."""
    fuelhh_records = [
        {
            "dataset": "FUELHH",
            "settlementDate": "2026-01-01",
            "settlementPeriod": 1,
            "startTime": "2026-01-01T00:00:00Z",
            "fuelType": "WIND",
            "generation": 10000.0,
        },
        {
            "dataset": "FUELHH",
            "settlementDate": "2026-01-01",
            "settlementPeriod": 2,
            "startTime": "2026-01-01T00:30:00Z",
            "fuelType": "WIND",
            "generation": 10500.0,
        },
    ]

    selected_forecast_df = pd.DataFrame([
        {
            "start_dt": pd.Timestamp("2026-01-01 00:00:00", tz="UTC"),
            "generation": 11000.0,
            "publishTime": "2025-12-31T11:30:00Z",
        }
    ])

    result = match_fuelhh_and_windfor(fuelhh_records, selected_forecast_df)
    
    assert result.total_intervals == 2
    assert result.matched_intervals == 2
    assert result.coverage_percent == 100.0
    
    df = result.matched_df
    # SP 1: Forecast 11000, Actual 10000 -> Error +1000 (Over)
    row_sp1 = df[df["settlementPeriod"] == 1].iloc[0]
    assert row_sp1["forecastMw"] == 11000.0
    assert row_sp1["actualMw"] == 10000.0
    assert row_sp1["errorMw"] == 1000.0
    assert row_sp1["biasDirection"] == "over"
    assert row_sp1["deliveryTime"] == "00:00 - 00:30"
    
    # SP 2: Forecast 11000, Actual 10500 -> Error +500 (Over)
    row_sp2 = df[df["settlementPeriod"] == 2].iloc[0]
    assert row_sp2["forecastMw"] == 11000.0
    assert row_sp2["actualMw"] == 10500.0
    assert row_sp2["errorMw"] == 500.0
    assert row_sp2["biasDirection"] == "over"
    assert row_sp2["deliveryTime"] == "00:30 - 01:00"

def test_matching_with_missing_forecast():
    """Verify handling when forecast for an hour is missing (coverage degradation)."""
    fuelhh_records = [
        {
            "dataset": "FUELHH",
            "settlementDate": "2026-01-01",
            "settlementPeriod": 1,
            "startTime": "2026-01-01T00:00:00Z",
            "fuelType": "WIND",
            "generation": 8000.0,
        },
        {
            "dataset": "FUELHH",
            "settlementDate": "2026-01-01",
            "settlementPeriod": 3,
            "startTime": "2026-01-01T01:00:00Z",
            "fuelType": "WIND",
            "generation": 8200.0,
        },
    ]

    # Forecast only provided for 00:00, missing for 01:00
    selected_forecast_df = pd.DataFrame([
        {
            "start_dt": pd.Timestamp("2026-01-01 00:00:00", tz="UTC"),
            "generation": 8500.0,
            "publishTime": "2025-12-31T11:30:00Z",
        }
    ])

    result = match_fuelhh_and_windfor(fuelhh_records, selected_forecast_df)
    assert result.total_intervals == 2
    assert result.matched_intervals == 1
    assert result.unmatched_intervals == 1
    assert result.coverage_percent == 50.0

    df = result.matched_df
    row_unmatched = df[df["settlementPeriod"] == 3].iloc[0]
    assert np.isnan(row_unmatched["forecastMw"])
    assert row_unmatched["biasDirection"] == "unmatched"
