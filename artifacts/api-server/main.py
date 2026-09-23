import json
import logging
import os
import urllib.error
import urllib.request
from collections import Counter
from datetime import datetime, timezone
from typing import Any, Optional

from fastapi import Depends, FastAPI, File, Form, HTTPException, Response, UploadFile
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from dotenv import load_dotenv

load_dotenv()


# --- Compatibility / legacy routes -------------------------------------------------
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import (


    AnalysisResultModel,
    JobModel,
    RankingRunModel,
    RankingRunResultModel,
    ResumeModel,
    create_tables,
    get_db,
)
from job_scraper import scrape_job_from_url
from nlp_engine import (
    analyze_resume_against_job,
    extract_skills,
    extract_text_from_pdf,
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="AI Resume Screening API", version="0.1.0")
bearer_scheme = HTTPBearer(auto_error=False)

# Configure CORS origins via `ALLOWED_ORIGINS` env var (comma-separated).
PRODUCTION_FRONTEND_ORIGIN = "https://resume-buildr-resume-screener.vercel.app"
raw_allowed = os.getenv("ALLOWED_ORIGINS")
if raw_allowed:
    allowed_origins = {
        origin.strip().rstrip("/")
        for origin in raw_allowed.split(",")
        if origin.strip()
    }
    allowed_origins.add(PRODUCTION_FRONTEND_ORIGIN)
else:
    allowed_origins = {"*"}

app.add_middleware(
    CORSMiddleware,
    allow_origins=sorted(allowed_origins),
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup_event():
    create_tables()
    logger.info("Database tables created/verified")


def get_current_user_id(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> str:
    if not credentials:
        raise HTTPException(status_code=401, detail="Authentication required")

    supabase_url = os.getenv("SUPABASE_URL") or os.getenv("NEXT_PUBLIC_SUPABASE_URL")
    publishable_key = os.getenv("SUPABASE_PUBLISHABLE_KEY") or os.getenv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY")
    if not supabase_url or not publishable_key:
        raise HTTPException(status_code=503, detail="Supabase authentication is not configured")

    request = urllib.request.Request(
        f"{supabase_url.rstrip('/')}/auth/v1/user",
        headers={
            "apikey": publishable_key,
            "Authorization": f"Bearer {credentials.credentials}",
        },
    )
    try:
        with urllib.request.urlopen(request, timeout=10) as response:
            user = json.loads(response.read().decode("utf-8"))
    except (urllib.error.HTTPError, urllib.error.URLError, json.JSONDecodeError) as exc:
        logger.info("Supabase token validation failed: %s", exc)
        raise HTTPException(status_code=401, detail="Invalid or expired session") from exc

    user_id = user.get("id")
    if not isinstance(user_id, str) or not user_id:
        raise HTTPException(status_code=401, detail="Invalid Supabase user")
    return user_id


@app.get("/")
def root():
    return {"name": "AI Resume Screening API", "status": "ok"}


@app.get("/favicon.ico", include_in_schema=False)
def favicon():
    return Response(
        content='''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" rx="112" fill="#091525"/><rect x="40" y="40" width="432" height="432" rx="108" fill="#37B9C7"/><path d="M165 105H288L357 174V384C357 398 346 409 332 409H165C151 409 140 398 140 384V130C140 116 151 105 165 105Z" fill="#F8FAFC"/><path d="M184 213H313M184 252H276" stroke="#152A48" stroke-width="17" stroke-linecap="round"/><circle cx="315" cy="323" r="65" fill="#091525" stroke="#F8FAFC" stroke-width="10"/><path d="M285 323L305 343L347 299" stroke="#53E5C0" stroke-width="15" stroke-linecap="round" stroke-linejoin="round"/></svg>''',
        media_type="image/svg+xml",
    )


def _dt_str(dt: Optional[datetime]) -> str:
    if dt is None:
        return datetime.now(timezone.utc).isoformat()
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.isoformat()


# ─── Health ───────────────────────────────────────────────────────────────────

@app.get("/api/healthz")
def health_check():
    return {"status": "ok"}


# ─── Resumes ──────────────────────────────────────────────────────────────────

@app.post("/api/resumes/upload")
async def upload_resume(
    file: UploadFile = File(...),
    candidate_name: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported")

    file_bytes = await file.read()
    if len(file_bytes) == 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty")

    raw_text = extract_text_from_pdf(file_bytes)
    skills = extract_skills(raw_text)

    if not candidate_name or not candidate_name.strip():
        candidate_name = file.filename.replace(".pdf", "").replace("_", " ").title()

    resume = ResumeModel(
        user_id=user_id,
        candidate_name=candidate_name.strip(),
        filename=file.filename,
        raw_text=raw_text,
        skills_found=skills,
    )
    db.add(resume)
    db.commit()
    db.refresh(resume)

    preview = raw_text[:300] + "..." if len(raw_text) > 300 else raw_text

    return {
        "id": resume.id,
        "candidate_name": resume.candidate_name,
        "filename": resume.filename,
        "extracted_text_preview": preview,
        "skills_found": resume.skills_found,
        "created_at": _dt_str(resume.created_at),
    }


@app.get("/api/resumes")
def list_resumes(db: Session = Depends(get_db), user_id: str = Depends(get_current_user_id)):
    resumes = db.query(ResumeModel).filter(ResumeModel.user_id == user_id).order_by(ResumeModel.created_at.desc()).all()
    result = []
    for r in resumes:
        count = db.query(AnalysisResultModel).filter(
            AnalysisResultModel.resume_id == r.id,
            AnalysisResultModel.user_id == user_id,
        ).count()
        result.append({
            "id": r.id,
            "candidate_name": r.candidate_name,
            "filename": r.filename,
            "skills_found": r.skills_found or [],
            "created_at": _dt_str(r.created_at),
            "analysis_count": count,
        })
    return result


@app.get("/api/resumes/{resume_id}")
def get_resume(resume_id: int, db: Session = Depends(get_db), user_id: str = Depends(get_current_user_id)):
    r = db.query(ResumeModel).filter(ResumeModel.id == resume_id, ResumeModel.user_id == user_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Resume not found")
    count = db.query(AnalysisResultModel).filter(
        AnalysisResultModel.resume_id == r.id,
        AnalysisResultModel.user_id == user_id,
    ).count()
    return {
        "id": r.id,
        "candidate_name": r.candidate_name,
        "filename": r.filename,
        "skills_found": r.skills_found or [],
        "created_at": _dt_str(r.created_at),
        "analysis_count": count,
        "raw_text": r.raw_text or "",
    }


@app.delete("/api/resumes/{resume_id}")
def delete_resume(resume_id: int, db: Session = Depends(get_db), user_id: str = Depends(get_current_user_id)):
    r = db.query(ResumeModel).filter(ResumeModel.id == resume_id, ResumeModel.user_id == user_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Resume not found")
    db.delete(r)
    db.commit()
    return {"message": f"Resume {resume_id} deleted"}


# ─── Jobs ─────────────────────────────────────────────────────────────────────

class CreateJobRequest(BaseModel):
    title: str
    company: Optional[str] = ""
    description: str
    required_skills: Optional[list[str]] = []


class JobImportRequest(BaseModel):
    url: str


@app.post("/api/jobs/import-url")
def import_job_from_url(req: JobImportRequest, user_id: str = Depends(get_current_user_id)):
    try:
        data = scrape_job_from_url(req.url.strip())
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        # Log the full exception on the server, but do not echo internal
        # exception details (or user-provided URLs) back to the client.
        logger.exception("unexpected scrape error for %s", req.url)
        raise HTTPException(status_code=400, detail="Failed to extract job data")

    # Auto-extract skills from the description
    skills = extract_skills(data.get("description") or "")

    return {
        "title":          data.get("title") or "",
        "company":        data.get("company") or "",
        "location":       data.get("location") or "",
        "description":    data.get("description") or "",
        "required_skills": skills,
        "source_url":     data.get("source_url") or req.url,
    }


@app.post("/api/jobs/add-from-url")
def import_job_from_url_legacy(req: JobImportRequest, user_id: str = Depends(get_current_user_id)):
    """Legacy compatibility: /api/jobs/add-from-url -> /api/jobs/import-url"""
    return import_job_from_url(req, user_id)


@app.post("/api/jobs")
def create_job(req: CreateJobRequest, db: Session = Depends(get_db), user_id: str = Depends(get_current_user_id)):
    extracted = extract_skills(req.description)
    all_skills = sorted(set((req.required_skills or []) + extracted))

    job = JobModel(
        user_id=user_id,
        title=req.title,
        company=req.company or "",
        description=req.description,
        required_skills=all_skills,
    )
    db.add(job)
    db.commit()
    db.refresh(job)

    return {
        "id": job.id,
        "title": job.title,
        "company": job.company,
        "description": job.description,
        "required_skills": job.required_skills,
        "created_at": _dt_str(job.created_at),
    }


@app.get("/api/jobs")
def list_jobs(db: Session = Depends(get_db), user_id: str = Depends(get_current_user_id)):
    jobs = db.query(JobModel).filter(JobModel.user_id == user_id).order_by(JobModel.created_at.desc()).all()
    return [
        {
            "id": j.id,
            "title": j.title,
            "company": j.company or "",
            "description": j.description,
            "required_skills": j.required_skills or [],
            "created_at": _dt_str(j.created_at),
        }
        for j in jobs
    ]


@app.get("/api/jobs/{job_id}")
def get_job(job_id: int, db: Session = Depends(get_db), user_id: str = Depends(get_current_user_id)):
    j = db.query(JobModel).filter(JobModel.id == job_id, JobModel.user_id == user_id).first()
    if not j:
        raise HTTPException(status_code=404, detail="Job not found")
    return {
        "id": j.id,
        "title": j.title,
        "company": j.company or "",
        "description": j.description,
        "required_skills": j.required_skills or [],
        "created_at": _dt_str(j.created_at),
    }


@app.delete("/api/jobs/{job_id}")
def delete_job(job_id: int, db: Session = Depends(get_db), user_id: str = Depends(get_current_user_id)):
    j = db.query(JobModel).filter(JobModel.id == job_id, JobModel.user_id == user_id).first()
    if not j:
        raise HTTPException(status_code=404, detail="Job not found")
    db.delete(j)
    db.commit()
    return {"message": f"Job {job_id} deleted"}


# ─── Analysis ─────────────────────────────────────────────────────────────────

class AnalyzeRequest(BaseModel):
    resume_id: int
    job_id: int


@app.post("/api/analysis/analyze")
def analyze_resume(req: AnalyzeRequest, db: Session = Depends(get_db), user_id: str = Depends(get_current_user_id)):
    resume = db.query(ResumeModel).filter(ResumeModel.id == req.resume_id, ResumeModel.user_id == user_id).first()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")

    job = db.query(JobModel).filter(JobModel.id == req.job_id, JobModel.user_id == user_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    result_data = analyze_resume_against_job(
        resume_text=resume.raw_text or "",
        job_text=job.description,
        resume_skills=resume.skills_found or [],
        job_required_skills=job.required_skills or [],
    )

    analysis = AnalysisResultModel(
        user_id=user_id,
        resume_id=resume.id,
        job_id=job.id,
        candidate_name=resume.candidate_name,
        job_title=job.title,
        ats_score=result_data["ats_score"],
        score_breakdown=result_data["score_breakdown"],
        skill_gap=result_data["skill_gap"],
        recommendations=result_data["recommendations"],
        explanation=result_data["explanation"],
    )
    db.add(analysis)
    db.commit()
    db.refresh(analysis)

    return {
        "id": analysis.id,
        "resume_id": analysis.resume_id,
        "job_id": analysis.job_id,
        "candidate_name": analysis.candidate_name,
        "job_title": analysis.job_title,
        "ats_score": analysis.ats_score,
        "score_breakdown": analysis.score_breakdown,
        "skill_gap": analysis.skill_gap,
        "recommendations": analysis.recommendations,
        "explanation": analysis.explanation,
        "created_at": _dt_str(analysis.created_at),
    }


class RankRequest(BaseModel):
    resume_ids: list[int]
    job_id: int


@app.post("/api/analysis/rank")
def rank_candidates(req: RankRequest, db: Session = Depends(get_db), user_id: str = Depends(get_current_user_id)):
    job = db.query(JobModel).filter(JobModel.id == req.job_id, JobModel.user_id == user_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    results = []
    for rid in req.resume_ids:
        resume = db.query(ResumeModel).filter(ResumeModel.id == rid, ResumeModel.user_id == user_id).first()
        if not resume:
            continue

        result_data = analyze_resume_against_job(
            resume_text=resume.raw_text or "",
            job_text=job.description,
            resume_skills=resume.skills_found or [],
            job_required_skills=job.required_skills or [],
        )
        results.append({
            "resume_id": resume.id,
            "candidate_name": resume.candidate_name,
            "ats_score": result_data["ats_score"],
            "skill_match": result_data["score_breakdown"]["skill_match"],
            "missing_skills": result_data["skill_gap"]["missing_skills"],
            "matched_skills": result_data["skill_gap"]["matched_skills"],
        })

    results.sort(key=lambda x: x["ats_score"], reverse=True)
    for i, r in enumerate(results, 1):
        r["rank"] = i

    # Persist the ranking run
    avg = sum(r["ats_score"] for r in results) / len(results) if results else 0.0
    run = RankingRunModel(
        user_id=user_id,
        job_id=job.id,
        job_title=job.title,
        candidate_count=len(results),
        top_candidate_name=results[0]["candidate_name"] if results else None,
        top_score=results[0]["ats_score"] if results else None,
        avg_score=round(avg, 2),
    )
    db.add(run)
    db.flush()

    for r in results:
        db.add(RankingRunResultModel(
            user_id=user_id,
            run_id=run.id,
            rank=r["rank"],
            resume_id=r["resume_id"],
            candidate_name=r["candidate_name"],
            ats_score=r["ats_score"],
            skill_match=r["skill_match"],
            matched_skills=r["matched_skills"],
            missing_skills=r["missing_skills"],
        ))
    db.commit()

    return results


@app.get("/api/analysis/rankings")
def list_ranking_runs(db: Session = Depends(get_db), user_id: str = Depends(get_current_user_id)):
    runs = db.query(RankingRunModel).filter(RankingRunModel.user_id == user_id).order_by(RankingRunModel.created_at.desc()).all()
    return [
        {
            "id": run.id,
            "job_id": run.job_id,
            "job_title": run.job_title,
            "candidate_count": run.candidate_count,
            "top_candidate_name": run.top_candidate_name,
            "top_score": run.top_score,
            "avg_score": run.avg_score,
            "created_at": _dt_str(run.created_at),
        }
        for run in runs
    ]


@app.get("/api/ranking-runs")
def list_ranking_runs_legacy(db: Session = Depends(get_db), user_id: str = Depends(get_current_user_id)):
    """Legacy compatibility: /api/ranking-runs -> /api/analysis/rankings"""
    return list_ranking_runs(db, user_id)


@app.get("/api/analysis/rankings/{run_id}")
def get_ranking_run(run_id: int, db: Session = Depends(get_db), user_id: str = Depends(get_current_user_id)):
    run = db.query(RankingRunModel).filter(RankingRunModel.id == run_id, RankingRunModel.user_id == user_id).first()
    if not run:
        raise HTTPException(status_code=404, detail="Ranking run not found")

    candidates = (
        db.query(RankingRunResultModel)
        .filter(RankingRunResultModel.run_id == run_id, RankingRunResultModel.user_id == user_id)
        .order_by(RankingRunResultModel.rank)
        .all()
    )
    return {
        "id": run.id,
        "job_id": run.job_id,
        "job_title": run.job_title,
        "candidate_count": run.candidate_count,
        "top_candidate_name": run.top_candidate_name,
        "top_score": run.top_score,
        "avg_score": run.avg_score,
        "created_at": _dt_str(run.created_at),
        "candidates": [
            {
                "rank": c.rank,
                "resume_id": c.resume_id,
                "candidate_name": c.candidate_name,
                "ats_score": c.ats_score,
                "skill_match": c.skill_match,
                "matched_skills": c.matched_skills,
                "missing_skills": c.missing_skills,
            }
            for c in candidates
        ],
    }


@app.get("/api/analysis/results/{result_id}")
def get_analysis_result(result_id: int, db: Session = Depends(get_db), user_id: str = Depends(get_current_user_id)):
    a = db.query(AnalysisResultModel).filter(AnalysisResultModel.id == result_id, AnalysisResultModel.user_id == user_id).first()
    if not a:
        raise HTTPException(status_code=404, detail="Analysis result not found")
    return {
        "id": a.id,
        "resume_id": a.resume_id,
        "job_id": a.job_id,
        "candidate_name": a.candidate_name,
        "job_title": a.job_title,
        "ats_score": a.ats_score,
        "score_breakdown": a.score_breakdown,
        "skill_gap": a.skill_gap,
        "recommendations": a.recommendations,
        "explanation": a.explanation,
        "created_at": _dt_str(a.created_at),
    }


@app.get("/api/analysis/results")
def list_analysis_results(db: Session = Depends(get_db), user_id: str = Depends(get_current_user_id)):
    analyses = (
        db.query(AnalysisResultModel).filter(AnalysisResultModel.user_id == user_id)
        .order_by(AnalysisResultModel.created_at.desc())
        .all()
    )
    return [
        {
            "id": a.id,
            "resume_id": a.resume_id,
            "job_id": a.job_id,
            "candidate_name": a.candidate_name,
            "job_title": a.job_title,
            "ats_score": a.ats_score,
            "created_at": _dt_str(a.created_at),
        }
        for a in analyses
    ]


@app.get("/api/analysis-results")
def list_analysis_results_legacy(db: Session = Depends(get_db), user_id: str = Depends(get_current_user_id)):
    """Legacy compatibility: /api/analysis-results -> /api/analysis/results"""
    return list_analysis_results(db, user_id)


@app.get("/api/analysis/dashboard-stats")
def get_dashboard_stats(db: Session = Depends(get_db), user_id: str = Depends(get_current_user_id)):
    total_resumes = db.query(ResumeModel).filter(ResumeModel.user_id == user_id).count()
    total_jobs = db.query(JobModel).filter(JobModel.user_id == user_id).count()
    total_analyses = db.query(AnalysisResultModel).filter(AnalysisResultModel.user_id == user_id).count()

    analyses = db.query(AnalysisResultModel).filter(AnalysisResultModel.user_id == user_id).all()
    scores = [a.ats_score for a in analyses if a.ats_score is not None]
    avg_score = round(sum(scores) / len(scores), 1) if scores else 0.0

    missing_skills_counter: Counter = Counter()
    for a in analyses:
        sg = a.skill_gap or {}
        for skill in sg.get("missing_skills", []):
            missing_skills_counter[skill] += 1

    top_missing = [
        {"skill": skill, "count": count}
        for skill, count in missing_skills_counter.most_common(10)
    ]

    recent = (
        db.query(AnalysisResultModel).filter(AnalysisResultModel.user_id == user_id)
        .order_by(AnalysisResultModel.created_at.desc())
        .limit(5)
        .all()
    )
    recent_analyses = [
        {
            "id": a.id,
            "resume_id": a.resume_id,
            "job_id": a.job_id,
            "candidate_name": a.candidate_name,
            "job_title": a.job_title,
            "ats_score": a.ats_score,
            "created_at": _dt_str(a.created_at),
        }
        for a in recent
    ]

    distribution_ranges = [
        ("0-20", 0, 20),
        ("21-40", 21, 40),
        ("41-60", 41, 60),
        ("61-80", 61, 80),
        ("81-100", 81, 100),
    ]
    score_distribution = []
    for label, low, high in distribution_ranges:
        count = sum(1 for s in scores if low <= s <= high)
        score_distribution.append({"range": label, "count": count})

    return {
        "total_resumes": total_resumes,
        "total_jobs": total_jobs,
        "total_analyses": total_analyses,
        "average_ats_score": avg_score,
        "top_missing_skills": top_missing,
        "recent_analyses": recent_analyses,
        "score_distribution": score_distribution,
    }
