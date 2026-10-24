"""Unit tests for cache service memory and disk tiers."""

import pytest
import shutil
from pathlib import Path

from app.services.cache import CacheService

@pytest.fixture
def temp_cache(tmp_path):
    cache_dir = tmp_path / "test_cache"
    service = CacheService(cache_dir=cache_dir, ttl_hours=1)
    yield service
    shutil.rmtree(cache_dir, ignore_errors=True)

def test_cache_set_and_get(temp_cache):
    params = {"date": "2026-01-01", "fuel": "WIND"}
    payload = [{"id": 1, "value": "test_data"}]

    assert temp_cache.get("TEST", params) is None
    temp_cache.set("TEST", params, payload)

    cached = temp_cache.get("TEST", params)
    assert cached == payload
    assert temp_cache.hits >= 1

def test_cache_stats_reporting(temp_cache):
    stats = temp_cache.get_stats()
    assert "enabled" in stats
    assert "hits" in stats
    assert "misses" in stats
    assert "hit_ratio_percent" in stats
