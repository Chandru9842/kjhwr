"""Pydantic schemas for UK Wind Intelligence backend API."""

from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field

class HealthResponse(BaseModel):
    status: str = Field(..., examples=["ok"])
    service: str = Field(..., examples=["uk-wind-intelligence-backend"])
    version: str = Field(..., examples=["1.0.0"])
    timestamp: str
    elexon_api: Dict[str, Any]

class SettlementIntervalSchema(BaseModel):
    id: str
    settlementDate: str
    settlementPeriod: int
    deliveryTime: str
    startTime: str
    actualMw: Optional[float] = None
    forecastMw: Optional[float] = None
    errorMw: Optional[float] = None
    absErrorMw: Optional[float] = None
    errorPercent: Optional[float] = None
    biasDirection: str = Field(..., examples=["over"])
    isPeak: bool
    selectedPublishTime: Optional[str] = None

class CapacityBandSchema(BaseModel):
    category: str
    period_count: int
    mean_error_mw: Optional[float] = None
    mae_mw: Optional[float] = None
    frequency_percent: float

class PublicationSummarySchema(BaseModel):
    id: str
    publication_type: str
    published_at: str
    records_count: int
    min_delivery_time: Optional[str] = None
    max_delivery_time: Optional[str] = None
    source: str
    status: str

class WindKpisSchema(BaseModel):
    mae_mw: Optional[float] = None
    rmse_mw: Optional[float] = None
    forecast_bias_mw: Optional[float] = None
    matched_data_coverage_percent: float
    total_settlement_periods: int
    matched_periods: int
    unmatched_periods: int

class AnalyticsMetadataSchema(BaseModel):
    start_date: str
    end_date: str
    decision_cutoff_time: str
    market_cutoff_rule: str
    market_uncertainty_explanation: str
    data_sources: List[str]
    retrieval_timestamp: str

class AnalyticsResponse(BaseModel):
    kpis: WindKpisSchema
    intervals: List[SettlementIntervalSchema]
    capacity_band_breakdown: List[CapacityBandSchema]
    publications_summary: List[PublicationSummarySchema]
    metadata: AnalyticsMetadataSchema

class DataDiagnosticsResponse(BaseModel):
    fuelhh_outturn: Dict[str, Any]
    windfor_forecasts: Dict[str, Any]
    matching_integrity: Dict[str, Any]
    decision_cutoff_specification: Dict[str, Any]
    cache_health: Dict[str, Any]
    diagnostics_timestamp: str
