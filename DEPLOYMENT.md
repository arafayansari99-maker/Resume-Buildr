# Deployment Guide: Supabase + Render + Vercel

This guide walks through deploying Resume-Buildr to production using **Render** (backend) and **Vercel** (frontend).

---

## Overview

| Component | Platform | URL | Cost |
|-----------|----------|-----|------|
| Backend (FastAPI) | Render | Set this to your deployed Render service URL | Free tier available |
| Frontend (React) | Vercel | https://resume-buildr.vercel.app | Free tier available |
| Database | Supabase PostgreSQL | Supabase project URL | Free tier available |

---

## Prerequisites

1. **GitHub Account** — Code must be in a public GitHub repo
2. **Render Account** — https://render.com (free tier available)
3. **Vercel Account** — https://vercel.com (free tier available)
4. **Supabase Account** — https://supabase.com (free tier available)
5. **GitHub Personal Access Token** (optional, for private repos)

## Authentication and Data Isolation

The application uses Supabase Auth email/password accounts. Every API request must carry a Supabase access token, and every resume, job, analysis, ranking, and dashboard query is scoped to that authenticated user.

In Supabase, open **Authentication → Providers → Email** and enable email/password sign-in. In Render, add:

```env
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

In the Vercel frontend project, add:

```env
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

Do not use `NEXT_PUBLIC_*` names in this Vite application. Never put the PostgreSQL password or a Supabase service-role key in frontend variables.

## Step 1: Create the Supabase PostgreSQL Database

1. Go to https://supabase.com and create a new project.
2. Open **Project Settings → Database → Connect**.
3. Copy the **Session pooler** connection string for a server-side application.
4. Replace the password placeholder with your database password.
5. Keep `sslmode=require` in the URL.

The connection string has this shape:

```text
postgresql://postgres.<project-ref>:<password>@<region>.pooler.supabase.com:5432/postgres?sslmode=require
```

The API creates the SQLAlchemy tables automatically during startup. Existing rows in the local SQLite database are not copied automatically; export or migrate them before switching production traffic.

Before enabling live traffic, reset any existing shared data once from the API service environment:

```bash
cd artifacts/api-server
CONFIRM_RESET=YES python reset_database.py
```

Run this only once. The reset utility drops and recreates the application tables; it does not affect Supabase Auth users.

---

## Step 2: Deploy Backend on Render

### 2.1 Create Render Web Service

1. Go to https://render.com
2. Sign up or log in
3. Click **New +** → **Web Service**
4. Click **Connect your GitHub account** or **Public Git repository**
5. Search for `Resume-Buildr` and select it
6. Configure:
   - **Name:** `resume-buildr-api` (or your choice)
   - **Root Directory:** `artifacts/api-server`
   - **Runtime:** `Python 3`
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:**
     ```bash
     python -m uvicorn main:app --host 0.0.0.0 --port $PORT
     ```
   - **Instance Type:** `Free`

### 2.2 Add Environment Variables

1. In Render dashboard, go to your service
2. Click **Environment** tab
3. Add the variables from [`artifacts/api-server/.env.render`](artifacts/api-server/.env.render):
   - `PORT=8080`
    - `ALLOWED_ORIGINS=https://resume-buildr-resume-screener.vercel.app` (include any custom or preview frontend domains as needed)
  - `DATABASE_URL=postgresql://postgres.<project-ref>:<password>@<region>.pooler.supabase.com:5432/postgres?sslmode=require`
   - `PYTHONUNBUFFERED=1`

4. Click **Deploy**

### 2.3 Get Your Backend URL

Once deployed, Render will assign a public URL like:
```
https://your-render-service.onrender.com
```

**Save this URL** — you'll need it for the frontend deployment.

---

## Step 3: Deploy Frontend on Vercel

### 3.1 Create Vercel Project

1. Go to https://vercel.com
2. Sign up or log in
3. Click **Add New...** → **Project**
4. Select **Import Git Repository** and choose `Resume-Buildr`
5. Configure:
   - **Project Name:** `resume-buildr` (or your choice)
   - **Framework Preset:** `Vite`
   - **Root Directory:** `artifacts/resume-screener`
   - **Build Command:** `pnpm install && pnpm run build`
   - **Output Directory:** `dist/public`

### 3.2 Add Environment Variables

1. Before deploying, click **Environment Variables**
2. Add variables from [`artifacts/resume-screener/.env.vercel`](artifacts/resume-screener/.env.vercel):
   - `PORT=5173`
   - `BASE_PATH=/`
  - `VITE_API_URL=https://your-render-service.onrender.com` (use the actual Render URL from Step 1.3)

3. Click **Deploy**

### 3.3 Get Your Frontend URL

Once deployed, Vercel will assign a public URL like:
```
https://your-vercel-project.vercel.app
```

---

## Step 4: Update Backend CORS

Now that the frontend is deployed, update the backend to allow it:

### 4.1 Update Render Environment Variables

1. Go back to Render dashboard
2. Edit your service
3. Update `ALLOWED_ORIGINS` to your Vercel URL:
   ```
    https://resume-buildr-resume-screener.vercel.app
   ```
4. Click **Save**
5. Render will automatically redeploy

---

## Accessing Your App

Once both are deployed:
- **Frontend:** https://resume-buildr-resume-screener.vercel.app
- **Backend API:** `https://your-render-service.onrender.com/api`
- **API Docs:** `https://your-render-service.onrender.com/docs` (Swagger UI)

---

## Troubleshooting

### Frontend shows API errors
- Check that `VITE_API_URL` in Vercel points to the correct Render backend
- Verify `ALLOWED_ORIGINS` in Render includes your Vercel URL
- Browser console → Network tab to see failed API calls

### Backend cold start is slow
- Render's free tier sleeps after 15 minutes of inactivity
- First request will take ~30 seconds to wake up
- This is normal for free hosting

### Build fails on Vercel
- Ensure `pnpm install && pnpm run build` completes locally:
  ```bash
  cd artifacts/resume-screener
  pnpm install
  pnpm run build
  ```
- Check that `PORT` and `BASE_PATH` env vars are set

### Build fails on Render
- Ensure Python dependencies install:
  ```bash
  cd artifacts/api-server
  pip install -r requirements.txt
  ```
- Check that FastAPI can start:
  ```bash
  python -m uvicorn main:app --host 0.0.0.0 --port 8080
  ```

---

## Environment Files Reference

### Render Backend
- **File:** `artifacts/api-server/.env.render`
- **Variables:**
  - `PORT` — Server port (set to 8080)
  - `ALLOWED_ORIGINS` — Comma-separated CORS origins
  - `DATABASE_URL` — Supabase PostgreSQL connection string
  - `PYTHONUNBUFFERED` — Python output buffering (set to 1)

### Vercel Frontend
- **File:** `artifacts/resume-screener/.env.vercel`
- **Variables:**
  - `PORT` — Vite dev server port (set to 5173)
  - `BASE_PATH` — App base path (set to /)
  - `VITE_API_URL` — Backend API URL (https://your-render-backend.com)

### Root Reference
- **File:** `.env.example` — All available environment variables

---

## Production Checklist

Before going live, ensure:

- ✅ Backend `ALLOWED_ORIGINS` includes your Vercel URL
- ✅ Render `DATABASE_URL` points to Supabase PostgreSQL
- ✅ Frontend `VITE_API_URL` points to your Render backend
- ✅ Both are accessible without CORS errors
- ✅ Health check passes: `https://backend-url/api/healthz`
- ✅ Frontend loads and can upload resumes
- ✅ Backend logs are clean (no 500 errors)

---

## Costs

| Service | Free Tier | Limits |
|---------|-----------|--------|
| Render | Yes | 1 free Web Service, sleeps after 15 min inactivity |
| Supabase | Yes | PostgreSQL database limits depend on project plan |
| Vercel | Yes | 6 GB bandwidth/month, hobby projects |
| GitHub | Yes | Unlimited public repos |

**Total cost:** $0/month if using free tiers

---

## Next Steps

- Monitor logs in Render and Vercel dashboards
- Set up GitHub Actions for auto-deploy on push (optional)
- Add a custom domain (optional, paid on Vercel/Render)
- Enable error tracking with Sentry (optional)

---

## Support

For issues, check:
1. Render logs: Service → Logs
2. Vercel logs: Deployments → Logs
3. GitHub Issues: https://github.com/arafayansari99-maker/Resume-Buildr/issues
