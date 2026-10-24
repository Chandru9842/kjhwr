"""Configuration module for UK Wind Intelligence backend."""

import os
from pathlib import Path
from typing import Optional

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
CACHE_DIR = DATA_DIR / "cache"

# Ensure data and cache directories exist
CACHE_DIR.mkdir(parents=True, exist_ok=True)

class Settings:
    # Elexon BMRS API
    BMRS_API_BASE_URL: str = os.getenv(
        "BMRS_API_BASE_URL", 
        "https://data.elexon.co.uk/bmrs/api/v1"
    )
    BMRS_API_KEY: Optional[str] = os.getenv("BMRS_API_KEY", None)
    
    # HTTP Client Configuration
    HTTP_TIMEOUT_SECONDS: float = float(os.getenv("HTTP_TIMEOUT_SECONDS", "30.0"))
    MAX_CHUNK_DAYS: int = int(os.getenv("MAX_CHUNK_DAYS", "6")) # Elexon strictly enforces <= 7 days per query
    MAX_RETRIES: int = int(os.getenv("MAX_RETRIES", "3"))
    RETRY_BACKOFF_SECONDS: float = float(os.getenv("RETRY_BACKOFF_SECONDS", "1.0"))
    
    # Caching
    CACHE_ENABLED: bool = os.getenv("CACHE_ENABLED", "true").lower() in ("true", "1", "yes")
    CACHE_TTL_HOURS: int = int(os.getenv("CACHE_TTL_HOURS", "24"))
    CACHE_DIR: Path = CACHE_DIR
    
    # Default Analysis Scope
    DEFAULT_START_DATE: str = "2026-01-01"
    DEFAULT_END_DATE: str = "2026-01-31"
    
    # Day-Ahead Market Decision Cutoff
    # Default is 12:00 UTC on day D-1.
    DEFAULT_CUTOFF_TIME: str = os.getenv("DEFAULT_CUTOFF_TIME", "12:00")
    
    # CORS Allowed Origins
    CORS_ORIGINS: str = os.getenv(
        "CORS_ORIGINS", 
        "http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000,http://127.0.0.1:3000,http://localhost:8000,http://127.0.0.1:8000"
    )
    
    # Service Metadata
    SERVICE_NAME: str = "uk-wind-intelligence-backend"
    SERVICE_VERSION: str = "1.0.0"

settings = Settings()
