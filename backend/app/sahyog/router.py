"""
router.py – Lawful Request Router & Section 94 BNSS Notice Formatter.

Routes attributed VASP findings to appropriate legal channels:
  - FIU-IND registered Indian Exchanges → Section 94 BNSS Freeze & KYC Disclosure
  - Foreign / International Exchanges   → MLAT / Interpol / Direct Nodal Portal
  - Privacy protocols / Mixers          → FIU-IND STR / Suspicious Transaction Flagging
"""
from __future__ import annotations

import logging
from datetime import UTC, datetime
from typing import Any
from uuid import uuid4

from app.models.schemas import VASPAttribution
from app.sahyog.schemas import RequestStatus, RouteType, SahyogRequestRecord

log = logging.getLogger(__name__)


# Thread-safe in-memory store for SAHYOG requests (backed by case state)
_REQUEST_STORE: dict[str, SahyogRequestRecord] = {}


def draft_notice_text(
    vasp_name: str,
    deposit_address: str,
    suspect_address: str,
    chain: str,
    amount: float,
    token: str,
    tx_hashes: list[str],
    case_number: str,
    is_fiu: bool,
) -> str:
    """Draft standardized legal notice for investigator review."""
    today_str = datetime.now(UTC).strftime("%d-%b-%Y")
    tx_list = "\n".join([f"  - {tx}" for tx in tx_hashes[:5]]) if tx_hashes else "  - Primary trace transfer"

    if is_fiu:
        return f"""OFFICE OF THE INVESTIGATING OFFICER / LAW ENFORCEMENT AGENCY
CYBER CRIME POLICE STATION
NOTICE UNDER SECTION 94 OF BHARATIYA NAGARIK SURAKSHA SANHITA (BNSS), 2023
(Formerly Section 91 of the Code of Criminal Procedure, 1973)

Date: {today_str}
Reference Case / FIR No.: {case_number}

To,
The Nodal Officer / Compliance Officer,
{vasp_name}
(Registered Entity with Financial Intelligence Unit - India / FIU-IND)

SUBJECT: URGENT DIRECTIVE TO FREEZE CRYPTO ASSETS AND DISCLOSE KYC / TRANSACTION LOGS

Whereas an investigation into cyber fraud and money laundering has revealed that illicit proceeds
were layered from suspect wallet ({suspect_address}) and directly deposited into your exchange pool
via the following KYC-linked deposit address:

1. Target Deposit Address: {deposit_address}
2. Blockchain Network: {chain.upper()}
3. Quantum of Identified Inflow: {amount:.2f} {token}
4. Trace Transaction Hashes:
{tx_list}

YOU ARE HEREBY DIRECTED TO:
1. IMMEDIATELY FREEZE / RESTRICT all outbound transfers, withdrawals, and conversions from the account
   mapped to the above deposit address ({deposit_address}).
2. FURNISH complete KYC records including:
   - Full Name, Registered Mobile Number, and Email Address of the account holder.
   - Government ID Proofs (Aadhaar / PAN / Passport) submitted during onboarding.
   - Bank Account details linked for fiat withdrawals (Account No., IFSC, Bank Name).
   - Complete IP login logs, device identifiers, and timestamped transaction ledger.

Failure to comply with this lawful directive within 24 hours of receipt shall attract penal provisions
under Section 223 and Section 228 of the Bharatiya Nyaya Sanhita (BNS), 2023.

By Order of Investigating Agency
State Cyber Crime Police / Law Enforcement Agency"""

    return f"""INTERNATIONAL LAW ENFORCEMENT MUTUAL ASSISTANCE REQUEST
CYBER FORENSICS & ASSET RECOVERY DIVISION

Date: {today_str}
Case Reference: {case_number}

To,
Compliance & Legal Investigations Division,
{vasp_name}

SUBJECT: URGENT ASSET PRESERVATION AND BENEFICIAL OWNERSHIP DISCLOSURE NOTICE

This agency is investigating transnational financial fraud. On-chain forensic attribution confirms
that victim funds were routed to your platform:

- Suspect Layering Origin: {suspect_address}
- Internal Deposit Address: {deposit_address}
- Blockchain: {chain.upper()}
- Estimated Value: {amount:.2f} {token}

Request Actions:
1. Voluntarily place an immediate temporary freeze / administrative hold on funds associated with {deposit_address}.
2. Preserve all server logs, KYC documentation, deposit session IP addresses, and linked banking identifiers.
3. Formal judicial MLAT / Letter Rogatory communication is being initiated through the Central Authority.

Authorized Law Enforcement Agency"""


class VaspRequestRouter:
    """Determines appropriate legal route and formats lawful requests."""

    @staticmethod
    def create_request(
        case_id: str,
        attribution: VASPAttribution,
        suspect_address: str,
        chain: str = "tron",
        amount: float = 0.0,
        token: str = "USDT",
        tx_hashes: list[str] | None = None,
        complaint_id: str | None = None,
    ) -> SahyogRequestRecord:
        """Create a pending draft request based on VASP attribution results."""
        tx_hashes = tx_hashes or []

        # Determine route type
        if attribution.trace_break_reason and "mixer" in attribution.trace_break_reason.lower():
            route_type: RouteType = "FIU_SUSPICIOUS_REPORT"
            legal_grounds = "Prevention of Money Laundering Act (PMLA), 2002 – Suspicious Transaction Reporting"
        elif attribution.is_fiu_registered:
            route_type = "BNSS_94_FREEZE"
            legal_grounds = "Section 94 Bharatiya Nagarik Suraksha Sanhita (BNSS), 2023 r/w FIU-IND Mandates"
        elif attribution.jurisdiction and attribution.jurisdiction.lower() != "india":
            route_type = "MLAT_INTERNATIONAL"
            legal_grounds = "Mutual Legal Assistance Treaty (MLAT) / International Asset Recovery Protocol"
        else:
            route_type = "NODAL_DIRECT"
            legal_grounds = "Direct VASP Legal Disclosure Request"

        notice_text = draft_notice_text(
            vasp_name=attribution.vasp_name,
            deposit_address=attribution.deposit_address,
            suspect_address=suspect_address,
            chain=chain,
            amount=amount,
            token=token,
            tx_hashes=tx_hashes,
            case_number=complaint_id or case_id,
            is_fiu=attribution.is_fiu_registered,
        )

        record = SahyogRequestRecord(
            case_id=case_id,
            complaint_id=complaint_id,
            route_type=route_type,
            vasp_name=attribution.vasp_name,
            is_fiu_registered=attribution.is_fiu_registered,
            target_deposit_address=attribution.deposit_address,
            suspect_wallet_address=suspect_address,
            chain=chain,
            amount=amount,
            token=token,
            tx_hashes=tx_hashes,
            legal_grounds=legal_grounds,
            status="PENDING_APPROVAL",
            notice_text=notice_text,
            metadata={
                "confidence_score": attribution.confidence_score,
                "hop_count": attribution.hop_count,
                "reasoning": attribution.reasoning,
                "nodal_officer_email": attribution.nodal_officer_email,
            },
        )

        _REQUEST_STORE[record.request_id] = record
        log.info("Created SAHYOG request %s for case %s (awaiting human approval)", record.request_id, case_id)
        return record

    @staticmethod
    def get_request(request_id: str) -> SahyogRequestRecord | None:
        return _REQUEST_STORE.get(request_id)

    @staticmethod
    def list_requests(
        status: RequestStatus | None = None,
        case_id: str | None = None,
    ) -> list[SahyogRequestRecord]:
        results = list(_REQUEST_STORE.values())
        if status:
            results = [r for r in results if r.status == status]
        if case_id:
            results = [r for r in results if r.case_id == case_id]
        return sorted(results, key=lambda r: r.drafted_at, reverse=True)

    @staticmethod
    def update_request(record: SahyogRequestRecord) -> None:
        _REQUEST_STORE[record.request_id] = record


vasp_request_router = VaspRequestRouter()
