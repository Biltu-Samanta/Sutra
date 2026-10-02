# Complete Step-by-Step Deployment Guide: Render (Backend) & Vercel (Frontend)

This guide walks you through deploying the **SUTRA** platform from your Git repository:
- **Backend (FastAPI, Python 3.11+, ML Models)** ➔ **Render Web Service**
- **Frontend (Next.js 15, App Router, TypeScript, Tailwind)** ➔ **Vercel**

---

## Architecture Overview

```
                      ┌──────────────────────────────────────┐
                      │           USER BROWSER               │
                      └──────────────────┬───────────────────┘
                                         │
                         HTTPS Requests  │
                                         ▼
                 ┌────────────────────────────────────────────────┐
                 │             VERCEL (FRONTEND)                  │
                 │   Next.js 15 App Router (SUTRA Design)         │
                 │   Root Dir: frontend                           │
                 │   Domain: https://sutra-frontend.vercel.app    │
                 └───────────────────────┬────────────────────────┘
                                         │
                         API Calls       │  (NEXT_PUBLIC_API_URL)
                                         ▼
                 ┌────────────────────────────────────────────────┐
                 │             RENDER (BACKEND)                   │
                 │   FastAPI + Uvicorn ASGI Server                │
                 │   Root Dir: backend                            │
                 │   Domain: https://sutra-backend.onrender.com   │
                 └───────┬───────────────┬────────────────┬───────┘
                         │               │                │
                         ▼               ▼                ▼
                  ┌─────────────┐ ┌─────────────┐  ┌─────────────┐
                  │ Neo4j Aura  │ │  Supabase   │  │   Upstash   │
                  │ Graph DB    │ │  PostgreSQL │  │    Redis    │
                  └─────────────┘ └─────────────┘  └─────────────┘
```

---

## Phase 1: Push Code to GitHub

Make sure your repository is committed and pushed to GitHub:

```bash
git add .
git commit -m "chore: ready for Vercel and Render deployment"
git branch -M main
# If you haven't linked your GitHub remote yet:
# git remote add origin https://github.com/<YOUR-USERNAME>/<YOUR-REPO-NAME>.git
git push -u origin main
```

---

## Phase 2: Deploy Backend to Render

### Option A: Using the Render Blueprint (`render.yaml`) — Recommended
1. Log in to [dashboard.render.com](https://dashboard.render.com/).
2. Click **New +** ➔ **Blueprint**.
3. Select your GitHub repository.
4. Render will automatically detect [`render.yaml`](file:///c:/Users/User/Documents/SIH26182/render.yaml) at the root and prefill:
   - Service name: `sutra-backend`
   - Root directory: `backend`
   - Build command: `pip install --upgrade pip && pip install -r requirements.txt`
   - Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - Health check: `/health`
5. Fill in the required environment variables (see table below) and click **Apply**.

---

### Option B: Manual Web Service Setup on Render
1. Go to [dashboard.render.com](https://dashboard.render.com/).
2. Click **New +** ➔ **Web Service**.
3. Choose **Build and deploy from a Git repository** and connect your repository.
4. Fill in the following exact settings:

| Setting | Value |
| :--- | :--- |
| **Name** | `sutra-backend` |
| **Region** | Choose nearest (e.g. `Singapore` or `Frankfurt`) |
| **Branch** | `main` |
| **Root Directory** | `backend` *(CRITICAL: must be set to `backend`)* |
| **Runtime** | `Python 3` |
| **Build Command** | `pip install --upgrade pip && pip install -r requirements.txt` |
| **Start Command** | `uvicorn app.main:app --host 0.0.0.0 --port $PORT` |
| **Instance Type** | Free or Starter ($7/mo) |

5. Under **Advanced** ➔ **Health Check Path**:
   - Set to: `/health`

6. Under **Environment Variables**, click **Add Environment Variable** for each:

| Key | Value / Instructions |
| :--- | :--- |
| `PORT` | `10000` *(Render sets this automatically, but good to have)* |
| `DATABASE_URL` | `postgresql://postgres.your-project-id:[YOUR-PASSWORD]@aws-0-ap-south-1.pooler.supabase.com:6543/postgres` |
| `SUPABASE_URL` | `https://your-project-id.supabase.co` |
| `SUPABASE_KEY` | `your_supabase_anon_key_here` |
| `SUPABASE_SERVICE_ROLE_KEY` | `your_supabase_service_role_key_here` |
| `NEO4J_URI` | `neo4j+s://your-instance.databases.neo4j.io` |
| `NEO4J_USER` | `neo4j` |
| `NEO4J_PASSWORD` | `your_neo4j_password_here` |
| `REDIS_URL` | `rediss://default:your-token@your-host.upstash.io:6379` |
| `GEMINI_API_KEY` | *(Your Google Gemini API Key from Google AI Studio)* |
| `GEMINI_MODEL` | `gemini-3.6-flash` |
| `TRONGRID_KEY` | *(Your TronGrid API key, or leave blank to use public nodes)* |
| `CORS_ORIGINS` | `http://localhost:3000,https://*.vercel.app` |
| `APP_NAME` | `Sutra` |
| `APP_VERSION` | `0.1.0` |
| `DEBUG` | `false` |

7. Click **Create Web Service**.
8. Wait 2–4 minutes for the build to finish. Once deployed, note down your live backend URL:
   `https://sutra-backend.onrender.com`

9. Test the backend in your browser:
   - `https://sutra-backend.onrender.com/health` ➔ should return `{"status":"ok","app":"Sutra","version":"0.1.0"}`
   - `https://sutra-backend.onrender.com/docs` ➔ interactive Swagger documentation.

---

## Phase 3: Deploy Frontend to Vercel

1. Log in to [vercel.com](https://vercel.com/).
2. Click **Add New...** ➔ **Project**.
3. Import your GitHub repository.
4. In the **Configure Project** screen:

| Setting | Value / Action |
| :--- | :--- |
| **Project Name** | `sutra-frontend` (or your choice) |
| **Framework Preset** | `Next.js` *(auto-detected)* |
| **Root Directory** | Click **Edit** ➔ select `frontend` *(CRITICAL)* |
| **Build Command** | `npm run build` *(default)* |
| **Output Directory** | `.next` *(default)* |
| **Install Command** | `npm install` *(default)* |

5. Expand the **Environment Variables** section and add:

| Key | Value | Description |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_API_URL` | `https://sutra-backend.onrender.com/api/v1` | **Point to your live Render backend URL from Phase 2** |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://dqvwereggdkjgjpsolft.supabase.co` | Supabase Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` | Supabase Public Anon Key |
| `NEXT_PUBLIC_USE_MOCK_DATA` | `false` | Live forensic analysis mode |

6. Click **Deploy**.
7. Vercel will build the Next.js application in ~60 seconds.
8. Once complete, you will receive your live domain, e.g.:
   `https://sutra-frontend.vercel.app`

---

## Phase 4: Final Handshake (CORS Connection)

1. Copy your live Vercel URL (e.g. `https://sutra-frontend.vercel.app`).
2. Go back to your [Render Dashboard](https://dashboard.render.com/) ➔ select `sutra-backend` ➔ **Environment**.
3. Update `CORS_ORIGINS` to include your exact Vercel domain:
   ```env
   CORS_ORIGINS=http://localhost:3000,https://sutra-frontend.vercel.app,https://*.vercel.app
   ```
4. Click **Save Changes**. Render will automatically trigger a zero-downtime redeploy with the new allowed origin.

---

## Phase 5: Verification Checklist

| Test Item | Verification Steps | Expected Result |
| :--- | :--- | :--- |
| **Backend Health** | Open `https://<render-url>/health` | Status 200: `{"status":"ok"}` |
| **Swagger Docs** | Open `https://<render-url>/docs` | Swagger interactive API interface loads |
| **Frontend Home** | Open `https://<vercel-url>/dashboard` | SUTRA Dashboard loads with DM Sans fonts & metrics |
| **New Investigation** | Open `https://<vercel-url>/trace/new` | 6-chain architectural grid renders cleanly |
| **Live Trace** | Submit TRON address `TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t` | Graph topology renders with 2D/3D controls |
| **SAHYOG Gateway** | Open `https://<vercel-url>/sahyog` | Directives queue loads and connects to backend |
| **VASP Intelligence** | Open `https://<vercel-url>/vasp` | Directory loads FIU-IND reporting entities |
| **PDF Downloads** | Click *Download LEA PDF* on any case | Generates official Section 94 BNSS stamped document |

---

## Common Troubleshooting & Tips

### 1. Render Free Tier "Spin-Down" (Cold Start)
- **Symptom**: First request after 15 minutes of inactivity takes 30–50 seconds.
- **Solution**: This is normal for Render free tier web services. Once awake, response times return to ~50–150ms.
- **Tip**: You can set up a free uptime monitor (e.g. UptimeRobot or Cron-job.org) hitting `https://<render-url>/health` every 10 minutes to keep it warm.

### 2. CORS Errors in Browser Console
- **Symptom**: `Access to fetch at ... from origin ... has been blocked by CORS policy`.
- **Solution**: Check that `CORS_ORIGINS` on Render includes your exact Vercel frontend URL, including `https://` with no trailing slash.

### 3. Next.js API Proxy / Rewrites
- The frontend [`next.config.ts`](file:///c:/Users/User/Documents/SIH26182/frontend/next.config.ts) automatically proxies calls matching `/api/v1/:path*` to the destination defined in `NEXT_PUBLIC_API_URL`. This eliminates CORS issues for same-origin requests.

### 4. Supabase Database Schema
- If deploying to a fresh Supabase project, execute the SQL schema from [`backend/supabase_schema.sql`](file:///c:/Users/User/Documents/SIH26182/backend/supabase_schema.sql) in your Supabase SQL Editor to provision the required tables (`cases`, `wallet_nodes`, `transfer_edges`, `sahyog_requests`, `audit_logs`).
