"""
test_adapters.py – Tests for Multi-Chain Adapters & Pluggable Intelligence Providers.
"""
import pytest
from app.engine.adapters import adapter_registry
from app.vasp.providers import intelligence_hub


def test_multi_chain_adapter_registration():
    """Verify that all six target chains are registered and resolvable."""
    expected_chains = ["tron", "ethereum", "bsc", "polygon", "bitcoin", "solana"]
    registered = adapter_registry.list_chains()

    for chain in expected_chains:
        assert chain in registered, f"Chain '{chain}' not in adapter registry"
        adapter = adapter_registry.get(chain)
        assert adapter is not None
        assert adapter.chain_name == chain


def test_chain_aliases():
    """Verify shorthand chain aliases map to canonical adapters."""
    assert adapter_registry.get("eth").chain_name == "ethereum"
    assert adapter_registry.get("btc").chain_name == "bitcoin"
    assert adapter_registry.get("sol").chain_name == "solana"
    assert adapter_registry.get("matic").chain_name == "polygon"
    assert adapter_registry.get("bnb").chain_name == "bsc"


@pytest.mark.asyncio
async def test_mock_adapter_deterministic_generation():
    """Verify offline mock adapter generates valid graph transactions."""
    mock_ad = adapter_registry.get("mock")
    txs = await mock_ad.get_transactions("TSuspectDeterministic12345", only_outbound=True)
    assert isinstance(txs, list)
    if txs:
        tx = txs[0]
        assert "tx_hash" in tx
        assert "from_address" in tx
        assert "to_address" in tx
        assert "value" in tx
        assert "token" in tx


@pytest.mark.asyncio
async def test_intelligence_hub_internal_resolution():
    """Verify IntelligenceHub queries first-party registries with provenance tracking."""
    # Test Binance TRON hot wallet
    label = await intelligence_hub.lookup("TN3W4H6rK2ce4vX9YnFQHwKENnHjoxb3m9", chain="tron")
    assert label is not None
    assert label.entity_name == "Binance"
    assert label.entity_category == "exchange"
    assert label.provider_source == "internal_registry"
    assert label.attribution_confidence >= 90.0

    # Test Tornado Cash mixer
    mixer_label = await intelligence_hub.lookup("0xd90e2f925da726b50c4ed8d0fb90ad053324f31b", chain="ethereum")
    assert mixer_label is not None
    assert mixer_label.entity_category == "mixer"
    assert mixer_label.risk_level == "severe"
