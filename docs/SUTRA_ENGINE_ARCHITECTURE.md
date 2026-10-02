# Sutra: Automated Blockchain Intelligence & VASP Attribution Engine

> **Operational Architecture & Compliance Guide**  
> Integrated with the Ministry of Home Affairs (MHA) / I4C **SAHYOG Portal** for automated cybercrime investigation and lawful Section 94 BNSS asset preservation directives.

---

## 1. Executive Summary & Capabilities

**Sutra** is an automated blockchain forensic intelligence engine purpose-built for Indian Law Enforcement Agencies (LEAs), the Indian Cyber Crime Coordination Centre (I4C), and the National Cyber Crime Reporting Portal (NCRP) / SAHYOG system.

| Core Requirement | Implementation Status | Architectural Component |
| :--- | :---: | :--- |
| **M1: Automated SAHYOG Analysis** | **Complete** | `app/api/routes_sahyog.py` (`POST /api/v1/sahyog/auto-analyze`) |
| **M2: Nearest Deposit-Accepting VASP** | **Complete** | `app/vasp/attribution.py` (Bounded BFS + Step-Back KYC Isolation) |
| **M3: Multi-Chain Support (6 Chains)** | **Complete** | `app/engine/adapters/` (TRON, Ethereum, BSC, Polygon, Bitcoin, Solana, Mock) |
| **M4: Entity Identification & Roles** | **Complete** | Distinguishes KYC deposit addresses, hot sweep pools, cold vaults, mixers, and bridges |
| **M5: Pluggable Intelligence Providers** | **Complete** | `app/vasp/providers/` (First-party FIU-IND, TRM Labs, Chainalysis, Elliptic, Mock) |
| **M6: Explainable Confidence Matrix (0–100)**| **Complete** | 5-Factor mathematical model + natural language court rationale |
| **M7: Investigation-Ready LEA Reports** | **Complete** | `app/legal/lea_report_generator.py` (Section 63 BSA JSON + PDF Docket) |
| **M8: Lawful Request Routing via SAHYOG**| **Complete** | `app/sahyog/router.py` + Human-in-the-Loop approval endpoint |

---

## 2. Multi-Chain Layer Architecture (M3)

The multi-chain layer normalizes heterogeneous UTXO, Account-based, and SPL token data into a uniform transaction stream:

```
                          ┌───────────────────────────┐
                          │   ChainAdapterRegistry    │
                          └─────────────┬─────────────┘
          ┌─────────────┬───────────────┼───────────────┬─────────────┐
          ▼             ▼               ▼               ▼             ▼
    ┌───────────┐ ┌───────────┐   ┌───────────┐   ┌───────────┐ ┌───────────┐
    │TronAdapter│ │EvmAdapter │   │BtcAdapter │   │SolanaAdptr│ │MockAdapter│
    └─────┬─────┘ └─────┬─────┘   └─────┬─────┘   └─────┬─────┘ └─────┬─────┘
          │             │               │               │             │
     TRC-20 USDT    ERC/BEP-20     UTXO / Mempool    SPL Tokens    Deterministic
     (TRON Grid)   (ETH/BSC/POL)  (Blockstream)    (Helius/RPC)   Offline Suite
```

- **TRON**: TRC-20 USDT high-frequency laundering tracking.
- **EVM (Ethereum, BSC, Polygon)**: Unified multi-network EVM adapter normalizing decimals and smart-contract events.
- **Bitcoin (BTC)**: UTXO tracing with Common-Input Ownership Heuristic (CIOH) clustering.
- **Solana (SOL)**: High-throughput SPL token balance tracking.
- **Deterministic Mock Adapter**: Enables 100% offline sandboxing, CI/CD testing, and demonstration without live explorer keys.

---

## 3. Nearest Deposit-Accepting VASP Attribution (M2, M4)

### The Step-Back KYC Isolation Algorithm

Launderers frequently send funds through intermediary unhosted mule wallets before depositing them onto a centralized exchange (VASP). Once deposited, the exchange’s automated hot-wallet sweeping daemon pools the tokens into a shared treasury hot wallet (`TN3W4H...`).

1. **Bounded BFS Traversal**: Initiated from the victim/suspect address following outgoing fund transfers through intermediary unhosted mules.
2. **Cluster & Label Matching**: Discovers when flow enters exchange infrastructure (hot wallet pool or exchange cluster).
3. **Step-Back Isolation**: The engine steps backward by exactly 1 hop along the highest-volume inbound transfer leading to the hot wallet. This isolates the **specific KYC-linked deposit address** allocated to the criminal, rather than the exchange's shared pool wallet.
4. **Trace Break Interception**:
   - Mixers/Tumblers (e.g. Tornado Cash, Sinbad, Blender) are intercepted and marked with explicit trace break records.
   - Cross-Chain Bridges (e.g. Polygon Bridge, Wormhole, Stargate) are flagged as requiring chain-hopping reconciliation.

---

## 4. Multi-Factor Explainable Confidence Matrix (0–100) (M6)

Sutra never produces black-box numbers. Every attribution score is calculated using 5 objective forensic pillars:

$$\text{Confidence Score} = S_{\text{label}} + S_{\text{proximity}} + S_{\text{value}} + S_{\text{sweep}} + S_{\text{timing}}$$

| Factor | Weight | Scoring Logic |
| :--- | :---: | :--- |
| **Label Reliability** | **30 pts** | 30 = FIU-IND registered entity; 26 = Verified hot wallet cluster; 18 = OSINT / threat intel DB. |
| **Hop Proximity** | **25 pts** | 25 = Direct deposit (1 hop); 21 = 2 hops (suspect $\to$ mule $\to$ deposit); 16 = 3 hops; 11 = 4 hops; 6 = 5+ hops. |
| **Value Share** | **20 pts** | Proportion of original suspect volume reaching the deposit address ($20 \times \frac{V_{\text{deposit}}}{V_{\text{suspect}}}$). |
| **Sweep Pattern** | **15 pts** | 15 = Verified subsequent sweep transaction into hot wallet pool; 8 = Cluster correlation. |
| **Timing Correlation**| **10 pts** | 10 = Swept within 2 hours; 8 = Swept within 12 hours; 5 = Swept within 48 hours; 2 = Delayed sweep. |

### Court-Ready Natural Language Rationale
Every score is accompanied by an auto-generated narrative:
> *"Attributed to Binance with 87.5/100 confidence. 2 hops (suspect -> 1 intermediary mule -> deposit); Verified VASP hot-wallet cluster (Binance); 87.5% volume concentration preserved; Verified deposit-to-hot-wallet sweep transaction; Consolidated within 4.2 hours."*

---

## 5. SAHYOG Portal Integration & Human-in-the-Loop Routing (M1, M8)

Lawful requests must **never** be dispatched autonomously without officer oversight. Sutra enforces a strict **Human-in-the-Loop (HITL)** state machine:

```
   ┌──────────────────────────────────────────────────────────┐
   │ 1. INGESTION & TRACE (NCRP / SAHYOG Portal API)          │
   └────────────────────────────┬─────────────────────────────┘
                                ▼
   ┌──────────────────────────────────────────────────────────┐
   │ 2. DRAFT NOTICE GENERATION (Status: PENDING_APPROVAL)    │
   │    Pre-filled with Deposit Address, Tx Hashes, & Section │
   └────────────────────────────┬─────────────────────────────┘
                                ▼
   ┌──────────────────────────────────────────────────────────┐
   │ 3. HUMAN-IN-THE-LOOP INVESTIGATOR REVIEW                 │
   │    IO reviews evidence, enters Officer Name & Badge ID   │
   └───────────────┬──────────────────────────┬───────────────┘
     [REJECT]      │                          │ [APPROVE]
     ▼             │                          ▼
┌──────────────┐   │             ┌─────────────────────────────┐
│ 4a. REJECTED │   │             │ 4b. AUTHORIZED & DISPATCHED │
│ Recorded in  │   │             │ Dispatched to SAHYOG API    │
│ Audit Trail  │   │             │ Stamped with Dispatch Token │
└──────────────┘   │             └─────────────────────────────┘
```

### Statutory Routing Rules:
- **FIU-IND Registered Indian Exchanges (WazirX, CoinDCX, CoinSwitch, ZebPay, Mudrex)**:
  - Formatted under **Section 94 of Bharatiya Nagarik Suraksha Sanhita (BNSS), 2023** (formerly Section 91 CrPC).
  - Directs immediate account freeze, fiat bank account disclosure, and KYC records.
- **Offshore Exchanges (Binance, OKX, Bybit, KuCoin)**:
  - Formatted under **Mutual Legal Assistance Treaty (MLAT) / Budapest Convention** asset preservation guidelines.
- **Privacy Protocols / Mixers**:
  - Automatically flags a Suspicious Transaction Report (STR) under the **Prevention of Money Laundering Act (PMLA), 2002**.

---

## 6. Investigation-Ready LEA Reporting & Section 63 BSA Evidence Seals (M7)

Under Indian law, electronic records are admissible only when accompanied by a certificate establishing system integrity without tampering:

- **Section 63 of Bharatiya Sakshya Adhiniyam (BSA), 2023** *(formerly Section 65B of Indian Evidence Act)*.
- **Section 79A of Information Technology Act, 2000**.

### Cryptographic Evidence Seal:
1. Transaction hashes are normalized and lexicographically sorted.
2. Graph nodes are canonicalized with their risk scores and addresses.
3. A deterministic **SHA-256 hash** is computed across the entire bundle. Any change to any transaction or address triggers an immediate avalanche effect, proving data integrity in court.
4. Generates both machine-readable JSON dockets and court-ready PDF documents:
   - `GET /api/v1/cases/{case_id}/lea-report` (JSON)
   - `GET /api/v1/cases/{case_id}/lea-report/pdf` (Court-ready PDF download)

---

## 7. Automated Test Suite Verification

The automated verification test suite (`backend/tests`) confirms all forensic algorithms:

```
tests/test_adapters.py::test_multi_chain_adapter_registration PASSED     [  7%]
tests/test_adapters.py::test_chain_aliases PASSED                        [ 14%]
tests/test_adapters.py::test_mock_adapter_deterministic_generation PASSED [ 21%]
tests/test_adapters.py::test_intelligence_hub_internal_resolution PASSED [ 28%]
tests/test_attribution.py::test_unhosted_mule_to_exchange_attribution PASSED [ 35%]
tests/test_attribution.py::test_mixer_trace_break_detection PASSED       [ 42%]
tests/test_attribution.py::test_cross_chain_bridge_detection PASSED      [ 50%]
tests/test_attribution.py::test_unknown_vasp_unhosted_fallback PASSED    [ 57%]
tests/test_evidence_report.py::test_section_63_bsa_evidence_hash_determinism PASSED [ 64%]
tests/test_evidence_report.py::test_lea_report_data_assembly PASSED      [ 71%]
tests/test_sahyog.py::test_sahyog_routing_fiu_bnss PASSED                [ 78%]
tests/test_sahyog.py::test_sahyog_routing_offshore_mlat PASSED           [ 85%]
tests/test_sahyog.py::test_sahyog_routing_mixer_fiu_str PASSED           [ 92%]
tests/test_sahyog.py::test_human_in_the_loop_approval_flow PASSED        [100%]

======================= 14 passed in 10.96s =======================
```
