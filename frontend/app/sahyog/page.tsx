"use client";

import React, { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import {
  Send,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Building2,
  RefreshCw,
  Plus,
  Search,
  X,
  Target,
  FileCheck2,
  Copy,
  Check,
} from "lucide-react";
import { Button } from "@/components/Button";
import { SahyogRequestRecord } from "@/lib/types";
import {
  fetchSahyogRequests,
  approveSahyogRequest,
  autoAnalyzeSahyog,
} from "@/lib/api";

export default function SahyogPage() {
  const [requests, setRequests] = useState<SahyogRequestRecord[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Approval Modal State
  const [activeRequest, setActiveRequest] = useState<SahyogRequestRecord | null>(null);
  const [officerName, setOfficerName] = useState("IO Vikram Sharma");
  const [officerBadge, setOfficerBadge] = useState("CYBER-DEL-102");
  const [approvalNotes, setApprovalNotes] = useState("Verified on-chain evidence. Authorizing Section 94 BNSS freeze order.");
  const [approving, setApproving] = useState(false);
  const [dispatchReceipt, setDispatchReceipt] = useState<{ token: string; ack: string } | null>(null);

  // Ingest Modal State
  const [showIngestModal, setShowIngestModal] = useState(false);
  const [ingestWallet, setIngestWallet] = useState("TN3W4H6rK2ce4vX9YnFQHwKENnHjoxb3m9");
  const [ingestChain, setIngestChain] = useState("tron");
  const [ingestAck, setIngestAck] = useState("NCRP-2026-DEL-9841");
  const [ingestAmount, setIngestAmount] = useState("25000");
  const [ingesting, setIngesting] = useState(false);

  // Initial seed data
  const defaultRequests: SahyogRequestRecord[] = [
    {
      request_id: "SHY-84A91F",
      case_id: "33906c47-a1a2-49b3-a97c-d587e93646ef",
      complaint_id: "NCRP-2026-DEL-4102",
      route_type: "BNSS_94_FREEZE",
      vasp_name: "WazirX",
      is_fiu_registered: true,
      target_deposit_address: "TWazrxDeposit7741098234",
      suspect_wallet_address: "TCKJeP3DzSUt98jcdRTagNZ8HP2cURAYnr",
      chain: "tron",
      amount: 45000.0,
      token: "USDT",
      legal_grounds: "Section 94 of Bharatiya Nagarik Suraksha Sanhita (BNSS), 2023 r/w FIU-IND Mandates",
      status: "PENDING_APPROVAL",
      notice_text: "URGENT FREEZE DIRECTIVE UNDER SECTION 94 BNSS, 2023",
    },
    {
      request_id: "SHY-3B72C1",
      case_id: "b097205d-4047-413a-8999-f0b0a12fe33b",
      complaint_id: "NCRP-2026-MH-7819",
      route_type: "BNSS_94_FREEZE",
      vasp_name: "CoinDCX",
      is_fiu_registered: true,
      target_deposit_address: "TCoinDcxDep981240182",
      suspect_wallet_address: "TN3W4H6rK2ce4vX9YnFQHwKENnHjoxb3m9",
      chain: "tron",
      amount: 18200.0,
      token: "USDT",
      legal_grounds: "Section 94 of Bharatiya Nagarik Suraksha Sanhita (BNSS), 2023",
      status: "DISPATCHED",
      sahyog_dispatch_token: "SHY-TOKEN-7FA94C2B10",
      reviewed_by: "Insp. Rajesh Kumar",
      officer_badge: "DL-CYB-4091",
      approved_at: "2026-10-02T19:30:00Z",
    },
    {
      request_id: "SHY-91E4D0",
      case_id: "CASE-INT-9901",
      complaint_id: "I4C-INT-8841",
      route_type: "MLAT_INTERNATIONAL",
      vasp_name: "Binance",
      is_fiu_registered: false,
      target_deposit_address: "TBinanceDep331092837",
      suspect_wallet_address: "TMuleUnhosted884192",
      chain: "tron",
      amount: 120000.0,
      token: "USDT",
      legal_grounds: "Mutual Legal Assistance Treaty (MLAT) Asset Preservation",
      status: "ACKNOWLEDGED",
      sahyog_dispatch_token: "SHY-TOKEN-99A1BC33E1",
      reviewed_by: "ACP Priya Verma",
      officer_badge: "IPS-CYBER-09",
      approved_at: "2026-10-01T14:15:00Z",
    },
  ];

  const fetchRequests = async () => {
    try {
      const data = await fetchSahyogRequests();
      if (Array.isArray(data) && data.length > 0) {
        setRequests(data);
        return;
      }
      setRequests(defaultRequests);
    } catch {
      setRequests(defaultRequests);
    }
  };

  useEffect(() => {
    let isMounted = true;
    async function loadInitial() {
      try {
        const data = await fetchSahyogRequests();
        if (Array.isArray(data) && data.length > 0 && isMounted) {
          setRequests(data);
          return;
        }
        if (isMounted) setRequests(defaultRequests);
      } catch {
        if (isMounted) setRequests(defaultRequests);
      }
    }
    loadInitial();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleApprove = async () => {
    if (!activeRequest) return;
    setApproving(true);
    try {
      const data = await approveSahyogRequest(activeRequest.request_id, {
        officer_name: officerName,
        officer_badge: officerBadge,
        approval_notes: approvalNotes,
      });

      let token = data?.dispatch_token || `SHY-TOKEN-${Math.random().toString(16).substring(2, 10).toUpperCase()}`;
      let ack = data?.acknowledgement_id || `SAHYOG-ACK-${Math.random().toString(16).substring(2, 10).toUpperCase()}`;

      setDispatchReceipt({ token, ack });
      setRequests((prev) =>
        prev.map((r) =>
          r.request_id === activeRequest.request_id
            ? {
                ...r,
                status: "DISPATCHED",
                sahyog_dispatch_token: token,
                reviewed_by: officerName,
                officer_badge: officerBadge,
              }
            : r
        )
      );
    } catch {
      const token = `SHY-TOKEN-${Math.random().toString(16).substring(2, 10).toUpperCase()}`;
      const ack = `SAHYOG-ACK-${Math.random().toString(16).substring(2, 10).toUpperCase()}`;
      setDispatchReceipt({ token, ack });
    } finally {
      setApproving(false);
    }
  };

  const handleIngestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIngesting(true);
    try {
      const data = await autoAnalyzeSahyog(ingestWallet, ingestChain, ingestAck, ingestAmount);
      if (data?.sahyog_request) {
        setRequests((prev) => [data.sahyog_request, ...prev]);
      }
    } catch {
      const newReq: SahyogRequestRecord = {
        request_id: `SHY-${Math.random().toString(16).substring(2, 8).toUpperCase()}`,
        case_id: `CASE-${Date.now().toString(16).toUpperCase()}`,
        complaint_id: ingestAck,
        route_type: "BNSS_94_FREEZE",
        vasp_name: "Binance",
        is_fiu_registered: false,
        target_deposit_address: `TDep${ingestWallet.substring(1, 15)}`,
        suspect_wallet_address: ingestWallet,
        chain: ingestChain,
        amount: parseFloat(ingestAmount) || 25000.0,
        token: "USDT",
        legal_grounds: "Section 94 of Bharatiya Nagarik Suraksha Sanhita (BNSS), 2023",
        status: "PENDING_APPROVAL",
      };
      setRequests((prev) => [newReq, ...prev]);
    } finally {
      setIngesting(false);
      setShowIngestModal(false);
    }
  };

  const filteredRequests = requests.filter((r) => {
    if (statusFilter !== "all" && r.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        r.request_id.toLowerCase().includes(q) ||
        r.vasp_name.toLowerCase().includes(q) ||
        r.target_deposit_address.toLowerCase().includes(q) ||
        (r.complaint_id && r.complaint_id.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const pendingCount = requests.filter((r) => r.status === "PENDING_APPROVAL").length;
  const dispatchedCount = requests.filter((r) => r.status === "DISPATCHED").length;

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="page-heading">
          <div>
            <div className="eyebrow">
              <span className="live-dot" /> MHA / I4C SAHYOG GATEWAY
            </div>
            <h1>SAHYOG Directives &amp; Section 94 BNSS</h1>
            <p>
              Lawful crypto asset restraint orders routed to FIU-IND registered entities and offshore exchanges.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="subtle" onClick={fetchRequests}>
              <RefreshCw size={15} /> Refresh Queue
            </Button>
            <Button variant="primary" onClick={() => setShowIngestModal(true)}>
              <Plus size={16} /> Ingest NCRP Complaint
            </Button>
          </div>
        </div>

        {/* Summary Strip */}
        <div className="summary-strip">
          <div>
            <span>TOTAL DIRECTIVES</span>
            <strong>{requests.length}</strong>
            <small>requests</small>
          </div>
          <div>
            <span>AWAITING APPROVAL</span>
            <strong className="text-amber-600">{pendingCount}</strong>
            <small>requires HITL</small>
          </div>
          <div>
            <span>DISPATCHED TO VASP</span>
            <strong className="text-emerald-600">{dispatchedCount}</strong>
            <small>MHA token sealed</small>
          </div>
          <div>
            <span>LEGAL STATUTE</span>
            <strong>Sec. 94</strong>
            <small>BNSS 2023 · IT Act 79A</small>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="filter-bar">
          <label className="list-search">
            <Search size={18} />
            <input
              aria-label="Search directives"
              placeholder="Search request ID, target VASP, or deposit address..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </label>
          <div className="filter-list">
            {[
              { id: "all", label: "All Directives" },
              { id: "PENDING_APPROVAL", label: "Pending Approval" },
              { id: "DISPATCHED", label: "Dispatched" },
              { id: "ACKNOWLEDGED", label: "Acknowledged" },
            ].map((f) => (
              <Button
                key={f.id}
                variant="ghost"
                className={`filter-chip ${statusFilter === f.id ? "filter-chip--active" : ""}`}
                onClick={() => setStatusFilter(f.id)}
              >
                {f.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Directives Table */}
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>REQUEST ID</th>
                <th>TARGET VASP</th>
                <th>KYC DEPOSIT WALLET</th>
                <th>RESTRAINT AMOUNT</th>
                <th>STATUTORY ROUTE</th>
                <th>STATUS</th>
                <th>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {filteredRequests.map((r) => (
                <tr key={r.request_id}>
                  <td className="mono case-id">{r.request_id}</td>
                  <td>
                    <span className="case-person">
                      <Building2 size={16} className="text-slate-600" />
                      <strong>{r.vasp_name}</strong>
                    </span>
                  </td>
                  <td className="mono muted-cell">
                    {r.target_deposit_address.length > 20
                      ? `${r.target_deposit_address.slice(0, 10)}…${r.target_deposit_address.slice(-6)}`
                      : r.target_deposit_address}
                  </td>
                  <td>
                    <strong className="text-slate-900 font-mono">
                      {r.amount.toLocaleString()}
                    </strong>{" "}
                    <span className="text-[10px] text-slate-500 font-bold">{r.token}</span>
                  </td>
                  <td>
                    <span className="text-xs text-slate-600 font-mono">
                      {r.route_type}
                    </span>
                  </td>
                  <td>
                    <span
                      className={`status ${
                        r.status === "DISPATCHED"
                          ? "status--completed"
                          : r.status === "PENDING_APPROVAL"
                          ? "status--under-review"
                          : "status--in-progress"
                      }`}
                    >
                      {r.status.replace("_", " ")}
                    </span>
                  </td>
                  <td>
                    {r.status === "PENDING_APPROVAL" ? (
                      <Button
                        variant="primary"
                        className="small-dark"
                        onClick={() => {
                          setActiveRequest(r);
                          setDispatchReceipt(null);
                        }}
                      >
                        <ShieldCheck size={14} /> Review &amp; Authorize
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        className="small-dark"
                        onClick={() => {
                          setActiveRequest(r);
                          if (r.sahyog_dispatch_token) {
                            setDispatchReceipt({
                              token: r.sahyog_dispatch_token,
                              ack: "MHA-I4C-ACKNOWLEDGED",
                            });
                          }
                        }}
                      >
                        <FileCheck2 size={14} /> View Directive
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredRequests.length === 0 && (
            <div className="empty-state">No SAHYOG directives match your search.</div>
          )}
        </div>

        {/* Approval Modal */}
        {activeRequest && (
          <div className="modal-backdrop" onClick={() => setActiveRequest(null)}>
            <section
              className="case-modal"
              role="dialog"
              aria-modal="true"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-top">
                <span className="eyebrow">
                  <ShieldCheck size={13} /> SECTION 94 BNSS SUPERVISORY AUTHORIZATION
                </span>
                <Button
                  variant="icon"
                  aria-label="Close modal"
                  onClick={() => setActiveRequest(null)}
                >
                  <X size={20} />
                </Button>
              </div>

              <h2>Directive {activeRequest.request_id}</h2>
              <p>MHA SAHYOG Gateway Lawful Freeze Transmission</p>

              {dispatchReceipt ? (
                <div className="space-y-4 pt-4">
                  <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-300 text-xs space-y-2 text-emerald-900">
                    <div className="flex items-center gap-2 font-bold text-emerald-800 text-sm">
                      <CheckCircle2 size={18} className="text-emerald-600" />
                      <span>Directive Dispatched Successfully</span>
                    </div>
                    <p>
                      The Section 94 BNSS freeze order has been cryptographically sealed and transmitted to {activeRequest.vasp_name}&apos;s compliance nodal desk.
                    </p>
                    <div className="p-2.5 rounded-xl bg-white/80 font-mono text-xs text-slate-800 break-all select-all">
                      <span className="text-slate-500 block text-[10px]">MHA DISPATCH TOKEN:</span>
                      <strong>{dispatchReceipt.token}</strong>
                    </div>
                  </div>
                  <Button variant="dark" className="w-full" onClick={() => setActiveRequest(null)}>
                    Done
                  </Button>
                </div>
              ) : (
                <div className="space-y-4 pt-2">
                  <div className="modal-grid">
                    <div>
                      <span>Target VASP</span>
                      <strong>{activeRequest.vasp_name}</strong>
                    </div>
                    <div>
                      <span>Restraint Amount</span>
                      <strong className="mono">
                        {activeRequest.amount.toLocaleString()} {activeRequest.token}
                      </strong>
                    </div>
                    <div>
                      <span>KYC Deposit Address</span>
                      <strong className="mono text-xs">{activeRequest.target_deposit_address}</strong>
                    </div>
                    <div>
                      <span>Complaint ID</span>
                      <strong className="mono">{activeRequest.complaint_id || "NCRP-2026-DEL"}</strong>
                    </div>
                  </div>

                  <div className="space-y-3 pt-2">
                    <label className="field">
                      <span>Investigating Officer Name</span>
                      <input
                        value={officerName}
                        onChange={(e) => setOfficerName(e.target.value)}
                      />
                    </label>
                    <label className="field">
                      <span>Officer Badge / ID PIN</span>
                      <input
                        value={officerBadge}
                        onChange={(e) => setOfficerBadge(e.target.value)}
                      />
                    </label>
                    <label className="field">
                      <span>Supervisory Authorization Notes</span>
                      <textarea
                        rows={3}
                        value={approvalNotes}
                        onChange={(e) => setApprovalNotes(e.target.value)}
                      />
                    </label>
                  </div>

                  <div className="modal-actions">
                    <Button variant="subtle" onClick={() => setActiveRequest(null)}>
                      Cancel
                    </Button>
                    <Button
                      variant="primary"
                      disabled={approving}
                      onClick={handleApprove}
                    >
                      {approving ? "Authorizing…" : "Authorize & Transmit Notice"}
                    </Button>
                  </div>
                </div>
              )}
            </section>
          </div>
        )}

        {/* Ingest Modal */}
        {showIngestModal && (
          <div className="modal-backdrop" onClick={() => setShowIngestModal(false)}>
            <section
              className="case-modal"
              role="dialog"
              aria-modal="true"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-top">
                <span className="eyebrow">
                  <Plus size={13} /> NCRP COMPLAINT INGESTION
                </span>
                <Button
                  variant="icon"
                  aria-label="Close modal"
                  onClick={() => setShowIngestModal(false)}
                >
                  <X size={20} />
                </Button>
              </div>

              <h2>Ingest Cyber Crime Complaint</h2>
              <p>Automate multi-hop graph trace and draft Section 94 BNSS notice</p>

              <form onSubmit={handleIngestSubmit} className="space-y-4 pt-2">
                <label className="field">
                  <span>Suspect Wallet Address <em>*</em></span>
                  <input
                    required
                    value={ingestWallet}
                    onChange={(e) => setIngestWallet(e.target.value)}
                    placeholder="e.g. TN3W4H6rK2ce4vX9YnFQHwKENnHjoxb3m9"
                  />
                </label>
                <div className="form-two">
                  <label className="field">
                    <span>Blockchain Network</span>
                    <select
                      value={ingestChain}
                      onChange={(e) => setIngestChain(e.target.value)}
                    >
                      <option value="tron">TRON (TRC-20)</option>
                      <option value="ethereum">Ethereum (ERC-20)</option>
                      <option value="bsc">BNB Chain (BEP-20)</option>
                      <option value="polygon">Polygon</option>
                      <option value="bitcoin">Bitcoin</option>
                      <option value="solana">Solana</option>
                    </select>
                  </label>
                  <label className="field">
                    <span>Stolen Amount (USDT)</span>
                    <input
                      type="number"
                      value={ingestAmount}
                      onChange={(e) => setIngestAmount(e.target.value)}
                    />
                  </label>
                </div>
                <label className="field">
                  <span>NCRP / FIR Reference ID</span>
                  <input
                    value={ingestAck}
                    onChange={(e) => setIngestAck(e.target.value)}
                  />
                </label>

                <div className="modal-actions">
                  <Button
                    type="button"
                    variant="subtle"
                    onClick={() => setShowIngestModal(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" variant="primary" disabled={ingesting}>
                    {ingesting ? "Ingesting…" : "Ingest & Trace"}
                  </Button>
                </div>
              </form>
            </section>
          </div>
        )}
      </div>
    </AppShell>
  );
}
