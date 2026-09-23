# Resume Matcher AI

AI-powered resume screening and job matching platform for recruiters, hiring managers, and talent teams.

This project helps users upload PDF resumes, import job descriptions, compare candidate fit, and review explainable matching scores across multiple applicants.

---

## Overview

Resume Matcher AI is a full-stack application designed to simplify candidate screening. It combines:

- a React + Vite frontend for recruiter workflows and dashboards
- a Python FastAPI backend for resume parsing, job matching, and ranking logic
- SQLite storage for local persistence
- generated API clients for type-safe frontend/backend communication

The goal is to reduce manual resume review time by surfacing the strongest candidate matches, highlighting skill gaps, and making the scoring process explainable.

---

## Features

- Resume upload and PDF text extraction
- Job creation and URL-based job import
- Candidate analysis against a job description
- ATS-style scoring with explainable breakdowns
- Multi-candidate ranking and comparison workflow
- Dashboard metrics for score distribution and missing skills
- API-first design with generated TypeScript clients
- Local development and production deployment support

---

## Tech Stack

### Frontend
- React
- Vite
- TypeScript
- Tailwind CSS
- shadcn/ui components
- TanStack Query
- Wouter routing

### Backend
- Python
- FastAPI
- SQLAlchemy
- SQLite
- Pydantic validation

### Tooling
- pnpm workspaces
- OpenAPI specification
- generated React API client
- generated Zod schemas

---

## Local Development

### Prerequisites
- Node.js 20+
- pnpm
- Python 3.11+
- pip

### Install dependencies

```bash
git clone <your-repo-url>
cd Resume-Matcher-AI
pnpm install
cd artifacts/api-server
pip install -r requirements.txt
```

### Start the backend

```bash
cd artifacts/api-server
python -m uvicorn main:app --host 0.0.0.0 --port 8080 --reload
```

### Start the frontend

```bash
cd artifacts/resume-screener
$env:PORT = 5173
$env:BASE_PATH = "/"
pnpm run dev
```

Open the app in the browser at:

```text
http://localhost:5173
```

---

## Deployment

This project supports deployment with separate frontend and API hosts. The frontend reads the live API URL from the `VITE_API_URL` environment variable.

### Frontend environment
- `PORT=5173`
- `BASE_PATH=/`
- `VITE_API_URL=https://your-api-domain.com`

### Backend environment
- `PORT=8080`
- `ALLOWED_ORIGINS=https://your-frontend-domain.com`

Additional deployment guidance is available in [DEPLOYMENT.md](DEPLOYMENT.md).

---

## Project Structure

```text
Resume-Matcher-AI/
├── artifacts/
│   ├── api-server/            # FastAPI backend
│   └── resume-screener/       # React + Vite frontend
├── lib/
│   ├── api-client-react/      # Generated frontend API client
│   ├── api-spec/              # OpenAPI specification
│   ├── api-zod/               # Generated Zod schemas
│   └── db/                    # Database layer setup
├── scripts/
├── .env.example
├── DEPLOYMENT.md
├── package.json
├── pnpm-workspace.yaml
├── pnpm-lock.yaml
├── README.md
└── render.yaml
```

---

## API Overview

All backend routes are grouped under `/api`.

Examples:
- `GET /api/healthz`
- `GET /api/resumes`
- `POST /api/resumes/upload`
- `POST /api/jobs`
- `POST /api/jobs/import-url`
- `POST /api/analysis/analyze`

---

## Notes

- The project is monorepo-based and uses workspace packages.
- The frontend and API can be run together locally for development.
- Production configuration should always point the frontend to the live API host and allow that host in backend CORS settings.

---

## GitHub Repo Description

AI-powered resume screening and job matching platform with React frontend and FastAPI backend.
