"""
Job URL scraper — extracts job title, company, description, location, and skills
from job board URLs (Indeed, LinkedIn, Glassdoor, and generic pages).

Strategy (in order):
  1. Fetch page with browser-like headers
  2. Extract JSON-LD JobPosting structured data (most reliable when present)
  3. Site-specific CSS selectors for known job boards
  4. trafilatura for generic main-content extraction
  5. Return best result found, never crash
"""

import json
import logging
import re
from typing import Any, Optional
from urllib.parse import urlparse

import requests
import trafilatura
from bs4 import BeautifulSoup

logger = logging.getLogger(__name__)

FETCH_TIMEOUT = 12  # seconds

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Accept-Encoding": "gzip, deflate, br",
    "Cache-Control": "no-cache",
    "Pragma": "no-cache",
}


# ── Helpers ───────────────────────────────────────────────────────────────────

def _clean(text: Optional[str]) -> str:
    if not text:
        return ""
    return re.sub(r"\s+", " ", text).strip()


def _detect_platform(url: str) -> str:
    host = urlparse(url).netloc.lower()
    if "linkedin.com" in host:
        return "linkedin"
    if "indeed.com" in host:
        return "indeed"
    if "glassdoor.com" in host:
        return "glassdoor"
    if "lever.co" in host:
        return "lever"
    if "greenhouse.io" in host:
        return "greenhouse"
    if "workable.com" in host:
        return "workable"
    if "ashbyhq.com" in host:
        return "ashby"
    if "myworkdayjobs.com" in host or "workday" in host:
        return "workday"
    return "generic"


def _fetch(url: str) -> Optional[str]:
    try:
        resp = requests.get(url, headers=HEADERS, timeout=FETCH_TIMEOUT, allow_redirects=True)
        if resp.status_code == 200:
            return resp.text
        logger.warning("fetch %s returned %s", url, resp.status_code)
    except Exception as exc:
        logger.warning("fetch error for %s: %s", url, exc)
    return None


# ── JSON-LD extraction ────────────────────────────────────────────────────────

def _extract_jsonld(soup: BeautifulSoup) -> Optional[dict[str, Any]]:
    """Find the first JSON-LD block with @type JobPosting."""
    for tag in soup.find_all("script", {"type": "application/ld+json"}):
        try:
            data = json.loads(tag.string or "")
            # May be a single object or a list
            items = data if isinstance(data, list) else [data]
            for item in items:
                if isinstance(item, dict) and item.get("@type") in ("JobPosting", "jobPosting"):
                    return item
        except Exception as e:
            logger.debug("JSON-LD parse error: %s", e)
            continue
    return None


def _parse_jsonld(data: dict[str, Any]) -> dict[str, Any]:
    title = _clean(data.get("title") or data.get("name") or "")
    
    # Company: hiringOrganization can be a string or object
    org = data.get("hiringOrganization") or {}
    if isinstance(org, str):
        company = _clean(org)
    else:
        company = _clean(org.get("name") or "")

    # Location
    location_obj = data.get("jobLocation") or {}
    if isinstance(location_obj, list):
        location_obj = location_obj[0] if location_obj else {}
    addr = location_obj.get("address") or {}
    if isinstance(addr, str):
        location = _clean(addr)
    else:
        parts = [
            addr.get("addressLocality"),
            addr.get("addressRegion"),
            addr.get("addressCountry"),
        ]
        location = ", ".join(_clean(p) for p in parts if p)

    # Description — may contain HTML
    raw_desc = data.get("description") or ""
    if raw_desc:
        desc_soup = BeautifulSoup(raw_desc, "lxml")
        description = _clean(desc_soup.get_text(separator=" "))
    else:
        description = ""

    return {"title": title, "company": company, "location": location, "description": description}


# ── Site-specific parsers ─────────────────────────────────────────────────────

def _parse_indeed(soup: BeautifulSoup) -> dict[str, Any]:
    result: dict[str, Any] = {"title": "", "company": "", "location": "", "description": ""}

    # Title
    for sel in ["h1.jobsearch-JobInfoHeader-title", "h1[data-testid='jobTitle']", "h1"]:
        el = soup.select_one(sel)
        if el:
            result["title"] = _clean(el.get_text())
            break

    # Company
    for sel in ["[data-testid='inlineHeader-companyName']", ".jobsearch-CompanyInfoWithoutHeaderImage a", ".icl-u-lg-mr--sm"]:
        el = soup.select_one(sel)
        if el:
            result["company"] = _clean(el.get_text())
            break

    # Location
    for sel in ["[data-testid='inlineHeader-companyLocation']", "[data-testid='job-location']"]:
        el = soup.select_one(sel)
        if el:
            result["location"] = _clean(el.get_text())
            break

    # Description
    for sel in ["#jobDescriptionText", "[data-testid='jobsearch-jobDescriptionText']", ".jobsearch-jobDescriptionText"]:
        el = soup.select_one(sel)
        if el:
            result["description"] = _clean(el.get_text(separator=" "))
            break

    return result


def _parse_linkedin(soup: BeautifulSoup) -> dict[str, Any]:
    result: dict[str, Any] = {"title": "", "company": "", "location": "", "description": ""}

    for sel in ["h1.top-card-layout__title", "h1.topcard__title", "h1"]:
        el = soup.select_one(sel)
        if el:
            result["title"] = _clean(el.get_text())
            break

    for sel in [".topcard__org-name-link", ".top-card-layout__company", "a.topcard__org-name-link"]:
        el = soup.select_one(sel)
        if el:
            result["company"] = _clean(el.get_text())
            break

    for sel in [".topcard__flavor--bullet", ".top-card-layout__card .topcard__flavor"]:
        el = soup.select_one(sel)
        if el:
            result["location"] = _clean(el.get_text())
            break

    for sel in [".description__text", ".show-more-less-html__markup", ".description"]:
        el = soup.select_one(sel)
        if el:
            result["description"] = _clean(el.get_text(separator=" "))
            break

    return result


def _parse_glassdoor(soup: BeautifulSoup) -> dict[str, Any]:
    result: dict[str, Any] = {"title": "", "company": "", "location": "", "description": ""}

    for sel in ["[data-test='job-title']", "h1.job-title", "h1"]:
        el = soup.select_one(sel)
        if el:
            result["title"] = _clean(el.get_text())
            break

    for sel in ["[data-test='employer-name']", ".employer-name", ".header-company-name"]:
        el = soup.select_one(sel)
        if el:
            result["company"] = _clean(el.get_text())
            break

    for sel in ["[data-test='location']", ".location"]:
        el = soup.select_one(sel)
        if el:
            result["location"] = _clean(el.get_text())
            break

    for sel in ["[data-test='description']", ".jobDescriptionContent", ".desc"]:
        el = soup.select_one(sel)
        if el:
            result["description"] = _clean(el.get_text(separator=" "))
            break

    return result


def _parse_lever(soup: BeautifulSoup) -> dict[str, Any]:
    result: dict[str, Any] = {"title": "", "company": "", "location": "", "description": ""}
    title_el = soup.select_one(".posting-headline h2")
    if title_el:
        result["title"] = _clean(title_el.get_text())
    company_el = soup.select_one(".main-header-logo img")
    if company_el:
        result["company"] = _clean(company_el.get("alt") or "")
    loc_el = soup.select_one(".posting-categories .location")
    if loc_el:
        result["location"] = _clean(loc_el.get_text())
    desc_el = soup.select_one(".posting-requirements") or soup.select_one(".section-wrapper")
    if desc_el:
        result["description"] = _clean(desc_el.get_text(separator=" "))
    return result


def _parse_greenhouse(soup: BeautifulSoup) -> dict[str, Any]:
    result: dict[str, Any] = {"title": "", "company": "", "location": "", "description": ""}
    title_el = soup.select_one("h1.app-title") or soup.select_one("h1")
    if title_el:
        result["title"] = _clean(title_el.get_text())
    loc_el = soup.select_one(".location")
    if loc_el:
        result["location"] = _clean(loc_el.get_text())
    desc_el = soup.select_one("#content") or soup.select_one(".job-post")
    if desc_el:
        result["description"] = _clean(desc_el.get_text(separator=" "))
    return result


def _parse_generic(soup: BeautifulSoup, html: str) -> dict[str, Any]:
    """trafilatura-based fallback — extracts main article text."""
    result: dict[str, Any] = {"title": "", "company": "", "location": "", "description": ""}

    # Title from <title> or first h1
    title_tag = soup.find("title")
    if title_tag:
        result["title"] = _clean(title_tag.get_text().split("|")[0].split("-")[0].split("–")[0])
    h1 = soup.find("h1")
    if h1:
        result["title"] = _clean(h1.get_text())

    # Description via trafilatura
    try:
        text = trafilatura.extract(html, include_tables=False, no_fallback=False) or ""
        result["description"] = _clean(text)
    except Exception as e:
        logger.debug("trafilatura extraction failed: %s", e)
        result["description"] = _clean(soup.get_text(separator=" "))

    return result


# ── Main entry point ──────────────────────────────────────────────────────────

def scrape_job_from_url(url: str) -> dict[str, Any]:
    """
    Fetch and parse a job posting URL. Returns a dict with keys:
      title, company, location, description, source_url
    Raises ValueError if the page cannot be fetched or parsed.
    """
    platform = _detect_platform(url)
    logger.info("scraping %s (platform: %s)", url, platform)

    html = _fetch(url)
    if not html:
        # Avoid echoing the provided URL back in the error message (prevents accidental
        # disclosure or injection via error responses). Log the URL instead.
        logger.warning("Could not fetch page for URL: %s", url)
        raise ValueError("Could not fetch the page. The site may require login or block automated access.")

    soup = BeautifulSoup(html, "lxml")
    result: dict[str, Any] = {"title": "", "company": "", "location": "", "description": "", "source_url": url}

    # ── 1. Try JSON-LD first (most reliable, site-agnostic) ──
    jsonld = _extract_jsonld(soup)
    if jsonld:
        logger.info("JSON-LD JobPosting found")
        parsed = _parse_jsonld(jsonld)
        result.update({k: v for k, v in parsed.items() if v})

    # ── 2. Try site-specific parser to fill any gaps ──
    site_parsed: dict[str, Any] = {}
    if platform == "indeed":
        site_parsed = _parse_indeed(soup)
    elif platform == "linkedin":
        site_parsed = _parse_linkedin(soup)
    elif platform == "glassdoor":
        site_parsed = _parse_glassdoor(soup)
    elif platform == "lever":
        site_parsed = _parse_lever(soup)
    elif platform == "greenhouse":
        site_parsed = _parse_greenhouse(soup)
    else:
        site_parsed = _parse_generic(soup, html)

    # Fill only the empty fields from site-specific parse
    for k, v in site_parsed.items():
        if v and not result.get(k):
            result[k] = v

    # ── 3. Fallback: if still no description, try trafilatura ──
    if not result["description"] and platform != "generic":
        try:
            text = trafilatura.extract(html, include_tables=False, no_fallback=False) or ""
            if text:
                result["description"] = _clean(text)
        except Exception as e:
            logger.debug("trafilatura extraction failed: %s", e)
            result["description"] = _clean(soup.get_text(separator=" "))

    # ── 4. Validate ──
    if not result["title"] and not result["description"]:
        raise ValueError(
            "Could not extract job data from this URL. "
            "The page may require login (e.g., LinkedIn), use JavaScript rendering, or block automated access. "
            "Try copying the job description text manually."
        )

    return result
