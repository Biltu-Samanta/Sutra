"""
evm_adapter.py – EVM blockchain adapter supporting Ethereum, BSC, and Polygon.
"""
from __future__ import annotations

import logging
from typing import Any

from app.engine.adapters.base import ChainAdapter
from app.engine.evm_tracer import fetch_evm_transfers, get_evm_balance

log = logging.getLogger(__name__)


class EvmAdapter(ChainAdapter):
    """Adapter for EVM-compatible chains (Ethereum, BSC, Polygon)."""

    def __init__(self, chain: str = "ethereum") -> None:
        self._chain = chain.lower()

    @property
    def chain_name(self) -> str:
        return self._chain

    async def get_transactions(
        self,
        address: str,
        only_outbound: bool = True,
        min_value: float = 0.0,
    ) -> list[dict[str, Any]]:
        try:
            return await fetch_evm_transfers(
                address=address,
                chain=self._chain,
                only_outbound=only_outbound,
                min_value_usdt=min_value,
            )
        except Exception as exc:
            log.warning("EvmAdapter(%s).get_transactions failed for %s: %s", self._chain, address, exc)
            return []

    async def get_balance(self, address: str) -> float:
        try:
            return await get_evm_balance(address, chain=self._chain)
        except Exception as exc:
            log.warning("EvmAdapter(%s).get_balance failed for %s: %s", self._chain, address, exc)
            return 0.0

    async def is_healthy(self) -> bool:
        return True
