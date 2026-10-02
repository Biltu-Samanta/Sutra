"""
mock_adapter.py – Deterministic Offline Multi-Chain Adapter for Testing and Sandboxing.

Provides deterministic responses for test wallets across all supported chains,
including unhosted mule layering, exchange sweeps, mixers, and bridges.
"""
from __future__ import annotations

import hashlib
import time
from typing import Any

from app.engine.adapters.base import ChainAdapter
from app.vasp.registry import VASP_REGISTRY, _MIXER_ADDRESSES, _BRIDGE_ADDRESSES


class MockAdapter(ChainAdapter):
    """Deterministic offline adapter simulating blockchain transaction graphs."""

    def __init__(self, chain: str = "tron") -> None:
        self._chain = chain.lower()
        self._custom_graphs: dict[str, list[dict[str, Any]]] = {}

    @property
    def chain_name(self) -> str:
        return self._chain

    def register_graph(self, address: str, transfers: list[dict[str, Any]]) -> None:
        """Register a canned set of transfers for a test address."""
        self._custom_graphs[address.lower()] = transfers

    async def get_transactions(
        self,
        address: str,
        only_outbound: bool = True,
        min_value: float = 0.0,
    ) -> list[dict[str, Any]]:
        addr_lower = address.lower()
        if addr_lower in self._custom_graphs:
            return [
                t for t in self._custom_graphs[addr_lower]
                if t.get("value", 0.0) >= min_value
            ]

        # Built-in deterministic generator based on address hash
        h = int(hashlib.sha256(addr_lower.encode()).hexdigest()[:8], 16)
        now = int(time.time())

        # If it's a known hot wallet, mixer, or bridge, return terminal/empty outbound
        if any(addr_lower in [w.lower() for w in v.hot_wallets] for v in VASP_REGISTRY.values()):
            return []
        if addr_lower in {m.lower() for m in _MIXER_ADDRESSES}:
            return []
        if addr_lower in {b.lower() for b in _BRIDGE_ADDRESSES}:
            return []

        # Generate deterministic synthetic outbound transfers
        outbound = []
        num_txs = (h % 3) + 1  # 1 to 3 transactions
        base_val = float((h % 10000) + 500)

        # Default destination: pick a known exchange deposit or mule
        binance_hot = "TN3W4H6rK2ce4vX9YnFQHwKENnHjoxb3m9"
        mule_target = f"TMule{hashlib.md5(addr_lower.encode()).hexdigest()[:12]}"

        for i in range(num_txs):
            dest = mule_target if i > 0 else f"TDeposit{hashlib.md5((addr_lower + 'dep').encode()).hexdigest()[:10]}"
            val = round(base_val / (i + 1), 2)
            if val >= min_value:
                outbound.append({
                    "tx_hash": f"0xmock{hashlib.sha256(f'{addr_lower}_{i}'.encode()).hexdigest()[:32]}",
                    "from_address": address,
                    "to_address": dest,
                    "value": val,
                    "token": "USDT" if self._chain in ("tron", "ethereum", "bsc", "polygon") else "SOL" if self._chain == "solana" else "BTC",
                    "contract": "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t" if self._chain == "tron" else None,
                    "timestamp": now - (3600 * (i + 1)),
                    "block_ts": (now - (3600 * (i + 1))) * 1000,
                })

        return outbound

    async def get_balance(self, address: str) -> float:
        h = int(hashlib.sha256(address.lower().encode()).hexdigest()[:6], 16)
        return float(h % 50000)

    async def is_healthy(self) -> bool:
        return True
