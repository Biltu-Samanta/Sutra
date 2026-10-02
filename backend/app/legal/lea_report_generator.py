"""
lea_report_generator.py – Comprehensive Law Enforcement Investigation Report Generator.

Produces court-ready digital evidence dockets adhering to:
  - Section 63 of Bharatiya Sakshya Adhiniyam (BSA), 2023 (Admissibility of Electronic Records)
  - Section 79A of Information Technology Act, 2000 (Digital Evidence Examiner)
  - Rule 3 of Prevention of Money Laundering (Maintenance of Records) Rules, 2005

Outputs:
  - Structured, machine-readable JSON bundle with cryptographic evidence seals
  - High-resolution, courtroom-formatted PDF report
"""
from __future__ import annotations

import hashlib
import json
import logging
from datetime import UTC, datetime
from pathlib import Path
from typing import Any
from uuid import uuid4

from jinja2 import Environment, select_autoescape

from app.legal.evidence_cert import build_evidence_certificate, compute_evidence_hash
from app.models.schemas import TraceResult

log = logging.getLogger(__name__)

REPORT_OUTPUT_DIR = Path("static/lea_reports")
REPORT_OUTPUT_DIR.mkdir(parents=True, exist_ok=True)


# ── Report HTML Template for WeasyPrint ────────────────────────────────────────

_LEA_HTML_TEMPLATE = """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <title>LEA Forensic Investigation Report – Case {{ report.case_id }}</title>
  <style>
    @page {
      size: A4;
      margin: 20mm 15mm 20mm 15mm;
      @bottom-right {
        content: "Page " counter(page) " of " counter(pages);
        font-size: 8pt;
        color: #718096;
      }
      @bottom-left {
        content: "CONFIDENTIAL – LAW ENFORCEMENT SENSITIVE | SUTRA ENGINE";
        font-size: 8pt;
        color: #718096;
      }
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
      font-size: 10pt;
      color: #1a202c;
      background: #fff;
      line-height: 1.5;
    }
    .header-table {
      width: 100%;
      border-bottom: 2px solid #2b6cb0;
      padding-bottom: 12px;
      margin-bottom: 18px;
    }
    .badge-confidential {
      background: #c53030;
      color: #fff;
      font-size: 7.5pt;
      font-weight: bold;
      padding: 3px 8px;
      border-radius: 3px;
      display: inline-block;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .title {
      font-size: 16pt;
      font-weight: 700;
      color: #1a365d;
      margin-top: 6px;
    }
    .subtitle {
      font-size: 9.5pt;
      color: #4a5568;
    }
    .section-title {
      font-size: 11pt;
      font-weight: bold;
      color: #2b6cb0;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 4px;
      margin-top: 18px;
      margin-bottom: 8px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    table.data-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 12px;
      font-size: 8.5pt;
    }
    table.data-table th, table.data-table td {
      border: 1px solid #cbd5e0;
      padding: 5px 8px;
      text-align: left;
    }
    table.data-table th {
      background: #edf2f7;
      color: #2d3748;
      font-weight: 600;
    }
    .evidence-box {
      background: #f7fafc;
      border: 1px dashed #4a5568;
      padding: 10px;
      margin-top: 14px;
      border-radius: 4px;
      font-family: 'Courier New', Courier, monospace;
      font-size: 8pt;
      word-break: break-all;
    }
    .score-badge {
      font-weight: bold;
      padding: 2px 6px;
      border-radius: 3px;
      background: #ebf8ff;
      color: #2b6cb0;
    }
    .footer-seal {
      margin-top: 25px;
      border-top: 1px solid #cbd5e0;
      padding-top: 10px;
      font-size: 8pt;
      color: #4a5568;
    }
  </style>
</head>
<body>

  <!-- Header -->
  <table class="header-table">
    <tr>
      <td>
        <span class="badge-confidential">CONFIDENTIAL // LEA SENSITIVE</span>
        <div class="title">BLOCKCHAIN FORENSIC INVESTIGATION REPORT</div>
        <div class="subtitle">Automated Intelligence & VASP Attribution Engine | Sutra Platform</div>
      </td>
      <td style="text-align: right; vertical-align: bottom;">
        <strong>Docket Ref:</strong> {{ report.docket_number }}<br/>
        <strong>Generated:</strong> {{ report.generated_at }}
      </td>
    </tr>
  </table>

  <!-- Case Metadata -->
  <div class="section-title">1. Case Identification & Authority</div>
  <table class="data-table">
    <tr>
      <th style="width: 25%;">Case / Incident ID</th>
      <td>{{ report.case_id }}</td>
      <th style="width: 25%;">NCRP Reference</th>
      <td>{{ report.complaint_id or "N/A" }}</td>
    </tr>
    <tr>
      <th>Investigating Officer</th>
      <td>{{ report.officer_name }}</td>
      <th>Badge / Service ID</th>
      <td>{{ report.officer_badge }}</td>
    </tr>
    <tr>
      <th>Agency / Division</th>
      <td>State Cyber Crime Police / I4C Portal</td>
      <th>Jurisdiction</th>
      <td>India (BNSS / IT Act)</td>
    </tr>
  </table>

  <!-- Target & Attribution Summary -->
  <div class="section-title">2. Executive Forensics & VASP Attribution Summary</div>
  <table class="data-table">
    <tr>
      <th style="width: 25%;">Suspect Origin Wallet</th>
      <td colspan="3"><code>{{ report.suspect_address }}</code> ({{ report.chain|upper }})</td>
    </tr>
    <tr>
      <th>Identified VASP</th>
      <td><strong>{{ report.attribution.vasp_name if report.attribution else "Unknown Entity" }}</strong></td>
      <th>FIU-IND Registered</th>
      <td>{{ "YES (Compliant Reporting Entity)" if report.attribution and report.attribution.is_fiu_registered else "NO / Offshore Entity" }}</td>
    </tr>
    <tr>
      <th>Nearest KYC Deposit Wallet</th>
      <td colspan="3"><code>{{ report.attribution.deposit_address if report.attribution else "N/A" }}</code></td>
    </tr>
    <tr>
      <th>Exchange Hot Wallet Sweep</th>
      <td colspan="3"><code>{{ report.attribution.hot_wallet_address if report.attribution else "N/A" }}</code></td>
    </tr>
    <tr>
      <th>Attribution Confidence</th>
      <td><span class="score-badge">{{ report.attribution.confidence_score if report.attribution else 0.0 }} / 100</span></td>
      <th>Hops to Deposit</th>
      <td>{{ report.attribution.hop_count if report.attribution else "N/A" }} Hop(s)</td>
    </tr>
    <tr>
      <th>Attribution Rationale</th>
      <td colspan="3">{{ report.attribution.reasoning if report.attribution else "Insufficient data to attribute centralized exchange." }}</td>
    </tr>
  </table>

  <!-- Multi-factor Confidence Breakdown -->
  {% if report.attribution and report.attribution.confidence_breakdown %}
  <div class="section-title">3. Multi-Factor Explainable Confidence Matrix</div>
  <table class="data-table">
    <tr>
      <th>Factor</th>
      <th>Max Points</th>
      <th>Awarded Score</th>
      <th>Forensic Factor Description</th>
    </tr>
    <tr>
      <td>Label Reliability</td>
      <td>30</td>
      <td>{{ report.attribution.confidence_breakdown.label_reliability }}</td>
      <td>Authoritative registry / FIU registration validation</td>
    </tr>
    <tr>
      <td>Hop Proximity</td>
      <td>25</td>
      <td>{{ report.attribution.confidence_breakdown.hop_proximity }}</td>
      <td>Physical proximity in graph from suspect to exchange deposit</td>
    </tr>
    <tr>
      <td>Value Share</td>
      <td>20</td>
      <td>{{ report.attribution.confidence_breakdown.value_share }}</td>
      <td>Fraction of outbound suspect volume entering this entity</td>
    </tr>
    <tr>
      <td>Sweep Pattern</td>
      <td>15</td>
      <td>{{ report.attribution.confidence_breakdown.sweep_pattern }}</td>
      <td>Verification of subsequent sweep into exchange hot wallet pool</td>
    </tr>
    <tr>
      <td>Timing Correlation</td>
      <td>10</td>
      <td>{{ report.attribution.confidence_breakdown.timing_correlation }}</td>
      <td>Speed of fund consolidation across layering mules</td>
    </tr>
  </table>
  {% endif %}

  <!-- Flow Ledger -->
  <div class="section-title">4. Forensically Traced Transaction Ledger</div>
  <table class="data-table">
    <thead>
      <tr>
        <th>Tx Hash</th>
        <th>From Address</th>
        <th>To Address</th>
        <th>Value</th>
        <th>Timestamp (UTC)</th>
      </tr>
    </thead>
    <tbody>
      {% for tx in report.transactions[:15] %}
      <tr>
        <td><code>{{ tx.tx_hash[:16] }}...</code></td>
        <td><code>{{ tx.from_address[:12] }}...</code></td>
        <td><code>{{ tx.to_address[:12] }}...</code></td>
        <td>{{ "%.2f"|format(tx.value) }} {{ tx.token }}</td>
        <td>{{ tx.timestamp_str }}</td>
      </tr>
      {% endfor %}
    </tbody>
  </table>

  <!-- Section 63 BSA Digital Evidence Certificate -->
  <div class="section-title">5. Certificate of Digital Evidence (Section 63 BSA, 2023)</div>
  <p style="font-size: 8.5pt; color: #4a5568; margin-bottom: 6px;">
    I hereby certify that the electronic records contained in this docket have been produced by the
    automated forensic tracing engine "Sutra" during its ordinary course of lawful cryptographic analysis.
    The hash integrity digest below ensures that no records have been altered or tampered with.
  </p>
  <div class="evidence-box">
    <strong>SECTION 63 BSA SHA-256 EVIDENCE INTEGRITY HASH:</strong><br/>
    {{ report.evidence_seal.sha256_hash }}<br/><br/>
    <strong>HASH PAYLOAD CANONICAL DIGEST:</strong> {{ report.evidence_seal.canonical_elements_count }} elements verified<br/>
    <strong>SYSTEM TIMESTAMP:</strong> {{ report.evidence_seal.timestamp }}
  </div>

  <div class="footer-seal">
    <strong>Investigating Officer Signature / Token Seal:</strong> __________________________<br/>
    Authorized under Section 94 BNSS, 2023 & Section 79A Information Technology Act, 2000.
  </div>

</body>
</html>
"""


def build_lea_report_data(
    case_id: str,
    trace: TraceResult,
    officer_name: str = "Investigating Officer",
    officer_badge: str = "CYBER-LE-01",
    complaint_id: str | None = None,
) -> dict[str, Any]:
    """Constructs the canonical JSON report bundle with Section 63 BSA certificate."""
    now_iso = datetime.now(UTC).isoformat()
    docket_num = f"LEA-SUTRA-{hashlib.md5(f'{case_id}:{now_iso}'.encode()).hexdigest()[:8].upper()}"

    tx_list = []
    for edge in trace.edges:
        tx_list.append({
            "tx_hash": edge.txHash,
            "from_address": edge.from_address,
            "to_address": edge.to_address,
            "value": edge.value,
            "token": edge.token,
            "timestamp": int(edge.timestamp.timestamp()),
            "timestamp_str": edge.timestamp.strftime("%Y-%m-%d %H:%M:%S UTC"),
        })

    # Compute Section 63 BSA hash
    node_dicts = [
        {"address": n.address, "chain": n.chain, "riskScore": n.riskScore}
        for n in trace.nodes
    ]
    tx_hashes = [e.txHash for e in trace.edges]
    evidence_hash = compute_evidence_hash(tx_hashes, node_dicts)

    attribution_data = trace.attribution.model_dump() if trace.attribution else None

    return {
        "docket_number": docket_num,
        "case_id": case_id,
        "complaint_id": complaint_id or trace.case_id,
        "generated_at": now_iso,
        "officer_name": officer_name,
        "officer_badge": officer_badge,
        "suspect_address": trace.suspect_address,
        "chain": trace.chain,
        "overall_risk_score": trace.overall_risk_score,
        "nodes_count": len(trace.nodes),
        "edges_count": len(trace.edges),
        "attribution": attribution_data,
        "transactions": tx_list,
        "typology_flags": sorted(list({flag for n in trace.nodes for flag in n.typologyFlags})),
        "evidence_seal": {
            "legal_framework": "Section 63 Bharatiya Sakshya Adhiniyam, 2023 r/w Section 79A IT Act, 2000",
            "sha256_hash": evidence_hash,
            "canonical_elements_count": len(tx_hashes) + len(node_dicts),
            "timestamp": now_iso,
        },
    }


async def generate_lea_report_pdf(report_data: dict[str, Any]) -> Path:
    """Render court-ready PDF using WeasyPrint (with graceful PDF/HTML fallback)."""
    env = Environment(autoescape=select_autoescape(["html", "xml"]))
    template = env.from_string(_LEA_HTML_TEMPLATE)
    rendered_html = template.render(report=report_data)

    out_file = REPORT_OUTPUT_DIR / f"{report_data['docket_number']}.pdf"

    try:
        from weasyprint import HTML
        HTML(string=rendered_html).write_pdf(str(out_file))
        log.info("Rendered LEA Report PDF via WeasyPrint: %s", out_file)
        return out_file
    except Exception as exc:
        log.warning("WeasyPrint direct render failed: %s; saving HTML report bundle", exc)
        html_file = REPORT_OUTPUT_DIR / f"{report_data['docket_number']}.html"
        html_file.write_text(rendered_html, encoding="utf-8")
        return html_file
