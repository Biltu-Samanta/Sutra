"""
base.py – Abstract Base Class for Multi-Chain Blockchain Adapters.

Defines the unified interface implemented by all blockchain adapters
(TRON, Ethereum, BSC, Polygon, Bitcoin, Solana, and Mock).
"""
from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any


class ChainAdapter(ABC):
    """Abstract base class for all chain-specific data adapters."""

    @property
    @abstractmethod
    def chain_name(self) -> str:
        """Name of the chain, e.g. 'tron', 'ethereum', 'bsc', 'polygon', 'bitcoin', 'solana'."""
        pass

    @abstractmethod
    async def get_transactions(
        self,
        address: str,
        only_outbound: bool = True,
        min_value: float = 0.0,
    ) -> list[dict[str, Any]]:
        """
        Fetch normalized token/native transfers for the specified address.
        
        Normalized transaction format:
          {
            "tx_hash": str,
            "from_address": str,
            "to_address": str,
            "value": float,
            "token": str,
            "contract": str | None,
            "timestamp": int (seconds),
            "block_ts": int (milliseconds),
          }
        """
        pass

    @abstractmethod
    async def get_balance(self, address: str) -> float:
        """Fetch total liquid / stablecoin balance for the specified address."""
        pass

    async def get_labels(self, address: str) -> list[str]:
        """Fetch known tags or labels for the address (default empty)."""
        return []

    def normalize_tx(self, raw: dict[str, Any]) -> dict[str, Any]:
        """Normalize raw RPC / explorer response into standard dict."""
        return raw

    async def is_healthy(self) -> bool:
        """Check if remote node / explorer is reachable."""
        return True
