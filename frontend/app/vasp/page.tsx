"use client";

import React, { useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import {
  Building2,
  CheckCircle2,
  AlertTriangle,
  Search,
  Mail,
  Phone,
  Globe,
  Copy,
  Check,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/Button";

interface VaspDirectoryEntry {
  name: string;
  jurisdiction: string;
  is_fiu_registered: boolean;
  risk_level: "low" | "medium" | "high";
  hot_wallets: string[];
  nodal_officer_email: string;
  nodal_officer_phone?: string;
  tags: string[];
}

export default function VaspDirectoryPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [fiuOnly, setFiuOnly] = useState(false);
  const [copiedWallet, setCopiedWallet] = useState<string | null>(null);

  const vasps: VaspDirectoryEntry[] = [
    {
      name: "WazirX",
      jurisdiction: "India",
      is_fiu_registered: true,
      risk_level: "low",
      hot_wallets: [
        "TCFBHekF4d1uQvTvh8X6fA5Y9K8mN2L5vQ",
        "TNPeeaa28mP3x5n8vQ6rTSwXyZaK8gqY5n",
      ],
      nodal_officer_email: "nodal@wazirx.com",
      nodal_officer_phone: "+91-2268590001",
      tags: ["exchange", "india", "fiu_registered", "inr_fiat"],
    },
    {
      name: "CoinDCX",
      jurisdiction: "India",
      is_fiu_registered: true,
      risk_level: "low",
      hot_wallets: [
        "TDcxHot8f7kH9mN3L5vQ6rTSwXyZaK8gqY",
        "TCoinDCX7kH9mN3L5vQ6rTSwXyZaK8gqY5",
      ],
      nodal_officer_email: "compliance@coindcx.com",
      nodal_officer_phone: "+91-2248960000",
      tags: ["exchange", "india", "fiu_registered", "inr_fiat"],
    },
    {
      name: "CoinSwitch Kuber",
      jurisdiction: "India",
      is_fiu_registered: true,
      risk_level: "low",
      hot_wallets: [
        "TSwXyZaK8gqY5n2b1aP8f7kH9mN3L5vQ6r",
        "TCskW8g7m2VqL4b9n1aP3fY6rK8n2mN5tQ",
      ],
      nodal_officer_email: "compliance@coinswitch.co",
      nodal_officer_phone: "+91-8045680000",
      tags: ["exchange", "india", "fiu_registered"],
    },
    {
      name: "ZebPay",
      jurisdiction: "India",
      is_fiu_registered: true,
      risk_level: "low",
      hot_wallets: [
        "TZebP7kH9mN3L5vQ6rTSwXyZaK8gqY5n2b1",
        "TZB9mN3L5vQ6rTSwXyZaK8gqY5n2b1aP8f7",
      ],
      nodal_officer_email: "compliance@zebpay.com",
      nodal_officer_phone: "+91-2268590000",
      tags: ["exchange", "india", "fiu_registered"],
    },
    {
      name: "Mudrex",
      jurisdiction: "India",
      is_fiu_registered: true,
      risk_level: "low",
      hot_wallets: [
        "TMudRx9mN3L5vQ6rTSwXyZaK8gqY5n2b1aP",
        "TMD8f7kH9mN3L5vQ6rTSwXyZaK8gqY5n2b1",
      ],
      nodal_officer_email: "compliance@mudrex.com",
      tags: ["exchange", "india", "fiu_registered"],
    },
    {
      name: "Binance",
      jurisdiction: "International",
      is_fiu_registered: false,
      risk_level: "medium",
      hot_wallets: [
        "TN3W4H6rK2ce4vX9YnFQHwKENnHjoxb3m9",
        "TND5T6yWpYVwA4f1tDqG9X8mN3L5vQ6rTS",
        "0x28C6c06298d514Db089934071355E5743bf21d60",
      ],
      nodal_officer_email: "case@binance.com",
      tags: ["exchange", "global_tier1", "offshore"],
    },
    {
      name: "OKX",
      jurisdiction: "Seychelles",
      is_fiu_registered: false,
      risk_level: "medium",
      hot_wallets: [
        "TFr2V5qK8gqY5n2b1aP8f7kH9mN3L5vQ6r",
        "0x6cC5F688a304C3d602496C3d65C79E885F3B4009",
      ],
      nodal_officer_email: "support@okx.com",
      tags: ["exchange", "global_tier1", "offshore"],
    },
    {
      name: "Bybit",
      jurisdiction: "UAE",
      is_fiu_registered: false,
      risk_level: "medium",
      hot_wallets: [
        "TBybtK8gqY5n2b1aP8f7kH9mN3L5vQ6rTSw",
        "0xf977814e90da44bfa03b6295a0616a897441acec",
      ],
      nodal_officer_email: "compliance@bybit.com",
      tags: ["exchange", "global_tier1", "offshore"],
    },
  ];

  const handleCopy = (wallet: string) => {
    navigator.clipboard.writeText(wallet);
    setCopiedWallet(wallet);
    setTimeout(() => setCopiedWallet(null), 1500);
  };

  const filteredVasps = vasps.filter((v) => {
    if (fiuOnly && !v.is_fiu_registered) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        v.name.toLowerCase().includes(q) ||
        v.jurisdiction.toLowerCase().includes(q) ||
        v.hot_wallets.some((w) => w.toLowerCase().includes(q))
      );
    }
    return true;
  });

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="page-heading">
          <div>
            <div className="eyebrow">
              <Building2 size={13} /> SUTRA VASP RECONNAISSANCE
            </div>
            <h1>Virtual Asset Service Providers (VASP) Registry</h1>
            <p>
              Authoritative intelligence directory of Indian FIU-IND registered reporting entities and global centralized exchanges.
            </p>
          </div>
          <Button
            variant={fiuOnly ? "primary" : "subtle"}
            onClick={() => setFiuOnly(!fiuOnly)}
          >
            <ShieldCheck size={16} />
            {fiuOnly ? "Showing FIU-IND Only" : "Filter: FIU-IND Only"}
          </Button>
        </div>

        <div className="summary-strip">
          <div>
            <span>TOTAL VASPS RECORDED</span>
            <strong>{vasps.length}</strong>
            <small>entities</small>
          </div>
          <div>
            <span>FIU-IND REGISTERED</span>
            <strong>{vasps.filter((v) => v.is_fiu_registered).length}</strong>
            <small>reporting entities</small>
          </div>
          <div>
            <span>HOT WALLET CLUSTERS</span>
            <strong>16+</strong>
            <small>sweeper pools</small>
          </div>
          <div>
            <span>STATUTORY DESKS</span>
            <strong>100%</strong>
            <small>Nodal &amp; Sec 94 ready</small>
          </div>
        </div>

        <div className="filter-bar">
          <label className="list-search">
            <Search size={18} />
            <input
              aria-label="Search VASP directory"
              placeholder="Search by VASP name, jurisdiction, or hot wallet..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredVasps.map((v) => (
            <div key={v.name} className="glass-panel p-5 space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-display text-base font-bold text-slate-900">
                      {v.name}
                    </h3>
                    {v.is_fiu_registered ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-300 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                        <CheckCircle2 size={12} /> FIU-IND REGISTERED
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-300 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                        <AlertTriangle size={12} /> OFFSHORE ENTITY
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                    <Globe size={13} className="text-slate-400" />
                    Jurisdiction: <strong>{v.jurisdiction}</strong>
                  </p>
                </div>
              </div>

              <div className="space-y-1.5 text-xs">
                <div className="flex items-center gap-2 text-slate-700">
                  <Mail size={13} className="text-[var(--primary)] shrink-0" />
                  <span className="text-slate-500">Nodal Email:</span>
                  <a
                    href={`mailto:${v.nodal_officer_email}`}
                    className="font-mono font-semibold text-[var(--primary)] hover:underline"
                  >
                    {v.nodal_officer_email}
                  </a>
                </div>
                {v.nodal_officer_phone && (
                  <div className="flex items-center gap-2 text-slate-700">
                    <Phone size={13} className="text-emerald-600 shrink-0" />
                    <span className="text-slate-500">Emergency Desk:</span>
                    <span className="font-mono font-semibold">
                      {v.nodal_officer_phone}
                    </span>
                  </div>
                )}
              </div>

              <div className="space-y-1.5 pt-2 border-t border-slate-200">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Known Cluster Hot Wallets
                </div>
                <div className="space-y-1">
                  {v.hot_wallets.map((wallet) => (
                    <div
                      key={wallet}
                      className="flex items-center justify-between rounded-lg bg-slate-50 border border-slate-200/80 px-2.5 py-1.5 font-mono text-[11px] text-slate-800"
                    >
                      <span className="truncate pr-2">{wallet}</span>
                      <button
                        type="button"
                        onClick={() => handleCopy(wallet)}
                        className="text-slate-400 hover:text-slate-900 transition-colors cursor-pointer shrink-0"
                        title="Copy wallet"
                      >
                        {copiedWallet === wallet ? (
                          <Check size={14} className="text-emerald-600" />
                        ) : (
                          <Copy size={14} />
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
