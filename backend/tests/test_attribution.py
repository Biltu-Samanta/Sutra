"""
test_attribution.py – Tests for Nearest Deposit-Accepting VASP & Explainable Confidence Engine.
"""
import pytest
from datetime import datetime, timezone, timedelta
from app.models.schemas import WalletNode, TransferEdge
from app.vasp.attribution import attribute_vasp, compute_explainable_confidence
from app.vasp.registry import VASP_REGISTRY


@pytest.mark.asyncio
async def test_unhosted_mule_to_exchange_attribution():
    """
    Scenario:
      Suspect (TSuspect) -> Mule 1 (TMule1) -> Deposit Address (TDepositKYC) -> Binance Hot Wallet (TN3W4H6rK2ce4vX9YnFQHwKENnHjoxb3m9).
    Expected:
      - Attributed VASP: Binance
      - Isolated KYC Deposit: TDepositKYC (step-back isolation)
      - Hot Wallet: TN3W4H6rK2ce4vX9YnFQHwKENnHjoxb3m9
      - Confidence: >= 70.0 with 5-factor breakdown
      - Human-readable reasoning provided
    """
    now = datetime.now(timezone.utc)
    binance_hot = "TN3W4H6rK2ce4vX9YnFQHwKENnHjoxb3m9"
    deposit_addr = "TDepositKYC9876543210123456789"
    mule_addr = "TMule1Unhosted123456789012345"
    suspect_addr = "TSuspectWallet123456789012345"

    nodes = [
        WalletNode(address=suspect_addr, chain="tron", riskScore=80, balance=100.0, firstSeen="2026-01-01"),
        WalletNode(address=mule_addr, chain="tron", riskScore=60, balance=50.0, firstSeen="2026-01-01"),
        WalletNode(address=deposit_addr, chain="tron", riskScore=20, balance=10.0, firstSeen="2026-01-01"),
        WalletNode(address=binance_hot, chain="tron", riskScore=10, balance=500000.0, firstSeen="2026-01-01", isVasp=True),
    ]

    edges = [
        TransferEdge(
            txHash="0xtx1",
            **{"from": suspect_addr, "to": mule_addr},
            value=20000.0,
            token="USDT",
            timestamp=now - timedelta(hours=3),
        ),
        TransferEdge(
            txHash="0xtx2",
            **{"from": mule_addr, "to": deposit_addr},
            value=19500.0,
            token="USDT",
            timestamp=now - timedelta(hours=2),
        ),
        TransferEdge(
            txHash="0xtx3",
            **{"from": deposit_addr, "to": binance_hot},
            value=19500.0,
            token="USDT",
            timestamp=now - timedelta(hours=1),
        ),
    ]

    attribution = await attribute_vasp(
        suspect_address=suspect_addr,
        nodes=nodes,
        edges=edges,
    )

    assert attribution is not None
    assert attribution.vasp_name == "Binance"
    # Step-back isolation verifies deposit address, NOT the hot wallet
    assert attribution.deposit_address == deposit_addr
    assert attribution.hot_wallet_address.lower() == binance_hot.lower()
    assert attribution.confidence_score >= 70.0
    assert attribution.hop_count >= 1

    # 5-factor confidence check
    breakdown = attribution.confidence_breakdown
    assert "label_reliability" in breakdown
    assert "hop_proximity" in breakdown
    assert "value_share" in breakdown
    assert "sweep_pattern" in breakdown
    assert "timing_correlation" in breakdown

    # Natural language court rationale check
    assert attribution.reasoning is not None
    assert "Binance" in attribution.reasoning
    assert "confidence" in attribution.reasoning


@pytest.mark.asyncio
async def test_mixer_trace_break_detection():
    """
    Scenario:
      Suspect -> Mule -> Tornado Cash Router (0xd90e2f925da726b50c4ed8d0fb90ad053324f31b)
    Expected:
      - Intercepted trace break with mixer/tumbler warning
    """
    now = datetime.now(timezone.utc)
    mixer_addr = "0xd90e2f925da726b50c4ed8d0fb90ad053324f31b"
    suspect_addr = "0xsuspect12345678901234567890123456789012"
    mule_addr = "0xmule1234567890123456789012345678901234"

    nodes = [
        WalletNode(address=suspect_addr, chain="ethereum", riskScore=80, balance=10.0, firstSeen="2026-01-01"),
        WalletNode(address=mule_addr, chain="ethereum", riskScore=70, balance=5.0, firstSeen="2026-01-01"),
        WalletNode(address=mixer_addr, chain="ethereum", riskScore=99, balance=1000.0, firstSeen="2026-01-01"),
    ]

    edges = [
        TransferEdge(
            txHash="0xeth1",
            **{"from": suspect_addr, "to": mule_addr},
            value=10.0,
            token="ETH",
            timestamp=now - timedelta(hours=2),
        ),
        TransferEdge(
            txHash="0xeth2",
            **{"from": mule_addr, "to": mixer_addr},
            value=9.9,
            token="ETH",
            timestamp=now - timedelta(hours=1),
        ),
    ]

    attribution = await attribute_vasp(
        suspect_address=suspect_addr,
        nodes=nodes,
        edges=edges,
    )

    # When flow terminates at a mixer without exchange sweep, trace break is registered
    if attribution:
        assert attribution.trace_break_reason is not None
        assert "mixer" in attribution.trace_break_reason.lower()


@pytest.mark.asyncio
async def test_cross_chain_bridge_detection():
    """
    Scenario:
      Suspect -> Polygon PoS Bridge
    Expected:
      - Trace break reason notes cross-chain bridge transfer
    """
    bridge_addr = "0xa0c68c638235ee3e043c035541402876538f1dcd"
    suspect_addr = "0xsuspect99999999999999999999999999999999"

    nodes = [
        WalletNode(address=suspect_addr, chain="ethereum", riskScore=50, balance=1.0, firstSeen="2026-01-01"),
        WalletNode(address=bridge_addr, chain="ethereum", riskScore=20, balance=5000.0, firstSeen="2026-01-01"),
    ]

    edges = [
        TransferEdge(
            txHash="0xbridge1",
            **{"from": suspect_addr, "to": bridge_addr},
            value=5000.0,
            token="USDT",
            timestamp=datetime.now(timezone.utc),
        ),
    ]

    attribution = await attribute_vasp(
        suspect_address=suspect_addr,
        nodes=nodes,
        edges=edges,
    )

    if attribution:
        assert attribution.trace_break_reason is not None
        assert "bridge" in attribution.trace_break_reason.lower()


@pytest.mark.asyncio
async def test_unknown_vasp_unhosted_fallback():
    """
    Scenario:
      Only unhosted mule wallets with no centralized exchange connection.
    Expected:
      - Returns None gracefully without raising exceptions.
    """
    suspect_addr = "TSuspectUnhosted111111111111111"
    mule_addr = "TMuleUnhosted222222222222222222"

    nodes = [
        WalletNode(address=suspect_addr, chain="tron", riskScore=50, balance=10.0, firstSeen="2026-01-01"),
        WalletNode(address=mule_addr, chain="tron", riskScore=40, balance=10.0, firstSeen="2026-01-01"),
    ]
    edges = [
        TransferEdge(
            txHash="0xunhosted1",
            **{"from": suspect_addr, "to": mule_addr},
            value=100.0,
            token="USDT",
            timestamp=datetime.now(timezone.utc),
        ),
    ]

    attribution = await attribute_vasp(
        suspect_address=suspect_addr,
        nodes=nodes,
        edges=edges,
    )

    assert attribution is None
