# RecruitIntel — AI Resume Screening & Job Matching System

An AI-powered ATS system that analyzes resumes against job descriptions, generates explainable compatibility scores, and ranks multiple candidates.

## Run & Operate

- `bash /home/runner/workspace/artifacts/api-server/start.sh` — run the Python FastAPI backend (port 8080)
- `pnpm --filter @workspace/resume-screener run dev` — run the React frontend (port varies)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9 (frontend tooling)
- **Frontend:** React + Vite, Tailwind CSS, shadcn/ui, Recharts, React Query, wouter
- **Backend:** Python 3, FastAPI, SQLite + SQLAlchemy, uvicorn
- **ML/NLP:** sentence-transformers (all-MiniLM-L6-v2), FAISS, scikit-learn TF-IDF, pdfplumber
- API codegen: Orval (from OpenAPI spec → React Query hooks + Zod schemas)

## Where things live

- `lib/api-spec/openapi.yaml` — single source of truth for all API contracts
- `lib/api-client-react/src/generated/` — generated React Query hooks (do not edit)
- `lib/api-zod/src/generated/` — generated Zod schemas (do not edit)
- `artifacts/resume-screener/` — React frontend
- `artifacts/api-server/main.py` — FastAPI routes (all under `/api/`)
- `artifacts/api-server/nlp_engine.py` — NLP/ML scoring engine
- `artifacts/api-server/database.py` — SQLAlchemy models + SQLite setup
- `artifacts/api-server/requirements.txt` — Python dependencies

## Architecture decisions

- **Python FastAPI replaces Node.js/Express** for the API server to support ML libraries (sentence-transformers, FAISS, scikit-learn). The artifact.toml was updated to run `uvicorn` directly.
- **SQLite** (not PostgreSQL) — lightweight, file-based, no provisioning needed. Stored at `artifacts/api-server/resume_screening.db`.
- **ATS score formula:** 40% skill match + 30% semantic similarity + 20% experience match + 10% education match.
- **Graceful ML fallback:** if sentence-transformers model fails to load, system falls back to TF-IDF cosine similarity for semantic scoring.
- **Contract-first:** OpenAPI spec → Orval codegen → typed React Query hooks. Frontend never writes raw fetch calls.

## Product

- Upload PDF resumes — extracts text, identifies skills automatically
- Define job descriptions — auto-extracts required skills from text
- Analyze one resume against a job — full ATS score with explainable breakdown
- Rank multiple candidates — leaderboard view with scores and skill gaps
- Dashboard — stats, score distribution chart, top missing skills, recent analyses

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- The API server runs Python (not Node.js) — do not try to run it with `pnpm`. Use `uvicorn` directly or via `start.sh`.
- Python packages (sentence-transformers, FAISS) are installed via pip, not pnpm. Check `requirements.txt`.
- The ML model (`all-MiniLM-L6-v2`) is downloaded on first use from HuggingFace. First analysis may be slower.
- After each OpenAPI spec change, run `pnpm --filter @workspace/api-spec run codegen` before using the updated types.
- The `lib/api-zod/tsconfig.json` must include `"lib": ["esnext", "dom"]` for `File`/`Blob` types.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
