"""
commercial_provider.py – Commercial Blockchain Threat Intelligence Adapters.

Implements pluggable client adapters for:
  - TRM Labs
  - Chainalysis KYT / Reactor
  - Elliptic Investigator

Includes strict API-key guards so that when keys are missing, the system
smoothly skips them and falls back to local / mock providers without throwing errors.
"""
from __future__ import annotations

import logging
import os
from typing import Any

import httpx

from app.vasp.providers.base import BaseIntelligenceProvider, EntityLabel

log = logging.getLogger(__name__)


class TRMLabsProvider(BaseIntelligenceProvider):
    """TRM Labs Threat Intelligence API client."""

    def __init__(self, api_key: str | None = None) -> None:
        self._api_key = api_key or os.getenv("TRM_API_KEY")
        self._base_url = "https://api.trmlabs.com/public/v1"

    @property
    def name(self) -> str:
        return "trm_labs"

    async def is_available(self) -> bool:
        return bool(self._api_key and self._api_key.strip())

    async def lookup_address(self, address: str, chain: str = "tron") -> EntityLabel | None:
        if not await self.is_available():
            return None

        url = f"{self._base_url}/entities/search"
        headers = {
            "Authorization": f"Bearer {self._api_key}",
            "Content-Type": "application/json",
        }
        payload = [{"address": address, "chain": chain}]

        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                resp = await client.post(url, json=payload, headers=headers)
                if resp.status_code == 200:
                    data = resp.json()
                    if data and isinstance(data, list) and len(data) > 0:
                        first = data[0]
                        entities = first.get("entities", [])
                        if entities:
                            ent = entities[0]
                            category = ent.get("category", "unknown").lower()
                            cat_norm = "exchange" if "exchange" in category else "mixer" if "mixer" in category else "unknown"
                            return EntityLabel(
                                address=address,
                                chain=chain,
                                entity_name=ent.get("entity_name") or "TRM Identified Entity",
                                entity_category=cat_norm,
                                risk_level="high" if first.get("risk_score", 0) > 70 else "medium",
                                provider_source=self.name,
                                attribution_confidence=float(ent.get("confidence", 85.0)),
                                tags=[c.get("category_name", "") for c in ent.get("categories", [])],
                                metadata={"trm_risk_score": first.get("risk_score")},
                            )
        except Exception as exc:
            log.warning("TRMLabs API call failed: %s", exc)

        return None


class ChainalysisProvider(BaseIntelligenceProvider):
    """Chainalysis Oracle / KYT API client."""

    def __init__(self, api_key: str | None = None) -> None:
        self._api_key = api_key or os.getenv("CHAINALYSIS_API_KEY")
        self._base_url = "https://api.chainalysis.com/api/kyt/v1"

    @property
    def name(self) -> str:
        return "chainalysis"

    async def is_available(self) -> bool:
        return bool(self._api_key and self._api_key.strip())

    async def lookup_address(self, address: str, chain: str = "tron") -> EntityLabel | None:
        if not await self.is_available():
            return None

        url = f"{self._base_url}/users/{address}"
        headers = {"Token": self._api_key}

        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                resp = await client.get(url, headers=headers)
                if resp.status_code == 200:
                    data = resp.json()
                    cluster = data.get("cluster", {})
                    name = cluster.get("name")
                    if name:
                        return EntityLabel(
                            address=address,
                            chain=chain,
                            entity_name=name,
                            entity_category="exchange" if cluster.get("category") == "exchange" else "unknown",
                            risk_level=data.get("risk_level", "low").lower(),
                            provider_source=self.name,
                            attribution_confidence=90.0,
                            tags=cluster.get("categories", []),
                            metadata=data,
                        )
        except Exception as exc:
            log.warning("Chainalysis API call failed: %s", exc)

        return None


class EllipticProvider(BaseIntelligenceProvider):
    """Elliptic Navigator / Investigator API client."""

    def __init__(self, api_key: str | None = None) -> None:
        self._api_key = api_key or os.getenv("ELLIPTIC_API_KEY")
        self._base_url = "https://api.elliptic.co/v2"

    @property
    def name(self) -> str:
        return "elliptic"

    async def is_available(self) -> bool:
        return bool(self._api_key and self._api_key.strip())

    async def lookup_address(self, address: str, chain: str = "tron") -> EntityLabel | None:
        if not await self.is_available():
            return None

        url = f"{self._base_url}/analyses"
        headers = {
            "x-access-key": self._api_key,
            "Content-Type": "application/json",
        }
        payload = {"subject": {"asset": chain.upper(), "type": "address", "hash": address}}

        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                resp = await client.post(url, json=payload, headers=headers)
                if resp.status_code in (200, 201):
                    data = resp.json()
                    cluster = data.get("cluster", {})
                    return EntityLabel(
                        address=address,
                        chain=chain,
                        entity_name=cluster.get("name") or "Elliptic Identified Entity",
                        entity_category="exchange" if "exchange" in cluster.get("entity_type", "").lower() else "unknown",
                        risk_level="high" if data.get("risk_score", 0) > 6.0 else "medium",
                        provider_source=self.name,
                        attribution_confidence=88.0,
                        tags=cluster.get("tags", []),
                        metadata=data,
                    )
        except Exception as exc:
            log.warning("Elliptic API call failed: %s", exc)

        return None
