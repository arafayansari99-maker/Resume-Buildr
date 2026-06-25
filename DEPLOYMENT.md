# Deployment Guide: Render + Vercel

This guide walks through deploying Resume-Buildr to production using **Render** (backend) and **Vercel** (frontend).

---

## Overview

| Component | Platform | URL | Cost |
|-----------|----------|-----|------|
| Backend (FastAPI) | Render | https://resume-buildr-api.onrender.com | Free tier available |
| Frontend (React) | Vercel | https://resume-buildr.vercel.app | Free tier available |
| Database | SQLite (on Render) | N/A | Included |

---

## Prerequisites

1. **GitHub Account** — Code must be in a public GitHub repo
2. **Render Account** — https://render.com (free tier available)
3. **Vercel Account** — https://vercel.com (free tier available)
4. **GitHub Personal Access Token** (optional, for private repos)

---

## Step 1: Deploy Backend on Render

### 1.1 Create Render Web Service

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

### 1.2 Add Environment Variables

1. In Render dashboard, go to your service
2. Click **Environment** tab
3. Add the variables from [`artifacts/api-server/.env.render`](artifacts/api-server/.env.render):
   - `PORT=8080`
   - `ALLOWED_ORIGINS=https://resume-buildr.vercel.app` (update with your Vercel URL once deployed)
   - `PYTHONUNBUFFERED=1`

4. Click **Deploy**

### 1.3 Get Your Backend URL

Once deployed, Render will assign a public URL like:
```
https://resume-buildr-api.onrender.com
```

**Save this URL** — you'll need it for the frontend deployment.

---

## Step 2: Deploy Frontend on Vercel

### 2.1 Create Vercel Project

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

### 2.2 Add Environment Variables

1. Before deploying, click **Environment Variables**
2. Add variables from [`artifacts/resume-screener/.env.vercel`](artifacts/resume-screener/.env.vercel):
   - `PORT=5173`
   - `BASE_PATH=/`
   - `VITE_API_URL=https://resume-buildr-api.onrender.com` (use your Render URL from Step 1.3)

3. Click **Deploy**

### 2.3 Get Your Frontend URL

Once deployed, Vercel will assign a public URL like:
```
https://resume-buildr.vercel.app
```

---

## Step 3: Update Backend CORS

Now that the frontend is deployed, update the backend to allow it:

### 3.1 Update Render Environment Variables

1. Go back to Render dashboard
2. Edit your service
3. Update `ALLOWED_ORIGINS` to your Vercel URL:
   ```
   https://resume-buildr.vercel.app
   ```
4. Click **Save**
5. Render will automatically redeploy

---

## Accessing Your App

Once both are deployed:
- **Frontend:** https://resume-buildr.vercel.app
- **Backend API:** https://resume-buildr-api.onrender.com/api
- **API Docs:** https://resume-buildr-api.onrender.com/docs (Swagger UI)

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
