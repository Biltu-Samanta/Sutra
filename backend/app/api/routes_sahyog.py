"""
routes_sahyog.py – SAHYOG Portal Integration & Human-in-the-Loop Lawful Routing Endpoints.

Provides:
  - List & view pending/approved SAHYOG freeze requests.
  - Mandatory Human-in-the-Loop (HITL) approval endpoint (/approve) with officer badge & audit trail.
  - Automated analysis trigger from SAHYOG/NCRP complaints.
"""
from __future__ import annotations

import logging
from datetime import UTC, datetime
from typing import Any

from fastapi import APIRouter, HTTPException, Query, status

from app.core.database import record_audit_event
from app.engine.traversal import run_bfs_trace
from app.models.schemas import TraceRequest, TraceResult
from app.sahyog.client import sahyog_client
from app.sahyog.router import vasp_request_router
from app.sahyog.schemas import (
    ApprovalPayload,
    RejectionPayload,
    RequestStatus,
    SahyogDispatchResponse,
    SahyogRequestRecord,
)
from app.vasp.attribution import attribute_vasp

log = logging.getLogger(__name__)

router = APIRouter(prefix="/sahyog", tags=["SAHYOG Portal Integration"])


@router.get(
    "/requests",
    response_model=list[SahyogRequestRecord],
    summary="List SAHYOG lawful requests",
    description="Retrieve all drafted, pending approval, and dispatched SAHYOG requests.",
)
async def list_requests(
    status_filter: RequestStatus | None = Query(default=None, alias="status"),
    case_id: str | None = Query(default=None),
) -> list[SahyogRequestRecord]:
    return vasp_request_router.list_requests(status=status_filter, case_id=case_id)


@router.get(
    "/requests/{request_id}",
    response_model=SahyogRequestRecord,
    summary="Get single SAHYOG request details",
)
async def get_request(request_id: str) -> SahyogRequestRecord:
    req = vasp_request_router.get_request(request_id)
    if not req:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"SAHYOG request '{request_id}' not found.",
        )
    return req


@router.post(
    "/requests/{request_id}/approve",
    response_model=SahyogDispatchResponse,
    summary="Approve and dispatch lawful request (Human-in-the-Loop)",
    description=(
        "Mandatory Human-in-the-Loop approval step. A verified law enforcement investigator "
        "submits their officer name and badge number to authorize dispatch of the Section 94 BNSS "
        "or MLAT request via the SAHYOG portal."
    ),
)
async def approve_request(
    request_id: str,
    payload: ApprovalPayload,
) -> SahyogDispatchResponse:
    req = vasp_request_router.get_request(request_id)
    if not req:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"SAHYOG request '{request_id}' not found.",
        )

    if req.status not in ("PENDING_APPROVAL", "DRAFT"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Request '{request_id}' is already in status '{req.status}' and cannot be approved.",
        )

    # Record Human Approval
    now_iso = datetime.now(UTC).isoformat()
    req.status = "APPROVED"
    req.reviewed_by = payload.officer_name
    req.officer_badge = payload.officer_badge
    req.approved_at = now_iso
    req.approval_notes = payload.approval_notes

    # Dispatch via SAHYOG Client Adapter
    dispatch_res = await sahyog_client.dispatch_request(req)

    req.status = "DISPATCHED"
    req.sahyog_dispatch_token = dispatch_res.dispatch_token
    req.sahyog_ack_timestamp = dispatch_res.dispatched_at
    vasp_request_router.update_request(req)

    # Persist immutable audit log
    try:
        await record_audit_event(
            action="SAHYOG_REQUEST_APPROVED",
            actor=f"{payload.officer_name} ({payload.officer_badge})",
            case_id=req.case_id,
            details={
                "request_id": req.request_id,
                "vasp_name": req.vasp_name,
                "route_type": req.route_type,
                "dispatch_token": dispatch_res.dispatch_token,
                "deposit_address": req.target_deposit_address,
            },
        )
    except Exception as a_exc:
        log.warning("Audit event recording deferred: %s", a_exc)

    log.info(
        "HITL Approval executed for %s by Officer %s (%s). Dispatched token: %s",
        request_id, payload.officer_name, payload.officer_badge, dispatch_res.dispatch_token,
    )
    return dispatch_res


@router.post(
    "/requests/{request_id}/reject",
    response_model=SahyogRequestRecord,
    summary="Reject a pending SAHYOG request",
)
async def reject_request(
    request_id: str,
    payload: RejectionPayload,
) -> SahyogRequestRecord:
    req = vasp_request_router.get_request(request_id)
    if not req:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"SAHYOG request '{request_id}' not found.",
        )

    req.status = "REJECTED"
    req.reviewed_by = payload.officer_name
    req.officer_badge = payload.officer_badge
    req.rejection_reason = payload.rejection_reason
    vasp_request_router.update_request(req)

    try:
        await record_audit_event(
            action="SAHYOG_REQUEST_REJECTED",
            actor=f"{payload.officer_name} ({payload.officer_badge})",
            case_id=req.case_id,
            details={"request_id": req.request_id, "reason": payload.rejection_reason},
        )
    except Exception as a_exc:
        log.warning("Audit event recording deferred: %s", a_exc)

    return req


@router.post(
    "/auto-analyze",
    summary="Automated SAHYOG Ingestion & Attribution Analysis",
    description=(
        "Ingests suspect wallet from SAHYOG portal, triggers automated multi-hop tracing, "
        "attributes nearest deposit-accepting VASP, and generates a pre-formatted Section 94 "
        "BNSS notice awaiting human review."
    ),
)
async def auto_analyze_sahyog_case(
    suspect_address: str,
    chain: str = "tron",
    complaint_id: str = "SAHYOG-AUTO-01",
    loss_amount: float = 5000.0,
    token: str = "USDT",
) -> dict[str, Any]:
    trace_req = TraceRequest(
        suspect_address=suspect_address,
        chain=chain,  # type: ignore
        max_hops=4,
        value_threshold_pct=5.0,
        complaint_id=complaint_id,
    )

    # 1. Run BFS Traversal
    trace_result: TraceResult = await run_bfs_trace(trace_req)

    # 2. Run Nearest VASP Attribution
    attribution = await attribute_vasp(
        suspect_address=suspect_address,
        nodes=trace_result.nodes,
        edges=trace_result.edges,
    )

    # 3. Create Lawful Request Record awaiting approval
    sahyog_request = None
    if attribution:
        tx_hashes = [e.txHash for e in trace_result.edges[:5]]
        sahyog_request = vasp_request_router.create_request(
            case_id=trace_result.case_id,
            attribution=attribution,
            suspect_address=suspect_address,
            chain=chain,
            amount=loss_amount,
            token=token,
            tx_hashes=tx_hashes,
            complaint_id=complaint_id,
        )

    return {
        "status": "ANALYSIS_COMPLETE",
        "case_id": trace_result.case_id,
        "complaint_id": complaint_id,
        "suspect_address": suspect_address,
        "nodes_count": len(trace_result.nodes),
        "edges_count": len(trace_result.edges),
        "attribution": attribution,
        "sahyog_request": sahyog_request,
        "hitl_approval_required": sahyog_request is not None,
        "message": (
            "Attribution identified deposit VASP. Section 94 BNSS request drafted and "
            "placed in queue for investigator review and authorization."
            if sahyog_request else "No centralized exchange deposit identified in trace graph."
        ),
    }
