"""Integration tests for FastAPI endpoints (/health, /diagnostics, /analytics)."""

import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, AsyncMock

from app.main import app

client = TestClient(app)

def test_health_endpoint():
    """Verify GET /health returns status 200 and healthy or degraded service state."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert "status" in data
    assert data["service"] == "uk-wind-intelligence-backend"
    assert "timestamp" in data
    assert "elexon_api" in data

def test_analytics_date_validation_error():
    """Verify invalid date order (start > end) returns HTTP 400."""
    response = client.get("/api/v1/analytics?start_date=2026-01-10&end_date=2026-01-05")
    assert response.status_code == 400
    data = response.json()
    assert "start_date cannot be after end_date" in data["detail"]

@patch("app.api.routes.elexon_client.fetch_fuelhh_wind_actuals", new_callable=AsyncMock)
@patch("app.api.routes.elexon_client.fetch_windfor_forecasts", new_callable=AsyncMock)
def test_analytics_mocked_end_to_end(mock_fetch_wf, mock_fetch_fuel):
    """Test full analytics endpoint pipeline with controlled mock data."""
    mock_fetch_fuel.return_value = [
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
            "generation": 10200.0,
        },
    ]

    mock_fetch_wf.return_value = [
        {
            "dataset": "WINDFOR",
            "publishTime": "2025-12-31T11:30:00Z",
            "startTime": "2026-01-01T00:00:00Z",
            "generation": 10500.0,
        }
    ]

    response = client.get("/api/v1/analytics?start_date=2026-01-01&end_date=2026-01-01&cutoff_time=12:00")
    assert response.status_code == 200
    data = response.json()
    
    assert "kpis" in data
    assert data["kpis"]["total_settlement_periods"] == 2
    assert data["kpis"]["matched_periods"] == 2
    assert data["kpis"]["matched_data_coverage_percent"] == 100.0
    
    # SP1: 10500 - 10000 = +500. SP2: 10500 - 10200 = +300.
    # MAE = (500 + 300) / 2 = 400.0 MW
    assert data["kpis"]["mae_mw"] == 400.0
    # Bias = (500 + 300) / 2 = +400.0 MW
    assert data["kpis"]["forecast_bias_mw"] == 400.0
    
    assert len(data["intervals"]) == 2
    assert data["intervals"][0]["deliveryTime"] == "00:00 - 00:30"
    assert data["intervals"][1]["deliveryTime"] == "00:30 - 01:00"
    
    assert "metadata" in data
    assert data["metadata"]["decision_cutoff_time"] == "12:00"
    assert "market_uncertainty_explanation" in data["metadata"]

@patch("app.api.routes.elexon_client.fetch_fuelhh_wind_actuals", new_callable=AsyncMock)
@patch("app.api.routes.elexon_client.fetch_windfor_forecasts", new_callable=AsyncMock)
def test_diagnostics_mocked(mock_fetch_wf, mock_fetch_fuel):
    """Test diagnostics endpoint with controlled mock data."""
    mock_fetch_fuel.return_value = [
        {"settlementDate": "2026-01-01", "settlementPeriod": 1, "startTime": "2026-01-01T00:00:00Z", "generation": 5000}
    ]
    mock_fetch_wf.return_value = [
        {"publishTime": "2025-12-31T11:30:00Z", "startTime": "2026-01-01T00:00:00Z", "generation": 5200}
    ]

    response = client.get("/api/v1/data/diagnostics?start_date=2026-01-01&end_date=2026-01-01")
    assert response.status_code == 200
    data = response.json()
    assert "fuelhh_outturn" in data
    assert "windfor_forecasts" in data
    assert "matching_integrity" in data
    assert "decision_cutoff_specification" in data
    assert "cache_health" in data
