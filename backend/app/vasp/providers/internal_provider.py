"""
internal_provider.py – First-Party Curated Intelligence Provider.

Leverages the high-confidence local VASP registry, FIU-registered entities,
custom analyst database, and sanctioned mixer/bridge clusters.
"""
from __future__ import annotations

import logging
from typing import Any

from app.vasp.custom_db import get_custom_vasp_db
from app.vasp.providers.base import BaseIntelligenceProvider, EntityLabel
from app.vasp.registry import (
    _BRIDGE_ADDRESSES,
    _MIXER_ADDRESSES,
    VASP_REGISTRY,
    get_vasp_by_hot_wallet,
    is_hot_wallet,
)

log = logging.getLogger(__name__)


class InternalRegistryProvider(BaseIntelligenceProvider):
    """Provider powered by Sutra's built-in curated registries."""

    @property
    def name(self) -> str:
        return "internal_registry"

    async def is_available(self) -> bool:
        return True

    async def lookup_address(self, address: str, chain: str = "tron") -> EntityLabel | None:
        addr_lower = address.strip().lower()

        # 1. Check mixers / tumblers
        if addr_lower in _MIXER_ADDRESSES:
            return EntityLabel(
                address=address,
                chain=chain,
                entity_name="Known Mixer / Privacy Protocol",
                entity_category="mixer",
                risk_level="severe",
                provider_source=self.name,
                attribution_confidence=98.0,
                tags=["mixer", "sanctioned", "privacy_protocol"],
                metadata={"detection": "OFAC / Curated Mixer Cluster"},
            )

        # 2. Check cross-chain bridges
        if addr_lower in _BRIDGE_ADDRESSES:
            return EntityLabel(
                address=address,
                chain=chain,
                entity_name="Cross-Chain Bridge Contract",
                entity_category="bridge",
                risk_level="medium",
                provider_source=self.name,
                attribution_confidence=95.0,
                tags=["bridge", "cross_chain"],
                metadata={"detection": "Verified Bridge Router"},
            )

        # 3. Check VASP hot wallet index
        vasp_entry = get_vasp_by_hot_wallet(addr_lower)
        if vasp_entry:
            return EntityLabel(
                address=address,
                chain=chain,
                entity_name=vasp_entry.name,
                entity_category="exchange",
                risk_level="low" if vasp_entry.is_fiu_registered else "medium",
                provider_source=self.name,
                attribution_confidence=95.0,
                tags=vasp_entry.tags,
                jurisdiction=vasp_entry.jurisdiction,
                is_fiu_registered=vasp_entry.is_fiu_registered,
                nodal_officer_email=vasp_entry.nodal_officer_email,
                nodal_officer_phone=vasp_entry.nodal_officer_phone,
                metadata={"hot_wallet": True},
            )

        # 4. Check custom analyst DB
        try:
            custom_db = get_custom_vasp_db()
            custom_label = custom_db.get_label(address)
            if custom_label:
                cat_map = {
                    "exchange": "exchange",
                    "mixer": "mixer",
                    "bridge": "bridge",
                    "scam": "scam",
                    "gambling": "gambling",
                }
                return EntityLabel(
                    address=address,
                    chain=chain,
                    entity_name=custom_label.entity_name,
                    entity_category=cat_map.get(custom_label.entity_type, "unknown"),
                    risk_level="high" if custom_label.entity_type in ("mixer", "scam") else "low",
                    provider_source=f"custom_db:{custom_label.source}",
                    attribution_confidence=custom_label.confidence * 100.0,
                    tags=custom_label.tags,
                    is_fiu_registered="fiu" in custom_label.tags,
                )
        except Exception as exc:
            log.debug("Internal custom_db lookup error: %s", exc)

        return None
