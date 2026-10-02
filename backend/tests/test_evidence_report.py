"""
test_evidence_report.py – Tests for Section 63 BSA Evidence Seals & LEA Reporting.
"""
from datetime import datetime, timezone
from app.legal.evidence_cert import compute_evidence_hash
from app.legal.lea_report_generator import build_lea_report_data
from app.models.schemas import TraceResult, TransferEdge, VASPAttribution, WalletNode


def test_section_63_bsa_evidence_hash_determinism():
    """Verify that evidence hash is deterministic and order-invariant under Section 63 BSA."""
    txs = ["0xabc1234567890", "0xdef9876543210", "0x1112223334445"]
    nodes = [
        {"address": "TWalletA", "chain": "tron", "riskScore": 60},
        {"address": "TWalletB", "chain": "tron", "riskScore": 20},
    ]

    hash1 = compute_evidence_hash(txs, nodes)
    # Reverse order of transactions and nodes
    hash2 = compute_evidence_hash(list(reversed(txs)), list(reversed(nodes)))

    assert len(hash1) == 64
    assert hash1 == hash2, "Canonical evidence hash must be strictly order-invariant"

    # Mutated transaction hash must trigger avalanche effect
    mutated_txs = ["0xabc1234567891", "0xdef9876543210", "0x1112223334445"]
    mutated_hash = compute_evidence_hash(mutated_txs, nodes)
    assert hash1 != mutated_hash


def test_lea_report_data_assembly():
    """Verify complete structure of LEA investigation report JSON bundle."""
    attrib = VASPAttribution(
        vasp_name="WazirX",
        is_fiu_registered=True,
        confidence_score=95.0,
        deposit_address="TWazrxDep987123",
        hot_wallet_address="TWazrxHot123456",
        nodal_officer_email="nodal@wazirx.com",
        confidence_breakdown={"label_reliability": 30, "hop_proximity": 21, "value_share": 19, "sweep_pattern": 15, "timing_correlation": 10},
        reasoning="Attributed to WazirX with 95.0/100 confidence.",
        hop_count=2,
    )

    node1 = WalletNode(address="TSuspect001", chain="tron", riskScore=80, balance=100.0, firstSeen="2026-01-01", typologyFlags=["peeling_chain"])
    node2 = WalletNode(address="TWazrxDep987123", chain="tron", riskScore=15, balance=5.0, firstSeen="2026-01-01", isVasp=True)

    edge = TransferEdge(
        txHash="0xtxlea001",
        **{"from": "TSuspect001", "to": "TWazrxDep987123"},
        value=25000.0,
        token="USDT",
        timestamp=datetime.now(timezone.utc),
    )

    trace = TraceResult(
        case_id="CASE-LEA-VERIFY-01",
        created_at=datetime.now(timezone.utc),
        status="COMPLETED",
        suspect_address="TSuspect001",
        chain="tron",
        nodes=[node1, node2],
        edges=[edge],
        overall_risk_score=80,
        attribution=attrib,
    )

    report = build_lea_report_data(
        case_id="CASE-LEA-VERIFY-01",
        trace=trace,
        officer_name="Insp. Sunita Devi",
        officer_badge="CYBER-DEL-102",
        complaint_id="NCRP-2026-8888",
    )

    assert report["case_id"] == "CASE-LEA-VERIFY-01"
    assert report["officer_name"] == "Insp. Sunita Devi"
    assert report["officer_badge"] == "CYBER-DEL-102"
    assert report["attribution"]["vasp_name"] == "WazirX"
    assert report["attribution"]["confidence_score"] == 95.0
    assert "label_reliability" in report["attribution"]["confidence_breakdown"]
    assert len(report["transactions"]) == 1
    assert "Section 63" in report["evidence_seal"]["legal_framework"]
    assert len(report["evidence_seal"]["sha256_hash"]) == 64
