"use client";

import React, { useState } from "react";
import { Download, ShieldCheck, CheckCircle2, Loader2, Send } from "lucide-react";
import { Button } from "@/components/Button";
import { generateNotice, getLeaReportPdfUrl } from "@/lib/api";
import { LegalNoticePayload, NoticeGenerateResponse } from "@/lib/types";

interface NoticePreviewProps {
  caseId?: string;
  vaspName?: string;
  depositAddress?: string;
  evidenceHash?: string;
  pdfUrl?: string;
  noticeRef?: string;
  isFiuRegistered?: boolean;
  payload?: LegalNoticePayload;
}

export function NoticePreview({
  caseId = "CS-2026-8891",
  vaspName = "CoinDCX",
  depositAddress = "TCOINDCXDEPOSIT9988776655443311",
  evidenceHash = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  pdfUrl: initialPdfUrl,
  noticeRef: initialNoticeRef,
  isFiuRegistered = true,
  payload,
}: NoticePreviewProps) {
  const [loading, setLoading] = useState(false);
  const [noticeSent, setNoticeSent] = useState(false);
  const [noticeData, setNoticeData] = useState<NoticeGenerateResponse | null>(null);

  const activePdfUrl = noticeData?.pdfUrl || noticeData?.pdf_url || initialPdfUrl || getLeaReportPdfUrl(caseId);
  const activeHash = noticeData?.sha256_evidence_hash || evidenceHash;
  const activeVasp = noticeData?.vasp_name || vaspName;
  const activeRef = noticeData?.notice_ref || initialNoticeRef || `NOTICE-${caseId}`;

  const handleGeneratePDF = async () => {
    if (activePdfUrl && !activePdfUrl.includes("#mock")) {
      window.open(activePdfUrl, "_blank");
      return;
    }

    setLoading(true);
    try {
      const noticePayload: LegalNoticePayload = payload || {
        case_number: caseId,
        suspect_address: depositAddress,
        attributed_vasp: {
          vasp_name: activeVasp,
          is_fiu_registered: isFiuRegistered,
          confidence_score: 0.95,
          deposit_address: depositAddress,
          hot_wallet_address: "THOTWALLETHOLDER00000000000000",
          nodal_officer_email: "nodal@coindcx.com",
        },
        loss_amount_inr: 500000,
        flow_summary: `Section 94 BNSS Legal Notice for Case ${caseId}`,
        sha256_evidence_hash: activeHash.padStart(64, "0").slice(0, 64),
      };

      const res = await generateNotice(noticePayload);
      setNoticeData(res);
      const targetUrl = res.pdf_url || res.pdfUrl;
      if (targetUrl && !targetUrl.includes("#mock")) {
        window.open(targetUrl, "_blank");
      } else {
        window.print();
      }
    } catch {
      window.print();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full space-y-6">
      <div className="page-heading">
        <div>
          <div className="eyebrow">LEGAL WORKSPACE</div>
          <h1>Legal Freeze Notice</h1>
          <p>
            Section 94 BNSS · Section 63 BSA Digital Evidence Certificate · {caseId}
          </p>
        </div>
        <Button variant="primary" onClick={() => setNoticeSent(true)}>
          <Send size={17} /> {noticeSent ? "Sent for Approval" : "Send for Approval"}
        </Button>
      </div>

      <div className="notice-layout">
        {/* Notice Paper */}
        <div className="notice-paper">
          <div className="notice-header">
            <div>
              <div className="eyebrow">OFFICIAL DOCUMENT</div>
              <h2>Formal Freeze Order</h2>
              <p>SECTION 94 BNSS, 2023</p>
            </div>
            <span className="notice-seal">
              <ShieldCheck size={26} />
            </span>
          </div>

          <div className="notice-ref">
            Reference Case ID: {caseId} <span>·</span> Ref: {activeRef}
          </div>

          <div className="notice-body">
            <p>
              <strong>TO: Nodal Compliance Officer, {activeVasp}</strong>
            </p>
            <p>
              WHEREAS information has been laid before the undersigned Cyber Crime Police Station regarding stolen victim funds routed through crypto networks and attributed to accounts maintained on your Virtual Asset Service Provider (VASP) platform.
            </p>
            <p className="notice-emphasis">
              YOU ARE HEREBY DIRECTED TO IMMEDIATELY FREEZE AND RESTRAIN MOVEMENT ON THE SPECIFIED DEPOSIT ACCOUNT:
            </p>
            <div className="address-box">
              <span>KYC DEPOSIT ADDRESS</span>
              <strong className="mono">{depositAddress}</strong>
            </div>
          </div>
        </div>

        {/* Notice Side Panel */}
        <div className="notice-side">
          <div className="notice-side-card">
            <div className="side-card-heading">
              <ShieldCheck size={20} />
              <h3>Evidence certificate</h3>
            </div>
            <span className="eyebrow">SECTION 63 BSA · DIGITAL HASH STAMP</span>
            <p>
              This document carries a cryptographically verifiable SHA-256 hash stamp corresponding to the graph traversal chain recorded at the time of legal notice issuance.
            </p>
            <div className="hash-box mono">{activeHash}</div>
          </div>

          <Button
            variant="dark"
            className="download-button"
            onClick={handleGeneratePDF}
            disabled={loading}
          >
            {loading ? <Loader2 size={17} className="animate-spin" /> : <Download size={17} />}
            Download PDF / Print
          </Button>

          {noticeSent && (
            <div className="success-callout">
              <CheckCircle2 size={18} /> Approval request marked as sent to Supervisory Officer.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
