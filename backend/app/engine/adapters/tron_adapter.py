"""
tron_adapter.py – TRON blockchain adapter (TRC-20 USDT / TRX).
"""
from __future__ import annotations

import logging
from typing import Any

from app.engine.adapters.base import ChainAdapter
from app.engine.tron_tracer import fetch_usdt_transfers, get_account_balance

log = logging.getLogger(__name__)


class TronAdapter(ChainAdapter):
    """Adapter for TRON network tracing (USDT TRC-20)."""

    @property
    def chain_name(self) -> str:
        return "tron"

    async def get_transactions(
        self,
        address: str,
        only_outbound: bool = True,
        min_value: float = 0.0,
    ) -> list[dict[str, Any]]:
        try:
            return await fetch_usdt_transfers(
                address=address,
                only_outbound=only_outbound,
                min_value_usdt=min_value,
            )
        except Exception as exc:
            log.warning("TronAdapter.get_transactions failed for %s: %s", address, exc)
            return []

    async def get_balance(self, address: str) -> float:
        try:
            return await get_account_balance(address)
        except Exception as exc:
            log.warning("TronAdapter.get_balance failed for %s: %s", address, exc)
            return 0.0

    async def is_healthy(self) -> bool:
        return True
