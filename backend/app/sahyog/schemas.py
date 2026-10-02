"""
schemas.py – Data Transfer Objects for SAHYOG Portal Integration & Lawful Routing.
"""
from __future__ import annotations

from datetime import UTC, datetime
from typing import Any, Literal
from uuid import uuid4
from pydantic import BaseModel, Field


RequestStatus = Literal[
    "DRAFT",
    "PENDING_APPROVAL",
    "APPROVED",
    "REJECTED",
    "DISPATCHED",
    "ACKNOWLEDGED",
    "FAILED",
]

RouteType = Literal[
    "BNSS_94_FREEZE",
    "BNSS_94_DISCLOSURE",
    "FIU_SUSPICIOUS_REPORT",
    "MLAT_INTERNATIONAL",
    "NODAL_DIRECT",
]


class SahyogRequestRecord(BaseModel):
    """A lawful LEA request routed through the SAHYOG portal or directly to VASP."""

    request_id: str = Field(default_factory=lambda: f"SHY-{str(uuid4())[:8].upper()}")
    case_id: str
    complaint_id: str | None = None
    route_type: RouteType = "BNSS_94_FREEZE"
    vasp_name: str
    is_fiu_registered: bool = False
    target_deposit_address: str
    suspect_wallet_address: str
    chain: str = "tron"
    amount: float = 0.0
    token: str = "USDT"
    tx_hashes: list[str] = Field(default_factory=list)
    legal_grounds: str = "Section 94 of Bharatiya Nagarik Suraksha Sanhita (BNSS), 2023"
    status: RequestStatus = "PENDING_APPROVAL"
    drafted_at: str = Field(default_factory=lambda: datetime.now(UTC).isoformat())
    reviewed_by: str | None = None
    officer_badge: str | None = None
    approved_at: str | None = None
    approval_notes: str | None = None
    rejection_reason: str | None = None
    sahyog_dispatch_token: str | None = None
    sahyog_ack_timestamp: str | None = None
    notice_text: str | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)


class ApprovalPayload(BaseModel):
    """Investigator approval submission for Human-in-the-Loop request dispatch."""

    officer_name: str = Field(..., min_length=2, description="Full name of approving law enforcement officer")
    officer_badge: str = Field(..., min_length=3, description="Official badge or police ID number")
    approval_notes: str = Field(default="Approved for lawful dispatch under Section 94 BNSS", min_length=5)


class RejectionPayload(BaseModel):
    """Investigator rejection submission."""

    officer_name: str = Field(..., min_length=2)
    officer_badge: str = Field(..., min_length=3)
    rejection_reason: str = Field(..., min_length=5)


class SahyogDispatchResponse(BaseModel):
    """Receipt returned upon dispatch to SAHYOG API or mock portal."""

    request_id: str
    status: RequestStatus
    dispatch_token: str
    recipient_vasp: str
    dispatched_at: str
    acknowledgement_id: str
    estimated_turnaround_hours: int = 24
