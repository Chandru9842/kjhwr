"""Forecast selection service implementing configurable Day-Ahead decision cutoffs."""

import logging
from datetime import datetime, date, time, timedelta, timezone
from typing import Any, Dict, List, Optional, Tuple
import pandas as pd

from app.config import settings
from app.utils.time import parse_utc_datetime, format_iso_utc

logger = logging.getLogger(__name__)

MARKET_CUTOFF_DOCUMENTATION = {
    "default_cutoff_time_utc": settings.DEFAULT_CUTOFF_TIME,
    "market_context": "UK Great Britain Electricity Market (N2EX / EPEX SPOT / Elexon BSC)",
    "market_uncertainty_explanation": (
        "In the UK electricity market, the exact Day-Ahead decision cutoff depends on trading venue: "
        "1. EPEX SPOT and Nord Pool UK Day-Ahead power auctions close bid submission at 11:00 UTC on day D-1. "
        "2. National Grid ESO publishes its primary Day-Ahead national wind forecast run (WINDFOR) "
        "between 11:30 and 12:00 UTC on day D-1. "
        "3. Elexon BSC Day-Ahead reporting historically aligns with the 12:00 UTC gate closure. "
        "4. Intraday rolling updates continue at 15:30, 18:30, and 22:30 UTC. "
        "To reflect trading reality, the platform uses D-1 12:00 UTC as the default Day-Ahead cutoff "
        "(capturing the primary ESO post-11:30 WINDFOR run), while allowing the trader to configure "
        "earlier cutoffs (e.g., 11:00 UTC) or afternoon reconciliations (e.g., 17:00 UTC)."
    ),
    "cutoff_rule": "For delivery on day D, eligible forecasts must satisfy publishTime <= (D - 1 day at cutoff_time UTC). Latest eligible publishTime is chosen."
}

class ForecastSelectionResult:
    def __init__(
        self,
        selected_forecasts: pd.DataFrame,
        cutoff_time: str,
        total_delivery_intervals: int,
        covered_delivery_intervals: int,
        filtered_out_late_count: int,
        distinct_publications_used: int,
    ):
        self.selected_forecasts = selected_forecasts
        self.cutoff_time = cutoff_time
        self.total_delivery_intervals = total_delivery_intervals
        self.covered_delivery_intervals = covered_delivery_intervals
        self.filtered_out_late_count = filtered_out_late_count
        self.distinct_publications_used = distinct_publications_used

class ForecastSelector:
    def __init__(self, default_cutoff_time: Optional[str] = None):
        self.default_cutoff_time = default_cutoff_time or settings.DEFAULT_CUTOFF_TIME

    def parse_cutoff_time_str(self, cutoff_str: str) -> time:
        """Parse 'HH:MM' string into time object."""
        try:
            parts = cutoff_str.strip().split(":")
            hour = int(parts[0])
            minute = int(parts[1]) if len(parts) > 1 else 0
            if not (0 <= hour <= 23 and 0 <= minute <= 59):
                raise ValueError()
            return time(hour, minute, 0)
        except Exception:
            raise ValueError(f"Invalid cutoff_time format: '{cutoff_str}'. Expected 'HH:MM' (e.g. '12:00' or '11:00').")

    def select_day_ahead_forecasts(
        self,
        windfor_records: List[Dict[str, Any]],
        cutoff_time_str: Optional[str] = None,
    ) -> ForecastSelectionResult:
        """
        Select Day-Ahead forecast for each delivery interval.
        
        Strict constraint:
        For target delivery date D, only forecasts with:
            publishTime <= D - 1 day at cutoff_time UTC
        are eligible. Any forecast published after cutoff is strictly excluded.
        """
        cutoff_str = cutoff_time_str or self.default_cutoff_time
        cutoff_time_obj = self.parse_cutoff_time_str(cutoff_str)
        
        if not windfor_records:
            empty_df = pd.DataFrame(columns=["startTime", "publishTime", "generation", "cutoff_timestamp"])
            return ForecastSelectionResult(empty_df, cutoff_str, 0, 0, 0, 0)
            
        df = pd.DataFrame(windfor_records)
        df["publish_dt"] = pd.to_datetime(df["publishTime"], utc=True)
        df["start_dt"] = pd.to_datetime(df["startTime"], utc=True)
        
        # Delivery date D
        df["delivery_date"] = df["start_dt"].dt.date
        
        # Calculate D-1 at cutoff_time UTC
        def calc_cutoff(d: date) -> pd.Timestamp:
            d_prev = d - timedelta(days=1)
            return pd.Timestamp(
                year=d_prev.year,
                month=d_prev.month,
                day=d_prev.day,
                hour=cutoff_time_obj.hour,
                minute=cutoff_time_obj.minute,
                second=0,
                tz="UTC"
            )
            
        unique_dates = df["delivery_date"].unique()
        cutoff_map = {d: calc_cutoff(d) for d in unique_dates}
        df["cutoff_timestamp"] = df["delivery_date"].map(cutoff_map)
        
        # Filter: publishTime <= cutoff_timestamp (DO NOT select forecasts published after decision time!)
        eligible_mask = df["publish_dt"] <= df["cutoff_timestamp"]
        filtered_out_late_count = int((~eligible_mask).sum())
        eligible_df = df[eligible_mask].copy()
        
        total_intervals = df["start_dt"].nunique()
        
        if eligible_df.empty:
            logger.warning(f"No WINDFOR forecasts were published prior to cutoff {cutoff_str} for available records.")
            empty_df = pd.DataFrame(columns=["startTime", "publishTime", "generation", "cutoff_timestamp"])
            return ForecastSelectionResult(empty_df, cutoff_str, total_intervals, 0, filtered_out_late_count, 0)
            
        # For each unique delivery start_dt, pick the latest published forecast among eligible ones
        selected_df = (
            eligible_df.sort_values("publish_dt")
            .groupby("start_dt")
            .last()
            .reset_index()
        )
        
        covered_intervals = len(selected_df)
        distinct_pubs = int(selected_df["publish_dt"].nunique())
        
        return ForecastSelectionResult(
            selected_forecasts=selected_df,
            cutoff_time=cutoff_str,
            total_delivery_intervals=total_intervals,
            covered_delivery_intervals=covered_intervals,
            filtered_out_late_count=filtered_out_late_count,
            distinct_publications_used=distinct_pubs,
        )

forecast_selector = ForecastSelector()
