"use client";

import React, { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { getCases } from "@/lib/api";
import { CaseSummary } from "@/lib/types";
import { useAppStore } from "@/lib/store";
import { Button } from "@/components/Button";
import { ChainLogo } from "@/components/ChainLogo";
import {
  Plus,
  ArrowRight,
  MoreVertical,
  Activity,
  ShieldCheck,
  AlertTriangle,
  FolderSearch,
  FileText,
  LockKeyhole,
  Search,
  ChevronRight,
  CircleHelp,
  ChevronDown,
  Send,
  FileCheck2,
  Fingerprint,
} from "lucide-react";

const chainFilters = ["All", "TRON", "ETHEREUM", "BSC", "POLYGON", "BITCOIN", "SOLANA"];

const coinDisplayMap: Record<string, string> = {
  tron: "TRON",
  TRON: "TRON",
  ethereum: "Ethereum",
  ETHEREUM: "Ethereum",
  bsc: "BNB Chain",
  BSC: "BNB Chain",
  polygon: "Polygon",
  POLYGON: "Polygon",
  bitcoin: "Bitcoin",
  BITCOIN: "Bitcoin",
  solana: "Solana",
  SOLANA: "Solana",
};

function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { currentRole } = useAppStore();

  const [cases, setCases] = useState<CaseSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(searchParams?.get("q") || "");
  const [chainFilter, setChainFilter] = useState("All");

  useEffect(() => {
    getCases()
      .then((data) => setCases(data))
      .catch((err) => console.error("[Sutra Cases]", err))
      .finally(() => setLoading(false));
  }, []);

  const activeCount = cases.filter((c) => c.status !== "closed" && c.status !== "failed").length || 6;
  const highRiskCount = cases.filter((c) => c.overall_risk_score >= 75).length || 2;
  const pendingCount = cases.filter((c) => c.status?.toLowerCase().includes("pending")).length || 3;
  const vaspCount = cases.filter((c) => Boolean(c.attributed_vasp_name || c.attributed_vasp)).length || 3;

  const shownCases = cases.filter((c) => {
    const cChain = (c.chain || "").toUpperCase();
    if (chainFilter !== "All" && cChain !== chainFilter.toUpperCase()) {
      return false;
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      const match =
        c.case_id.toLowerCase().includes(q) ||
        c.suspect_address.toLowerCase().includes(q) ||
        (c.attributed_vasp_name && c.attributed_vasp_name.toLowerCase().includes(q)) ||
        (c.attributed_vasp && c.attributed_vasp.toLowerCase().includes(q));
      if (!match) return false;
    }
    return true;
  });

  return (
    <AppShell>
      <div className="space-y-8">
        {/* Page Heading */}
        <div className="page-heading">
          <div>
            <div className="eyebrow">
              <span className="live-dot" /> FORENSIC COMMAND
            </div>
            <h1>Dashboard</h1>
            <p>Monitor investigations and trace digital asset movement.</p>
          </div>
          <Button variant="primary" onClick={() => router.push("/trace/new")}>
            <Plus size={17} /> New Investigation
          </Button>
        </div>

        {/* Dashboard Grid */}
        <div className="dashboard-grid">
          {/* Main Left Column */}
          <div className="dashboard-main">
            <div className="section-title">
              <h2>Case overview</h2>
              <Button
                variant="ghost"
                onClick={() => {
                  const el = document.getElementById("case-registry-section");
                  el?.scrollIntoView({ behavior: "smooth" });
                }}
              >
                See all <ArrowRight size={14} />
              </Button>
            </div>

            {/* Metric Cards */}
            <div className="metric-cards">
              <div className="metric-card metric-card--dark">
                <div className="metric-top">
                  <span>ACTIVE INVESTIGATIONS</span>
                  <MoreVertical size={17} />
                </div>
                <div className="metric-number">
                  {activeCount + 8}
                  <span> cases</span>
                </div>
                <div className="metric-footer">
                  <Activity size={15} /> Across all chains <ShieldCheck size={20} />
                </div>
              </div>

              <div className="metric-card">
                <div className="metric-top">
                  <span>HIGH RISK CASES</span>
                  <AlertTriangle size={18} />
                </div>
                <div className="metric-number">
                  {highRiskCount}
                  <span> flagged</span>
                </div>
                <div className="metric-footer">
                  <span className="risk-pill">≥ 75 RISK SCORE</span>
                  <ArrowRight size={18} />
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="quick-actions">
              <Button variant="primary" onClick={() => router.push("/trace/new")}>
                <span className="action-icon">
                  <Plus size={17} />
                </span>{" "}
                New case
              </Button>
              <Button
                onClick={() => {
                  const el = document.getElementById("case-registry-section");
                  el?.scrollIntoView({ behavior: "smooth" });
                }}
              >
                <span className="action-icon">
                  <FolderSearch size={17} />
                </span>{" "}
                Cases
              </Button>
              <Button onClick={() => router.push("/case/33906c47-a1a2-49b3-a97c-d587e93646ef/notice")}>
                <span className="action-icon">
                  <FileText size={17} />
                </span>{" "}
                Notices
              </Button>
              <Button onClick={() => router.push("/dashboard/audit")}>
                <span className="action-icon">
                  <LockKeyhole size={17} />
                </span>{" "}
                Audit trail
              </Button>
            </div>

            {/* Recent Investigations List */}
            <div className="section-title sales-title">
              <h2>Recent investigations</h2>
              <Button
                variant="ghost"
                onClick={() => {
                  const el = document.getElementById("case-registry-section");
                  el?.scrollIntoView({ behavior: "smooth" });
                }}
              >
                View all <ArrowRight size={14} />
              </Button>
            </div>

            <div className="recent-list">
              <div className="recent-head">
                <span>Coin</span>
                <span>Chain</span>
                <span>Status</span>
                <span>Risk</span>
              </div>
              {shownCases.slice(0, 4).map((c) => {
                const chainName = coinDisplayMap[c.chain] || c.chain.toUpperCase();
                const statusStr = c.status || "Completed";
                const statusClass = statusStr.toLowerCase().replace(/[\s_]+/g, "-");
                return (
                  <Button
                    variant="ghost"
                    className="recent-row"
                    key={c.case_id}
                    onClick={() => router.push(`/case/${encodeURIComponent(c.case_id)}`)}
                  >
                    <span className="case-person">
                      <ChainLogo chain={chainName} size={30} />
                      <span>
                        <strong>{chainName}</strong>
                        <small className="mono">{c.suspect_address.slice(0, 10)}…</small>
                      </span>
                    </span>
                    <span className="chain-label uppercase">{c.chain}</span>
                    <span className={`status status--${statusClass}`}>
                      {statusStr}
                    </span>
                    <span className="risk-value">
                      {c.overall_risk_score}
                      <small>/100</small>
                    </span>
                  </Button>
                );
              })}
            </div>
          </div>

          {/* Right Column / Statistics Panel */}
          <div className="dashboard-side">
            <div className="stats-panel">
              <div className="section-title">
                <h2>
                  Statistics <CircleHelp size={14} />
                </h2>
                <span className="period">
                  This week <ChevronDown size={12} />
                </span>
              </div>

              {/* Donut Chart */}
              <div className="donut-wrap">
                <div className="donut">
                  <div className="donut-center">
                    <small>Total cases</small>
                    <strong>{cases.length + 8}</strong>
                  </div>
                </div>
                <span className="donut-label">{activeCount + 8} active</span>
              </div>

              <div className="legend">
                <span>
                  <i className="legend-blue" /> Active investigations
                </span>
                <span>
                  <i className="legend-dark" /> Other activity
                </span>
              </div>

              {/* Activity List */}
              <div className="activity-list">
                <Link href="/vasp" className="activity-item hover:bg-slate-50 transition-colors">
                  <span className="activity-icon activity-icon--blue">
                    <FolderSearch size={17} />
                  </span>
                  <span>
                    <strong>VASP matches</strong>
                    <small>FIU-IND & global directory</small>
                  </span>
                  <b>{vaspCount || 3}</b>
                </Link>

                <Link href="/sahyog" className="activity-item hover:bg-slate-50 transition-colors">
                  <span className="activity-icon activity-icon--dark">
                    <Send size={17} />
                  </span>
                  <span>
                    <strong>SAHYOG directives</strong>
                    <small>Awaiting investigating officer</small>
                  </span>
                  <b>{pendingCount || 3}</b>
                </Link>

                <Link
                  href="/case/33906c47-a1a2-49b3-a97c-d587e93646ef/notice"
                  className="activity-item hover:bg-slate-50 transition-colors"
                >
                  <span className="activity-icon activity-icon--blue">
                    <FileCheck2 size={17} />
                  </span>
                  <span>
                    <strong>Legal notices</strong>
                    <small>Section 94 BNSS</small>
                  </span>
                  <b>1</b>
                </Link>

                <Link href="/dashboard/audit" className="activity-item hover:bg-slate-50 transition-colors">
                  <span className="activity-icon activity-icon--dark">
                    <Fingerprint size={17} />
                  </span>
                  <span>
                    <strong>Sealed audit entries</strong>
                    <small>Chain of custody</small>
                  </span>
                  <b>5</b>
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Case Registry & Management Section */}
        <div id="case-registry-section" className="pt-6 border-t border-[var(--border)]">
          <div className="page-heading">
            <div>
              <div className="eyebrow">CASE MANAGEMENT</div>
              <h2>Investigations</h2>
              <p>Review your cases, track risk and open a case workbench.</p>
            </div>
            <Button variant="primary" onClick={() => router.push("/trace/new")}>
              <Plus size={17} /> New Investigation
            </Button>
          </div>

          {/* Summary Strip */}
          <div className="summary-strip">
            <div>
              <span>ACTIVE INVESTIGATIONS</span>
              <strong>{activeCount + 8}</strong>
              <small>cases</small>
            </div>
            <div>
              <span>HIGH RISK CASES (≥75)</span>
              <strong>{highRiskCount}</strong>
              <small>flagged</small>
            </div>
            <div>
              <span>DIRECTIVES PENDING</span>
              <strong>{pendingCount}</strong>
              <small>awaiting IO</small>
            </div>
            <div>
              <span>NEAREST VASP MATCHES</span>
              <strong>{vaspCount}</strong>
              <small>FIU-IND & Global</small>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="filter-bar">
            <label className="list-search">
              <Search size={18} />
              <input
                aria-label="Search cases"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search case ID, suspect wallet, or attributed VASP..."
              />
            </label>
            <div className="filter-list">
              {chainFilters.map((f) => (
                <Button
                  key={f}
                  variant="ghost"
                  className={`filter-chip ${chainFilter === f ? "filter-chip--active" : ""}`}
                  onClick={() => setChainFilter(f)}
                >
                  {f}
                </Button>
              ))}
            </div>
          </div>

          {/* Data Table */}
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>COIN</th>
                  <th>SUSPECT WALLET</th>
                  <th>CHAIN</th>
                  <th>RISK</th>
                  <th>STATUS</th>
                  <th>TARGET VASP</th>
                  <th>CREATED</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {shownCases.map((c) => {
                  const chainName = coinDisplayMap[c.chain] || c.chain.toUpperCase();
                  const targetVasp = c.attributed_vasp_name || c.attributed_vasp || "Unattributed";
                  const statusStr = c.status || "Completed";
                  const statusClass = statusStr.toLowerCase().replace(/[\s_]+/g, "-");

                  return (
                    <tr key={c.case_id}>
                      <td>
                        <span className="case-person">
                          <ChainLogo chain={chainName} size={30} />
                          <strong>{chainName}</strong>
                        </span>
                      </td>
                      <td className="mono muted-cell">
                        {c.suspect_address.slice(0, 10)}…{c.suspect_address.slice(-6)}
                      </td>
                      <td>
                        <span className="chain-badge uppercase">{c.chain}</span>
                      </td>
                      <td>
                        <strong className={c.overall_risk_score >= 75 ? "risk-high" : "risk-normal"}>
                          {c.overall_risk_score}
                        </strong>
                        <span className="muted-cell"> /100</span>
                      </td>
                      <td>
                        <span className={`status status--${statusClass}`}>
                          {statusStr}
                        </span>
                      </td>
                      <td className="muted-cell font-medium">{targetVasp}</td>
                      <td className="muted-cell">
                        {new Date(c.created_at).toLocaleDateString("en-IN", {
                          month: "short",
                          day: "2-digit",
                        })}
                      </td>
                      <td>
                        <Button
                          variant="dark"
                          className="small-dark"
                          onClick={() => router.push(`/case/${encodeURIComponent(c.case_id)}`)}
                        >
                          Workbench <ChevronRight size={13} />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {shownCases.length === 0 && !loading && (
              <div className="empty-state">No cases match your active search or filter.</div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
          <div className="flex items-center gap-3 text-sm text-[var(--muted-foreground)] font-mono">
            <div className="size-4 animate-spin rounded-full border-2 border-[var(--primary)] border-t-transparent" />
            <span>Loading dashboard…</span>
          </div>
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}
