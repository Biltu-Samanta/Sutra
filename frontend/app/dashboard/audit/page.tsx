"use client";

import React, { useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import {
  LockKeyhole,
  Search,
  SlidersHorizontal,
  CheckCircle2,
} from "lucide-react";

interface AuditLogItem {
  id: string;
  officer: string;
  action: string;
  query: string;
  timestamp: string;
}

export default function AuditLogPage() {
  const [auditSearch, setAuditSearch] = useState("");
  const [auditFilter, setAuditFilter] = useState("All Actions");

  const auditRows: AuditLogItem[] = [
    {
      id: "LOG-1092",
      officer: "Inspector A. Sharma (IO-402)",
      action: "Traversal",
      query: "TABC1234567890XYZ99887766554433 · 4 hops",
      timestamp: "20 Sept, 08:02 pm",
    },
    {
      id: "LOG-1093",
      officer: "ACP R. Verma (Supervisor)",
      action: "Notice",
      query: "CS-2026-8891 · Approved Section 94 Notice for CoinDCX",
      timestamp: "20 Sept, 08:15 pm",
    },
    {
      id: "LOG-1094",
      officer: "Inspector K. Patil (IO-118)",
      action: "Ingestion",
      query: "FIR-2026-DEL-0412 · NCRP Ingestion",
      timestamp: "21 Sept, 02:42 pm",
    },
    {
      id: "LOG-1095",
      officer: "ACP R. Verma (Supervisor)",
      action: "Certificate",
      query: "Section 63 BSA Hash: 3a9f02c1...8b4e72",
      timestamp: "21 Sept, 03:34 pm",
    },
    {
      id: "LOG-1096",
      officer: "VASP Compliance (WazirX Nodal)",
      action: "Freeze Execution",
      query: "Deposit Account #WZ-9921 Freeze Confirmation",
      timestamp: "21 Sept, 05:00 pm",
    },
    {
      id: "LOG-1097",
      officer: "Inspector A. Sharma (IO-402)",
      action: "Traversal",
      query: "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t · 5 hops",
      timestamp: "22 Sept, 10:14 am",
    },
    {
      id: "LOG-1098",
      officer: "ACP R. Verma (Supervisor)",
      action: "Notice",
      query: "CS-2026-8820 · Approved Section 94 Notice for WazirX",
      timestamp: "22 Sept, 11:20 am",
    },
  ];

  const shownAudit = auditRows.filter((r) => {
    const matchesAction =
      auditFilter === "All Actions" || r.action === auditFilter;
    const q = auditSearch.toLowerCase();
    const matchesSearch =
      !q ||
      r.id.toLowerCase().includes(q) ||
      r.officer.toLowerCase().includes(q) ||
      r.action.toLowerCase().includes(q) ||
      r.query.toLowerCase().includes(q) ||
      r.timestamp.toLowerCase().includes(q);

    return matchesAction && matchesSearch;
  });

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="page-heading">
          <div>
            <div className="eyebrow">
              <LockKeyhole size={13} /> SUPERVISORY OVERSIGHT &amp; CHAIN OF CUSTODY
            </div>
            <h1>Supervisory Audit Trail</h1>
            <p>
              Cryptographically sealed register of searches, traversals and legal notice issuances under Section 63 BSA.
            </p>
          </div>
        </div>

        <div className="filter-bar audit-filter">
          <label className="list-search">
            <Search size={18} />
            <input
              aria-label="Search audit logs"
              placeholder="Search by Log ID, Officer, Action, or Query..."
              value={auditSearch}
              onChange={(e) => setAuditSearch(e.target.value)}
            />
          </label>
          <div className="select-wrap">
            <SlidersHorizontal size={16} />
            <span>ACTION:</span>
            <select
              aria-label="Filter audit action"
              value={auditFilter}
              onChange={(e) => setAuditFilter(e.target.value)}
            >
              <option>All Actions</option>
              <option>Traversal</option>
              <option>Notice</option>
              <option>Ingestion</option>
              <option>Certificate</option>
              <option>Freeze Execution</option>
            </select>
          </div>
        </div>

        <div className="table-scroll">
          <table className="data-table audit-table">
            <thead>
              <tr>
                <th>LOG ID</th>
                <th>OFFICER / UNIT</th>
                <th>ACTION TYPE</th>
                <th>TARGET QUERY / CASE REFERENCE</th>
                <th>TIMESTAMP (UTC)</th>
                <th>INTEGRITY</th>
              </tr>
            </thead>
            <tbody>
              {shownAudit.map((r) => (
                <tr key={r.id}>
                  <td className="mono case-id">{r.id}</td>
                  <td>{r.officer}</td>
                  <td>
                    <span className="audit-tag">{r.action}</span>
                  </td>
                  <td className="mono muted-cell">{r.query}</td>
                  <td className="mono muted-cell">{r.timestamp}</td>
                  <td>
                    <span className="sealed">
                      <CheckCircle2 size={13} /> SEALED
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {shownAudit.length === 0 && (
            <div className="empty-state">No audit entries match your search.</div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
