import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { Activity, ArrowDownLeft, ArrowLeft, ArrowRight, Bell, Building2, Check, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, CircleHelp, Clock3, Copy, Download, FileCheck2, FileText, Fingerprint, FolderSearch, LayoutGrid, LockKeyhole, LogOut, Menu, MoreVertical, Plus, Search, Send, Settings, ShieldCheck, SlidersHorizontal, Sparkles, Wallet, X, AlertTriangle, BriefcaseBusiness } from "lucide-react";
import { Button } from "@/components/Button";
import { ChainLogo } from "@/components/ChainLogo";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [
    { title: "SUTRA | Fraud Ops Platform" },
    { name: "description", content: "SUTRA forensic command workspace for blockchain investigations, legal notices, and supervisory audits." },
    { property: "og:title", content: "SUTRA | Fraud Ops Platform" },
    { property: "og:description", content: "Blockchain investigations, legal notices, and supervisory audits in one forensic workspace." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: SutraApp,
});

type Page = "dashboard" | "new" | "investigations" | "notices" | "audit";
type Case = { id: string; wallet: string; chain: string; risk: number; status: string; vasp: string; created: string };
const initialCases: Case[] = [
  { id: "62439082-84a9-4302-a318-f9e2a6d6f393", wallet: "TR7NHqjeKQ…gjLj6t", chain: "TRON", risk: 24, status: "Completed", vasp: "Unattributed", created: "02 Oct" },
  { id: "323429f2-e643-477b-9a5a-6de642e2a089", wallet: "TR7NHqjeKQ…gjLj6t", chain: "TRON", risk: 24, status: "Completed", vasp: "Unattributed", created: "02 Oct" },
  { id: "8582b5f6-f804-44cf-916b-368ab0033457", wallet: "TR7NHqjeKQ…gjLj6t", chain: "TRON", risk: 24, status: "Completed", vasp: "Unattributed", created: "02 Oct" },
  { id: "eb06f523-ee70-41ce-aaad-16d95d17e8a7", wallet: "TR7NHqjeKQ…gjLj6t", chain: "TRON", risk: 24, status: "Completed", vasp: "Unattributed", created: "02 Oct" },
  { id: "CS-2026-8891", wallet: "TCoinDCXDeposit…43311", chain: "TRON", risk: 81, status: "Under review", vasp: "CoinDCX", created: "20 Sep" },
  { id: "CS-2026-8820", wallet: "0x7e3a…09f21", chain: "ETHEREUM", risk: 76, status: "In progress", vasp: "WazirX", created: "18 Sep" },
];
const chainOptions = ["TRON", "Ethereum", "BNB Chain", "Polygon", "Bitcoin", "Solana"];
const coinDisplay: Record<string, string> = { TRON: "TRON", ETHEREUM: "Ethereum", BSC: "BNB Chain", POLYGON: "Polygon", BITCOIN: "Bitcoin", SOLANA: "Solana", Ethereum: "Ethereum", "BNB Chain": "BNB Chain", Polygon: "Polygon", Bitcoin: "Bitcoin", Solana: "Solana" };
const filters = ["All", "TRON", "ETHEREUM", "BSC", "POLYGON", "BITCOIN", "SOLANA"];
const auditRows = [
  ["LOG-1092", "Inspector A. Sharma (IO-402)", "Traversal", "TABC1234567890XYZ99887766554433 · 4 hops", "20 Sept, 08:02 pm"],
  ["LOG-1093", "ACP R. Verma (Supervisor)", "Notice", "CS-2026-8891 · Approved Section 94 Notice for CoinDCX", "20 Sept, 08:15 pm"],
  ["LOG-1094", "Inspector K. Patil (IO-118)", "Ingestion", "FIR-2026-DEL-0412 · NCRP Ingestion", "21 Sept, 02:42 pm"],
  ["LOG-1095", "ACP R. Verma (Supervisor)", "Certificate", "Section 63 BSA Hash: 3a9f02c1...8b4e72", "21 Sept, 03:34 pm"],
  ["LOG-1096", "VASP Compliance (WazirX Nodal)", "Freeze Execution", "Deposit Account #WZ-9921 Freeze Confirmation", "21 Sept, 05:00 pm"],
];
const nav: { id: Page; label: string; icon: typeof LayoutGrid }[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutGrid },
  { id: "new", label: "New Investigation", icon: Plus },
  { id: "investigations", label: "Investigations", icon: FolderSearch },
  { id: "notices", label: "Legal Notices", icon: FileText },
  { id: "audit", label: "Supervisory Audit", icon: LockKeyhole },
];
function SutraApp() {
  const [page, setPage] = useState<Page>("dashboard");
  const [cases, setCases] = useState(initialCases);
  const [search, setSearch] = useState("");
  const [chainFilter, setChainFilter] = useState("All");
  const [auditSearch, setAuditSearch] = useState("");
  const [auditFilter, setAuditFilter] = useState("All Actions");
  const [formMode, setFormMode] = useState<"address" | "fir">("address");
  const [selectedChain, setSelectedChain] = useState("TRON");
  const [wallet, setWallet] = useState("");
  const [fir, setFir] = useState("");
  const [hops, setHops] = useState(5);
  const [threshold, setThreshold] = useState(2);
  const [reference, setReference] = useState("");
  const [selectedCase, setSelectedCase] = useState<Case | null>(null);
  const [accountOpen, setAccountOpen] = useState(false);
  const [noticeSent, setNoticeSent] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [greeting, setGreeting] = useState("Greetings!");
  useEffect(() => {
    const hour = new Date().getHours();
    setGreeting(hour >= 5 && hour < 12 ? "Good morning!" : hour < 17 ? "Good afternoon!" : hour < 21 ? "Good evening!" : "Good night!");
  }, []);
  useEffect(() => {
    const sections = document.querySelectorAll<HTMLElement>(".page-content .page-heading, .page-content .section-title, .page-content .metric-cards, .page-content .quick-actions, .page-content .recent-list, .page-content .stats-panel, .page-content .form-layout, .page-content .summary-strip, .page-content .filter-bar, .page-content .table-scroll, .page-content .notice-layout, .page-content .audit-list");
    if (!('IntersectionObserver' in window) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -24px 0px' });
    sections.forEach(section => { section.classList.add('scroll-reveal'); observer.observe(section); });
    return () => { observer.disconnect(); sections.forEach(section => section.classList.remove('scroll-reveal', 'is-visible')); };
  }, [page]);
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    let frame = 0;
    let target = window.scrollY;
    const animate = () => {
      const remaining = target - window.scrollY;
      if (Math.abs(remaining) < 0.7) { window.scrollTo({ top: target, behavior: 'instant' }); frame = 0; return; }
      window.scrollTo({ top: window.scrollY + remaining * 0.22, behavior: 'instant' });
      frame = requestAnimationFrame(animate);
    };
    const onWheel = (event: WheelEvent) => {
      if (event.ctrlKey || event.metaKey || event.shiftKey || event.deltaX !== 0 || !event.deltaY) return;
      const origin = event.target;
      if (origin instanceof Element && origin.closest('.table-scroll, .filter-list, textarea, select, input')) return;
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      if (maxScroll <= 0) return;
      const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? window.innerHeight : 1);
      target = Math.max(0, Math.min(maxScroll, (frame ? target : window.scrollY) + delta));
      event.preventDefault();
      if (!frame) frame = requestAnimationFrame(animate);
    };
    window.addEventListener('wheel', onWheel, { passive: false });
    return () => { window.removeEventListener('wheel', onWheel); cancelAnimationFrame(frame); };
  }, [page]);
  const go = (p: Page) => { setPage(p); setSelectedCase(null); setMobileNavOpen(false); setSearch(""); setChainFilter("All"); window.scrollTo({ top: 0, behavior: "instant" }); };
  const shownCases = cases.filter(c => (chainFilter === "All" || c.chain === chainFilter) && `${c.id} ${c.wallet} ${c.vasp}`.toLowerCase().includes(search.toLowerCase()));
  const shownAudit = auditRows.filter(r => (auditFilter === "All Actions" || r[2] === auditFilter) && r.join(" ").toLowerCase().includes(auditSearch.toLowerCase()));
  const submitInvestigation = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const address = formMode === "address" ? wallet.trim() : fir.trim();
    if (!address) return;
    const newCase: Case = { id: `CS-2026-${Math.floor(1000 + Math.random() * 8999)}`, wallet: address.length > 23 ? `${address.slice(0, 13)}…${address.slice(-7)}` : address, chain: selectedChain === "BNB Chain" ? "BSC" : selectedChain.toUpperCase(), risk: 0, status: "In progress", vasp: "Pending attribution", created: "Today" };
    setCases(prev => [newCase, ...prev]); setWallet(""); setFir(""); go("investigations");
  };
  const title = page === "new" ? "New Investigation" : page === "audit" ? "Supervisory Audit" : page === "notices" ? "Legal Notices" : page === "investigations" ? "Investigations" : "Overview";
  return <div className="app-backdrop"><div className="app-frame">
    <aside className={`sidebar ${mobileNavOpen ? "sidebar--open" : ""}`} aria-label="Main navigation">
      <div className="brand-mark" title="SUTRA"><span className="brand-letter">S</span><span className="brand-dot" /></div>
      <div className="side-divider" />
      <nav className="nav-icons">{nav.map(item => <Button key={item.id} variant="icon" aria-label={item.label} title={item.label} className={`nav-icon ${page === item.id ? "nav-icon--active" : ""}`} onClick={() => go(item.id)}><item.icon size={19} strokeWidth={1.9}/></Button>)}</nav>
      <div className="side-bottom"><Button variant="icon" aria-label="Help" title="Help" className="nav-icon" onClick={() => setAccountOpen(true)}><CircleHelp size={19}/></Button><Button variant="icon" aria-label="Account" title="Account" className="nav-icon" onClick={() => setAccountOpen(v => !v)}><LogOut size={19}/></Button></div>
    </aside>
    <main className="workspace">
      <header className="topbar">
        <div className="topbar-intro"><Button variant="icon" className="mobile-menu" aria-label="Open menu" onClick={() => setMobileNavOpen(v => !v)}>{mobileNavOpen ? <X size={20}/> : <Menu size={20}/>}</Button><div className="officer-avatar">AS</div><div><div className="greeting">{greeting} <span>✦</span></div><div className="subtitle">Start your day with SUTRA</div></div></div>
        <div className="topbar-search"><Search size={17}/><input aria-label="Search investigations" placeholder="Search investigations..." value={search} onChange={e => { setSearch(e.target.value); if (e.target.value && page !== "dashboard" && page !== "investigations") go("investigations"); }} onKeyDown={e => { if (e.key === "Enter") go("investigations"); }}/></div>
        <div className="topbar-actions"><Button variant="icon" className="header-icon" aria-label="Notifications" title="No new notifications" onClick={() => setAccountOpen(v => !v)}><Bell size={18}/></Button><div className="account-wrap"><Button variant="dark" onClick={() => setAccountOpen(v => !v)} className="account-button"><span className="account-avatar">AS</span><span>My account</span><ChevronDown size={13}/></Button>{accountOpen && <div className="account-popover"><strong>Inspector A. Sharma</strong><span>Investigating Officer</span><div className="popover-rule"/><span>SUTRA Fraud Ops Platform</span><Button variant="ghost" onClick={() => setAccountOpen(false)}>Close</Button></div>}</div></div>
      </header>
      <div className="page-content">
        {page === "dashboard" && <>
          <div className="page-heading"><div><div className="eyebrow"><span className="live-dot"/> FORENSIC COMMAND</div><h1>Dashboard</h1><p>Monitor investigations and trace digital asset movement.</p></div><Button variant="primary" onClick={() => go("new")}><Plus size={17}/> New Investigation</Button></div>
          <div className="dashboard-grid"><div className="dashboard-main">
            <div className="section-title"><h2>Case overview</h2><Button variant="ghost" onClick={() => go("investigations")}>See all <ArrowRight size={14}/></Button></div>
            <div className="metric-cards"><div className="metric-card metric-card--dark"><div className="metric-top"><span>ACTIVE INVESTIGATIONS</span><MoreVertical size={17}/></div><div className="metric-number">{cases.length + 8}<span> cases</span></div><div className="metric-footer"><Activity size={15}/> Across all chains <ShieldCheck size={20}/></div></div><div className="metric-card"><div className="metric-top"><span>HIGH RISK CASES</span><AlertTriangle size={18}/></div><div className="metric-number">2<span> flagged</span></div><div className="metric-footer"><span className="risk-pill">≥ 75 RISK SCORE</span><ArrowRight size={18}/></div></div></div>
            <div className="quick-actions"><Button variant="primary" onClick={() => go("new")}><span className="action-icon"><Plus size={17}/></span> New case</Button><Button onClick={() => go("investigations")}><span className="action-icon"><FolderSearch size={17}/></span> Cases</Button><Button onClick={() => go("notices")}><span className="action-icon"><FileText size={17}/></span> Notices</Button><Button onClick={() => go("audit")}><span className="action-icon"><LockKeyhole size={17}/></span> Audit trail</Button></div>
            <div className="section-title sales-title"><h2>Recent investigations</h2><Button variant="ghost" onClick={() => go("investigations")}>View all <ArrowRight size={14}/></Button></div>
            <div className="recent-list"><div className="recent-head"><span>Coin</span><span>Chain</span><span>Status</span><span>Risk</span></div>{cases.slice(0, 4).map(c => <Button variant="ghost" className="recent-row" key={c.id} onClick={() => { setSelectedCase(c); go("investigations"); setSelectedCase(c); }}><span className="case-person"><ChainLogo chain={coinDisplay[c.chain] ?? c.chain} size={30}/><strong>{coinDisplay[c.chain] ?? c.chain}</strong></span><span className="chain-label">{c.chain}</span><span className={`status status--${c.status.toLowerCase().replace(" ", "-")}`}>{c.status}</span><span className="risk-value">{c.risk}<small>/100</small></span></Button>)}</div>
          </div><div className="dashboard-side"><div className="stats-panel"><div className="section-title"><h2>Statistics <CircleHelp size={14}/></h2><span className="period">This week <ChevronDown size={12}/></span></div><div className="donut-wrap"><div className="donut"><div className="donut-center"><small>Total cases</small><strong>{cases.length + 8}</strong></div></div><span className="donut-label">14 active</span></div><div className="legend"><span><i className="legend-blue"/> Active investigations</span><span><i className="legend-dark"/> Other activity</span></div><div className="activity-list"><div className="activity-item"><span className="activity-icon activity-icon--blue"><FolderSearch size={17}/></span><span><strong>VASP matches</strong><small>FIU-IND & global directory</small></span><b>3</b></div><div className="activity-item"><span className="activity-icon activity-icon--dark"><Send size={17}/></span><span><strong>SAHYOG directives</strong><small>Awaiting investigating officer</small></span><b>3</b></div><div className="activity-item"><span className="activity-icon activity-icon--blue"><FileCheck2 size={17}/></span><span><strong>Legal notices</strong><small>Section 94 BNSS</small></span><b>1</b></div><div className="activity-item"><span className="activity-icon activity-icon--dark"><Fingerprint size={17}/></span><span><strong>Sealed audit entries</strong><small>Chain of custody</small></span><b>5</b></div></div></div></div></div>
        </>}
        {page === "new" && <><div className="page-heading"><div><div className="eyebrow">INVESTIGATION WORKSPACE</div><h1>New Investigation</h1></div></div><div className="form-layout"><form className="investigation-form" onSubmit={submitInvestigation}><div className="form-tabs"><Button type="button" variant="ghost" className={formMode === "address" ? "form-tab form-tab--active" : "form-tab"} onClick={() => setFormMode("address")}><Wallet size={17}/> Paste Address</Button><Button type="button" variant="ghost" className={formMode === "fir" ? "form-tab form-tab--active" : "form-tab"} onClick={() => setFormMode("fir")}><FileText size={17}/> AI FIR Extraction</Button></div><div className="form-body">{formMode === "address" ? <label className="field"><span>Suspect target wallet address <em>*</em></span><input required value={wallet} onChange={e => setWallet(e.target.value)} placeholder="Paste TRON, EVM, Bitcoin or Solana address"/></label> : <label className="field"><span>Complaint / FIR narrative <em>*</em></span><textarea required rows={5} value={fir} onChange={e => setFir(e.target.value)} placeholder="Paste the complaint narrative or wallet details here"/></label>}<div className="field"><div className="field-between"><span>Target blockchain architecture</span><small>Selected: {selectedChain}</small></div><div className="chain-grid">{chainOptions.map(chain => <Button key={chain} type="button" variant="ghost" className={`chain-option ${selectedChain === chain ? "chain-option--active" : ""}`} onClick={() => setSelectedChain(chain)}><span className="chain-option-top"><ChainLogo chain={chain} size={30}/><span>{chain}</span></span><small>{({ TRON: "TRC-20 USDT", Ethereum: "ERC-20 / ETH", "BNB Chain": "BEP-20", Polygon: "POL / MATIC", Bitcoin: "BTC Ledger", Solana: "SPL Token" } as Record<string,string>)[chain]}</small></Button>)}</div></div><div className="form-two"><label className="field"><span>Max hops (1–10) <em>*</em></span><input type="number" min={1} max={10} required value={hops} onChange={e => setHops(Number(e.target.value))}/></label><label className="field"><span>Value threshold (%) <small>(prune dust)</small></span><input type="number" min={0} max={100} value={threshold} onChange={e => setThreshold(Number(e.target.value))}/></label></div><label className="field"><span>Complaint / FIR reference ID <small>(optional)</small></span><input value={reference} onChange={e => setReference(e.target.value)} placeholder="e.g. NCRP-2026-88910"/></label><Button type="submit" variant="primary" className="submit-button"><ShieldCheck size={18}/> Start Trace <ArrowRight size={17}/></Button></div></form><div className="form-aside"><span className="aside-icon"><ShieldCheck size={24}/></span><h2>Trace with clarity.</h2><p>Follow digital asset movement across chains with a clear record for every investigation.</p><div className="aside-rule"/><div className="aside-step"><span>01</span> Set the target wallet</div><div className="aside-step"><span>02</span> Configure tracing</div><div className="aside-step"><span>03</span> Review your case</div></div></div></>}
        {page === "investigations" && <><div className="page-heading"><div><div className="eyebrow">CASE MANAGEMENT</div><h1>Investigations</h1><p>Review your cases, track risk and open a case workbench.</p></div><Button variant="primary" onClick={() => go("new")}><Plus size={17}/> New Investigation</Button></div><div className="summary-strip"><div><span>ACTIVE INVESTIGATIONS</span><strong>{cases.length + 8}</strong><small>cases</small></div><div><span>HIGH RISK CASES (≥75)</span><strong>2</strong><small>flagged</small></div><div><span>DIRECTIVES PENDING</span><strong>3</strong><small>awaiting IO</small></div><div><span>NEAREST VASP MATCHES</span><strong>3</strong><small>FIU-IND & Global</small></div></div><div className="filter-bar"><label className="list-search"><Search size={18}/><input aria-label="Search cases" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search case ID, suspect wallet, or attributed VASP..."/></label><div className="filter-list">{filters.map(f => <Button key={f} variant="ghost" className={`filter-chip ${chainFilter === f ? "filter-chip--active" : ""}`} onClick={() => setChainFilter(f)}>{f}</Button>)}</div></div><div className="table-scroll"><table className="data-table"><thead><tr><th>COIN</th><th>SUSPECT WALLET</th><th>CHAIN</th><th>RISK</th><th>STATUS</th><th>TARGET VASP</th><th>CREATED</th><th></th></tr></thead><tbody>{shownCases.map(c => <tr key={c.id}><td><span className="case-person"><ChainLogo chain={coinDisplay[c.chain] ?? c.chain} size={30}/><strong>{coinDisplay[c.chain] ?? c.chain}</strong></span></td><td className="mono muted-cell">{c.wallet}</td><td><span className="chain-badge">{c.chain}</span></td><td><strong className={c.risk >= 75 ? "risk-high" : "risk-normal"}>{c.risk}</strong><span className="muted-cell"> /100</span></td><td><span className={`status status--${c.status.toLowerCase().replace(" ", "-")}`}>{c.status}</span></td><td className="muted-cell">{c.vasp}</td><td className="muted-cell">{c.created}</td><td><Button variant="dark" className="small-dark" onClick={() => setSelectedCase(c)}>Workbench <ChevronRight size={13}/></Button></td></tr>)}</tbody></table>{shownCases.length === 0 && <div className="empty-state">No cases match your search.</div>}</div></>}
        {page === "notices" && <><div className="page-heading"><div><div className="eyebrow">LEGAL WORKSPACE</div><h1>Legal Freeze Notice</h1><p>Section 94 BNSS · Section 63 BSA Digital Evidence Certificate · CS-2026-8891</p></div><Button variant="primary" onClick={() => setNoticeSent(true)}><Send size={17}/> {noticeSent ? "Sent for Approval" : "Send for Approval"}</Button></div><div className="notice-layout"><div className="notice-paper"><div className="notice-header"><div><div className="eyebrow">OFFICIAL DOCUMENT</div><h2>Formal Freeze Order</h2><p>SECTION 94 BNSS, 2023</p></div><span className="notice-seal"><ShieldCheck size={26}/></span></div><div className="notice-ref">Reference Case ID: CS-2026-8891 <span>·</span> Ref: NOTICE-CS-2026-8891</div><div className="notice-body"><p><strong>TO: Nodal Compliance Officer, CoinDCX</strong></p><p>WHEREAS information has been laid before the undersigned Cyber Crime Police Station regarding stolen victim funds routed through crypto networks and attributed to accounts maintained on your Virtual Asset Service Provider (VASP) platform.</p><p className="notice-emphasis">YOU ARE HEREBY DIRECTED TO IMMEDIATELY FREEZE AND RESTRAIN MOVEMENT ON THE SPECIFIED DEPOSIT ACCOUNT:</p><div className="address-box"><span>KYC DEPOSIT ADDRESS</span><strong className="mono">TCOINDCXDEPOSIT9988776655443311</strong></div></div></div><div className="notice-side"><div className="notice-side-card"><div className="side-card-heading"><ShieldCheck size={20}/><h3>Evidence certificate</h3></div><span className="eyebrow">SECTION 63 BSA · DIGITAL HASH STAMP</span><p>This document carries a cryptographically verifiable SHA-256 hash stamp corresponding to the graph traversal chain recorded at the time of legal notice issuance.</p><div className="hash-box mono">e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855</div></div><Button variant="dark" className="download-button" onClick={() => window.print()}><Download size={17}/> Download PDF / Print</Button>{noticeSent && <div className="success-callout"><CheckCircle2 size={18}/> Approval request marked as sent in this preview.</div>}</div></div></>}
        {page === "audit" && <><div className="page-heading"><div><div className="eyebrow"><LockKeyhole size={13}/> SUPERVISORY OVERSIGHT & CHAIN OF CUSTODY</div><h1>Supervisory Audit Trail</h1><p>Cryptographically sealed register of searches, traversals and legal notice issuances.</p></div></div><div className="filter-bar audit-filter"><label className="list-search"><Search size={18}/><input aria-label="Search audit logs" placeholder="Search by Log ID, Officer, Action, or Query..." value={auditSearch} onChange={e => setAuditSearch(e.target.value)}/></label><div className="select-wrap"><SlidersHorizontal size={16}/><span>ACTION:</span><select aria-label="Filter audit action" value={auditFilter} onChange={e => setAuditFilter(e.target.value)}><option>All Actions</option><option>Traversal</option><option>Notice</option><option>Ingestion</option><option>Certificate</option><option>Freeze Execution</option></select></div></div><div className="table-scroll"><table className="data-table audit-table"><thead><tr><th>LOG ID</th><th>OFFICER / UNIT</th><th>ACTION TYPE</th><th>TARGET QUERY / CASE REFERENCE</th><th>TIMESTAMP (UTC)</th><th>INTEGRITY</th></tr></thead><tbody>{shownAudit.map(r => <tr key={r[0]}><td className="mono case-id">{r[0]}</td><td>{r[1]}</td><td><span className="audit-tag">{r[2]}</span></td><td className="mono muted-cell">{r[3]}</td><td className="mono muted-cell">{r[4]}</td><td><span className="sealed"><CheckCircle2 size={13}/> SEALED</span></td></tr>)}</tbody></table>{shownAudit.length === 0 && <div className="empty-state">No audit entries match your search.</div>}</div></>}
      </div>
    </main>
    {selectedCase && <div className="modal-backdrop" onClick={() => setSelectedCase(null)}><section className="case-modal" role="dialog" aria-modal="true" aria-label="Case workbench" onClick={e => e.stopPropagation()}><div className="modal-top"><span className="eyebrow">CASE WORKBENCH</span><Button variant="icon" aria-label="Close workbench" onClick={() => setSelectedCase(null)}><X size={20}/></Button></div><h2>{selectedCase.id}</h2><p>Investigation record and tracing overview</p><div className="modal-grid"><div><span>Suspect wallet</span><strong className="mono">{selectedCase.wallet}</strong></div><div><span>Blockchain</span><strong>{selectedCase.chain}</strong></div><div><span>Risk score</span><strong>{selectedCase.risk} / 100</strong></div><div><span>Status</span><strong>{selectedCase.status}</strong></div><div><span>Target VASP</span><strong>{selectedCase.vasp}</strong></div><div><span>Created</span><strong>{selectedCase.created}</strong></div></div><div className="modal-actions"><Button variant="subtle" onClick={() => { navigator.clipboard?.writeText(selectedCase.id); setCopied(true); setTimeout(() => setCopied(false), 2000); }}>{copied ? <Check size={16}/> : <Copy size={16}/>} {copied ? "Copied" : "Copy case ID"}</Button><Button variant="primary" onClick={() => { setSelectedCase(null); go("notices"); }}>View legal notice <ArrowRight size={16}/></Button></div></section></div>}
  </div></div>;
}
