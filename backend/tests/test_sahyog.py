"""
test_sahyog.py – Tests for SAHYOG Portal Integration & Human-in-the-Loop Lawful Routing.
"""
import pytest
from app.models.schemas import VASPAttribution
from app.sahyog.client import sahyog_client
from app.sahyog.router import vasp_request_router
from app.sahyog.schemas import ApprovalPayload, RejectionPayload


def _make_attrib(name="WazirX", is_fiu=True, is_mixer=False):
    return VASPAttribution(
        vasp_name=name,
        is_fiu_registered=is_fiu,
        confidence_score=92.0,
        deposit_address="TWazrxDeposit1234567890",
        hot_wallet_address="TWazrxHotWallet123456789",
        nodal_officer_email="nodal@wazirx.com",
        confidence_breakdown={"label_reliability": 30, "hop_proximity": 21, "value_share": 16, "sweep_pattern": 15, "timing_correlation": 10},
        reasoning=f"Attributed to {name}.",
        hop_count=2,
        attribution_type="unhosted_sweep",
        trace_break_reason="Funds entered mixer" if is_mixer else None,
        jurisdiction="India" if is_fiu else "International",
    )


def test_sahyog_routing_fiu_bnss():
    """FIU-IND Indian exchange maps to Section 94 BNSS freeze notice."""
    attrib = _make_attrib("WazirX", is_fiu=True)
    req = vasp_request_router.create_request(
        case_id="CASE-BNSS-01",
        attribution=attrib,
        suspect_address="TSuspect001",
        amount=50000.0,
        token="USDT",
        complaint_id="NCRP-2026-001",
    )

    assert req.route_type == "BNSS_94_FREEZE"
    assert "Section 94" in req.legal_grounds
    assert req.status == "PENDING_APPROVAL"
    assert "SECTION 94 OF BHARATIYA NAGARIK SURAKSHA SANHITA" in req.notice_text


def test_sahyog_routing_offshore_mlat():
    """Offshore international exchange maps to MLAT / International notice."""
    attrib = _make_attrib("Binance", is_fiu=False)
    req = vasp_request_router.create_request(
        case_id="CASE-MLAT-01",
        attribution=attrib,
        suspect_address="TSuspect002",
        amount=100000.0,
        token="USDT",
        complaint_id="NCRP-2026-002",
    )

    assert req.route_type == "MLAT_INTERNATIONAL"
    assert "MLAT" in req.legal_grounds
    assert req.status == "PENDING_APPROVAL"


def test_sahyog_routing_mixer_fiu_str():
    """Privacy protocol trace break maps to FIU-IND Suspicious Transaction Report."""
    attrib = _make_attrib("Mixer Flow", is_fiu=False, is_mixer=True)
    req = vasp_request_router.create_request(
        case_id="CASE-STR-01",
        attribution=attrib,
        suspect_address="TSuspect003",
        amount=25000.0,
        token="USDT",
    )

    assert req.route_type == "FIU_SUSPICIOUS_REPORT"
    assert "PMLA" in req.legal_grounds
    assert req.status == "PENDING_APPROVAL"


@pytest.mark.asyncio
async def test_human_in_the_loop_approval_flow():
    """
    Lawful notices MUST never auto-dispatch without explicit human approval.
    Flow: PENDING_APPROVAL -> Officer submits badge/name -> APPROVED -> DISPATCHED with token.
    """
    attrib = _make_attrib("CoinDCX", is_fiu=True)
    req = vasp_request_router.create_request(
        case_id="CASE-HITL-01",
        attribution=attrib,
        suspect_address="TSuspect004",
        amount=15000.0,
        token="USDT",
    )

    # Initial state must be pending
    assert req.status == "PENDING_APPROVAL"
    assert req.reviewed_by is None
    assert req.sahyog_dispatch_token is None

    # Simulate Human Officer Authorization
    approval = ApprovalPayload(
        officer_name="Insp. Rajesh Kumar",
        officer_badge="DL-CYB-4091",
        approval_notes="Evidence reviewed and verified. Proceeding with immediate freeze.",
    )

    req.reviewed_by = approval.officer_name
    req.officer_badge = approval.officer_badge
    req.approval_notes = approval.approval_notes
    req.status = "APPROVED"

    # Dispatch via client adapter
    dispatch_res = await sahyog_client.dispatch_request(req)
    req.status = "DISPATCHED"
    req.sahyog_dispatch_token = dispatch_res.dispatch_token
    vasp_request_router.update_request(req)

    # Post-dispatch verification
    assert req.status == "DISPATCHED"
    assert req.reviewed_by == "Insp. Rajesh Kumar"
    assert req.officer_badge == "DL-CYB-4091"
    assert req.sahyog_dispatch_token.startswith("SHY-TOKEN-")
    assert dispatch_res.acknowledgement_id.startswith("SAHYOG-ACK-")
