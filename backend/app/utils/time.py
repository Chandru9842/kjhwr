"""Time and settlement period utility functions for UK electricity market data."""

from datetime import datetime, timezone, timedelta, date
from typing import List, Tuple, Union

def parse_utc_datetime(dt_input: Union[str, datetime, date]) -> datetime:
    """Parse a datetime input and normalize to UTC timezone-aware datetime."""
    if isinstance(dt_input, datetime):
        if dt_input.tzinfo is None:
            return dt_input.replace(tzinfo=timezone.utc)
        return dt_input.astimezone(timezone.utc)
    
    if isinstance(dt_input, date):
        return datetime(dt_input.year, dt_input.month, dt_input.day, 0, 0, 0, tzinfo=timezone.utc)
    
    if isinstance(dt_input, str):
        cleaned = dt_input.strip()
        # Handle trailing Z
        if cleaned.endswith("Z"):
            cleaned = cleaned[:-1] + "+00:00"
        
        # Try fromisoformat first
        try:
            dt = datetime.fromisoformat(cleaned)
            if dt.tzinfo is None:
                return dt.replace(tzinfo=timezone.utc)
            return dt.astimezone(timezone.utc)
        except ValueError:
            pass
        
        # Try common date formats
        for fmt in ("%Y-%m-%d %H:%M:%S", "%Y-%m-%d", "%d/%m/%Y"):
            try:
                dt = datetime.strptime(cleaned, fmt)
                return dt.replace(tzinfo=timezone.utc)
            except ValueError:
                continue
                
        raise ValueError(f"Unable to parse datetime string: {dt_input}")
    
    raise TypeError(f"Unsupported datetime input type: {type(dt_input)}")

def format_iso_utc(dt: datetime) -> str:
    """Format datetime as standard ISO-8601 UTC string (YYYY-MM-DDTHH:MM:SSZ)."""
    utc_dt = parse_utc_datetime(dt)
    return utc_dt.strftime("%Y-%m-%dT%H:%M:%SZ")

def settlement_period_to_time_window(sp: int) -> str:
    """Convert UK Settlement Period (1-48, or 1-50 on clock changes) to HH:MM - HH:MM window."""
    if sp < 1 or sp > 50:
        return f"SP-{sp}"
    
    start_minutes = (sp - 1) * 30
    end_minutes = sp * 30
    
    start_h = (start_minutes // 60) % 24
    start_m = start_minutes % 60
    
    end_h = (end_minutes // 60) % 24
    end_m = end_minutes % 60
    
    # If period finishes at 24:00 (midnight of next day)
    end_str = "24:00" if (end_minutes == 1440 and sp == 48) else f"{end_h:02d}:{end_m:02d}"
    return f"{start_h:02d}:{start_m:02d} - {end_str}"

def is_peak_settlement_period(sp: int) -> bool:
    """Check if settlement period falls in standard UK Peak hours (07:00 to 19:00, SP 15 to 38)."""
    return 15 <= sp <= 38

def generate_date_chunks(start_date_str: str, end_date_str: str, max_chunk_days: int = 6) -> List[Tuple[str, str]]:
    """
    Split a date range into safe chunks of at most max_chunk_days.
    Elexon API strictly enforces <= 7 days between start and end date inclusive.
    """
    start_dt = datetime.strptime(start_date_str, "%Y-%m-%d").date()
    end_dt = datetime.strptime(end_date_str, "%Y-%m-%d").date()
    
    if start_dt > end_dt:
        raise ValueError(f"start_date ({start_date_str}) cannot be after end_date ({end_date_str})")
        
    chunks: List[Tuple[str, str]] = []
    current_start = start_dt
    
    while current_start <= end_dt:
        current_end = min(current_start + timedelta(days=max_chunk_days - 1), end_dt)
        chunks.append((current_start.strftime("%Y-%m-%d"), current_end.strftime("%Y-%m-%d")))
        current_start = current_end + timedelta(days=1)
        
    return chunks
