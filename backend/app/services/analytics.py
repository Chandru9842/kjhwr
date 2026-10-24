"""Analytics service computing MAE, RMSE, Bias, Coverage, and Capacity Band Breakdowns."""

import logging
from typing import Any, Dict, List, Optional
import numpy as np
import pandas as pd

from app.services.forecast_selector import MARKET_CUTOFF_DOCUMENTATION
from app.services.cache import cache_service
from app.services.matcher import MatchedIntervalResult
from app.utils.time import format_iso_utc

logger = logging.getLogger(__name__)

def calculate_kpis(matched_result: MatchedIntervalResult) -> Dict[str, Any]:
    """Calculate MAE, RMSE, Bias, and Matched Coverage from matched intervals."""
    df = matched_result.matched_df
    matched_rows = df[df["actualMw"].notna() & df["forecastMw"].notna()]
    
    if matched_rows.empty:
        return {
            "mae_mw": None,
            "rmse_mw": None,
            "forecast_bias_mw": None,
            "matched_data_coverage_percent": 0.0,
            "total_settlement_periods": matched_result.total_intervals,
            "matched_periods": 0,
            "unmatched_periods": matched_result.total_intervals,
        }
        
    actual = matched_rows["actualMw"].to_numpy()
    forecast = matched_rows["forecastMw"].to_numpy()
    errors = forecast - actual
    
    mae = float(np.mean(np.abs(errors)))
    rmse = float(np.sqrt(np.mean(errors ** 2)))
    bias = float(np.mean(errors))
    
    return {
        "mae_mw": round(mae, 2),
        "rmse_mw": round(rmse, 2),
        "forecast_bias_mw": round(bias, 2),
        "matched_data_coverage_percent": matched_result.coverage_percent,
        "total_settlement_periods": matched_result.total_intervals,
        "matched_periods": matched_result.matched_intervals,
        "unmatched_periods": matched_result.unmatched_intervals,
    }

def calculate_capacity_band_breakdown(matched_df: pd.DataFrame) -> List[Dict[str, Any]]:
    """Compute error distribution and bias segmented by national wind generation capacity tiers."""
    matched = matched_df[matched_df["actualMw"].notna() & matched_df["forecastMw"].notna()].copy()
    total_matched = len(matched)
    
    if total_matched == 0:
        return []
        
    bands = [
        {"name": "Low Wind (< 5,000 MW)", "min": 0, "max": 5000},
        {"name": "Medium Wind (5k - 10k MW)", "min": 5000, "max": 10000},
        {"name": "High Wind (10k - 15k MW)", "min": 10000, "max": 15000},
        {"name": "Extreme / Storm (> 15,000 MW)", "min": 15000, "max": float("inf")},
    ]
    
    results = []
    for b in bands:
        subset = matched[(matched["actualMw"] >= b["min"]) & (matched["actualMw"] < b["max"])]
        count = len(subset)
        if count > 0:
            errs = (subset["forecastMw"] - subset["actualMw"]).to_numpy()
            b_mae = float(np.mean(np.abs(errs)))
            b_bias = float(np.mean(errs))
            freq = round((count / total_matched * 100.0), 1)
        else:
            b_mae = None
            b_bias = None
            freq = 0.0
            
        results.append({
            "category": b["name"],
            "period_count": count,
            "mean_error_mw": round(b_bias, 1) if b_bias is not None else None,
            "mae_mw": round(b_mae, 1) if b_mae is not None else None,
            "frequency_percent": freq,
        })
        
    return results

def extract_publication_summary(windfor_records: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Extract audit summary of distinct WINDFOR gate closure publication runs."""
    if not windfor_records:
        return []
        
    df = pd.DataFrame(windfor_records)
    grouped = df.groupby("publishTime").agg(
        records_count=("startTime", "count"),
        min_delivery=("startTime", "min"),
        max_delivery=("startTime", "max"),
    ).reset_index()
    
    grouped.sort_values("publishTime", ascending=False, inplace=True)
    
    summaries = []
    for _, row in grouped.iterrows():
        pub_time = row["publishTime"]
        # Distinguish Day-Ahead gate closure (approx 11:30 - 12:00 UTC) vs Intraday
        hour_part = pub_time[11:16] if len(pub_time) >= 16 else ""
        if "11:" in hour_part or "12:" in hour_part:
            pub_type = "Day-Ahead Gate Closure"
        elif "15:" in hour_part or "17:" in hour_part:
            pub_type = "Afternoon ESO Update"
        elif "02:" in hour_part or "04:" in hour_part or "07:" in hour_part:
            pub_type = "Morning NWP Run"
        else:
            pub_type = "Intraday Rolling Run"
            
        summaries.append({
            "id": f"PUB-{pub_time.replace(':', '').replace('-', '').replace('Z', '')}",
            "publication_type": pub_type,
            "published_at": pub_time,
            "records_count": int(row["records_count"]),
            "min_delivery_time": row["min_delivery"],
            "max_delivery_time": row["max_delivery"],
            "source": "Elexon BMRS WINDFOR",
            "status": "Verified",
        })
        
    return summaries

def check_missing_settlement_data(fuelhh_records: List[Dict[str, Any]], expected_days: int) -> Dict[str, Any]:
    """Audit settlement period monotonicity and completeness for the requested date window."""
    if not fuelhh_records:
        return {
            "status": "empty",
            "missing_settlement_dates": [],
            "incomplete_dates": {},
            "total_expected_periods": expected_days * 48,
            "total_received_periods": 0,
        }
        
    df = pd.DataFrame(fuelhh_records)
    received_by_date = df.groupby("settlementDate")["settlementPeriod"].unique().to_dict()
    
    incomplete_dates = {}
    for s_date, periods in received_by_date.items():
        if len(periods) < 48:
            missing_sps = sorted(list(set(range(1, 49)) - set(periods)))
            incomplete_dates[s_date] = missing_sps
            
    total_received = len(df)
    total_expected = expected_days * 48
    is_complete = (total_received == total_expected) and len(incomplete_dates) == 0
    
    return {
        "is_complete": is_complete,
        "total_expected_periods": total_expected,
        "total_received_periods": total_received,
        "unique_settlement_days": df["settlementDate"].nunique(),
        "incomplete_dates_count": len(incomplete_dates),
        "incomplete_dates_detail": incomplete_dates,
    }
