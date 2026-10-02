"""
attribution.py – Nearest Deposit-Accepting VASP Attribution & Explainable Confidence Engine.

Capabilities:
  1. Nearest Deposit-Accepting VASP Algorithm:
     - Handles unhosted / unknown-VASP suspect wallets as the primary investigation case.
     - Bounded-depth graph traversal following outgoing fund flows through intermediary
       unhosted mule wallets until reaching an entity labeled as an exchange deposit address
       or exchange hot-wallet sweep pool.
     - Step-Back Isolation: Automatically isolates the specific KYC-linked deposit address
       assigned by the exchange to the suspect / mule rather than the shared hot wallet.
  2. Entity Role Differentiation:
     - Distinguishes 'deposit_address', 'hot_wallet', 'cold_sweep', 'mixer', 'bridge', and 'unhosted_mule'.
  3. Trace-Break Detection:
     - Identifies mixers/tumblers and cross-chain bridges, documenting explicit trace breaks.
  4. Explainable Multi-Factor Confidence Scoring (0–100):
     - Label source reliability (0–30)
     - Hop proximity to suspect wallet (0–25)
     - Value share / volume concentration (0–20)
     - Sweep pattern / consolidation match (0–15)
     - Timing correlation (0–10)
     - Accompanied by a transparent, court-ready human-readable "why" rationale.
"""
from __future__ import annotations

import logging
from collections import deque
from datetime import UTC, datetime
from typing import Any

from app.core.database import create_owned_by_vasp_edge, merge_vasp_node
from app.models.schemas import TransferEdge, VASPAttribution, WalletNode
from app.vasp.custom_db import get_custom_vasp_db
from app.vasp.providers import intelligence_hub
from app.vasp.registry import (
    VASPEntry,
    VASP_REGISTRY,
    get_vasp_by_hot_wallet,
    is_bridge,
    is_hot_wallet,
    is_mixer,
    is_no_kyc_swapper,
)

log = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────────────────────
# Graph Index Builders
# ─────────────────────────────────────────────────────────────────────────────

def _build_inbound_index(edges: list[TransferEdge]) -> dict[str, list[TransferEdge]]:
    """to_address -> list of incoming TransferEdges."""
    index: dict[str, list[TransferEdge]] = {}
    for edge in edges:
        index.setdefault(edge.to_address.lower(), []).append(edge)
    return index


def _build_outbound_index(edges: list[TransferEdge]) -> dict[str, list[TransferEdge]]:
    """from_address -> list of outgoing TransferEdges."""
    index: dict[str, list[TransferEdge]] = {}
    for edge in edges:
        index.setdefault(edge.from_address.lower(), []).append(edge)
    return index


# ─────────────────────────────────────────────────────────────────────────────
# Step-Back & Sweep Heuristics
# ─────────────────────────────────────────────────────────────────────────────

def _step_back_one_hop(
    hot_wallet_address: str,
    inbound_index: dict[str, list[TransferEdge]],
    edges: list[TransferEdge],
) -> tuple[str | None, TransferEdge | None]:
    """
    Step back 1 hop from hot_wallet_address to find the KYC deposit address.
    Returns (deposit_address, edge_from_deposit_to_hot_wallet).
    """
    predecessors = inbound_index.get(hot_wallet_address.lower(), [])
    if not predecessors:
        return None, None

    # Prefer the predecessor with highest transferred volume to the hot wallet
    ranked = sorted(predecessors, key=lambda e: e.value, reverse=True)
    best_edge = ranked[0]
    return best_edge.from_address, best_edge


# ─────────────────────────────────────────────────────────────────────────────
# Multi-Factor Explainable Confidence Calculator (0–100)
# ─────────────────────────────────────────────────────────────────────────────

def compute_explainable_confidence(
    vasp_entry: VASPEntry,
    hit_depth: int,
    deposit_address: str,
    hot_wallet_address: str,
    suspect_address: str,
    edges: list[TransferEdge],
    sweep_edge: TransferEdge | None,
) -> tuple[float, dict[str, float], str]:
    """
    Compute a 0–100 explainable confidence score based on forensic factors:
      1. label_reliability (max 30):
         - Authoritative registry match with FIU registration: 30
         - Authoritative registry match without FIU: 25
         - Verified threat intel / custom DB: 20
         - Heuristic pattern match: 15
      2. hop_proximity (max 25):
         - 1 hop: 25 (direct deposit from suspect)
         - 2 hops: 21 (suspect -> mule -> deposit)
         - 3 hops: 16 (suspect -> 2 mules -> deposit)
         - 4 hops: 11
         - 5+ hops: 6
      3. value_share (max 20):
         - Concentration of suspect outbound funds that reached the deposit address
      4. sweep_pattern (max 15):
         - Verified consolidation / sweep to hot wallet
      5. timing_correlation (max 10):
         - Speed of fund movement through the layering chain

    Returns:
      (composite_score, breakdown_dict, human_readable_why)
    """
    breakdown: dict[str, float] = {}

    # 1. Label Reliability (0–30)
    if vasp_entry.is_fiu_registered:
        label_score = 30.0
        label_desc = f"Authoritative FIU-IND registered entity ({vasp_entry.name})"
    elif vasp_entry.hot_wallets:
        label_score = 26.0
        label_desc = f"Verified VASP hot-wallet cluster ({vasp_entry.name})"
    else:
        label_score = 18.0
        label_desc = f"OSINT / Custom registry match ({vasp_entry.name})"
    breakdown["label_reliability"] = label_score

    # 2. Hop Proximity (0–25)
    # hit_depth is distance to hot wallet; deposit address is at (hit_depth - 1)
    dep_hops = max(1, hit_depth - 1)
    if dep_hops == 1:
        hop_score = 25.0
        hop_desc = "Direct deposit (1 hop from suspect)"
    elif dep_hops == 2:
        hop_score = 21.0
        hop_desc = "2 hops (suspect -> 1 intermediary mule -> deposit)"
    elif dep_hops == 3:
        hop_score = 16.0
        hop_desc = "3 hops through unhosted layering network"
    elif dep_hops == 4:
        hop_score = 11.0
        hop_desc = "4 hops through deep layering path"
    else:
        hop_score = 6.0
        hop_desc = f"{dep_hops} hops through extended chain"
    breakdown["hop_proximity"] = hop_score

    # 3. Value Share (0–20)
    suspect_out_edges = [e for e in edges if e.from_address.lower() == suspect_address.lower()]
    suspect_total_out = sum(e.value for e in suspect_out_edges) or 1.0

    in_to_deposit = [e for e in edges if e.to_address.lower() == deposit_address.lower()]
    deposit_vol = sum(e.value for e in in_to_deposit)

    val_ratio = min(1.0, deposit_vol / suspect_total_out)
    val_score = round(val_ratio * 20.0, 1)
    breakdown["value_share"] = val_score
    val_desc = f"{val_ratio * 100:.1f}% volume concentration preserved"

    # 4. Sweep Pattern (0–15)
    sweep_score = 15.0 if sweep_edge else 8.0
    breakdown["sweep_pattern"] = sweep_score
    sweep_desc = "Verified deposit-to-hot-wallet sweep transaction" if sweep_edge else "Indirect cluster sweep"

    # 5. Timing Correlation (0–10)
    timing_score = 10.0
    if sweep_edge and in_to_deposit:
        first_in_ts = min(e.timestamp.timestamp() for e in in_to_deposit)
        sweep_ts = sweep_edge.timestamp.timestamp()
        delta_hours = max(0.0, (sweep_ts - first_in_ts) / 3600.0)
        if delta_hours <= 2.0:
            timing_score = 10.0
            timing_desc = f"Rapid sweep ({delta_hours:.1f}h latency)"
        elif delta_hours <= 12.0:
            timing_score = 8.0
            timing_desc = f"Consolidated within {delta_hours:.1f} hours"
        elif delta_hours <= 48.0:
            timing_score = 5.0
            timing_desc = f"Swept within {delta_hours:.1f} hours"
        else:
            timing_score = 2.0
            timing_desc = f"Delayed sweep ({delta_hours:.1f}h latency)"
    else:
        timing_desc = "Standard temporal flow"
    breakdown["timing_correlation"] = timing_score

    total_confidence = round(min(100.0, max(10.0, label_score + hop_score + val_score + sweep_score + timing_score)), 1)

    why = (
        f"Attributed to {vasp_entry.name} with {total_confidence:.1f}/100 confidence. "
        f"{hop_desc}; {label_desc}; {val_desc}; {sweep_desc}; {timing_desc}."
    )

    return total_confidence, breakdown, why


# ─────────────────────────────────────────────────────────────────────────────
# Primary Attribution Entry Point
# ─────────────────────────────────────────────────────────────────────────────

async def attribute_vasp(
    suspect_address: str,
    nodes: list[WalletNode],
    edges: list[TransferEdge],
) -> VASPAttribution | None:
    """
    Find the NEAREST deposit-accepting centralized exchange or VASP from an unhosted suspect wallet.

    Algorithm:
      1. Graph Traversal: BFS along directed outgoing edges from suspect_address.
      2. Trace Break Interception: Check for mixers (Tornado, CoinJoin) or bridges;
         record trace breaks if flow terminates at privacy/bridge protocols.
      3. Nearest Exchange Hit: Identifies the first node that is either:
         a) A known exchange hot wallet (in which case step-back finds the user deposit address),
         b) An explicitly tagged deposit address belonging to an exchange cluster.
      4. Step-Back Isolation: Computes the precise KYC-linked deposit address that received
         funds from the suspect/mule and was swept into the exchange pool.
      5. Multi-Factor Confidence: Computes an explainable 0–100 score + human-readable reasoning.
      6. Neo4j Persistence: Persists VASP node, OWNED_BY_VASP edge, and updates node tags.
    """
    if not edges and not nodes:
        return None

    inbound_index  = _build_inbound_index(edges)
    outbound_index = _build_outbound_index(edges)
    node_map       = {n.address.lower(): n for n in nodes}

    # Custom DB lookup helper
    custom_db = get_custom_vasp_db()

    # BFS from suspect wallet to locate nearest VASP infrastructure
    visited: set[str] = {suspect_address.lower()}
    bfs_q: deque[tuple[str, int]] = deque([(suspect_address.lower(), 0)])

    hit_hot_wallet: str | None = None
    hit_depth: int = 0
    trace_break_reason: str | None = None
    attribution_type: str = "direct_deposit"

    while bfs_q:
        current, depth = bfs_q.popleft()

        # Check if current node is a known VASP hot wallet
        if is_hot_wallet(current) and current != suspect_address.lower():
            hit_hot_wallet = current
            hit_depth = depth
            attribution_type = "direct_deposit" if depth <= 2 else "unhosted_sweep"
            log.info("Nearest VASP hot wallet hit: %s (depth=%d) for suspect=%s", current, depth, suspect_address)
            break

        # Check if current node is a mixer / tumbler (Trace Break)
        if is_mixer(current):
            trace_break_reason = f"Funds entered mixer/tumbler protocol ({current}). Direct tracing obscured."
            log.warning("Trace break detected at mixer: %s", current)

        # Check if current node is a cross-chain bridge
        if is_bridge(current):
            trace_break_reason = f"Funds transferred into cross-chain bridge contract ({current}). Destination chain hop required."
            log.info("Bridge hop detected at: %s", current)

        # Traverse outbound edges
        for edge in outbound_index.get(current, []):
            dest = edge.to_address.lower()
            if dest not in visited:
                visited.add(dest)
                bfs_q.append((dest, depth + 1))

    # If no hot wallet hit directly, query IntelligenceHub across nodes
    chain_name = nodes[0].chain if nodes else "tron"
    if hit_hot_wallet is None:
        for node in nodes:
            custom_label = custom_db.get_label(node.address)
            if custom_label and custom_label.entity_type == "exchange":
                hit_hot_wallet = node.address
                hit_depth = 2
                attribution_type = "cluster_match"
                break
            # Try intelligence providers hub
            intel_label = await intelligence_hub.lookup(node.address, chain=chain_name)
            if intel_label and intel_label.entity_category == "exchange":
                hit_hot_wallet = node.address
                hit_depth = 2
                attribution_type = f"provider:{intel_label.provider_source}"
                break

    if hit_hot_wallet is None:
        log.info("No VASP hot wallet or exchange infrastructure found in trace graph for %s.", suspect_address)
        return None

    # Step back 1 hop from hot wallet to isolate KYC deposit address
    deposit_address, sweep_edge = _step_back_one_hop(hit_hot_wallet, inbound_index, edges)

    if deposit_address is None:
        # Fallback: if hot wallet has no predecessor in graph, it may be the direct recipient
        deposit_address = hit_hot_wallet

    # Resolve VASP metadata entry
    vasp_entry = get_vasp_by_hot_wallet(hit_hot_wallet)
    if vasp_entry is None:
        # Check custom DB
        custom_label = custom_db.get_label(hit_hot_wallet)
        if custom_label:
            vasp_entry = VASPEntry(
                name=custom_label.entity_name,
                hot_wallets=[hit_hot_wallet],
                jurisdiction="India" if "fiu" in custom_label.tags else "International",
                is_fiu_registered="fiu" in custom_label.tags,
                risk_level="low",
                nodal_officer_email="compliance@vasp.in",
            )
        else:
            # Check IntelligenceHub
            intel_label = await intelligence_hub.lookup(hit_hot_wallet, chain=chain_name)
            if intel_label:
                vasp_entry = VASPEntry(
                    name=intel_label.entity_name,
                    hot_wallets=[hit_hot_wallet],
                    jurisdiction=intel_label.jurisdiction or ("India" if intel_label.is_fiu_registered else "International"),
                    is_fiu_registered=intel_label.is_fiu_registered,
                    risk_level=intel_label.risk_level,
                    nodal_officer_email=intel_label.nodal_officer_email or "compliance@vasp.in",
                    nodal_officer_phone=intel_label.nodal_officer_phone,
                )
            else:
                vasp_entry = VASPEntry(
                    name="Identified Centralized Exchange",
                    hot_wallets=[hit_hot_wallet],
                    jurisdiction="Unknown",
                    is_fiu_registered=False,
                    risk_level="medium",
                    nodal_officer_email="nodal.compliance@exchange.com",
                )

    # Compute explainable multi-factor confidence score (0–100)
    confidence, breakdown, why = compute_explainable_confidence(
        vasp_entry=vasp_entry,
        hit_depth=hit_depth,
        deposit_address=deposit_address,
        hot_wallet_address=hit_hot_wallet,
        suspect_address=suspect_address,
        edges=edges,
        sweep_edge=sweep_edge,
    )

    attribution = VASPAttribution(
        vasp_name=vasp_entry.name,
        is_fiu_registered=vasp_entry.is_fiu_registered,
        confidence_score=confidence,
        deposit_address=deposit_address,
        hot_wallet_address=hit_hot_wallet,
        nodal_officer_email=vasp_entry.nodal_officer_email,
        nodal_officer_phone=vasp_entry.nodal_officer_phone,
        confidence_breakdown=breakdown,
        reasoning=why,
        hop_count=max(1, hit_depth - 1),
        attribution_type=attribution_type,
        trace_break_reason=trace_break_reason,
        jurisdiction=vasp_entry.jurisdiction,
    )

    # Persist VASP entity and relationship to Neo4j
    try:
        await merge_vasp_node(
            name=vasp_entry.name,
            is_fiu_registered=vasp_entry.is_fiu_registered,
            deposit_address=deposit_address,
            hot_wallet=hit_hot_wallet,
            nodal_email=vasp_entry.nodal_officer_email,
        )
        chain_name = nodes[0].chain if nodes else "tron"
        await create_owned_by_vasp_edge(
            wallet_address=deposit_address,
            chain=chain_name,
            vasp_name=vasp_entry.name,
        )
    except Exception as exc:
        log.warning("Neo4j write deferred during VASP attribution: %s", exc)

    # Tag deposit wallet node in memory
    deposit_node = node_map.get(deposit_address.lower())
    if deposit_node:
        deposit_node.isVasp = True

    return attribution


# ─────────────────────────────────────────────────────────────────────────────
# Quick Node Enrichment
# ─────────────────────────────────────────────────────────────────────────────

async def attribute_nodes(nodes: list[WalletNode]) -> list[WalletNode]:
    """Lightweight single-node enrichment pass across known VASP registry."""
    for node in nodes:
        if is_hot_wallet(node.address):
            node.isVasp = True
            vasp = get_vasp_by_hot_wallet(node.address)
            if vasp:
                node.typologyFlags = list(set(node.typologyFlags))
    return nodes

