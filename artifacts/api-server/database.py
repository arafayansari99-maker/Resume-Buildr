import json
import logging
import os
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import (
    JSON,
    Column,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    create_engine,
)
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

logger = logging.getLogger(__name__)

DB_PATH = os.path.join(os.path.dirname(__file__), "resume_screening.db")
configured_database_url = os.getenv("DATABASE_URL", "").strip()
DATABASE_URL = configured_database_url or f"sqlite:///{DB_PATH}"

# Supabase commonly provides a postgresql:// URL. psycopg is the SQLAlchemy
# driver used by the API, so normalize the scheme before creating the engine.
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql+psycopg://", 1)
elif DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+psycopg://", 1)


def _build_engine():
    try:
        if DATABASE_URL.startswith("sqlite:"):
            return create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
        return create_engine(DATABASE_URL, pool_pre_ping=True, pool_recycle=300)
    except Exception as exc:  # pragma: no cover - defensive for serverless startup
        fallback_url = f"sqlite:///{DB_PATH}"
        logger.warning(
            "Database connection failed for %s. Falling back to local SQLite at %s. Error: %s",
            DATABASE_URL,
            fallback_url,
            exc,
        )
        return create_engine(fallback_url, connect_args={"check_same_thread": False})


engine = _build_engine()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


class ResumeModel(Base):
    __tablename__ = "resumes"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String(128), nullable=False, index=True)
    candidate_name = Column(String(255), nullable=False)
    filename = Column(String(255), nullable=False)
    raw_text = Column(Text, nullable=False, default="")
    skills_found = Column(JSON, nullable=False, default=list)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class JobModel(Base):
    __tablename__ = "jobs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String(128), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    company = Column(String(255), nullable=True, default="")
    description = Column(Text, nullable=False)
    required_skills = Column(JSON, nullable=False, default=list)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class AnalysisResultModel(Base):
    __tablename__ = "analysis_results"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String(128), nullable=False, index=True)
    resume_id = Column(Integer, ForeignKey("resumes.id"), nullable=False)
    job_id = Column(Integer, ForeignKey("jobs.id"), nullable=False)
    candidate_name = Column(String(255), nullable=False)
    job_title = Column(String(255), nullable=False)
    ats_score = Column(Float, nullable=False)
    score_breakdown = Column(JSON, nullable=False, default=dict)
    skill_gap = Column(JSON, nullable=False, default=dict)
    recommendations = Column(JSON, nullable=False, default=list)
    explanation = Column(JSON, nullable=False, default=dict)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class RankingRunModel(Base):
    __tablename__ = "ranking_runs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String(128), nullable=False, index=True)
    job_id = Column(Integer, ForeignKey("jobs.id"), nullable=False)
    job_title = Column(String(255), nullable=False)
    candidate_count = Column(Integer, nullable=False, default=0)
    top_candidate_name = Column(String(255), nullable=True)
    top_score = Column(Float, nullable=True)
    avg_score = Column(Float, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class RankingRunResultModel(Base):
    __tablename__ = "ranking_run_results"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String(128), nullable=False, index=True)
    run_id = Column(Integer, ForeignKey("ranking_runs.id"), nullable=False)
    rank = Column(Integer, nullable=False)
    resume_id = Column(Integer, nullable=False)
    candidate_name = Column(String(255), nullable=False)
    ats_score = Column(Float, nullable=False)
    skill_match = Column(Float, nullable=False)
    matched_skills = Column(JSON, nullable=False, default=list)
    missing_skills = Column(JSON, nullable=False, default=list)


def create_tables() -> None:
    Base.metadata.create_all(bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
