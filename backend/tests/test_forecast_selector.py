"""Unit tests for Day-Ahead forecast selection and decision cutoff enforcement."""

import pytest
from datetime import datetime, timezone
import pandas as pd

from app.services.forecast_selector import ForecastSelector

@pytest.fixture
def selector():
    return ForecastSelector(default_cutoff_time="12:00")

def test_cutoff_strict_exclusion_of_late_publications(selector):
    """Verify that any forecast published after D-1 at cutoff_time is strictly rejected."""
    # Target delivery interval: 2026-01-02 14:00:00Z (Day D = 2026-01-02)
    # Cutoff for 2026-01-02 is D-1 12:00 UTC -> 2026-01-01 12:00:00Z
    records = [
        # Eligible: published before cutoff
        {
            "dataset": "WINDFOR",
            "publishTime": "2026-01-01T09:30:00Z",
            "startTime": "2026-01-02T14:00:00Z",
            "generation": 8500
        },
        # Eligible: published right before cutoff (11:30)
        {
            "dataset": "WINDFOR",
            "publishTime": "2026-01-01T11:30:00Z",
            "startTime": "2026-01-02T14:00:00Z",
            "generation": 8900
        },
        # Ineligible: published 1 minute AFTER cutoff (12:01)
        {
            "dataset": "WINDFOR",
            "publishTime": "2026-01-01T12:01:00Z",
            "startTime": "2026-01-02T14:00:00Z",
            "generation": 9200
        },
        # Ineligible: published afternoon update (15:30)
        {
            "dataset": "WINDFOR",
            "publishTime": "2026-01-01T15:30:00Z",
            "startTime": "2026-01-02T14:00:00Z",
            "generation": 9800
        },
        # Ineligible: published on delivery day (intraday)
        {
            "dataset": "WINDFOR",
            "publishTime": "2026-01-02T10:00:00Z",
            "startTime": "2026-01-02T14:00:00Z",
            "generation": 10500
        },
    ]

    result = selector.select_day_ahead_forecasts(records, cutoff_time_str="12:00")
    
    assert result.covered_delivery_intervals == 1
    assert result.filtered_out_late_count == 3
    
    selected_row = result.selected_forecasts.iloc[0]
    # Must select the latest forecast BEFORE or AT cutoff (11:30, 8900 MW)
    assert selected_row["publishTime"] == "2026-01-01T11:30:00Z"
    assert selected_row["generation"] == 8900

def test_configurable_cutoff_time(selector):
    """Test switching cutoff from 11:00 to 17:00."""
    records = [
        # Early run (09:30)
        {"publishTime": "2026-01-01T09:30:00Z", "startTime": "2026-01-02T10:00:00Z", "generation": 5000},
        # Midday run (11:30)
        {"publishTime": "2026-01-01T11:30:00Z", "startTime": "2026-01-02T10:00:00Z", "generation": 5500},
        # Afternoon run (15:30)
        {"publishTime": "2026-01-01T15:30:00Z", "startTime": "2026-01-02T10:00:00Z", "generation": 6000},
    ]

    # With 11:00 cutoff -> Only 09:30 is eligible
    res_11 = selector.select_day_ahead_forecasts(records, cutoff_time_str="11:00")
    assert res_11.selected_forecasts.iloc[0]["publishTime"] == "2026-01-01T09:30:00Z"
    assert res_11.selected_forecasts.iloc[0]["generation"] == 5000

    # With 12:00 cutoff -> 11:30 is eligible
    res_12 = selector.select_day_ahead_forecasts(records, cutoff_time_str="12:00")
    assert res_12.selected_forecasts.iloc[0]["publishTime"] == "2026-01-01T11:30:00Z"
    assert res_12.selected_forecasts.iloc[0]["generation"] == 5500

    # With 17:00 cutoff -> 15:30 is eligible
    res_17 = selector.select_day_ahead_forecasts(records, cutoff_time_str="17:00")
    assert res_17.selected_forecasts.iloc[0]["publishTime"] == "2026-01-01T15:30:00Z"
    assert res_17.selected_forecasts.iloc[0]["generation"] == 6000

def test_empty_records_returns_graceful_empty_result(selector):
    """Test handling of empty forecast lists."""
    result = selector.select_day_ahead_forecasts([], cutoff_time_str="12:00")
    assert result.covered_delivery_intervals == 0
    assert result.total_delivery_intervals == 0
    assert result.selected_forecasts.empty
