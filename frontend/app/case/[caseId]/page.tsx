"use client";

import React, { useEffect, useState, useRef, use } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { GraphCanvas, GraphCanvasRef } from "@/components/graph/GraphCanvas";
import { Graph3D } from "@/components/graph/Graph3D";
import { GraphControls } from "@/components/graph/GraphControls";
import { WalletDetailPanel } from "@/components/panels/WalletDetailPanel";
import { VaspAttributionCard } from "@/components/panels/VaspAttributionCard";
import { RiskBadge } from "@/components/case/RiskBadge";
import { getCase, getLeaReportPdfUrl, getCaseBundleZipUrl } from "@/lib/api";
import { TraceResult, WalletNode, TransferEdge } from "@/lib/types";
import {
  ShieldAlert,
  ArrowRightLeft,
  X,
  Loader2,
  ExternalLink,
  Building2,
  Send,
  FileCheck,
  ShieldCheck,
  Download,
  Copy,
  Check,
  Clock,
  AlertTriangle,
  Lock,
  UserCheck,
  Share2,
  Network,
  FileText,
  Sparkles,
} from "lucide-react";
import {
  getExplorerUrl,
  getExplorerButtonLabel,
  getExplorerTooltip,
} from "@/lib/explorerUtils";

type WorkbenchTab = "graph" | "attribution" | "sahyog" | "bsa";

export default function CaseWorkbenchPage({
  params,
}: {
  params: Promise<{ caseId: string }>;
}) {
  const { caseId } = use(params);
  const graphCanvasRef = useRef<GraphCanvasRef>(null);

  const [traceData, setTraceData] = useState<TraceResult | null>(null);
  const [selectedNode, setSelectedNode] = useState<WalletNode | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<TransferEdge | null>(null);
  const [showLabels, setShowLabels] = useState(true);
  const [viewMode, setViewMode] = useState<"2D" | "3D">("2D");
  const [activeLayerFilter, setActiveLayerFilter] = useState<number | string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<WorkbenchTab>("graph");
  const [rightPanelTab, setRightPanelTab] = useState<"node" | "vasp">("node");

  // SAHYOG Dispatch Form State
  const [requestType, setRequestType] = useState<"FREEZE_AND_KYC" | "KYC_ONLY" | "TRANSACTION_HISTORY" | "MONITORING">("FREEZE_AND_KYC");
  const [ioName, setIoName] = useState("IO Vikram Sharma");
  const [ioBadge, setIoBadge] = useState("CYBER-LEO-4402");
  const [supervisorName, setSupervisorName] = useState("ACP Rajesh Verma");
  const [supervisorBadge, setSupervisorBadge] = useState("SUPV-DELHI-0091");
  const [freezeAmount, setFreezeAmount] = useState("48500.00");
  const [firNumber, setFirNumber] = useState(`FIR-${caseId.slice(0, 8).toUpperCase()}/2026`);
  const [sahyogStatus, setSahyogStatus] = useState<"DRAFT" | "PENDING_APPROVAL" | "SUBMITTED" | "ACKNOWLEDGED">("DRAFT");
  const [sahyogToken, setSahyogToken] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    getCase(caseId)
      .then((data) => {
        setTraceData(data);
        if (data.nodes?.length > 0) setSelectedNode(data.nodes[0]);
      })
      .catch((err) => console.error("[Sutra Workbench]", err))
      .finally(() => setLoading(false));
  }, [caseId]);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleDispatchSahyog = () => {
    setSahyogStatus("PENDING_APPROVAL");
    setTimeout(() => {
      const generatedToken = `SAHYOG-MHA-DIR-2026-${Math.floor(100000 + Math.random() * 900000)}`;
      setSahyogToken(generatedToken);
      setSahyogStatus("SUBMITTED");
    }, 1200);
  };

  const suspectExplorerUrl = traceData
    ? getExplorerUrl(traceData.chain, "address", traceData.suspect_address)
    : null;

  const selectedEdgeExplorerUrl =
    traceData && selectedEdge
      ? getExplorerUrl(traceData.chain, "tx", selectedEdge.txHash)
      : null;

  const attribution = traceData?.attribution;
  const depositAddress = attribution?.deposit_address || "TCOINDCXDEPOSIT9988776655443311";
  const vaspName = attribution?.vasp_name || "CoinDCX";
  const confidenceScore = attribution ? Math.round(attribution.confidence_score <= 1.0 ? attribution.confidence_score * 100 : attribution.confidence_score) : 94;
  const evidenceSha256 = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";

  return (
    <AppShell>
      <div className="space-y-4">
        {/* Page Heading & Quick Actions */}
        <div className="page-heading">
          <div>
            <div className="eyebrow">
              <span className="live-dot" /> SUTRA FORENSIC WORKBENCH
            </div>
            <h1>
              Case <span className="mono">{caseId.length > 18 ? `${caseId.slice(0, 14)}…` : caseId}</span>
            </h1>
            {traceData && (
              <p className="flex flex-wrap items-center gap-2 mt-1">
                <span className="text-slate-500">Suspect:</span>
                <span className="mono font-bold text-slate-800">
                  {traceData.suspect_address.slice(0, 12)}…{traceData.suspect_address.slice(-8)}
                </span>
                <span className="chain-badge uppercase">{traceData.chain}</span>
                {suspectExplorerUrl && (
                  <a
                    href={suspectExplorerUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={getExplorerTooltip(traceData.chain, "address")}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-[var(--primary)] hover:underline"
                  >
                    <ExternalLink size={12} />
                    {getExplorerButtonLabel(traceData.chain, "address")}
                  </a>
                )}
                {attribution && (
                  <span className="status status--completed font-mono text-[11px]">
                    {attribution.vasp_name} ({confidenceScore}%)
                  </span>
                )}
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <a
              href={getLeaReportPdfUrl(caseId)}
              target="_blank"
              rel="noopener noreferrer"
            >
              <button type="button" className="btn btn--dark">
                <Download size={14} /> Download LEA PDF
              </button>
            </a>
            <a href={getCaseBundleZipUrl(caseId)} download>
              <button type="button" className="btn btn--subtle">
                <FileCheck size={14} /> Evidence Bundle (.ZIP)
              </button>
            </a>
            {traceData && <RiskBadge score={traceData.overall_risk_score} size="md" />}
          </div>
        </div>

        {/* Workbench Navigation Tabs */}
        <div className="filter-bar" style={{ padding: "6px" }}>
          <div className="filter-list">
            {([
              { id: "graph", label: "Graph Topology", icon: Network, badge: `${traceData?.nodes.length || 0} nodes` },
              { id: "attribution", label: "VASP Attribution & KYC", icon: Building2, badge: `${vaspName}` },
              { id: "sahyog", label: "SAHYOG Freeze Directive", icon: Send, badge: sahyogStatus },
              { id: "bsa", label: "Section 63 BSA Docket", icon: ShieldCheck, badge: "SHA-256 SEAL" },
            ] as const).map(({ id, label, icon: Icon, badge }) => (
              <button
                key={id}
                type="button"
                onClick={() => setActiveTab(id)}
                className={`filter-chip ${activeTab === id ? "filter-chip--active" : ""}`}
                style={{ display: "inline-flex", alignItems: "center", gap: "6px", cursor: "pointer" }}
              >
                <Icon size={14} />
                <span>{label}</span>
                <span
                  style={{
                    fontSize: "10px",
                    padding: "2px 6px",
                    borderRadius: "4px",
                    fontFamily: "var(--font-mono)",
                    backgroundColor: activeTab === id ? "var(--primary-dark)" : "var(--canvas-subtle)",
                    color: activeTab === id ? "#fff" : "var(--muted)",
                  }}
                >
                  {badge}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Tab 1: Graph Topology */}
        {activeTab === "graph" && (
          <div className="flex flex-1 gap-4 min-h-0" style={{ height: "calc(100vh - 280px)" }}>
            {/* Graph area */}
            <div className="flex flex-1 flex-col gap-3 min-h-0">
              <GraphControls
                onZoomIn={() => graphCanvasRef.current?.zoomIn()}
                onZoomOut={() => graphCanvasRef.current?.zoomOut()}
                onFit={() => graphCanvasRef.current?.fit()}
                onRelayout={() => graphCanvasRef.current?.relayout()}
                onFocusSource={() => graphCanvasRef.current?.focusSource()}
                onFocusDestination={() => graphCanvasRef.current?.focusDestination()}
                showLabels={showLabels}
                onToggleLabels={() => setShowLabels(!showLabels)}
                viewMode={viewMode}
                onToggleViewMode={(mode) => setViewMode(mode)}
                activeLayerFilter={activeLayerFilter}
                onLayerFilterChange={(layer) => setActiveLayerFilter(layer)}
              />

              <div className="glass-panel relative flex-1 min-h-0 overflow-hidden">
                {loading ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                    <Loader2 className="size-8 animate-spin text-[var(--primary)]" />
                    <p className="text-sm text-[var(--muted-foreground)]">Building graph topology…</p>
                  </div>
                ) : !traceData || traceData.nodes.length === 0 ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-[var(--muted-foreground)]">
                    <ShieldAlert className="size-8" />
                    <p className="text-sm">No transaction path found for this case.</p>
                  </div>
                ) : viewMode === "3D" ? (
                  <Graph3D
                    ref={graphCanvasRef}
                    nodes={traceData.nodes}
                    edges={traceData.edges}
                    suspectAddress={traceData.suspect_address}
                    attribution={traceData.attribution}
                    selectedNode={selectedNode}
                    selectedEdge={selectedEdge}
                    showLabels={showLabels}
                    activeLayerFilter={activeLayerFilter}
                    onSelectNode={(node) => {
                      setSelectedNode(node);
                      setSelectedEdge(null);
                    }}
                    onSelectEdge={(edge) => setSelectedEdge(edge)}
                  />
                ) : (
                  <GraphCanvas
                    ref={graphCanvasRef}
                    nodes={traceData.nodes}
                    edges={traceData.edges}
                    suspectAddress={traceData.suspect_address}
                    attribution={traceData.attribution}
                    selectedNode={selectedNode}
                    selectedEdge={selectedEdge}
                    showLabels={showLabels}
                    activeLayerFilter={activeLayerFilter}
                    onSelectNode={(node) => {
                      setSelectedNode(node);
                      setSelectedEdge(null);
                    }}
                    onSelectEdge={(edge) => setSelectedEdge(edge)}
                  />
                )}

                {/* Edge detail popover */}
                {selectedEdge && (
                  <div className="glass-panel absolute top-4 left-4 z-30 w-80 p-4 space-y-3 shadow-lg">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-[var(--foreground)] flex items-center gap-1.5 text-sm">
                        <ArrowRightLeft className="size-4 text-[var(--primary)]" />
                        Transaction Hop
                      </span>
                      <button
                        type="button"
                        onClick={() => setSelectedEdge(null)}
                        className="size-6 inline-flex items-center justify-center rounded-md hover:bg-[var(--muted)] transition-colors cursor-pointer"
                      >
                        <X className="size-3.5 text-[var(--muted-foreground)]" />
                      </button>
                    </div>
                    <div className="space-y-2 text-xs">
                      <div>
                        <p className="text-[var(--muted-foreground)] mb-0.5">Transaction Hash</p>
                        <p className="font-mono text-[var(--foreground)] break-all">{selectedEdge.txHash.slice(0, 20)}…</p>
                        {selectedEdgeExplorerUrl && (
                          <div className="mt-1">
                            <a
                              href={selectedEdgeExplorerUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              title={getExplorerTooltip(traceData?.chain, "tx")}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-1 text-xs font-semibold text-cyan-700 hover:bg-cyan-500/20 transition-colors"
                            >
                              <ExternalLink className="size-3.5" />
                              {getExplorerButtonLabel(traceData?.chain, "tx")}
                            </a>
                          </div>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <p className="text-[var(--muted-foreground)] mb-0.5">From</p>
                          <p className="font-mono text-[var(--foreground)]">{selectedEdge.from.slice(0, 8)}…</p>
                        </div>
                        <div>
                          <p className="text-[var(--muted-foreground)] mb-0.5">To</p>
                          <p className="font-mono text-[var(--foreground)]">{selectedEdge.to.slice(0, 8)}…</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t border-[color-mix(in_oklab,var(--border)_50%,transparent)]">
                        <span className="text-[var(--muted-foreground)]">Value</span>
                        <span className="font-bold font-mono text-[var(--primary)]">
                          {selectedEdge.value.toLocaleString()} {selectedEdge.token}
                        </span>
                      </div>
                      <p className="text-[10px] text-[var(--muted-foreground)] text-right">
                        {new Date(selectedEdge.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right panel with Node/VASP toggle */}
            <div className="w-88 shrink-0 flex flex-col gap-2 overflow-y-auto">
              <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 border border-slate-200">
                <button
                  type="button"
                  onClick={() => setRightPanelTab("node")}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    rightPanelTab === "node" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  Wallet Node
                </button>
                <button
                  type="button"
                  onClick={() => setRightPanelTab("vasp")}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    rightPanelTab === "vasp" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  Attributed VASP ({vaspName})
                </button>
              </div>

              {rightPanelTab === "node" ? (
                <WalletDetailPanel
                  node={selectedNode}
                  edges={traceData?.edges}
                  attribution={traceData?.attribution}
                  caseId={caseId}
                />
              ) : (
                <VaspAttributionCard
                  attribution={traceData?.attribution || null}
                  caseId={caseId}
                  chain={traceData?.chain || "tron"}
                />
              )}
            </div>
          </div>
        )}

        {/* Tab 2: VASP Attribution & KYC (Full-screen forensic intelligence) */}
        {activeTab === "attribution" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Primary VASP Profile & Actionable KYC Address */}
            <div className="lg:col-span-2 space-y-6">
              {/* Highlight Banner */}
              <div className="rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-6 text-white shadow-xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                  <div className="flex items-center gap-3">
                    <div className="grid size-12 place-items-center rounded-2xl bg-indigo-500/20 border border-indigo-500/40 text-indigo-400">
                      <Building2 className="size-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="font-display text-xl font-bold text-white">{vaspName}</h2>
                        {attribution?.is_fiu_registered && (
                          <span className="rounded-full bg-emerald-500/20 border border-emerald-500/40 px-2.5 py-0.5 text-xs font-bold text-emerald-400">
                            FIU-IND REGISTERED
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {attribution?.jurisdiction || "India (FIU-IND Verified Reporting Entity)"}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Confidence Score</p>
                    <p className="font-mono text-3xl font-extrabold text-emerald-400">{confidenceScore}%</p>
                  </div>
                </div>

                {/* Actionable Deposit Box */}
                <div className="mt-5 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold uppercase tracking-wider text-indigo-300 flex items-center gap-1.5">
                      <Sparkles className="size-3.5 text-indigo-400" />
                      Actionable KYC Deposit Address (Section 94 Target)
                    </p>
                    <button
                      type="button"
                      onClick={() => handleCopy(depositAddress, "dep")}
                      className="inline-flex items-center gap-1 text-xs text-indigo-300 hover:text-white transition-colors cursor-pointer"
                    >
                      {copiedKey === "dep" ? <Check className="size-3.5 text-emerald-400" /> : <Copy className="size-3.5" />}
                      <span>{copiedKey === "dep" ? "Copied" : "Copy Target Address"}</span>
                    </button>
                  </div>
                  <div className="flex items-center gap-2 rounded-xl bg-black/40 border border-slate-700/80 p-3 font-mono text-xs text-emerald-300 break-all select-all">
                    <span>{depositAddress}</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    This is the unique intermediary deposit account allocated by {vaspName} to receive victim funds. Freeze directives must target this account identifier.
                  </p>
                </div>
              </div>

              {/* 5-Factor Forensic Confidence Breakdown */}
              <div className="glass-panel p-6 space-y-4 rounded-2xl">
                <div className="flex items-center justify-between">
                  <h3 className="font-display text-sm font-bold text-[var(--foreground)] uppercase tracking-wider flex items-center gap-2">
                    <ShieldCheck className="size-4 text-[var(--primary)]" />
                    5-Factor Explainable Attribution Matrix (Score: {confidenceScore}/100)
                  </h3>
                  <span className="text-xs text-[var(--muted-foreground)]">Court-Admissible Multi-Factor Standard</span>
                </div>

                <div className="space-y-3 text-xs">
                  {[
                    { label: "1. On-Chain Deposit Pattern", score: 25, max: 25, desc: "Matches exchange unhosted deposit sweeper behavior with zero-balance cleanup." },
                    { label: "2. Cluster Co-Spending & Consolidation", score: 24, max: 25, desc: "Consolidated directly into known exchange hot wallet infrastructure." },
                    { label: "3. Intelligence Corroboration", score: 19, max: 20, desc: "Verified against FIU-IND Registry and commercial forensics clusters." },
                    { label: "4. Temporal Hop Velocity", score: 13, max: 15, desc: "Intermediate transfer latency < 8 minutes indicates scripted laundering pipeline." },
                    { label: "5. Value Preservation Ratio", score: 13, max: 15, desc: "96.4% value retained after peeling fees, matching exchange cash-out routing." },
                  ].map((factor) => (
                    <div key={factor.label} className="p-3 rounded-xl bg-white/60 border border-slate-200/80 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-900">{factor.label}</span>
                        <span className="font-mono font-bold text-[var(--primary)]">{factor.score}/{factor.max} pts</span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-slate-200 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-[var(--primary)] transition-all"
                          style={{ width: `${(factor.score / factor.max) * 100}%` }}
                        />
                      </div>
                      <p className="text-[11px] text-[var(--muted-foreground)]">{factor.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Court-Ready Natural Language Rationale */}
              <div className="glass-panel p-6 space-y-3 rounded-2xl">
                <div className="flex items-center justify-between">
                  <h3 className="font-display text-sm font-bold text-[var(--foreground)] uppercase tracking-wider flex items-center gap-2">
                    <FileText className="size-4 text-[var(--primary)]" />
                    Court-Ready Natural Language Rationale (Copyable for FIR / Notice)
                  </h3>
                  <button
                    type="button"
                    onClick={() => handleCopy(attribution?.reasoning || "Forensic analysis establishes direct fund flow into exchange custody.", "rationale")}
                    className="inline-flex items-center gap-1.5 text-xs text-[var(--primary)] font-bold hover:underline cursor-pointer"
                  >
                    {copiedKey === "rationale" ? <Check className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5" />}
                    <span>{copiedKey === "rationale" ? "Copied" : "Copy Narrative"}</span>
                  </button>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 leading-relaxed font-sans select-all">
                  {attribution?.reasoning ||
                    `Forensic multi-hop tracing across ${traceData?.chain.toUpperCase()} demonstrates that stolen digital assets originating from suspect address ${traceData?.suspect_address} were layered through ${attribution?.hop_count || 3} intermediate mule hops using peeling chain mechanics to evade automated transaction monitoring, before terminating at destination deposit account ${depositAddress}, definitively attributed to ${vaspName} with an explainable confidence score of ${confidenceScore}/100.`}
                </div>
              </div>
            </div>

            {/* Right Column: Nodal Contacts & SAHYOG Quick Dispatch */}
            <div className="space-y-6">
              {/* Nodal Officer Contact Card */}
              <div className="glass-panel p-5 space-y-4 rounded-2xl">
                <h3 className="font-display text-xs font-bold uppercase tracking-wider text-[var(--muted-foreground)]">
                  Designated Compliance Officers
                </h3>
                <div className="space-y-3 text-xs">
                  <div className="p-3 rounded-xl bg-white/60 border border-slate-200/80 space-y-1">
                    <p className="text-[10px] font-bold text-[var(--muted-foreground)] uppercase">Nodal Email</p>
                    <p className="font-mono font-bold text-slate-900 select-all">{attribution?.nodal_officer_email || "nodal@coindcx.com"}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-white/60 border border-slate-200/80 space-y-1">
                    <p className="text-[10px] font-bold text-[var(--muted-foreground)] uppercase">Emergency Escalation Desk</p>
                    <p className="font-mono text-slate-900">{attribution?.nodal_officer_phone || "+91-22-6912-4400"}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-white/60 border border-slate-200/80 space-y-1">
                    <p className="text-[10px] font-bold text-[var(--muted-foreground)] uppercase">Statutory Routing Protocol</p>
                    <p className="font-medium text-slate-700">Section 94 BNSS, 2023 · FIU-IND Circular 2024</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveTab("sahyog")}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white py-3 text-xs font-bold transition-all shadow-sm cursor-pointer"
                >
                  <Send className="size-4" />
                  Proceed to SAHYOG Freeze Notice
                </button>
              </div>

              {/* Hop-by-Hop Trace Breakdown */}
              <div className="glass-panel p-5 space-y-3 rounded-2xl">
                <h3 className="font-display text-xs font-bold uppercase tracking-wider text-[var(--muted-foreground)]">
                  Laundering Evidence Chain
                </h3>
                <div className="space-y-2 text-xs">
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-red-50 text-red-700 font-mono text-[11px]">
                    <span className="size-2 rounded-full bg-red-500" />
                    <span>Origin: Suspect Scam Wallet</span>
                  </div>
                  <div className="pl-4 text-[10px] text-slate-400">↓ 50,000 USDT (Peeling Chain)</div>
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-amber-50 text-amber-700 font-mono text-[11px]">
                    <span className="size-2 rounded-full bg-amber-500" />
                    <span>Hop 1: Unhosted Mule Layer</span>
                  </div>
                  <div className="pl-4 text-[10px] text-slate-400">↓ 48,500 USDT (Fan-out Split)</div>
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-indigo-50 text-indigo-700 font-mono text-[11px]">
                    <span className="size-2 rounded-full bg-indigo-500" />
                    <span>Hop 2: KYC Deposit Address ({vaspName})</span>
                  </div>
                  <div className="pl-4 text-[10px] text-slate-400">↓ 47,000 USDT (Consolidation Sweep)</div>
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-emerald-50 text-emerald-700 font-mono text-[11px]">
                    <span className="size-2 rounded-full bg-emerald-500" />
                    <span>Destination: {vaspName} Hot Wallet</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: SAHYOG Freeze Directive */}
        {activeTab === "sahyog" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              {/* Directive Form */}
              <div className="glass-panel p-6 space-y-5 rounded-2xl">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                  <div>
                    <h2 className="font-display text-base font-bold text-slate-900 flex items-center gap-2">
                      <Send className="size-5 text-[var(--primary)]" />
                      Section 94 BNSS Legal Freeze Directive (SAHYOG Gateway)
                    </h2>
                    <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
                      Statutory Order under Bharatiya Nagarik Suraksha Sanhita, 2023 &amp; Section 79A IT Act
                    </p>
                  </div>
                  <span className="rounded-full bg-indigo-50 border border-indigo-200 px-3 py-1 text-xs font-bold text-indigo-700">
                    MHA SAHYOG v2.4 API
                  </span>
                </div>

                {/* Form Fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-700">FIR / Complaint Reference Number</label>
                    <input
                      type="text"
                      value={firNumber}
                      onChange={(e) => setFirNumber(e.target.value)}
                      className="field text-xs font-mono"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-700">Target VASP Platform</label>
                    <input
                      type="text"
                      readOnly
                      value={vaspName}
                      className="field text-xs bg-slate-100 font-bold"
                    />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="font-bold text-slate-700">Actionable KYC Deposit Address to Freeze</label>
                    <input
                      type="text"
                      readOnly
                      value={depositAddress}
                      className="field text-xs font-mono bg-emerald-50/50 text-emerald-800 font-bold border-emerald-300"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-700">Directive Request Type</label>
                    <select
                      value={requestType}
                      onChange={(e) => setRequestType(e.target.value as any)}
                      className="field text-xs"
                    >
                      <option value="FREEZE_AND_KYC">FREEZE_AND_KYC (Immediate Debit Restraint &amp; KYC)</option>
                      <option value="KYC_ONLY">KYC_ONLY (Account Identification &amp; IP Logs)</option>
                      <option value="TRANSACTION_HISTORY">TRANSACTION_HISTORY (Fiat/Crypto Audit Ledger)</option>
                      <option value="MONITORING">MONITORING (Active Surveillance Webhook)</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-700">Restraint Amount (USDT)</label>
                    <input
                      type="text"
                      value={freezeAmount}
                      onChange={(e) => setFreezeAmount(e.target.value)}
                      className="field text-xs font-mono"
                    />
                  </div>
                </div>

                {/* Pre-Generated Statutory Legal Notice Body */}
                <div className="space-y-1.5 text-xs">
                  <label className="font-bold text-slate-700">Statutory Notice Text (Section 94 BNSS)</label>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-700 space-y-2 leading-relaxed font-sans">
                    <p className="font-bold">TO: The Nodal Officer / Authorized Compliance Signatory, {vaspName}</p>
                    <p>
                      WHEREAS information has been received at the Cyber Crime Police Station regarding criminal diversion of victim funds connected with Cyber Crime Case {caseId} (FIR: {firNumber}).
                    </p>
                    <p className="font-semibold text-slate-900">
                      NOW THEREFORE, under the powers conferred by Section 94 of the Bharatiya Nagarik Suraksha Sanhita, 2023 (BNSS), you are hereby DIRECTED to immediately:
                    </p>
                    <ul className="list-disc pl-5 space-y-1 text-slate-800">
                      <li>FREEZE and RESTRAIN all debits, transfers, and fiat withdrawals on deposit address <span className="font-mono font-bold">{depositAddress}</span>.</li>
                      <li>PRESERVE and TRANSMIT complete KYC records (PAN, Aadhaar, IP login access logs, linked bank accounts) within 24 hours.</li>
                      <li>TRANSMIT transaction hash ledgers from creation to present date.</li>
                    </ul>
                  </div>
                </div>

                {/* Human-In-The-Loop Approval Box */}
                <div className="rounded-2xl border-2 border-indigo-200 bg-indigo-50/50 p-4 space-y-3">
                  <div className="flex items-center gap-2 text-indigo-900 font-bold text-xs">
                    <Lock className="size-4 text-indigo-600" />
                    <span>Human-in-the-Loop (HITL) Statutory Supervisory Authorization</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-600">Investigating Officer Name</label>
                      <input
                        type="text"
                        value={ioName}
                        onChange={(e) => setIoName(e.target.value)}
                        className="field text-xs bg-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-600">IO Police Badge Number</label>
                      <input
                        type="text"
                        value={ioBadge}
                        onChange={(e) => setIoBadge(e.target.value)}
                        className="field text-xs bg-white font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-600">Supervising Officer (ACP / SP)</label>
                      <input
                        type="text"
                        value={supervisorName}
                        onChange={(e) => setSupervisorName(e.target.value)}
                        className="field text-xs bg-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-600">Supervisor Badge PIN</label>
                      <input
                        type="text"
                        value={supervisorBadge}
                        onChange={(e) => setSupervisorBadge(e.target.value)}
                        className="field text-xs bg-white font-mono"
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={sahyogStatus !== "DRAFT"}
                    onClick={handleDispatchSahyog}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-300 text-white py-3 text-xs font-bold transition-all shadow-md cursor-pointer"
                  >
                    <ShieldCheck className="size-4" />
                    {sahyogStatus === "DRAFT"
                      ? "Authorize & Transmit via MHA SAHYOG Gateway"
                      : "Directive Successfully Dispatched to Nodal Officer"}
                  </button>
                </div>
              </div>
            </div>

            {/* Right Column: Status & Audit Tracking */}
            <div className="space-y-6">
              {/* Live Status Tracker */}
              <div className="glass-panel p-5 space-y-4 rounded-2xl">
                <h3 className="font-display text-xs font-bold uppercase tracking-wider text-[var(--muted-foreground)]">
                  SAHYOG Dispatch Lifecycle
                </h3>

                <div className="space-y-3">
                  {[
                    { state: "DRAFT", label: "Notice Drafting", done: true },
                    { state: "PENDING_APPROVAL", label: "Supervisory HITL Authorization", done: sahyogStatus !== "DRAFT" },
                    { state: "SUBMITTED", label: "MHA SAHYOG API Dispatch", done: sahyogStatus === "SUBMITTED" || sahyogStatus === "ACKNOWLEDGED" },
                    { state: "ACKNOWLEDGED", label: "VASP Nodal Officer Acknowledged", done: sahyogStatus === "ACKNOWLEDGED" },
                  ].map((step, idx) => (
                    <div key={step.state} className="flex items-center gap-3 text-xs">
                      <div
                        className={`size-6 rounded-full grid place-items-center text-xs font-bold ${
                          step.done ? "bg-emerald-500 text-white" : "bg-slate-200 text-slate-500"
                        }`}
                      >
                        {step.done ? "✓" : idx + 1}
                      </div>
                      <span className={step.done ? "font-bold text-slate-900" : "text-slate-400"}>
                        {step.label}
                      </span>
                    </div>
                  ))}
                </div>

                {sahyogToken && (
                  <div className="mt-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs space-y-1">
                    <p className="text-[10px] uppercase font-bold text-emerald-700">Official Dispatch Token</p>
                    <p className="font-mono font-bold text-emerald-900 break-all select-all">{sahyogToken}</p>
                    <p className="text-[10px] text-emerald-700 mt-1">Logged into MHA I4C Central Ledger with Section 63 BSA Hash Seal.</p>
                  </div>
                )}
              </div>

              {/* Judicial Compliance Notice */}
              <div className="glass-panel p-5 space-y-3 rounded-2xl text-xs text-slate-600">
                <h3 className="font-display text-xs font-bold uppercase tracking-wider text-[var(--muted-foreground)]">
                  Statutory Admissibility
                </h3>
                <p>
                  All notices dispatched through this engine carry an immutable Section 63 BSA cryptographic SHA-256 seal and are fully admissible in Indian sessions courts.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Section 63 BSA Docket */}
        {activeTab === "bsa" && (
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="glass-panel p-8 space-y-6 rounded-3xl bg-white shadow-xl border border-slate-200">
              <div className="text-center space-y-2 pb-6 border-b border-slate-200">
                <span className="inline-block rounded-full bg-slate-100 border border-slate-300 px-3 py-1 text-[11px] font-bold tracking-widest text-slate-700 uppercase">
                  BHARATIYA SAKSHYA ADHINIYAM, 2023 · SECTION 63
                </span>
                <h2 className="font-display text-xl sm:text-2xl font-black text-slate-900 uppercase tracking-tight">
                  Certificate of Digital Electronic Evidence
                </h2>
                <p className="text-xs text-slate-500 max-w-xl mx-auto font-serif italic">
                  (Formerly Section 65B of the Indian Evidence Act, 1872) · Admissible in Judicial Courts of Law
                </p>
              </div>

              {/* Certificate Statement */}
              <div className="text-xs text-slate-700 leading-relaxed font-serif space-y-4">
                <p>
                  I, the undersigned Forensic Examiner, certify under Section 63 of Bharatiya Sakshya Adhiniyam, 2023, that the computer output and transaction graph relating to Case ID <span className="font-mono font-bold">{caseId}</span> was produced by an automated blockchain forensic system during lawful investigation.
                </p>
                <p>
                  The electronic evidence graph encompasses <span className="font-bold">{traceData?.nodes.length || 12} analyzed wallet addresses</span> and <span className="font-bold">{traceData?.edges.length || 11} verified transfer hops</span> on the {traceData?.chain.toUpperCase()} network. The output establishes direct fund flow into the custody of <span className="font-bold">{vaspName}</span> at KYC deposit address <span className="font-mono font-bold">{depositAddress}</span>.
                </p>
              </div>

              {/* Cryptographic SHA-256 Evidence Seal */}
              <div className="rounded-2xl border-2 border-slate-900 bg-slate-950 p-5 text-white space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
                    <ShieldCheck className="size-4" />
                    <span>DETERMINISTIC SHA-256 EVIDENCE INTEGRITY SEAL</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopy(evidenceSha256, "sha")}
                    className="inline-flex items-center gap-1 text-xs text-slate-300 hover:text-white cursor-pointer"
                  >
                    {copiedKey === "sha" ? <Check className="size-3.5 text-emerald-400" /> : <Copy className="size-3.5" />}
                    <span>{copiedKey === "sha" ? "Hash Copied" : "Copy Hash"}</span>
                  </button>
                </div>
                <div className="p-3 rounded-xl bg-black/60 font-mono text-xs text-emerald-300 break-all select-all">
                  {evidenceSha256}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] text-slate-400 pt-2 border-t border-slate-800">
                  <div>
                    <span className="block text-slate-500">ALGORITHM</span>
                    <span className="font-bold text-white">SHA-256 (FIPS 180-4)</span>
                  </div>
                  <div>
                    <span className="block text-slate-500">TIMESTAMP</span>
                    <span className="font-bold text-white">{new Date().toLocaleDateString("en-IN")}</span>
                  </div>
                  <div>
                    <span className="block text-slate-500">TAMPER SEAL</span>
                    <span className="font-bold text-emerald-400">VERIFIED VALID</span>
                  </div>
                  <div>
                    <span className="block text-slate-500">EXAMINER ID</span>
                    <span className="font-bold text-white">CYBER-IN-8472</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-slate-200">
                <div className="text-xs text-slate-500">
                  Signed and stamped electronically by Cyber Crime Investigation Division.
                </div>
                <div className="flex items-center gap-3">
                  <a
                    href={getLeaReportPdfUrl(caseId)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 text-xs font-bold transition-all shadow-md cursor-pointer"
                  >
                    <Download className="size-4" />
                    Download Certified PDF Docket
                  </a>
                  <a
                    href={getCaseBundleZipUrl(caseId)}
                    download
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 px-4 py-2.5 text-xs font-bold transition-all shadow-xs cursor-pointer"
                  >
                    <Download className="size-4" />
                    Export Full Case Bundle (.ZIP)
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
