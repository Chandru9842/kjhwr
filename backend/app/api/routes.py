"""FastAPI route handlers for UK Wind Intelligence backend."""

import logging
from datetime import datetime, timezone
from typing import Optional
import numpy as np
from fastapi import APIRouter, HTTPException, Query

from app.config import settings
from app.services.elexon_client import elexon_client, ElexonClientError
from app.services.forecast_selector import forecast_selector, MARKET_CUTOFF_DOCUMENTATION
from app.services.matcher import match_fuelhh_and_windfor
from app.services.analytics import (
    calculate_kpis, 
    calculate_capacity_band_breakdown, 
    extract_publication_summary,
    check_missing_settlement_data
)
from app.services.cache import cache_service
from app.utils.time import format_iso_utc
from app.api.schemas import (
    HealthResponse, 
    DataDiagnosticsResponse, 
    AnalyticsResponse,
    WindKpisSchema,
    AnalyticsMetadataSchema,
    SettlementIntervalSchema,
    CapacityBandSchema,
    PublicationSummarySchema
)

logger = logging.getLogger(__name__)
router = APIRouter()

@router.get("/health", response_model=HealthResponse, tags=["System"])
async def get_health():
    """Health check endpoint probing service status and Elexon BMRS endpoint connectivity."""
    elexon_status = await elexon_client.check_health()
    now_str = format_iso_utc(datetime.now(timezone.utc))
    
    overall_status = "healthy" if elexon_status.get("status") in ("healthy", "degraded") else "degraded"
    
    return HealthResponse(
        status=overall_status,
        service=settings.SERVICE_NAME,
        version=settings.SERVICE_VERSION,
        timestamp=now_str,
        elexon_api=elexon_status
    )

@router.get("/api/v1/data/diagnostics", response_model=DataDiagnosticsResponse, tags=["Diagnostics"])
async def get_data_diagnostics(
    start_date: str = Query(settings.DEFAULT_START_DATE, description="Start date (YYYY-MM-DD)"),
    end_date: str = Query(settings.DEFAULT_END_DATE, description="End date (YYYY-MM-DD)"),
    cutoff_time: str = Query(settings.DEFAULT_CUTOFF_TIME, description="Cutoff time (HH:MM)"),
    force_refresh: bool = Query(False, description="Bypass cache and query Elexon API directly")
):
    """
    Data diagnostics endpoint inspecting raw record counts, date bounds,
    missing settlement periods, publication timestamps, and caching performance.
    """
    try:
        # Fetch both datasets
        fuelhh_records = await elexon_client.fetch_fuelhh_wind_actuals(start_date, end_date, force_refresh)
        windfor_records = await elexon_client.fetch_windfor_forecasts(start_date, end_date, lookback_days=2, force_refresh=force_refresh)
        
        # Apply forecast selection
        selector_result = forecast_selector.select_day_ahead_forecasts(windfor_records, cutoff_time)
        
        # Match intervals
        matched_result = match_fuelhh_and_windfor(fuelhh_records, selector_result.selected_forecasts)
        
        # Calculate expected days
        d_start = datetime.strptime(start_date, "%Y-%m-%d").date()
        d_end = datetime.strptime(end_date, "%Y-%m-%d").date()
        expected_days = (d_end - d_start).days + 1
        
        missing_audit = check_missing_settlement_data(fuelhh_records, expected_days)
        cache_stats = cache_service.get_stats()
        
        return DataDiagnosticsResponse(
            fuelhh_outturn={
                "dataset": "FUELHH (fuelType=WIND)",
                "total_records_ingested": len(fuelhh_records),
                "expected_settlement_periods": expected_days * 48,
                "missing_settlement_audit": missing_audit,
                "min_settlement_date": fuelhh_records[0].get("settlementDate") if fuelhh_records else None,
                "max_settlement_date": fuelhh_records[-1].get("settlementDate") if fuelhh_records else None,
            },
            windfor_forecasts={
                "dataset": "WINDFOR (National Wind Generation Forecast)",
                "total_records_ingested": len(windfor_records),
                "distinct_publication_runs": len(set(r.get("publishTime") for r in windfor_records)),
                "min_delivery_time": min((r.get("startTime") for r in windfor_records), default=None),
                "max_delivery_time": max((r.get("startTime") for r in windfor_records), default=None),
            },
            matching_integrity={
                "total_intervals": matched_result.total_intervals,
                "matched_intervals": matched_result.matched_intervals,
                "unmatched_intervals": matched_result.unmatched_intervals,
                "coverage_percent": matched_result.coverage_percent,
                "is_complete_month_coverage": (
                    matched_result.total_intervals == 1488 and 
                    matched_result.coverage_percent >= 99.0 and 
                    start_date == "2026-01-01" and 
                    end_date == "2026-01-31"
                ),
            },
            decision_cutoff_specification={
                "cutoff_time_used": cutoff_time,
                "filtered_out_post_cutoff_count": selector_result.filtered_out_late_count,
                "covered_delivery_intervals": selector_result.covered_delivery_intervals,
                "documentation": MARKET_CUTOFF_DOCUMENTATION,
            },
            cache_health=cache_stats,
            diagnostics_timestamp=format_iso_utc(datetime.now(timezone.utc)),
        )
    except HTTPException:
        raise
    except ElexonClientError as e:
        raise HTTPException(status_code=e.status_code or 502, detail=str(e))
    except Exception as e:
        logger.exception("Unexpected error in diagnostics")
        raise HTTPException(status_code=500, detail=f"Diagnostics calculation error: {str(e)}")

@router.get("/api/v1/analytics", response_model=AnalyticsResponse, tags=["Analytics"])
async def get_analytics(
    start_date: str = Query(settings.DEFAULT_START_DATE, description="Start date (YYYY-MM-DD)"),
    end_date: str = Query(settings.DEFAULT_END_DATE, description="End date (YYYY-MM-DD)"),
    cutoff_time: str = Query(settings.DEFAULT_CUTOFF_TIME, description="Cutoff time (HH:MM)"),
    force_refresh: bool = Query(False, description="Bypass cache and query Elexon API directly")
):
    """
    Primary analytics endpoint calculating MAE, RMSE, forecast bias, matched coverage,
    and returning verified half-hourly settlement reconciliation records for UK electricity traders.
    """
    try:
        # Validate date formats
        try:
            d_start = datetime.strptime(start_date, "%Y-%m-%d").date()
            d_end = datetime.strptime(end_date, "%Y-%m-%d").date()
            if d_start > d_end:
                raise ValueError("start_date cannot be after end_date")
        except ValueError as ve:
            raise HTTPException(status_code=400, detail=str(ve))
            
        # 1. Fetch FUELHH outturn records (filtered fuelType=WIND)
        fuelhh_records = await elexon_client.fetch_fuelhh_wind_actuals(
            start_date=start_date, 
            end_date=end_date, 
            force_refresh=force_refresh
        )
        
        # 2. Fetch WINDFOR forecast records (lookback 2 days for day-ahead releases)
        windfor_records = await elexon_client.fetch_windfor_forecasts(
            start_date=start_date, 
            end_date=end_date, 
            lookback_days=2, 
            force_refresh=force_refresh
        )
        
        # 3. Apply Day-Ahead decision cutoff selection (no future leaks!)
        selector_result = forecast_selector.select_day_ahead_forecasts(
            windfor_records=windfor_records, 
            cutoff_time_str=cutoff_time
        )
        
        # 4. Match forecasts to actuals by delivery interval
        matched_result = match_fuelhh_and_windfor(
            fuelhh_records=fuelhh_records,
            selected_forecast_df=selector_result.selected_forecasts
        )
        
        # 5. Calculate KPI metrics (MAE, RMSE, Bias, Coverage)
        kpi_metrics = calculate_kpis(matched_result)
        
        # 6. Calculate capacity band error distribution breakdown
        band_breakdown = calculate_capacity_band_breakdown(matched_result.matched_df)
        
        # 7. Extract publication history audit trail
        publications = extract_publication_summary(windfor_records)
        
        # 8. Convert intervals to clean dictionary models
        df = matched_result.matched_df
        # Replace NaN with None for valid JSON serialization
        df_clean = df.replace({np.nan: None})
        
        intervals_list = []
        for _, row in df_clean.iterrows():
            intervals_list.append(SettlementIntervalSchema(
                id=str(row["id"]),
                settlementDate=str(row["settlementDate"]),
                settlementPeriod=int(row["settlementPeriod"]),
                deliveryTime=str(row["deliveryTime"]),
                startTime=str(row["startTime"]),
                actualMw=float(row["actualMw"]) if row["actualMw"] is not None else None,
                forecastMw=float(row["forecastMw"]) if row["forecastMw"] is not None else None,
                errorMw=float(row["errorMw"]) if row["errorMw"] is not None else None,
                absErrorMw=float(row["absErrorMw"]) if row["absErrorMw"] is not None else None,
                errorPercent=float(row["errorPercent"]) if row["errorPercent"] is not None else None,
                biasDirection=str(row["biasDirection"]),
                isPeak=bool(row["isPeak"]),
                selectedPublishTime=str(row["selectedPublishTime"]) if row["selectedPublishTime"] is not None else None,
            ))
            
        now_str = format_iso_utc(datetime.now(timezone.utc))
        
        return AnalyticsResponse(
            kpis=WindKpisSchema(**kpi_metrics),
            intervals=intervals_list,
            capacity_band_breakdown=[CapacityBandSchema(**b) for b in band_breakdown],
            publications_summary=[PublicationSummarySchema(**p) for p in publications[:50]], # Top 50 recent runs
            metadata=AnalyticsMetadataSchema(
                start_date=start_date,
                end_date=end_date,
                decision_cutoff_time=cutoff_time,
                market_cutoff_rule=MARKET_CUTOFF_DOCUMENTATION["cutoff_rule"],
                market_uncertainty_explanation=MARKET_CUTOFF_DOCUMENTATION["market_uncertainty_explanation"],
                data_sources=["Elexon BMRS FUELHH (WIND)", "Elexon BMRS WINDFOR"],
                retrieval_timestamp=now_str,
            )
        )
    except HTTPException:
        raise
    except ElexonClientError as e:
        raise HTTPException(status_code=e.status_code or 502, detail=str(e))
    except Exception as e:
        logger.exception("Unexpected error in analytics calculation")
        raise HTTPException(status_code=500, detail=f"Analytics calculation error: {str(e)}")
