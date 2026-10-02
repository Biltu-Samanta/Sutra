"""
adapters/__init__.py – Registry and factory for multi-chain blockchain adapters.
"""
from __future__ import annotations

import logging
import os
from typing import Any

from app.engine.adapters.base import ChainAdapter
from app.engine.adapters.btc_adapter import BtcAdapter
from app.engine.adapters.evm_adapter import EvmAdapter
from app.engine.adapters.mock_adapter import MockAdapter
from app.engine.adapters.solana_adapter import SolanaAdapter
from app.engine.adapters.tron_adapter import TronAdapter

log = logging.getLogger(__name__)


class _ChainAdapterRegistry:
    """Singleton registry managing active chain adapters."""

    def __init__(self) -> None:
        self._adapters: dict[str, ChainAdapter] = {}
        self._mock_adapters: dict[str, MockAdapter] = {}
        self._init_defaults()

    def _init_defaults(self) -> None:
        self.register(TronAdapter())
        self.register(EvmAdapter("ethereum"))
        self.register(EvmAdapter("bsc"))
        self.register(EvmAdapter("polygon"))
        self.register(BtcAdapter())
        self.register(SolanaAdapter())

    def register(self, adapter: ChainAdapter) -> None:
        """Register or override a chain adapter."""
        self._adapters[adapter.chain_name.lower()] = adapter
        log.debug("Registered chain adapter: %s", adapter.chain_name)

    def get(self, chain: str) -> ChainAdapter:
        """
        Get the adapter for the specified chain.
        If USE_MOCK_CHAIN_ADAPTER is set to '1' or 'true', returns a deterministic MockAdapter.
        """
        chain_key = chain.strip().lower()
        if os.getenv("USE_MOCK_CHAIN_ADAPTER", "0").lower() in ("1", "true", "yes"):
            if chain_key not in self._mock_adapters:
                self._mock_adapters[chain_key] = MockAdapter(chain=chain_key)
            return self._mock_adapters[chain_key]

        if chain_key in self._adapters:
            return self._adapters[chain_key]

        # Alias mappings
        if chain_key in ("eth", "erc20"):
            return self._adapters["ethereum"]
        if chain_key in ("trx", "trc20"):
            return self._adapters["tron"]
        if chain_key in ("btc",):
            return self._adapters["bitcoin"]
        if chain_key in ("sol",):
            return self._adapters["solana"]
        if chain_key in ("matic", "pol"):
            return self._adapters["polygon"]
        if chain_key in ("binance", "bnb"):
            return self._adapters["bsc"]

        log.warning("Unknown chain '%s' requested; falling back to MockAdapter", chain)
        if chain_key not in self._mock_adapters:
            self._mock_adapters[chain_key] = MockAdapter(chain=chain_key)
        return self._mock_adapters[chain_key]

    def list_chains(self) -> list[str]:
        return list(self._adapters.keys())


# Global registry singleton
adapter_registry = _ChainAdapterRegistry()

__all__ = [
    "ChainAdapter",
    "TronAdapter",
    "EvmAdapter",
    "BtcAdapter",
    "SolanaAdapter",
    "MockAdapter",
    "adapter_registry",
]
