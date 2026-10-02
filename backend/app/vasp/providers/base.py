"""
base.py – Abstract Base Class & Schema for Blockchain Intelligence Providers.
"""
from __future__ import annotations

from abc import ABC, abstractmethod
from datetime import UTC, datetime
from typing import Any, Literal
from pydantic import BaseModel, Field


class EntityLabel(BaseModel):
    """Normalized intelligence label returned by any intelligence provider."""
    address: str
    chain: str = "tron"
    entity_name: str
    entity_category: Literal[
        "exchange",
        "mixer",
        "bridge",
        "gambling",
        "scam",
        "sanctioned",
        "merchant",
        "defi",
        "unhosted",
        "unknown",
    ] = "unknown"
    risk_level: Literal["low", "medium", "high", "severe"] = "low"
    provider_source: str
    attribution_confidence: float = Field(default=50.0, ge=0.0, le=100.0)
    tags: list[str] = Field(default_factory=list)
    jurisdiction: str | None = None
    is_fiu_registered: bool = False
    nodal_officer_email: str | None = None
    nodal_officer_phone: str | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)
    fetched_at: str = Field(default_factory=lambda: datetime.now(UTC).isoformat())


class BaseIntelligenceProvider(ABC):
    """Abstract base class for threat intelligence & attribution providers."""

    @property
    @abstractmethod
    def name(self) -> str:
        """Unique provider identifier (e.g. 'internal', 'trm_labs', 'chainalysis', 'elliptic', 'mock')."""
        pass

    @abstractmethod
    async def lookup_address(self, address: str, chain: str = "tron") -> EntityLabel | None:
        """Query intelligence provider for entity labels and risk classification."""
        pass

    @abstractmethod
    async def is_available(self) -> bool:
        """Check whether the provider is configured and reachable."""
        pass
