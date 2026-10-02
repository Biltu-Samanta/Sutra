"""
solana_adapter.py – Solana blockchain adapter (SOL / SPL Tokens).
"""
from __future__ import annotations

import logging
from typing import Any

from app.engine.adapters.base import ChainAdapter
from app.engine.solana_tracer import fetch_solana_transfers, get_solana_balance

log = logging.getLogger(__name__)


class SolanaAdapter(ChainAdapter):
    """Adapter for Solana network tracing."""

    @property
    def chain_name(self) -> str:
        return "solana"

    async def get_transactions(
        self,
        address: str,
        only_outbound: bool = True,
        min_value: float = 0.0,
    ) -> list[dict[str, Any]]:
        try:
            return await fetch_solana_transfers(
                address=address,
                only_outbound=only_outbound,
                min_value_sol=min_value,
            )
        except Exception as exc:
            log.warning("SolanaAdapter.get_transactions failed for %s: %s", address, exc)
            return []

    async def get_balance(self, address: str) -> float:
        try:
            return await get_solana_balance(address)
        except Exception as exc:
            log.warning("SolanaAdapter.get_balance failed for %s: %s", address, exc)
            return 0.0

    async def is_healthy(self) -> bool:
        return True
