"""Caching service supporting memory and persistent disk cache for Elexon API data."""

import hashlib
import json
import logging
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Any, Dict, Optional, Tuple

from app.config import settings

logger = logging.getLogger(__name__)

class CacheService:
    def __init__(self, cache_dir: Optional[Path] = None, ttl_hours: Optional[int] = None):
        self.cache_dir = cache_dir or settings.CACHE_DIR
        self.ttl_hours = ttl_hours or settings.CACHE_TTL_HOURS
        self.enabled = settings.CACHE_ENABLED
        self._memory_cache: Dict[str, Tuple[datetime, Any]] = {}
        
        self.hits: int = 0
        self.misses: int = 0
        
        self.cache_dir.mkdir(parents=True, exist_ok=True)

    def _make_key(self, namespace: str, params: Dict[str, Any]) -> str:
        """Create deterministic SHA-256 hash key from namespace and parameters."""
        sorted_items = sorted(params.items(), key=lambda x: str(x[0]))
        serialized = json.dumps(sorted_items, sort_keys=True, default=str)
        hashed = hashlib.sha256(serialized.encode("utf-8")).hexdigest()[:16]
        return f"{namespace}_{hashed}"

    def get(self, namespace: str, params: Dict[str, Any]) -> Optional[Any]:
        """Retrieve cached value if available and not expired."""
        if not self.enabled:
            self.misses += 1
            return None
            
        key = self._make_key(namespace, params)
        now = datetime.now(timezone.utc)
        
        # 1. Check memory cache first
        if key in self._memory_cache:
            expires_at, data = self._memory_cache[key]
            if now < expires_at:
                self.hits += 1
                return data
            else:
                del self._memory_cache[key]
                
        # 2. Check disk cache
        file_path = self.cache_dir / f"{key}.json"
        if file_path.exists():
            try:
                with open(file_path, "r", encoding="utf-8") as f:
                    entry = json.load(f)
                    
                expires_at_str = entry.get("expires_at")
                if expires_at_str:
                    expires_at = datetime.fromisoformat(expires_at_str)
                    if now < expires_at:
                        data = entry.get("data")
                        # Hydrate memory cache
                        self._memory_cache[key] = (expires_at, data)
                        self.hits += 1
                        return data
                    else:
                        file_path.unlink(missing_ok=True)
            except Exception as e:
                logger.warning(f"Error reading cache file {file_path}: {e}")
                
        self.misses += 1
        return None

    def set(self, namespace: str, params: Dict[str, Any], data: Any) -> None:
        """Store value in memory and disk cache."""
        if not self.enabled:
            return
            
        key = self._make_key(namespace, params)
        now = datetime.now(timezone.utc)
        expires_at = now + timedelta(hours=self.ttl_hours)
        
        # Memory
        self._memory_cache[key] = (expires_at, data)
        
        # Disk
        file_path = self.cache_dir / f"{key}.json"
        temp_path = self.cache_dir / f"{key}.tmp"
        
        entry = {
            "key": key,
            "namespace": namespace,
            "created_at": now.isoformat(),
            "expires_at": expires_at.isoformat(),
            "params": params,
            "data": data,
        }
        
        try:
            with open(temp_path, "w", encoding="utf-8") as f:
                json.dump(entry, f, default=str)
            temp_path.replace(file_path)
        except Exception as e:
            logger.warning(f"Error writing cache file {file_path}: {e}")
            temp_path.unlink(missing_ok=True)

    def get_stats(self) -> Dict[str, Any]:
        """Return cache health and usage metrics."""
        disk_files = list(self.cache_dir.glob("*.json"))
        total_requests = self.hits + self.misses
        hit_ratio = (self.hits / total_requests * 100.0) if total_requests > 0 else 0.0
        
        return {
            "enabled": self.enabled,
            "ttl_hours": self.ttl_hours,
            "memory_keys_count": len(self._memory_cache),
            "disk_files_count": len(disk_files),
            "hits": self.hits,
            "misses": self.misses,
            "hit_ratio_percent": round(hit_ratio, 2),
            "cache_dir": str(self.cache_dir),
        }

cache_service = CacheService()
