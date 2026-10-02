"use client";

import React from "react";
import { AppShell } from "@/components/layout/AppShell";
import { TraceForm } from "@/components/intake/TraceForm";

export default function NewTracePage() {
  return (
    <AppShell>
      <div className="space-y-6">
        <div className="page-heading">
          <div>
            <div className="eyebrow">INVESTIGATION WORKSPACE</div>
            <h1>New Investigation</h1>
            <p>Initiate multi-hop blockchain asset tracing from a suspect wallet address or raw FIR narrative.</p>
          </div>
        </div>
        <TraceForm />
      </div>
    </AppShell>
  );
}
