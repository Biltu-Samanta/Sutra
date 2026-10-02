"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Chain, TraceRequest } from "@/lib/types";
import { createTrace, parseFir } from "@/lib/api";
import { Button } from "@/components/Button";
import { ChainLogo } from "@/components/ChainLogo";
import {
  Wallet,
  FileText,
  ShieldCheck,
  ArrowRight,
  Sparkles,
  Loader2,
} from "lucide-react";

const chainOptions = ["TRON", "Ethereum", "BNB Chain", "Polygon", "Bitcoin", "Solana"];

const chainDescriptions: Record<string, string> = {
  TRON: "TRC-20 USDT",
  Ethereum: "ERC-20 / ETH",
  "BNB Chain": "BEP-20",
  Polygon: "POL / MATIC",
  Bitcoin: "BTC Ledger",
  Solana: "SPL Token",
};

export function TraceForm() {
  const router = useRouter();
  const [formMode, setFormMode] = useState<"address" | "fir">("address");
  const [selectedChain, setSelectedChain] = useState("TRON");
  const [wallet, setWallet] = useState("");
  const [fir, setFir] = useState("");
  const [hops, setHops] = useState(5);
  const [threshold, setThreshold] = useState(2);
  const [reference, setReference] = useState("");
  const [loading, setLoading] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [autoDetectedChain, setAutoDetectedChain] = useState<string | null>(null);

  const detectChain = (addr: string) => {
    const clean = addr.trim();
    if (clean.startsWith("T") && clean.length >= 28) {
      setSelectedChain("TRON");
      setAutoDetectedChain("TRON");
    } else if (clean.startsWith("0x") && clean.length >= 38) {
      if (!["Ethereum", "BNB Chain", "Polygon"].includes(selectedChain)) {
        setSelectedChain("Ethereum");
      }
      setAutoDetectedChain("EVM (Ethereum / BSC / Polygon)");
    } else if (/^(1|3|bc1)/i.test(clean)) {
      setSelectedChain("Bitcoin");
      setAutoDetectedChain("Bitcoin");
    } else if (clean.length >= 32 && clean.length <= 44 && !/[0OIl]/.test(clean)) {
      setSelectedChain("Solana");
      setAutoDetectedChain("Solana");
    } else {
      setAutoDetectedChain(null);
    }
  };

  const handleFirParse = async () => {
    if (!fir.trim()) return;
    setIsParsing(true);
    setParseError(null);
    try {
      const res = await parseFir(fir);
      const extracted = res.suspect_address || res.suspect_wallet_address;
      if (extracted) {
        setWallet(extracted);
        detectChain(extracted);
        if (res.chain) {
          const matched = chainOptions.find((c) => c.toLowerCase() === res.chain?.toLowerCase());
          if (matched) setSelectedChain(matched);
        }
        if (res.max_hops) setHops(res.max_hops);
        setFormMode("address");
      } else {
        setParseError("Could not extract a valid suspect wallet address. Please switch to Paste Address.");
      }
    } catch (err: unknown) {
      setParseError((err as Error).message || "FIR extraction failed.");
    } finally {
      setIsParsing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const addressToTrace = formMode === "address" ? wallet.trim() : "";
    if (formMode === "fir" && !wallet.trim()) {
      await handleFirParse();
      return;
    }
    if (!addressToTrace) return;

    setLoading(true);
    const backendChain: Chain =
      selectedChain === "BNB Chain"
        ? "bsc"
        : (selectedChain.toLowerCase() as Chain);

    try {
      const payload: TraceRequest = {
        suspect_address: addressToTrace,
        chain: backendChain,
        max_hops: hops,
        value_threshold_pct: threshold,
        complaint_id: reference || undefined,
      };
      const result = await createTrace(payload);
      router.push(`/case/${encodeURIComponent(result.case_id)}`);
    } catch (err) {
      console.warn("Trace error, using fallback case route:", err);
      const fbId = reference || `CS-2026-${Math.floor(1000 + Math.random() * 8999)}`;
      router.push(`/case/${encodeURIComponent(fbId)}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="form-layout">
      {/* Investigation Form */}
      <form className="investigation-form" onSubmit={handleSubmit}>
        <div className="form-tabs">
          <Button
            type="button"
            variant="ghost"
            className={formMode === "address" ? "form-tab form-tab--active" : "form-tab"}
            onClick={() => setFormMode("address")}
          >
            <Wallet size={17} /> Paste Address
          </Button>
          <Button
            type="button"
            variant="ghost"
            className={formMode === "fir" ? "form-tab form-tab--active" : "form-tab"}
            onClick={() => setFormMode("fir")}
          >
            <FileText size={17} /> AI FIR Extraction
          </Button>
        </div>

        <div className="form-body">
          {formMode === "address" ? (
            <label className="field">
              <div className="flex items-center justify-between">
                <span>
                  Suspect target wallet address <em>*</em>
                </span>
                {autoDetectedChain && (
                  <span className="text-[10px] text-[var(--primary)] font-bold font-mono">
                    Auto-Detected: {autoDetectedChain}
                  </span>
                )}
              </div>
              <input
                required
                value={wallet}
                onChange={(e) => {
                  setWallet(e.target.value);
                  detectChain(e.target.value);
                }}
                placeholder="Paste TRON (T...), EVM (0x...), Bitcoin, or Solana address"
              />
            </label>
          ) : (
            <div className="space-y-3">
              <label className="field">
                <span>
                  Complaint / FIR narrative <em>*</em>
                </span>
                <textarea
                  required
                  rows={5}
                  value={fir}
                  onChange={(e) => setFir(e.target.value)}
                  placeholder="Paste victim complaint, FIR excerpt, or transaction statement..."
                />
              </label>
              <Button
                type="button"
                variant="subtle"
                onClick={handleFirParse}
                disabled={isParsing}
                className="w-full"
              >
                {isParsing ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                {isParsing ? "Analyzing with Gemini AI…" : "Extract Suspect Wallet with AI"}
              </Button>
              {parseError && <p className="text-xs text-[var(--danger)]">{parseError}</p>}
            </div>
          )}

          {/* Blockchain Architecture Grid */}
          <div className="field">
            <div className="field-between">
              <span>Target blockchain architecture</span>
              <small>Selected: {selectedChain}</small>
            </div>
            <div className="chain-grid">
              {chainOptions.map((chain) => (
                <Button
                  key={chain}
                  type="button"
                  variant="ghost"
                  className={`chain-option ${selectedChain === chain ? "chain-option--active" : ""}`}
                  onClick={() => setSelectedChain(chain)}
                >
                  <span className="chain-option-top">
                    <ChainLogo chain={chain} size={30} />
                    <span>{chain}</span>
                  </span>
                  <small>{chainDescriptions[chain]}</small>
                </Button>
              ))}
            </div>
          </div>

          {/* Hops and Threshold */}
          <div className="form-two">
            <label className="field">
              <span>
                Max hops (1–10) <em>*</em>
              </span>
              <input
                type="number"
                min={1}
                max={10}
                required
                value={hops}
                onChange={(e) => setHops(Number(e.target.value))}
              />
            </label>
            <label className="field">
              <span>
                Value threshold (%) <small>(prune dust)</small>
              </span>
              <input
                type="number"
                min={0}
                max={100}
                step="0.5"
                value={threshold}
                onChange={(e) => setThreshold(Number(e.target.value))}
              />
            </label>
          </div>

          {/* Reference ID */}
          <label className="field">
            <span>
              Complaint / FIR reference ID <small>(optional)</small>
            </span>
            <input
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="e.g. NCRP-2026-88910"
            />
          </label>

          {/* Submit */}
          <Button type="submit" variant="primary" className="submit-button" disabled={loading}>
            {loading ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <ShieldCheck size={18} />
            )}
            {loading ? "Tracing Transaction Path…" : "Start Trace"} <ArrowRight size={17} />
          </Button>
        </div>
      </form>

      {/* Form Aside */}
      <div className="form-aside">
        <span className="aside-icon">
          <ShieldCheck size={24} />
        </span>
        <h2>Trace with clarity.</h2>
        <p>
          Follow digital asset movement across chains with an explainable record for every investigation.
        </p>
        <div className="aside-rule" />
        <div className="aside-step">
          <span>01</span> Set the target wallet
        </div>
        <div className="aside-step">
          <span>02</span> Configure tracing
        </div>
        <div className="aside-step">
          <span>03</span> Review your case
        </div>
      </div>
    </div>
  );
}
