"""
Job row schema, tag catalog, deduplication IDs, and enrichment lookup tables.
"""
from __future__ import annotations

import hashlib
import re
from urllib.parse import urlparse, urlencode, parse_qsl

TAG_CATALOG: dict[str, dict[str, str]] = {
    "no_sponsorship":        {"label": "Does NOT offer sponsorship",          "emoji": "🛂"},
    "us_citizenship_required": {"label": "Requires U.S. citizenship",         "emoji": "🇺🇸"},
    "closed":                {"label": "Application closed",                  "emoji": "🔒"},
    "faang_plus":            {"label": "FAANG+",                              "emoji": "🔥"},
    "advanced_degree":       {"label": "Advanced degree required",            "emoji": "🎓"},
    "fast_apply":            {"label": "Fast apply (Simplify/Lever/GH)",      "emoji": "⚡"},
    "high_impact":           {"label": "High-impact company",                 "emoji": "⭐"},
    "remote":                {"label": "Remote",                              "emoji": "🌐"},
}

# Query params that are tracking noise — strip before hashing the URL.
_STRIP_PARAMS: frozenset[str] = frozenset({
    "utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term",
    "ref", "source", "gh_src", "referer", "sid", "trk", "jobid",
})


def canonical_url(raw: str) -> str:
    """Strip tracking params, normalize scheme/host; return cleaned URL string."""
    raw = (raw or "").strip()
    if not raw:
        return raw
    try:
        p = urlparse(raw)
        qs = [
            (k, v) for k, v in parse_qsl(p.query, keep_blank_values=True)
            if k.lower() not in _STRIP_PARAMS
        ]
        netloc = p.netloc.lower()
        if netloc.startswith("www."):
            netloc = netloc[4:]
        cleaned = p._replace(
            scheme="https",
            netloc=netloc,
            query=urlencode(sorted(qs)),
            fragment="",
        )
        return cleaned.geturl().rstrip("/")
    except Exception:
        return raw


def _norm(s: str) -> str:
    s = (s or "").lower()
    s = re.sub(r"[^a-z0-9 ]", "", s)
    return re.sub(r"\s+", " ", s).strip()


def make_job_id(apply_url: str) -> str:
    """Stable ID: sha256(canonical_url)[:16]. One ID per unique job posting."""
    return hashlib.sha256(canonical_url(apply_url).encode()).hexdigest()[:16]


def make_fallback_id(company: str, role: str) -> str:
    """Fallback when apply_url is absent — hash of normalized company+role."""
    key = f"{_norm(company)}|{_norm(role)}"
    return hashlib.sha256(key.encode()).hexdigest()[:16]


# ---------------------------------------------------------------------------
# Enrichment lookup tables
# ---------------------------------------------------------------------------

FAST_APPLY_DOMAINS: frozenset[str] = frozenset({
    "app.simplify.jobs", "simplify.jobs",
    "jobs.lever.co",
    "boards.greenhouse.io", "job-boards.greenhouse.io",
    "jobs.ashbystudio.com", "app.ashbystudio.com",
    "apply.workable.com",
})

# JS-rendered — we can't scrape these with plain HTTP; mark as js_required.
JS_REQUIRED_DOMAINS: frozenset[str] = frozenset({
    "linkedin.com", "www.linkedin.com",
    "myworkdayjobs.com",
})

STANDARD_ATS_DOMAINS: frozenset[str] = frozenset({
    "myworkday.com", "wd1.myworkdayjobs.com", "wd3.myworkdayjobs.com",
    "wd5.myworkdayjobs.com", "wd7.myworkdayjobs.com",
    "careers.icims.com",
    "taleo.net",
    "successfactors.com",
    "brassring.com",
    "smartrecruiters.com",
    "jobvite.com",
    "hire.withgoogle.com",
    "careers.google.com",
})

HIGH_IMPACT_COMPANIES: frozenset[str] = frozenset({
    # FAANG+
    "apple", "google", "alphabet", "meta", "amazon", "netflix", "microsoft",
    # Quant / HFT
    "jane street", "citadel", "hudson river trading", "hrt", "two sigma",
    "drw", "optiver", "jump trading", "virtu", "akuna capital", "de shaw",
    "tower research", "imc trading", "sig", "susquehanna",
    # Top tech / AI
    "nvidia", "amd", "intel", "qualcomm", "arm",
    "openai", "anthropic", "deepmind", "xai", "mistral",
    "stripe", "snowflake", "databricks", "palantir", "figma", "notion",
    "vercel", "datadog", "cloudflare", "fastly", "hashicorp",
    # Consumer tech
    "uber", "lyft", "airbnb", "doordash", "instacart", "pinterest",
    "tiktok", "bytedance", "snap", "spotify",
    # Fintech / finance
    "coinbase", "robinhood", "plaid", "brex", "chime", "affirm",
    "bloomberg", "goldman sachs", "morgan stanley", "jpmorgan", "jp morgan",
})
