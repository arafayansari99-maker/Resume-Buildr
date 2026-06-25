# Resume-Buildr

An **AI-powered ATS (Applicant Tracking System)** that analyzes resumes against job descriptions, generates explainable compatibility scores, and ranks multiple candidates using advanced NLP and ML techniques.

**Live Demo:** [Resume-Buildr on Vercel + Render](#deployment)

---

## 🎯 Project Summary

Resume-Buildr is a full-stack application built for recruiters and hiring managers to:
- **Upload PDF resumes** and automatically extract text + skills
- **Define job descriptions** with auto-extracted required skills
- **Analyze compatibility** — single resume vs. job with explainable ATS score
- **Rank candidates** — leaderboard view with scores and skill gaps
- **Dashboard** — stats, score distribution, top missing skills, recent analyses

This project demonstrates **real-world ML integration, API design, and full-stack architecture** with a focus on **explainability, security, and production-readiness**.

---

## ✨ Key Features

✅ **Resume Parsing** — PDF text extraction + automatic skill identification  
✅ **Semantic Matching** — Uses sentence-transformers (all-MiniLM-L6-v2) + FAISS for deep semantic similarity  
✅ **Explainable Scoring** — ATS score breakdown: 40% skill match + 30% semantic + 20% experience + 10% education  
✅ **Multi-Candidate Ranking** — Leaderboard with filterable scores and skill gaps  
✅ **Job Scraping** — Import job descriptions from URLs (LinkedIn, Indeed, etc.)  
✅ **Secure API** — CORS, input validation, SQL injection prevention, rate limiting ready  
✅ **Mobile Responsive** — Fully responsive React UI with Tailwind CSS  
✅ **Dashboard Analytics** — Score distribution charts, missing skills heatmap  

---

## 🏗️ Tech Stack

### Frontend
- **Framework:** React 19 + Vite
- **Styling:** Tailwind CSS + shadcn/ui
- **State Management:** React Query (TanStack Query)
- **Routing:** Wouter
- **Data Visualization:** Recharts
- **Form Handling:** React Hook Form
- **Export:** jsPDF for PDF downloads
- **Type Safety:** TypeScript + Zod schemas (generated from OpenAPI)

### Backend
- **Runtime:** Python 3.12 + FastAPI
- **Server:** Uvicorn
- **Database:** SQLite + SQLAlchemy ORM
- **PDF Processing:** pdfplumber
- **NLP/ML:**
  - `sentence-transformers` — semantic embeddings
  - `FAISS` — vector similarity search
  - `scikit-learn` — TF-IDF fallback + skill extraction
  - `transformers` — pre-trained model loading
- **Web Scraping:** BeautifulSoup4 + trafilatura
- **API Validation:** Pydantic

### DevOps & Tools
- **Monorepo:** pnpm workspaces
- **Build:** esbuild, Vite
- **API Spec:** OpenAPI 3.0 + Orval codegen
- **Type Generation:** Orval (React Query hooks + Zod)
- **Security Scanning:** bandit (Python), pnpm audit (Node)

---

## 📊 Product Requirements

### Core MVP
1. ✅ Upload and parse PDF resumes
2. ✅ Define job descriptions manually or via URL import
3. ✅ Analyze single resume vs. job with ATS score
4. ✅ Rank multiple candidates
5. ✅ Dashboard with analytics

### Security & Production
- ✅ Input validation + SQL injection prevention
- ✅ CORS configured by environment
- ✅ Error handling (no internal error leakage)
- ✅ Secure file upload (PDF only, size validated)
- ✅ Database initialization on startup
- ✅ Dependency vulnerability scanning

### Future Enhancements
- Rate limiting middleware
- Persistent user sessions (if adding auth)
- Batch resume analysis
- Resume template recommendations
- Interview question generation

---

## 🚀 Quick Start

### Prerequisites
- Node.js 24+, `pnpm`
- Python 3.12+, `pip`
- Git

### Local Development

1. **Clone the repo**
   ```bash
   git clone https://github.com/arafayansari99-maker/Resume-Buildr.git
   cd Resume-Buildr
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   cd artifacts/api-server && pip install -r requirements.txt && cd ../..
   ```

3. **Start Backend** (PowerShell or Terminal)
   ```bash
   cd artifacts/api-server
   python -m uvicorn main:app --host 0.0.0.0 --port 8080 --reload
   ```

4. **Start Frontend** (new terminal)
   ```bash
   cd artifacts/resume-screener
   $env:PORT = 5173
   $env:BASE_PATH = "/"
   pnpm run dev
   ```

5. **Open browser**
   ```
   http://localhost:5173
   ```

---

## 📁 Project Structure

```
Resume-Buildr/
├── artifacts/
│   ├── api-server/              # Python FastAPI backend
│   │   ├── main.py              # Routes & app config
│   │   ├── nlp_engine.py        # ML scoring logic
│   │   ├── database.py          # SQLAlchemy models
│   │   ├── job_scraper.py       # URL job import
│   │   ├── requirements.txt     # Python dependencies
│   │   └── start.sh             # Dev startup script
│   └── resume-screener/         # React Vite frontend
│       ├── src/
│       │   ├── pages/           # Route pages
│       │   ├── components/      # Reusable UI
│       │   └── hooks/           # Custom React hooks
│       ├── vite.config.ts
│       └── package.json
├── lib/
│   ├── api-spec/                # OpenAPI spec (single source of truth)
│   ├── api-client-react/        # Generated React Query hooks
│   └── api-zod/                 # Generated Zod schemas
├── pnpm-workspace.yaml          # Monorepo config
├── package.json                 # Root scripts
└── README.md
```

---

## 🔗 API Endpoints

All endpoints are under `/api/`.

### Resumes
- `POST /api/resumes/upload` — Upload PDF resume
- `GET /api/resumes` — List all resumes
- `GET /api/resumes/{id}` — Get single resume
- `DELETE /api/resumes/{id}` — Delete resume

### Jobs
- `POST /api/jobs` — Create job manually
- `POST /api/jobs/import-url` — Import job from URL
- `GET /api/jobs` — List all jobs
- `GET /api/jobs/{id}` — Get single job

### Analysis
- `POST /api/analysis/analyze` — Analyze resume vs. job
- `GET /api/analysis/results` — List all analyses
- `GET /api/analysis/results/{id}` — Get analysis detail
- `GET /api/analysis/rankings` — Rank candidates
- `GET /api/analysis/dashboard-stats` — Dashboard metrics

### Health
- `GET /api/healthz` — Health check

---

## 📈 ATS Scoring Formula

```
Final Score = (0.40 × Skill Match) 
            + (0.30 × Semantic Similarity) 
            + (0.20 × Experience Match) 
            + (0.10 × Education Match)
```

- **Skill Match:** Jaccard similarity of extracted skills
- **Semantic Similarity:** Cosine similarity using sentence-transformers embeddings
- **Experience Match:** Years parsed from resume vs. job requirement
- **Education Match:** Degree level match (bachelors, masters, etc.)

---

## 🔒 Security Features

- ✅ **Input Validation** — Pydantic models enforce schema
- ✅ **SQL Injection Prevention** — SQLAlchemy ORM parameterized queries
- ✅ **File Upload Security** — PDF only, max 10MB, type checked
- ✅ **CORS** — Configurable via `ALLOWED_ORIGINS` env var
- ✅ **Error Handling** — No internal error details leaked to client
- ✅ **Dependency Audits** — `pnpm audit` + `pip-audit` scans
- ✅ **Linting** — Bandit (Python) for security warnings

---

## 🌐 Deployment

### Live URLs
- **Frontend:** https://resume-buildr.vercel.app (Vercel)
- **Backend:** https://resume-buildr-api.onrender.com (Render)

### Deploy on Render (Backend)

1. Push code to GitHub
2. Create Render account → New Web Service
3. Connect GitHub repo, set root to `artifacts/api-server`
4. Build: `pip install -r requirements.txt`
5. Start: `python -m uvicorn main:app --host 0.0.0.0 --port $PORT`
6. Add env var: `ALLOWED_ORIGINS=https://resume-buildr.vercel.app`

### Deploy on Vercel (Frontend)

1. Create Vercel account → Import GitHub repo
2. Root directory: `artifacts/resume-screener`
3. Framework: Vite
4. Build: `pnpm install && pnpm run build`
5. Output: `dist/public`
6. Env vars: `PORT=5173`, `BASE_PATH=/`

---

## 📊 What Recruiters Should Know

### Why This Project?
- **Real-world ML:** Demonstrates integration of sentence-transformers, FAISS, and scikit-learn
- **Full-stack ownership:** Backend (Python) + Frontend (React) + DevOps (GitHub, Render, Vercel)
- **Scalability:** Monorepo architecture, API-first design, cloud-ready
- **Production mindset:** Security scanning, error handling, dependency management
- **Explainability:** ATS scores break down into interpretable components

### Tech Highlights
- Semantic AI matching (not just keyword lookup)
- Contract-first API design (OpenAPI → Orval codegen)
- Type-safe across full stack (TypeScript + Python Pydantic)
- Mobile-responsive, accessible UI (shadcn/ui + Tailwind)
- Tested endpoints + security hardening

### Potential Impact
- Saves hiring teams hours on resume screening
- Reduces bias through ML-based matching
- Provides explainable scores for candidate discussions
- Scales to thousands of resumes/jobs

---

## 🛠️ Development

### Running Tests
```bash
cd artifacts/api-server
python -m pytest test_api.py -v
```

### Type Checking
```bash
pnpm run typecheck
```

### Security Audit
```bash
pnpm audit
pip-audit -r requirements.txt
```

### Regenerate API Types
```bash
pnpm --filter @workspace/api-spec run codegen
```

---

## 📝 License

MIT

---

## 🤝 Author

Built by [Your Name] as a portfolio project showcasing full-stack AI/ML engineering.

**Contact:**
- GitHub: [@arafayansari99-maker](https://github.com/arafayansari99-maker)
- Email: [a.rafayansari99@gmail.com]

---

## 🚀 Next Steps

- ⭐ Star this repo if you find it useful!
- 🐛 Issues & PRs welcome
- 📬 Reach out for feedback or collaboration
