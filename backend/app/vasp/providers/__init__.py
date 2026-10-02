"""
providers/__init__.py – Intelligence Provider Hub & Fallback Pipeline.

Chains first-party registries, commercial intelligence vendors (TRM, Chainalysis,
Elliptic), and offline mock providers with Redis caching and provenance tracking.
"""
from __future__ import annotations

import json
import logging
from typing import Any

from app.core.database import cache_get, cache_set
from app.vasp.providers.base import BaseIntelligenceProvider, EntityLabel
from app.vasp.providers.commercial_provider import (
    ChainalysisProvider,
    EllipticProvider,
    TRMLabsProvider,
)
from app.vasp.providers.internal_provider import InternalRegistryProvider
from app.vasp.providers.mock_provider import MockIntelligenceProvider

log = logging.getLogger(__name__)

_INTEL_CACHE_TTL = 3600  # 1 hour


class IntelligenceHub:
    """Orchestrates lookup across all available blockchain intelligence providers."""

    def __init__(self) -> None:
        self.internal = InternalRegistryProvider()
        self.trm = TRMLabsProvider()
        self.chainalysis = ChainalysisProvider()
        self.elliptic = EllipticProvider()
        self.mock = MockIntelligenceProvider()

        # Primary lookup order
        self.providers: list[BaseIntelligenceProvider] = [
            self.internal,
            self.trm,
            self.chainalysis,
            self.elliptic,
            self.mock,
        ]

    def _cache_key(self, address: str, chain: str) -> str:
        return f"intel:label:{chain.lower()}:{address.lower()}"

    async def lookup(self, address: str, chain: str = "tron") -> EntityLabel | None:
        """
        Query the provider chain with fallback and Redis caching.
        Returns first matching EntityLabel with provenance metadata.
        """
        ck = self._cache_key(address, chain)

        # 1. Check Redis cache
        cached = await cache_get(ck)
        if cached:
            try:
                data = json.loads(cached) if isinstance(cached, str) else cached
                return EntityLabel.model_validate(data)
            except Exception as exc:
                log.debug("Failed to deserialize cached intel label: %s", exc)

        # 2. Iterate through provider chain
        for provider in self.providers:
            try:
                if not await provider.is_available():
                    continue

                label = await provider.lookup_address(address, chain=chain)
                if label:
                    log.info("Intel hit for %s via %s: %s (%s)", address, provider.name, label.entity_name, label.entity_category)
                    # Cache successful hit
                    try:
                        await cache_set(ck, label.model_dump_json(), ttl=_INTEL_CACHE_TTL)
                    except Exception as c_exc:
                        log.debug("Redis cache write failed for intel label: %s", c_exc)
                    return label
            except Exception as exc:
                log.warning("Provider %s failed during lookup for %s: %s", provider.name, address, exc)

        return None


# Global singleton instance
intelligence_hub = IntelligenceHub()

__all__ = [
    "BaseIntelligenceProvider",
    "EntityLabel",
    "InternalRegistryProvider",
    "TRMLabsProvider",
    "ChainalysisProvider",
    "EllipticProvider",
    "MockIntelligenceProvider",
    "IntelligenceHub",
    "intelligence_hub",
]
