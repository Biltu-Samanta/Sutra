"""
mock_provider.py – Deterministic Offline Threat Intelligence & Attribution Provider.

Provides deterministic labels and attribution data for testing, simulation,
and sandboxed execution without requiring internet access or paid vendor keys.
"""
from __future__ import annotations

import hashlib
from typing import Any

from app.vasp.providers.base import BaseIntelligenceProvider, EntityLabel


class MockIntelligenceProvider(BaseIntelligenceProvider):
    """Deterministic offline intelligence provider for tests and local development."""

    def __init__(self) -> None:
        self._canned_labels: dict[str, EntityLabel] = {}
        self._init_canned_data()

    @property
    def name(self) -> str:
        return "mock_provider"

    async def is_available(self) -> bool:
        return True

    def register_label(self, label: EntityLabel) -> None:
        """Register a test label programmatically."""
        self._canned_labels[label.address.lower()] = label

    def _init_canned_data(self) -> None:
        # Canned WazirX, CoinDCX, Binance, Mixers for reproducible testing
        self.register_label(
            EntityLabel(
                address="TWazrxHotWalletTron12345678901234",
                chain="tron",
                entity_name="WazirX",
                entity_category="exchange",
                risk_level="low",
                provider_source=self.name,
                attribution_confidence=96.0,
                tags=["exchange", "fiu_registered", "india"],
                jurisdiction="India",
                is_fiu_registered=True,
                nodal_officer_email="nodal@wazirx.com",
                nodal_officer_phone="+91-2268590001",
            )
        )
        self.register_label(
            EntityLabel(
                address="0xd90e2f925da726b50c4ed8d0fb90ad053324f31b",
                chain="ethereum",
                entity_name="Tornado Cash Router",
                entity_category="mixer",
                risk_level="severe",
                provider_source=self.name,
                attribution_confidence=99.0,
                tags=["mixer", "sanctioned", "ofac"],
                jurisdiction="Decentralized",
                is_fiu_registered=False,
            )
        )

    async def lookup_address(self, address: str, chain: str = "tron") -> EntityLabel | None:
        addr_lower = address.strip().lower()
        if addr_lower in self._canned_labels:
            return self._canned_labels[addr_lower]

        # Deterministic simulation based on prefix or address content
        if "binance" in addr_lower or addr_lower.startswith("tn3w4"):
            return EntityLabel(
                address=address,
                chain=chain,
                entity_name="Binance",
                entity_category="exchange",
                risk_level="low",
                provider_source=self.name,
                attribution_confidence=95.0,
                tags=["exchange", "international", "tier1"],
                jurisdiction="International",
                is_fiu_registered=False,
                nodal_officer_email="case@binance.com",
            )

        if "wazirx" in addr_lower or addr_lower.startswith("tcfb"):
            return EntityLabel(
                address=address,
                chain=chain,
                entity_name="WazirX",
                entity_category="exchange",
                risk_level="low",
                provider_source=self.name,
                attribution_confidence=96.0,
                tags=["exchange", "india", "fiu_registered"],
                jurisdiction="India",
                is_fiu_registered=True,
                nodal_officer_email="nodal@wazirx.com",
            )

        if "mixer" in addr_lower or "tornado" in addr_lower:
            return EntityLabel(
                address=address,
                chain=chain,
                entity_name="Simulated Coin Mixer",
                entity_category="mixer",
                risk_level="severe",
                provider_source=self.name,
                attribution_confidence=92.0,
                tags=["mixer", "privacy_protocol"],
            )

        if "bridge" in addr_lower:
            return EntityLabel(
                address=address,
                chain=chain,
                entity_name="Simulated Cross-Chain Bridge",
                entity_category="bridge",
                risk_level="medium",
                provider_source=self.name,
                attribution_confidence=90.0,
                tags=["bridge", "cross_chain"],
            )

        return None
