"""Official Elexon BMRS API client for FUELHH actuals and WINDFOR forecasts."""

import asyncio
import logging
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

import httpx

from app.config import settings
from app.services.cache import cache_service
from app.utils.time import generate_date_chunks, parse_utc_datetime, format_iso_utc

logger = logging.getLogger(__name__)

class ElexonClientError(Exception):
    """Base exception for Elexon BMRS API interactions."""
    def __init__(self, message: str, status_code: Optional[int] = None, details: Any = None):
        super().__init__(message)
        self.status_code = status_code
        self.details = details

class ElexonClient:
    def __init__(
        self,
        base_url: Optional[str] = None,
        timeout: Optional[float] = None,
        max_chunk_days: Optional[int] = None,
    ):
        self.base_url = (base_url or settings.BMRS_API_BASE_URL).rstrip("/")
        self.timeout = timeout or settings.HTTP_TIMEOUT_SECONDS
        self.max_chunk_days = max_chunk_days or settings.MAX_CHUNK_DAYS
        self.headers = {
            "User-Agent": f"UK-Wind-Intelligence/{settings.SERVICE_VERSION} (Energy Trading Analytics Desk)",
            "Accept": "application/json",
        }
        if settings.BMRS_API_KEY:
            self.headers["X-API-Key"] = settings.BMRS_API_KEY

    async def _fetch_url_with_retry(self, url: str, params: Dict[str, Any]) -> Dict[str, Any]:
        """Execute HTTP GET with exponential backoff retries for transient errors."""
        last_error: Optional[Exception] = None
        
        for attempt in range(1, settings.MAX_RETRIES + 1):
            try:
                async with httpx.AsyncClient(timeout=self.timeout, headers=self.headers) as client:
                    response = await client.get(url, params=params)
                    
                    if response.status_code == 200:
                        return response.json()
                    
                    # 400 Bad Request indicates parameter validation failure
                    if response.status_code == 400:
                        raise ElexonClientError(
                            f"Elexon API validation error (HTTP 400): {response.text}",
                            status_code=400,
                            details=response.text
                        )
                        
                    # Non-200 responses
                    logger.warning(
                        f"Elexon API returned HTTP {response.status_code} for {url} (Attempt {attempt}/{settings.MAX_RETRIES})"
                    )
                    if response.status_code in (429, 500, 502, 503, 504):
                        await asyncio.sleep(settings.RETRY_BACKOFF_SECONDS * (2 ** (attempt - 1)))
                        continue
                    else:
                        raise ElexonClientError(
                            f"Elexon API error HTTP {response.status_code}: {response.text}",
                            status_code=response.status_code,
                            details=response.text
                        )
            except (httpx.RequestError, httpx.TimeoutException) as exc:
                last_error = exc
                logger.warning(f"Network error accessing Elexon API: {exc} (Attempt {attempt}/{settings.MAX_RETRIES})")
                await asyncio.sleep(settings.RETRY_BACKOFF_SECONDS * (2 ** (attempt - 1)))
                
        raise ElexonClientError(f"Failed to fetch data from Elexon API after {settings.MAX_RETRIES} attempts: {last_error}")

    async def check_health(self) -> Dict[str, Any]:
        """Perform lightweight probe of Elexon BMRS endpoint."""
        url = f"{self.base_url}/datasets/FUELHH"
        now = datetime.now(timezone.utc)
        today_str = now.strftime("%Y-%m-%d")
        params = {"settlementDateFrom": today_str, "settlementDateTo": today_str}
        
        try:
            start_time = datetime.now(timezone.utc)
            async with httpx.AsyncClient(timeout=10.0, headers=self.headers) as client:
                res = await client.get(url, params=params)
                latency_ms = round((datetime.now(timezone.utc) - start_time).total_seconds() * 1000, 2)
                
                if res.status_code == 200:
                    return {
                        "status": "healthy",
                        "latency_ms": latency_ms,
                        "endpoint": url,
                        "checked_at": format_iso_utc(now),
                    }
                return {
                    "status": "degraded",
                    "http_status": res.status_code,
                    "latency_ms": latency_ms,
                    "endpoint": url,
                    "checked_at": format_iso_utc(now),
                }
        except Exception as e:
            return {
                "status": "unreachable",
                "error": str(e),
                "endpoint": url,
                "checked_at": format_iso_utc(now),
            }

    async def fetch_fuelhh_wind_actuals(
        self,
        start_date: str,
        end_date: str,
        force_refresh: bool = False
    ) -> List[Dict[str, Any]]:
        """
        Fetch FUELHH half-hourly outturn generation records, filtered for fuelType=WIND.
        Chunks date ranges into safe intervals (<= 6 days) to respect Elexon's 7-day limit.
        """
        chunks = generate_date_chunks(start_date, end_date, max_chunk_days=self.max_chunk_days)
        all_records: List[Dict[str, Any]] = []
        
        for p_from, p_to in chunks:
            cache_params = {"dataset": "FUELHH", "fuel": "WIND", "from": p_from, "to": p_to}
            
            if not force_refresh:
                cached = cache_service.get("FUELHH", cache_params)
                if cached is not None:
                    all_records.extend(cached)
                    continue
                    
            url = f"{self.base_url}/datasets/FUELHH"
            params = {
                "settlementDateFrom": p_from,
                "settlementDateTo": p_to,
            }
            
            raw = await self._fetch_url_with_retry(url, params)
            data_items = raw.get("data", [])
            
            # Filter specifically for WIND fuelType
            wind_items = [
                item for item in data_items 
                if item.get("fuelType") == "WIND" and item.get("generation") is not None
            ]
            
            # Cache chunk result
            cache_service.set("FUELHH", cache_params, wind_items)
            all_records.extend(wind_items)
            
        # Deduplicate records by (settlementDate, settlementPeriod)
        seen = set()
        deduped: List[Dict[str, Any]] = []
        for r in all_records:
            key = (r.get("settlementDate"), r.get("settlementPeriod"))
            if key not in seen:
                seen.add(key)
                deduped.append(r)
                
        # Sort chronologically
        deduped.sort(key=lambda x: (x.get("settlementDate", ""), x.get("settlementPeriod", 0)))
        return deduped

    async def fetch_windfor_forecasts(
        self,
        start_date: str,
        end_date: str,
        lookback_days: int = 2,
        force_refresh: bool = False
    ) -> List[Dict[str, Any]]:
        """
        Fetch WINDFOR national wind generation forecasts.
        
        CRITICAL RULES HONORED:
        1. Preserves both 'startTime' (delivery target) and 'publishTime' (forecast release time).
        2. Extends lookback window by lookback_days so Day-Ahead forecasts published on D-1
           for the start date (e.g. Dec 31, 2025 for Jan 1, 2026 delivery) are captured.
        3. Chunks queries into <= 6 day intervals.
        """
        # Lookback start date
        start_dt = datetime.strptime(start_date, "%Y-%m-%d").date()
        effective_start = (start_dt - timedelta(days=lookback_days)).strftime("%Y-%m-%d")
        
        chunks = generate_date_chunks(effective_start, end_date, max_chunk_days=self.max_chunk_days)
        all_records: List[Dict[str, Any]] = []
        
        for p_from, p_to in chunks:
            iso_from = f"{p_from}T00:00:00Z"
            iso_to = f"{p_to}T23:59:59Z"
            cache_params = {"dataset": "WINDFOR", "from": iso_from, "to": iso_to}
            
            if not force_refresh:
                cached = cache_service.get("WINDFOR", cache_params)
                if cached is not None:
                    all_records.extend(cached)
                    continue
                    
            url = f"{self.base_url}/datasets/WINDFOR"
            params = {
                "publishDateTimeFrom": iso_from,
                "publishDateTimeTo": iso_to,
            }
            
            raw = await self._fetch_url_with_retry(url, params)
            data_items = raw.get("data", [])
            
            # Ensure valid generation and timestamps
            valid_items = [
                item for item in data_items
                if item.get("publishTime") and item.get("startTime") and item.get("generation") is not None
            ]
            
            cache_service.set("WINDFOR", cache_params, valid_items)
            all_records.extend(valid_items)
            
        # Deduplicate records by (publishTime, startTime)
        seen = set()
        deduped: List[Dict[str, Any]] = []
        for r in all_records:
            key = (r.get("publishTime"), r.get("startTime"))
            if key not in seen:
                seen.add(key)
                deduped.append(r)
                
        # Sort by delivery startTime, then publishTime
        deduped.sort(key=lambda x: (x.get("startTime", ""), x.get("publishTime", "")))
        return deduped

elexon_client = ElexonClient()
