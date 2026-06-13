import logging
import re
from typing import Any

import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

logger = logging.getLogger(__name__)

TECH_SKILLS = {
    # Languages
    "python", "java", "javascript", "typescript", "c++", "c#", "go", "rust",
    "kotlin", "swift", "scala", "r", "matlab", "php", "ruby", "perl",
    # Web
    "react", "angular", "vue", "node.js", "nodejs", "express", "django",
    "flask", "fastapi", "spring", "spring boot", "html", "css", "sass",
    "graphql", "rest", "restful", "next.js", "nextjs",
    # Data / ML
    "machine learning", "deep learning", "nlp", "natural language processing",
    "computer vision", "tensorflow", "pytorch", "keras", "scikit-learn",
    "pandas", "numpy", "scipy", "matplotlib", "seaborn", "hugging face",
    "transformers", "bert", "gpt", "llm", "rag", "embeddings", "faiss",
    "langchain", "openai", "anthropic", "xgboost", "lightgbm",
    # Data Engineering
    "sql", "mysql", "postgresql", "postgres", "mongodb", "redis", "elasticsearch",
    "spark", "hadoop", "kafka", "airflow", "dbt", "snowflake", "databricks",
    "bigquery", "redshift", "hive", "presto", "flink",
    # Cloud
    "aws", "azure", "gcp", "google cloud", "ec2", "s3", "lambda", "ecs",
    "eks", "kubernetes", "k8s", "docker", "terraform", "ansible", "jenkins",
    "ci/cd", "github actions", "gitlab ci",
    # Tools
    "git", "linux", "bash", "shell", "vim", "jira", "confluence",
    # Data formats
    "json", "xml", "yaml", "csv", "parquet", "avro",
    # MLOps
    "mlflow", "kubeflow", "sagemaker", "vertex ai", "wandb", "dvc",
    # Concepts
    "agile", "scrum", "microservices", "api", "devops", "tdd",
}

EDUCATION_KEYWORDS = {
    "bachelor", "master", "phd", "doctorate", "degree", "b.s.", "m.s.",
    "b.e.", "m.e.", "b.tech", "m.tech", "mba", "university", "college",
    "graduate", "undergraduate", "computer science", "engineering",
    "mathematics", "statistics", "data science", "artificial intelligence",
}

EXPERIENCE_KEYWORDS = {
    "year", "years", "experience", "senior", "junior", "lead", "manager",
    "engineer", "developer", "architect", "analyst", "scientist", "intern",
    "work", "worked", "project", "team", "managed", "led", "built",
}


_embedding_model = None
_embedding_available = False


def _load_embedding_model():
    global _embedding_model, _embedding_available
    if _embedding_model is not None:
        return _embedding_model
    try:
        from sentence_transformers import SentenceTransformer
        _embedding_model = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")
        _embedding_available = True
        logger.info("Sentence transformer model loaded successfully")
    except Exception as e:
        logger.warning(f"Could not load sentence transformer model: {e}")
        _embedding_available = False
    return _embedding_model


def extract_text_from_pdf(file_bytes: bytes) -> str:
    try:
        import io
        import pdfplumber
        with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
            pages_text = []
            for page in pdf.pages:
                text = page.extract_text()
                if text:
                    pages_text.append(text)
            return "\n".join(pages_text)
    except Exception as e:
        logger.error(f"PDF extraction failed: {e}")
        return ""


def extract_skills(text: str) -> list[str]:
    text_lower = text.lower()
    found_skills = set()

    for skill in TECH_SKILLS:
        pattern = r"\b" + re.escape(skill) + r"\b"
        if re.search(pattern, text_lower):
            found_skills.add(skill)

    skill_patterns = [
        r"\b([A-Z][a-zA-Z0-9]*(?:\.[jJ][sS]|\.py|\.go)?)\b",
    ]
    for pat in skill_patterns:
        matches = re.findall(pat, text)
        for m in matches:
            if m.lower() in TECH_SKILLS:
                found_skills.add(m.lower())

    return sorted(found_skills)


def _compute_tfidf_similarity(text1: str, text2: str) -> float:
    try:
        vectorizer = TfidfVectorizer(
            stop_words="english",
            ngram_range=(1, 2),
            max_features=5000,
        )
        tfidf = vectorizer.fit_transform([text1, text2])
        sim = cosine_similarity(tfidf[0:1], tfidf[1:2])[0][0]
        return float(sim)
    except Exception:
        return 0.0


def _compute_semantic_similarity(text1: str, text2: str) -> float:
    model = _load_embedding_model()
    if model is None or not _embedding_available:
        return _compute_tfidf_similarity(text1, text2)
    try:
        embeddings = model.encode([text1[:2048], text2[:2048]])
        sim = cosine_similarity([embeddings[0]], [embeddings[1]])[0][0]
        return float(sim)
    except Exception as e:
        logger.warning(f"Semantic similarity fallback to TF-IDF: {e}")
        return _compute_tfidf_similarity(text1, text2)


def _estimate_experience_years(text: str) -> int:
    patterns = [
        r"(\d+)\+?\s*years?\s+(?:of\s+)?experience",
        r"(\d+)\+?\s*years?\s+(?:of\s+)?(?:work|professional)",
        r"experience\s+(?:of\s+)?(\d+)\+?\s*years?",
    ]
    years_found = []
    text_lower = text.lower()
    for pat in patterns:
        matches = re.findall(pat, text_lower)
        for m in matches:
            try:
                years_found.append(int(m))
            except ValueError:
                pass
    return max(years_found) if years_found else 0


def _extract_experience_level(text: str) -> str:
    text_lower = text.lower()
    if any(w in text_lower for w in ["senior", "staff", "principal", "lead", "manager", "director"]):
        return "senior"
    if any(w in text_lower for w in ["junior", "entry level", "entry-level", "graduate", "intern"]):
        return "junior"
    return "mid"


def _check_education_match(resume_text: str, job_text: str) -> float:
    resume_lower = resume_text.lower()
    job_lower = job_text.lower()

    has_degree = any(kw in resume_lower for kw in ["bachelor", "master", "phd", "b.s.", "m.s.", "b.e.", "m.e.", "b.tech"])
    phd_required = any(kw in job_lower for kw in ["phd", "doctorate", "ph.d"])
    masters_required = any(kw in job_lower for kw in ["master", "m.s.", "m.e."])

    if phd_required:
        if "phd" in resume_lower or "doctorate" in resume_lower:
            return 100.0
        elif "master" in resume_lower:
            return 70.0
        elif has_degree:
            return 50.0
        return 30.0

    if masters_required:
        if "master" in resume_lower or "phd" in resume_lower:
            return 100.0
        elif has_degree:
            return 75.0
        return 50.0

    if has_degree:
        return 90.0
    return 60.0


def _compute_experience_match(resume_text: str, job_text: str) -> float:
    resume_years = _estimate_experience_years(resume_text)
    job_years = _estimate_experience_years(job_text)

    resume_level = _extract_experience_level(resume_text)
    job_level = _extract_experience_level(job_text)

    level_map = {"junior": 1, "mid": 2, "senior": 3}
    resume_lvl_num = level_map.get(resume_level, 2)
    job_lvl_num = level_map.get(job_level, 2)

    if job_years == 0:
        level_score = min(100.0, (resume_lvl_num / max(job_lvl_num, 1)) * 100)
    else:
        if resume_years >= job_years:
            years_score = min(100.0, 100.0)
        else:
            years_score = (resume_years / job_years) * 100

        level_diff = resume_lvl_num - job_lvl_num
        if level_diff >= 0:
            level_score = 100.0
        else:
            level_score = max(40.0, 100.0 + level_diff * 20)

        level_score = (years_score * 0.6 + level_score * 0.4)

    return round(level_score, 1)


def _compute_keyword_coverage(resume_text: str, job_text: str) -> float:
    job_words = set(re.findall(r"\b[a-zA-Z]{3,}\b", job_text.lower()))
    stop_words = {"the", "and", "for", "are", "with", "this", "that", "have",
                  "will", "from", "they", "their", "able", "also", "been",
                  "experience", "work", "team", "you", "our", "your"}
    job_keywords = job_words - stop_words
    if not job_keywords:
        return 50.0

    resume_words = set(re.findall(r"\b[a-zA-Z]{3,}\b", resume_text.lower()))
    covered = job_keywords & resume_words
    return round((len(covered) / len(job_keywords)) * 100, 1)


def generate_recommendations(
    resume_text: str,
    job_text: str,
    missing_skills: list[str],
    ats_score: float,
    score_breakdown: dict,
) -> list[dict]:
    recs = []

    if missing_skills:
        top_missing = missing_skills[:5]
        recs.append({
            "category": "Skills",
            "suggestion": f"Add these missing skills to your resume: {', '.join(top_missing)}.",
            "priority": "high",
        })

    if score_breakdown.get("experience_match", 100) < 70:
        recs.append({
            "category": "Experience",
            "suggestion": "Quantify your achievements with measurable outcomes (e.g., 'Reduced latency by 40%', 'Led team of 5').",
            "priority": "high",
        })

    if score_breakdown.get("keyword_coverage", 100) < 60:
        recs.append({
            "category": "Keywords",
            "suggestion": "Mirror language from the job description more closely. Many ATS systems do exact keyword matching.",
            "priority": "medium",
        })

    if score_breakdown.get("education_match", 100) < 70:
        recs.append({
            "category": "Education",
            "suggestion": "Highlight relevant coursework, certifications, or bootcamps if formal education doesn't fully match.",
            "priority": "medium",
        })

    if score_breakdown.get("semantic_similarity", 100) < 50:
        recs.append({
            "category": "Content",
            "suggestion": "Rewrite your summary and key bullet points to align more closely with the role's core responsibilities.",
            "priority": "high",
        })

    cloud_words = {"aws", "azure", "gcp", "cloud", "kubernetes", "docker", "terraform"}
    if any(w in job_text.lower() for w in cloud_words) and not any(w in resume_text.lower() for w in cloud_words):
        recs.append({
            "category": "Cloud",
            "suggestion": "Add cloud platform experience (AWS/Azure/GCP). Even personal projects or certifications count.",
            "priority": "medium",
        })

    if ats_score < 60:
        recs.append({
            "category": "Overall",
            "suggestion": "Consider a targeted rewrite of the resume specifically tailored to this job description.",
            "priority": "high",
        })

    return recs[:8]


def generate_explanation(
    resume_text: str,
    job_text: str,
    ats_score: float,
    score_breakdown: dict,
    skill_gap: dict,
) -> dict:
    matched = skill_gap.get("matched_skills", [])
    missing = skill_gap.get("missing_skills", [])

    strengths = []
    weaknesses = []

    if score_breakdown.get("skill_match", 0) >= 70:
        strengths.append(f"Strong skill alignment — matches {len(matched)} required skills including {', '.join(matched[:3])}.")
    if score_breakdown.get("semantic_similarity", 0) >= 65:
        strengths.append("Resume content is semantically well-aligned with the job description.")
    if score_breakdown.get("experience_match", 0) >= 80:
        strengths.append("Experience level and years match or exceed the job requirements.")
    if score_breakdown.get("education_match", 0) >= 85:
        strengths.append("Educational background meets or exceeds requirements.")
    if score_breakdown.get("keyword_coverage", 0) >= 70:
        strengths.append("Good keyword coverage — resume uses terminology from the job description.")

    if missing:
        weaknesses.append(f"Missing {len(missing)} required skills: {', '.join(missing[:4])}{'...' if len(missing) > 4 else ''}.")
    if score_breakdown.get("semantic_similarity", 100) < 50:
        weaknesses.append("Resume content doesn't closely mirror the job description's focus areas.")
    if score_breakdown.get("experience_match", 100) < 60:
        weaknesses.append("Experience level may not fully meet the job's requirements.")
    if score_breakdown.get("keyword_coverage", 100) < 50:
        weaknesses.append("Resume lacks many keywords used in the job description, which may hurt ATS ranking.")

    if not strengths:
        strengths.append("Resume demonstrates relevant background in the domain.")
    if not weaknesses:
        weaknesses.append("No major gaps identified — focus on tailoring language to the specific role.")

    if ats_score >= 85:
        overall = f"Excellent match ({ats_score:.0f}/100). This candidate is a strong fit for the role."
        reasoning = f"Score of {ats_score:.0f}/100 driven by strong skill overlap and semantic alignment. Skill match: {score_breakdown.get('skill_match', 0):.0f}%, semantic similarity: {score_breakdown.get('semantic_similarity', 0):.0f}%. Candidate meets the core technical and experience requirements."
    elif ats_score >= 70:
        overall = f"Good match ({ats_score:.0f}/100). Candidate meets most requirements with some gaps."
        reasoning = f"Score of {ats_score:.0f}/100 reflects solid fundamentals with room to improve. Skill match: {score_breakdown.get('skill_match', 0):.0f}%, experience match: {score_breakdown.get('experience_match', 0):.0f}%. Addressing missing skills and better keyword alignment could push this above 80."
    elif ats_score >= 50:
        overall = f"Partial match ({ats_score:.0f}/100). Significant gaps exist but some relevant experience."
        reasoning = f"Score of {ats_score:.0f}/100 indicates partial qualification. Key gaps in skill coverage ({score_breakdown.get('skill_match', 0):.0f}%) and keyword alignment ({score_breakdown.get('keyword_coverage', 0):.0f}%) are dragging the score down. A targeted resume rewrite would substantially improve this."
    else:
        overall = f"Weak match ({ats_score:.0f}/100). Resume needs significant tailoring for this role."
        reasoning = f"Score of {ats_score:.0f}/100 reflects limited alignment with the job requirements. With skill match at {score_breakdown.get('skill_match', 0):.0f}% and semantic similarity at {score_breakdown.get('semantic_similarity', 0):.0f}%, a comprehensive revision focused on the required competencies is recommended."

    return {
        "overall": overall,
        "strengths": strengths,
        "weaknesses": weaknesses,
        "score_reasoning": reasoning,
    }


def analyze_resume_against_job(
    resume_text: str,
    job_text: str,
    resume_skills: list[str],
    job_required_skills: list[str],
) -> dict:
    if not resume_text.strip():
        resume_text = "No text extracted from resume"

    job_skills_from_text = extract_skills(job_text)
    all_job_skills = sorted(set(job_required_skills + job_skills_from_text))

    if not all_job_skills:
        all_job_skills = extract_skills(job_text)

    resume_skill_set = set(s.lower() for s in resume_skills)
    job_skill_set = set(s.lower() for s in all_job_skills)

    matched_skills = sorted(resume_skill_set & job_skill_set)
    missing_skills = sorted(job_skill_set - resume_skill_set)
    extra_skills = sorted(resume_skill_set - job_skill_set)

    if job_skill_set:
        skill_match = round((len(matched_skills) / len(job_skill_set)) * 100, 1)
    else:
        skill_match = 50.0

    semantic_sim = _compute_semantic_similarity(resume_text, job_text)
    semantic_score = round(semantic_sim * 100, 1)

    experience_match = _compute_experience_match(resume_text, job_text)
    education_match = _check_education_match(resume_text, job_text)
    keyword_coverage = _compute_keyword_coverage(resume_text, job_text)

    ats_score = (
        skill_match * 0.40
        + semantic_score * 0.30
        + experience_match * 0.20
        + education_match * 0.10
    )
    ats_score = round(min(100.0, max(0.0, ats_score)), 1)

    score_breakdown = {
        "skill_match": skill_match,
        "semantic_similarity": semantic_score,
        "experience_match": experience_match,
        "education_match": education_match,
        "keyword_coverage": keyword_coverage,
    }

    skill_gap = {
        "matched_skills": matched_skills,
        "missing_skills": missing_skills,
        "extra_skills": extra_skills,
    }

    recommendations = generate_recommendations(
        resume_text, job_text, missing_skills, ats_score, score_breakdown
    )
    explanation = generate_explanation(
        resume_text, job_text, ats_score, score_breakdown, skill_gap
    )

    return {
        "ats_score": ats_score,
        "score_breakdown": score_breakdown,
        "skill_gap": skill_gap,
        "recommendations": recommendations,
        "explanation": explanation,
    }
