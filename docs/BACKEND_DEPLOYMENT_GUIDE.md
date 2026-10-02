# 🚀 Sutra Backend — Production Deployment & Cloud Infrastructure Guide

A comprehensive, step-by-step guide to provisioning cloud databases, authenticating users, setting up third-party APIs, and deploying the **Sutra** FastAPI backend to production.

---

## 📋 Table of Contents
1. [Architecture & Services Overview](#1-architecture--services-overview)
2. [Pre-Deployment Checklist](#2-pre-deployment-checklist)
3. [Step 1: Setting Up Supabase (Database & Auth)](#3-step-1-setting-up-supabase-database--auth)
4. [Step 2: Setting Up Neo4j AuraDB (Graph Database)](#4-step-2-setting-up-neo4j-auradb-graph-database)
5. [Step 3: Setting Up Redis (Upstash Serverless Cache)](#5-step-3-setting-up-redis-upstash-serverless-cache)
6. [Step 4: Obtaining Blockchain & AI API Keys](#6-step-4-obtaining-blockchain--ai-api-keys)
7. [Step 5: Environment Variables Reference (.env)](#7-step-5-environment-variables-reference-env)
8. [Step 6: Deploying to Production (Render / Docker / Railway)](#8-step-6-deploying-to-production-render--docker--railway)
9. [Step 7: Connecting Frontend & Backend](#9-step-7-connecting-frontend--backend)
10. [Step 8: Post-Deployment Smoke Testing & Verification](#10-step-8-post-deployment-smoke-testing--verification)

---

## 1. Architecture & Services Overview

Sutra relies on three specialized cloud data stores and external APIs:

```mermaid
graph TD
    Client[Next.js Frontend / IO Terminal] -->|JWT / HTTPS| API[FastAPI Backend / Uvicorn]
    API -->|Relational Data & Auth| Supabase[(Supabase PostgreSQL + Auth)]
    API -->|Multi-Hop Graph Analytics| Neo4j[(Neo4j AuraDB Graph Engine)]
    API -->|Hop & RPC Cache| Redis[(Upstash / Redis Cloud)]
    API -->|Blockchain Traversal| RPC[TronGrid / Alchemy / Solana / Mempool]
    API -->|Complaint Parsing & Reports| GenAI[Google Gemini 3.6 Flash]
```

| Component | Technology | Recommended Provider | Purpose |
|---|---|---|---|
| **Web Service** | FastAPI + Uvicorn (Python 3.12) | Render / Railway / Docker / AWS | Main REST & Forensic API |
| **Relational DB & Auth** | PostgreSQL + Supabase Auth | [Supabase](https://supabase.com) (Free Tier available) | Cases, FIR records, officer profiles, certificates |
| **Graph Database** | Cypher / Graph Database | [Neo4j AuraDB](https://neo4j.com/cloud/platform/aura-graph-database/) (Free Tier available) | Multi-hop BFS traversal, wallet clusters |
| **Fast In-Memory Cache** | Redis 7+ / Serverless REST | [Upstash Redis](https://upstash.com) or Redis Cloud | Cache RPC transaction calls and rate limits |
| **AI Extraction & Narrative** | Google GenAI SDK | [Google AI Studio](https://aistudio.google.com/) | Extract structured entities from complaints & generate legal dossiers |
| **Blockchain RPCs** | JSON-RPC / REST APIs | TronGrid, Alchemy, Mempool.space | Live on-chain transaction indexing |

---

## 2. Pre-Deployment Checklist

Before deploying, ensure you have signed up for:
- [ ] **GitHub Account** (repository hosting)
- [ ] **Supabase Account** (Database & JWT Auth)
- [ ] **Neo4j Aura Account** (Graph database)
- [ ] **Upstash Account** or Redis Cloud account
- [ ] **Google AI Studio Account** (Gemini API Key)
- [ ] **TronGrid Account** (TRON API Key)
- [ ] **Render.com / Railway / Cloud Provider Account**

---

## 3. Step 1: Setting Up Supabase (Database & Auth)

### 3.1 Create a New Project
1. Log in to [Supabase](https://supabase.com) and click **"New Project"**.
2. Select your organization and enter:
   - **Name**: `sutra-production` (or `sutra-db`)
   - **Database Password**: Generate a secure password and save it in a safe place.
   - **Region**: Choose the region closest to your backend hosting (e.g., `AWS ap-south-1 Mumbai` or `us-east-1`).
3. Click **"Create new project"** (takes ~2 minutes to provision).

### 3.2 Execute the Database Schema
1. In your Supabase dashboard, navigate to the **SQL Editor** tab (left sidebar icon `>_`).
2. Click **"New query"**.
3. Open `backend/supabase_schema.sql` from your project repository, copy its entire content, and paste it into the SQL editor:
   ```sql
   -- 1. Custom Law Enforcement Wallet Labels
   CREATE TABLE IF NOT EXISTS public.custom_wallet_labels ( ... );
   -- 2. Investigation Cases & Forensic Metadata Table
   CREATE TABLE IF NOT EXISTS public.cases ( ... );
   -- 3. Cryptographic Evidence Certificates
   CREATE TABLE IF NOT EXISTS public.evidence_certificates ( ... );
   -- 4. Enable Row Level Security (RLS) & Policies
   ...
   ```
4. Click **Run** (or `Ctrl + Enter`). Verify that the tables appear under the **Table Editor** (`custom_wallet_labels`, `cases`, `evidence_certificates`).

### 3.3 Configure Authentication & Officer Metadata
1. Go to **Authentication > Providers > Email**:
   - Ensure **"Enable Email provider"** is checked.
   - For frictionless testing or deployment, you can disable **"Confirm email"** temporarily so newly registered police officers can immediately sign in.
2. In **Project Settings > API**:
   - Copy **Project URL** (`https://<project-ref>.supabase.co`) -> `SUPABASE_URL`
   - Copy **anon public** key -> `SUPABASE_KEY`
   - Copy **service_role secret** key -> `SUPABASE_SERVICE_ROLE_KEY` (Keep this secret; only give to the backend!)
3. In **Project Settings > Database**:
   - Under **Connection string > URI (Session or Transaction pooler)**:
     - Copy the URI -> `DATABASE_URL`

---

## 4. Step 2: Setting Up Neo4j AuraDB (Graph Database)

Sutra uses Neo4j to store wallet node graphs, trace peeling chains, and run Cypher queries.

1. Go to [Neo4j Aura](https://neo4j.com/cloud/platform/aura-graph-database/).
2. Sign in and click **"New Instance"**.
3. Select **AuraDB Free** (Instance type: `Free`).
4. Give it a name: `sutra-graph`.
5. **CRITICAL**: An administrator password will be displayed only once. **Download the credentials file (.env or .txt)**.
6. Once the instance status turns **Running**, copy:
   - **Connection URI**: usually format `neo4j+s://<instance-id>.databases.neo4j.io`
   - **Username**: `neo4j`
   - **Password**: The password downloaded earlier.
7. Set these in your environment:
   ```env
   NEO4J_URI=neo4j+s://<your-instance-id>.databases.neo4j.io
   NEO4J_USER=neo4j
   NEO4J_PASSWORD=your_saved_password
   ```
*(Note: Schema indexes and constraints are automatically initialized by the backend on startup via `app.core.database.ensure_schema()`.)*

---

## 5. Step 3: Setting Up Redis (Upstash Serverless Cache)

Redis prevents API rate limits by caching blockchain block exploration and transactions.

### Option A: Upstash Serverless Redis (Recommended - Zero Maintenance)
1. Go to [Upstash Console](https://console.upstash.com/).
2. Click **"Create Database"**:
   - Name: `sutra-cache`
   - Region: Select closest to your backend hosting
   - Type: Regional
3. After creation, scroll down to the **REST API** section and copy:
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`
   - Or standard Redis URI: `REDIS_URL=rediss://default:<password>@<endpoint>:6379`

### Option B: Redis Cloud / Self-hosted
If using standard Redis:
```env
REDIS_URL=redis://default:<password>@<redis-host>:6379/0
```

---

## 6. Step 4: Obtaining Blockchain & AI API Keys

### 6.1 TronGrid (Required for TRON / USDT Tracing)
TRON accounts for the majority of cyber scam USDT peel transactions.
1. Sign up at [TronGrid](https://www.trongrid.io/).
2. Create an API Key in the dashboard.
3. Add to `.env`:
   ```env
   TRONGRID_KEY=your_trongrid_api_key_here
   ```

### 6.2 Google Gemini API (Required for Complaint Parser & AI Report)
1. Visit [Google AI Studio](https://aistudio.google.com/).
2. Click **"Get API key"** and create a key in your Google Cloud project.
3. Add to `.env`:
   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   GEMINI_MODEL=gemini-3.6-flash
   ```

### 6.3 Ethereum & Multi-Chain RPCs (Optional/Recommended)
- **Ethereum**: Sign up at [Alchemy](https://www.alchemy.com/) or [Infura](https://infura.io/) and get an Ethereum Mainnet RPC URL (`ETH_RPC_URL`).
- **Solana**: Default public RPC is configured (`https://api.mainnet-beta.solana.com`), or obtain a dedicated endpoint from QuickNode / Helius.
- **Bitcoin**: Default public Mempool API is configured (`https://mempool.space/api`).

---

## 7. Step 5: Environment Variables Reference (.env)

Below is the complete production `.env` configuration file:

```bash
# ── Application Configuration ────────────────────────────────────────────────
APP_NAME=Sutra
APP_VERSION=0.1.0
DEBUG=false
PORT=8000

# ── Allowed CORS Origins (Include frontend URLs) ──────────────────────────────
CORS_ORIGINS=http://localhost:3000,https://sutra-frontend.vercel.app,https://your-custom-domain.com

# ── Authentication & Security ────────────────────────────────────────────────
AUTH_ENABLED=true

# ── Supabase (Relational Database & Auth) ─────────────────────────────────────
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here
DATABASE_URL=postgresql://postgres.your-project-id:[YOUR-PASSWORD]@aws-0-ap-south-1.pooler.supabase.com:6543/postgres

# ── Neo4j Graph Database (AuraDB) ─────────────────────────────────────────────
NEO4J_URI=neo4j+s://your-instance.databases.neo4j.io
NEO4J_USER=neo4j
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=your_neo4j_password_here

# ── Redis In-Memory Cache (Upstash) ──────────────────────────────────────────
UPSTASH_REDIS_REST_URL=https://your-upstash-instance.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_upstash_redis_token_here
REDIS_URL=rediss://default:your_upstash_redis_token_here@your-upstash-instance.upstash.io:6379

# ── AI / LLM (Google Gemini) ──────────────────────────────────────────────────
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-3.6-flash

# ── Blockchain RPCs ───────────────────────────────────────────────────────────
TRONGRID_KEY=your_trongrid_api_key_here
ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/your_alchemy_key_here
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
# ── Optional Commercial Threat Intelligence ──────────────────────────────────
TRM_API_KEY=
CHAINALYSIS_API_KEY=
ELLIPTIC_API_KEY=
```

---

## 8. Step 6: Deploying to Production (Render / Docker / Railway)

### Option 1: Deploy on Render.com (Recommended)
1. Push your code to your GitHub repository:
   ```bash
   git add .
   git commit -m "Configure Sutra production release"
   git push origin main
   ```
2. Log in to [Render](https://render.com) and click **"New +" > "Web Service"**.
3. Connect your GitHub repository (`backend`).
4. Select deployment mode:
   - **Environment**: **Docker** (Uses the optimized [Dockerfile](file:///c:/Users/User/Documents/SIH26182/backend/Dockerfile))
   - **Branch**: `main`
   - **Region**: Closest to your database (e.g., Singapore or Frankfurt/Oregon)
   - **Instance Type**: Starter / Standard (Minimum 512 MB RAM, recommended 1 GB+ RAM for Graph analytics)
5. Under **Advanced > Environment Variables**, add all environment variables listed in [Section 7](#7-step-5-environment-variables-reference-env).
6. Under **Health Check Path**, enter:
   ```text
   /health
   ```
7. Click **"Create Web Service"**. Render will automatically build the container and provide your live URL:
   `https://sutra-backend.onrender.com`

---

### Option 2: Run with Docker Compose (VPS / AWS EC2 / DigitalOcean)
If deploying to an Ubuntu/Debian Linux Server:

1. SSH into your server:
   ```bash
   ssh root@your-server-ip
   ```
2. Install Docker & Docker Compose:
   ```bash
   apt-get update && apt-get install -y docker.io docker-compose git
   ```
3. Clone the repository and configure `.env`:
   ```bash
   git clone https://github.com/AnjelaGit-26/backend.git
   cd backend
   cp .env.example .env
   nano .env # Enter production keys
   ```
4. Start the service:
   ```bash
   docker-compose up -d --build
   ```
5. Check logs:
   ```bash
   docker-compose logs -f
   ```

---

## 9. Step 7: Connecting Frontend & Backend

Once your backend is deployed at (for example) `https://sutra-backend.onrender.com`:

1. Update your frontend environment variables in [frontend/.env.local](file:///c:/Users/User/Documents/SIH26182/frontend/.env.local):
   ```env
   NEXT_PUBLIC_API_URL=https://sutra-backend.onrender.com/api/v1
   NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxxxxxxxxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   NEXT_PUBLIC_USE_MOCK_DATA=false
   ```
2. In `backend`, verify that `CORS_ORIGINS` includes your frontend domain:
   ```env
   CORS_ORIGINS=http://localhost:3000,https://your-frontend-deployment.vercel.app
   ```

---

## 10. Step 8: Post-Deployment Smoke Testing & Verification

Once deployed, verify the endpoints using `curl` or Postman:

### 1. Health & Database Readiness Check
```bash
curl -X GET https://sutra-backend.onrender.com/health
```
**Expected Response:**
```json
{
  "status": "healthy",
  "app": "Sutra",
  "version": "0.1.0",
  "neo4j": "connected",
  "redis": "connected",
  "supabase": "connected"
}
```

### 2. Swagger / OpenAPI Documentation
Open in your browser:
👉 `https://sutra-backend.onrender.com/docs`
You should see the interactive API testing interface with all forensic endpoints (`/trace`, `/cases`, `/vasp`, `/notice`, `/fir`).

### 3. Test Full Trace Execution
```bash
curl -X POST https://sutra-backend.onrender.com/api/v1/trace/ \
  -H "Content-Type: application/json" \
  -d '{
    "suspect_address": "TABC1234567890XYZ99887766554433",
    "chain": "tron",
    "max_hops": 3,
    "value_threshold_pct": 2.0
  }'
```

---

## 🛡️ Security Best Practices for Production
1. **Never commit `.env` files**: Keep `.env` in `.gitignore`.
2. **Keep `SUPABASE_SERVICE_ROLE_KEY` Secret**: Only the backend should know this key; never expose it to client-side code.
3. **Enable `AUTH_ENABLED=true`**: In production, ensure token verification is strictly enabled so unauthenticated users cannot invoke graph operations.
4. **Use HTTPS / TLS**: Render and Vercel automatically provision TLS certificates. Never send bearer tokens over plaintext HTTP.
