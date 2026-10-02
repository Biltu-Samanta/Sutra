# SUTRA — Real-Time Blockchain Forensics & Fraud Attribution System

Sutra is an automated, court-admissible blockchain intelligence platform engineered for law enforcement agencies, cybercrime investigators, and VASP compliance officers under the **Bharatiya Nagarik Suraksha Sanhita (BNSS), 2023** and **Bharatiya Sakshya Adhiniyam (BSA), 2023**.

---

## 1. Project Architecture

```
project-root/
├── frontend/              # Vercel root directory (Next.js 15 App Router)
│   ├── app/               # App Router pages (dashboard, trace, case, sahyog, vasp)
│   ├── components/        # SUTRA design system, 2D/3D graph canvases, panels
│   ├── lib/               # Central API client (api.ts), Supabase, types, utils
│   ├── public/            # Static assets and SVGs
│   ├── package.json       # Frontend dependencies & scripts
│   ├── next.config.ts     # Next.js configuration & API proxy rewrites
│   └── .env.example       # Client-side env variables (NEXT_PUBLIC_ only)
├── backend/               # Render root directory (FastAPI, Python 3.11+)
│   ├── app/
│   │   ├── api/           # REST endpoints (trace, cases, vasp, sahyog, fir, etc.)
│   │   ├── core/          # Pydantic settings, Neo4j, Redis, Supabase clients
│   │   ├── engine/        # Multi-hop BFS tracer, adapters (TRON, EVM, Solana, BTC)
│   │   ├── legal/         # Section 94 BNSS notices & Section 63 BSA certificates
│   │   ├── models/        # Pydantic schemas & ML model wrappers
│   │   ├── sahyog/        # MHA I4C gateway integration & schemas
│   │   └── vasp/          # VASP attribution engine & threat intelligence
│   ├── models/            # ML weights (.pkl, .onnx, .pt)
│   ├── tests/             # Pytest test suite
│   ├── requirements.txt   # Pip dependencies
│   ├── Procfile           # Render start process definition
│   └── .env.example       # Backend environment variables template
├── docs/                  # Architecture specifications & deployment manuals
├── _review/               # Stashed prototypes & duplicate files (non-destructive)
├── render.yaml            # Render Blueprint for automated backend deployment
├── .gitignore             # Unified monorepo ignore rules
└── README.md              # Project documentation
```

---

## 2. Deployment Guide

### A. Deploying Backend to Render

1. Log in to [Render](https://render.com/) and click **New > Web Service** (or connect via Blueprint using `render.yaml`).
2. Connect your GitHub repository.
3. Configure the following service settings:
   - **Root Directory**: `backend`
   - **Environment**: `Python 3`
   - **Build Command**: `pip install --upgrade pip && pip install -r requirements.txt`
   - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - **Health Check Path**: `/health`
4. Set the Environment Variables in the Render Dashboard (refer to `backend/.env.example`):
   - `PORT`: Automatically assigned by Render
   - `DATABASE_URL`: PostgreSQL connection string (e.g. Supabase pooler)
   - `SUPABASE_URL`: Supabase project URL
   - `SUPABASE_KEY`: Supabase anon key
   - `SUPABASE_SERVICE_ROLE_KEY`: Supabase service role key
   - `NEO4J_URI`: `neo4j+s://<dbid>.databases.neo4j.io`
   - `NEO4J_USER`: `neo4j`
   - `NEO4J_PASSWORD`: `<your-neo4j-password>`
   - `REDIS_URL`: `rediss://default:<token>@<host>:6379`
   - `GEMINI_API_KEY`: Google Gemini AI key (for FIR parsing)
   - `TRONGRID_KEY`: TronGrid API key (for TRON RPC traces)
   - `CORS_ORIGINS`: Your Vercel frontend domain (e.g. `https://sutra.vercel.app`)

---

### B. Deploying Frontend to Vercel

1. Log in to [Vercel](https://vercel.com/) and click **Add New > Project**.
2. Select your GitHub repository.
3. Configure the Project Settings:
   - **Root Directory**: Click *Edit* and select `frontend`
   - **Framework Preset**: `Next.js`
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next` (default)
4. Add the Environment Variables:
   - `NEXT_PUBLIC_API_URL`: Your live Render backend API URL (e.g. `https://sutra-backend.onrender.com/api/v1`)
   - `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase public anon key
   - `NEXT_PUBLIC_USE_MOCK_DATA`: `false`

---

## 3. Local Development

### Prerequisites
- Python 3.11+
- Node.js 18+ & npm
- Neo4j Database (local or Aura Cloud)
- Redis (local or Upstash)

### 1. Start Backend
```bash
cd backend
python -m venv venv
# On Windows:
.\venv\Scripts\activate
# On Linux/macOS:
source venv/bin/activate

pip install -r requirements.txt
cp .env.example .env
# Fill in your database and API keys in .env
python -m app.main
```
Backend runs on `http://localhost:8000` (docs at `http://localhost:8000/docs`, health check at `http://localhost:8000/health`).

### 2. Start Frontend
```bash
cd frontend
npm install
npm run dev
```
Frontend runs on `http://localhost:3000`.

---

## 4. Running Backend Tests

```bash
cd backend
pytest tests/ -v
```
