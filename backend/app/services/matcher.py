"""Delivery interval alignment and matching between actual outturn (FUELHH) and forecast (WINDFOR)."""

import logging
from typing import Any, Dict, List, Optional, Tuple
import numpy as np
import pandas as pd

from app.utils.time import settlement_period_to_time_window, is_peak_settlement_period, format_iso_utc

logger = logging.getLogger(__name__)

class MatchedIntervalResult:
    def __init__(
        self,
        matched_df: pd.DataFrame,
        total_intervals: int,
        matched_intervals: int,
        unmatched_intervals: int,
        coverage_percent: float,
    ):
        self.matched_df = matched_df
        self.total_intervals = total_intervals
        self.matched_intervals = matched_intervals
        self.unmatched_intervals = unmatched_intervals
        self.coverage_percent = coverage_percent

def match_fuelhh_and_windfor(
    fuelhh_records: List[Dict[str, Any]],
    selected_forecast_df: pd.DataFrame,
) -> MatchedIntervalResult:
    """
    Match actual wind generation records (FUELHH) with Day-Ahead selected forecasts (WINDFOR).
    
    UK Grid Alignment:
    FUELHH outturn is recorded half-hourly (SP 1 to 48 per day, e.g. 00:00 and 00:30).
    WINDFOR forecast is published as hourly average power (MW).
    Each half-hourly interval is mapped to its delivery hour (floored to :00) to pair
    with the applicable Day-Ahead forecast.
    """
    if not fuelhh_records:
        empty_df = pd.DataFrame(columns=[
            "id", "settlementDate", "settlementPeriod", "deliveryTime", "startTime",
            "actualMw", "forecastMw", "errorMw", "absErrorMw", "errorPercent",
            "biasDirection", "isPeak", "selectedPublishTime"
        ])
        return MatchedIntervalResult(empty_df, 0, 0, 0, 0.0)
        
    df_actual = pd.DataFrame(fuelhh_records).copy()
    df_actual["start_dt"] = pd.to_datetime(df_actual["startTime"], utc=True)
    df_actual["actualMw"] = pd.to_numeric(df_actual["generation"], errors="coerce")
    
    # Map half-hour start_dt to parent hour start (e.g. 00:30 -> 00:00)
    df_actual["hour_dt"] = df_actual["start_dt"].dt.floor("h")
    
    if selected_forecast_df.empty:
        df_actual["forecastMw"] = np.nan
        df_actual["selectedPublishTime"] = None
        df_actual["errorMw"] = np.nan
        df_actual["absErrorMw"] = np.nan
        df_actual["errorPercent"] = np.nan
        df_actual["biasDirection"] = "unmatched"
        matched_df = df_actual
    else:
        df_fc = selected_forecast_df.copy()
        df_fc["start_dt"] = pd.to_datetime(df_fc["start_dt"], utc=True)
        df_fc["forecastMw"] = pd.to_numeric(df_fc["generation"], errors="coerce")
        df_fc["selectedPublishTime"] = df_fc["publishTime"]
        
        # Merge actuals with forecasts on hour_dt == forecast start_dt
        merged = pd.merge(
            df_actual,
            df_fc[["start_dt", "forecastMw", "selectedPublishTime"]],
            left_on="hour_dt",
            right_on="start_dt",
            how="left",
            suffixes=("", "_fc_dup"),
        )
        
        # Calculate error metrics
        merged["errorMw"] = merged["forecastMw"] - merged["actualMw"]
        merged["absErrorMw"] = merged["errorMw"].abs()
        
        # Relative error % = |Error| / Actual * 100
        merged["errorPercent"] = np.where(
            merged["actualMw"] > 0,
            (merged["absErrorMw"] / merged["actualMw"] * 100.0).round(2),
            np.nan
        )
        
        # Bias direction
        conditions = [
            merged["errorMw"] > 0,
            merged["errorMw"] < 0,
            merged["errorMw"] == 0,
        ]
        choices = ["over", "under", "exact"]
        merged["biasDirection"] = np.select(conditions, choices, default="unmatched")
        
        matched_df = merged
        
    # Format standard fields
    matched_df["id"] = (
        "SP-" + matched_df["settlementDate"].astype(str) + 
        "-SP" + matched_df["settlementPeriod"].astype(str).str.zfill(2)
    )
    matched_df["deliveryTime"] = matched_df["settlementPeriod"].apply(settlement_period_to_time_window)
    matched_df["isPeak"] = matched_df["settlementPeriod"].apply(is_peak_settlement_period)
    
    # Sort chronologically
    matched_df.sort_values(["settlementDate", "settlementPeriod"], inplace=True)
    
    total_count = len(matched_df)
    matched_mask = matched_df["actualMw"].notna() & matched_df["forecastMw"].notna()
    matched_count = int(matched_mask.sum())
    unmatched_count = total_count - matched_count
    coverage_pct = round((matched_count / total_count * 100.0), 2) if total_count > 0 else 0.0
    
    return MatchedIntervalResult(
        matched_df=matched_df,
        total_intervals=total_count,
        matched_intervals=matched_count,
        unmatched_intervals=unmatched_count,
        coverage_percent=coverage_pct,
    )
