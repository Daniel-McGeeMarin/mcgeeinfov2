"""
Job page enrichment.
Phase 1 (free, instant): apply_type and high_impact from URL/company name.
Phase 2 (network): fetch the apply_url page and extract skills, experience, salary.

Platforms with JS-rendered pages (LinkedIn, Workday) are marked js_required and skipped.
Per-platform extractors exist for Lever and Greenhouse; everything else uses a generic
keyword scan over visible text / <li> items.
"""
from __future__ import annotations

import re
import urllib.request
import urllib.error
from typing import Any
from urllib.parse import urlparse

from .db import DB
from .schema import FAST_APPLY_DOMAINS, HIGH_IMPACT_COMPANIES, JS_REQUIRED_DOMAINS

try:
    from bs4 import BeautifulSoup
    _BS4 = True
except ImportError:
    _BS4 = False

_HEADERS = {"User-Agent": "Mozilla/5.0 (compatible; mcgeeinfov2-jobs/1.0)"}


# ---------------------------------------------------------------------------
# Phase 1: URL-pattern classification (no network)
# ---------------------------------------------------------------------------

def detect_apply_type(apply_url: str) -> str | None:
    if not apply_url:
        return None
    try:
        host = urlparse(apply_url).netloc.lower().lstrip("www.")
    except Exception:
        return None

    def matches(domain_set: frozenset[str]) -> bool:
        return host in domain_set or any(host.endswith("." + d) for d in domain_set)

    if matches(JS_REQUIRED_DOMAINS):
        return "js_required"
    if matches(FAST_APPLY_DOMAINS):
        return "fast_apply"
    return None  # unknown — will be set to "standard" after page fetch succeeds


def detect_workday(apply_url: str) -> bool:
    if not apply_url:
        return False
    try:
        host = urlparse(apply_url).netloc.lower().lstrip("www.")
        return host == "myworkdayjobs.com" or host.endswith(".myworkdayjobs.com")
    except Exception:
        return False


def detect_high_impact(company: str) -> bool:
    norm = (company or "").lower().strip()
    return norm in HIGH_IMPACT_COMPANIES or any(h in norm for h in HIGH_IMPACT_COMPANIES)


# ---------------------------------------------------------------------------
# Phase 2: page fetch + extraction
# ---------------------------------------------------------------------------

def _fetch(url: str, timeout: int = 15) -> str | None:
    try:
        req = urllib.request.Request(url, headers=_HEADERS)
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            ct = resp.headers.get("Content-Type", "")
            if "text/html" not in ct:
                return None
            return resp.read().decode("utf-8", errors="replace")
    except (urllib.error.URLError, OSError):
        return None


def _extract_lever(html: str) -> dict[str, Any]:
    out: dict[str, Any] = {}
    # Lever embeds job data as JSON in a <script> tag
    m = re.search(r'"lists"\s*:\s*(\[.*?\])', html, re.DOTALL)
    if m:
        try:
            import json
            lists = json.loads(m.group(1))
            reqs = next((l for l in lists if "requirement" in (l.get("text") or "").lower()), None)
            if reqs and reqs.get("content"):
                text = re.sub(r"<[^>]+>", " ", reqs["content"])
                out["skills"] = _skill_keywords(text)
        except Exception:
            pass
    return out


def _extract_greenhouse(html: str) -> dict[str, Any]:
    out: dict[str, Any] = {}
    if not _BS4:
        return _extract_generic(html)
    try:
        soup = BeautifulSoup(html, "html.parser")
        content = soup.find("div", {"id": "content"}) or soup.find("div", class_=re.compile(r"job-post"))
        if content:
            text = content.get_text(" ", strip=True)
            out["skills"] = _skill_keywords(text)
            out["salary_range"] = _salary(text)
    except Exception:
        pass
    return out


def _extract_generic(html: str) -> dict[str, Any]:
    if _BS4:
        try:
            soup = BeautifulSoup(html, "html.parser")
            for tag in soup(["script", "style", "nav", "header", "footer"]):
                tag.decompose()
            text = soup.get_text(" ", strip=True)
        except Exception:
            text = re.sub(r"<[^>]+>", " ", html)
    else:
        # Regex fallback: text from <li> items (usually contains requirements)
        items = re.findall(r"<li[^>]*>(.*?)</li>", html, re.DOTALL)
        text = " ".join(re.sub(r"<[^>]+>", " ", i) for i in items)

    return {
        "skills":       _skill_keywords(text),
        "salary_range": _salary(text),
    }


_SKILLS = [
    "python", "java", "c++", "c#", "javascript", "typescript", "go", "rust",
    "r", "scala", "kotlin", "swift", "matlab",
    "react", "vue", "angular", "node.js", "django", "fastapi", "flask", "spring",
    "sql", "postgresql", "mysql", "mongodb", "redis", "elasticsearch",
    "aws", "gcp", "azure", "docker", "kubernetes", "terraform",
    "machine learning", "deep learning", "pytorch", "tensorflow", "spark",
    "data structures", "algorithms", "system design", "distributed systems",
    "linux", "git", "ci/cd",
]


def _skill_keywords(text: str) -> list[str]:
    lower = text.lower()
    return [s for s in _SKILLS if s in lower]


_SALARY_RE = re.compile(
    r"\$\s*\d{2,3}[,.]?\d{0,3}\s*(?:k|,000)?\s*(?:[-–—]|to)\s*\$?\s*\d{2,3}[,.]?\d{0,3}\s*(?:k|,000)?",
    re.IGNORECASE,
)


def _salary(text: str) -> str | None:
    m = _SALARY_RE.search(text)
    return m.group(0).strip() if m else None


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def enrich_job(job: dict) -> dict[str, Any]:
    """Return enrichment data dict ready for DB.update_enrichment()."""
    apply_url = job.get("apply_url") or ""
    company = job.get("company") or ""

    apply_type = detect_apply_type(apply_url)
    new_tags: list[str] = []

    if detect_workday(apply_url):
        new_tags.append("workday")

    if apply_type == "js_required":
        return {"apply_type": "js_required", "enrichment_status": "js_required", "new_tags": new_tags}

    if apply_type == "fast_apply":
        new_tags.append("fast_apply")

    if detect_high_impact(company):
        new_tags.append("high_impact")

    if not apply_url:
        return {"apply_type": apply_type, "enrichment_status": "done", "new_tags": new_tags}

    html = _fetch(apply_url)
    if html is None:
        return {"apply_type": apply_type, "enrichment_status": "failed", "new_tags": new_tags}

    host = urlparse(apply_url).netloc.lower()
    if "lever.co" in host:
        extracted = _extract_lever(html)
    elif "greenhouse.io" in host:
        extracted = _extract_greenhouse(html)
    else:
        extracted = _extract_generic(html)

    return {
        "apply_type":       apply_type or "standard",
        "skills":           extracted.get("skills") or [],
        "experience":       extracted.get("experience"),
        "salary_range":     extracted.get("salary_range"),
        "enrichment_status": "done",
        "new_tags":         new_tags,
    }


def run_enrichment_pass(db: DB, limit: int = 50) -> dict[str, int]:
    """Enrich up to `limit` unenriched jobs. Returns counts by status."""
    jobs = db.get_unenriched_jobs(limit=limit)
    counts: dict[str, int] = {}
    for job in jobs:
        try:
            result = enrich_job(job)
            db.update_enrichment(job["id"], result)
            status = result.get("enrichment_status", "done")
        except Exception:
            db.update_enrichment(job["id"], {"enrichment_status": "failed"})
            status = "failed"
        counts[status] = counts.get(status, 0) + 1
    return counts
