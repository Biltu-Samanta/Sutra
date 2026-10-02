"""
btc_adapter.py – Bitcoin blockchain adapter (UTXO / Mempool.space / Blockstream).
"""
from __future__ import annotations

import logging
from typing import Any

from app.engine.adapters.base import ChainAdapter
from app.engine.btc_tracer import fetch_btc_transfers, get_btc_balance

log = logging.getLogger(__name__)


class BtcAdapter(ChainAdapter):
    """Adapter for Bitcoin mainnet tracing."""

    @property
    def chain_name(self) -> str:
        return "bitcoin"

    async def get_transactions(
        self,
        address: str,
        only_outbound: bool = True,
        min_value: float = 0.0,
    ) -> list[dict[str, Any]]:
        try:
            return await fetch_btc_transfers(
                address=address,
                only_outbound=only_outbound,
                min_value_btc=min_value,
            )
        except Exception as exc:
            log.warning("BtcAdapter.get_transactions failed for %s: %s", address, exc)
            return []

    async def get_balance(self, address: str) -> float:
        try:
            return await get_btc_balance(address)
        except Exception as exc:
            log.warning("BtcAdapter.get_balance failed for %s: %s", address, exc)
            return 0.0

    async def is_healthy(self) -> bool:
        return True
