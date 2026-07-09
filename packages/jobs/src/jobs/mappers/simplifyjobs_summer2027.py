"""
SimplifyJobs/Summer2026-Internships (dev branch) — HTML table format.
Repo keeps its 2026 name but is updated continuously with 2027 listings.
Columns: Company | Role | Location | Application | Age
Each Application cell has two links: direct (first, non-Simplify) and Simplify button.
We always prefer the direct upstream URL for canonical deduplication.
"""
from __future__ import annotations

import re
import urllib.request

from ..date_resolution import iso_from_days_ago, iso_from_months_ago, iso_from_weeks_ago
from ..mapper_abstract import MapperAbstract
from ..schema import canonical_url, make_fallback_id, make_job_id

_SOURCE_URL = "https://raw.githubusercontent.com/SimplifyJobs/Summer2026-Internships/dev/README.md"

_EMOJI_TO_TAG: dict[str, str] = {
    "🛂": "no_sponsorship",
    "🇺🇸": "us_citizenship_required",
    "🔒": "closed",
    "🔥": "high_impact",
    "🎓": "advanced_degree",
}


def _strip_html(html: str) -> str:
    return re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", html or "")).strip()


def _extract_direct_href(html: str) -> str:
    """Return first href that is not a Simplify wrapper URL."""
    hrefs = re.findall(r'href=["\'](https?://[^"\']+)["\']', html or "")
    for h in hrefs:
        if "simplify.jobs" not in h:
            return h
    return hrefs[0] if hrefs else ""


def _parse_html_tables(content: str) -> list[dict[str, str]]:
    rows: list[dict[str, str]] = []
    for block in re.findall(r"<table>(.*?)</table>", content, re.DOTALL):
        if "Company" not in block or "Application" not in block or "Age" not in block:
            continue
        tbody = re.search(r"<tbody>(.*?)</tbody>", block, re.DOTALL)
        if not tbody:
            continue
        for tr in re.findall(r"<tr>(.*?)</tr>", tbody.group(1), re.DOTALL):
            tds = re.findall(r"<td[^>]*>(.*?)</td>", tr, re.DOTALL)
            if len(tds) < 5:
                continue
            rows.append({
                "Company":     _strip_html(tds[0]),
                "Role":        _strip_html(tds[1]),
                "Location":    _strip_html(tds[2]),
                "Application": _extract_direct_href(tds[3]) or _strip_html(tds[3]),
                "Age":         _strip_html(tds[4]),
            })
    return rows


class SimplifyJobsSummer2027Mapper(MapperAbstract):
    SOURCE_ID = "simplifyjobs_summer2027"
    SOURCE_URL = _SOURCE_URL
    CONFIG = None  # custom run()

    def _parse_date(self, raw: str) -> str | None:
        s = (raw or "").strip().lower()
        if not s or s in {"0d", "today", "just now"}:
            return iso_from_days_ago(0)
        for pattern, fn in (
            (r"^(\d+)d$",  iso_from_days_ago),
            (r"^(\d+)w$",  iso_from_weeks_ago),
            (r"^(\d+)mo$", iso_from_months_ago),
        ):
            m = re.match(pattern, s)
            if m:
                return fn(int(m.group(1)))
        return None

    def run(self) -> list[dict]:
        req = urllib.request.Request(self.SOURCE_URL, headers={"User-Agent": "mcgeeinfov2-jobs/1.0"})
        with urllib.request.urlopen(req, timeout=30) as resp:
            content = resp.read().decode("utf-8", errors="replace")

        rows = _parse_html_tables(content)
        last_company: str | None = None
        for row in rows:
            company = (row.get("Company") or "").strip()
            if company == "↳" and last_company:
                row["Company"] = last_company
            elif company and company != "↳":
                last_company = company

        result = []
        for row in rows:
            url = canonical_url(row.get("Application") or "")
            job_id = make_job_id(url) if url else make_fallback_id(row.get("Company") or "", row.get("Role") or "")
            tags: list[str] = []
            for col in ("Company", "Role"):
                for emoji, tag_id in _EMOJI_TO_TAG.items():
                    if emoji in (row.get(col) or "") and tag_id not in tags:
                        tags.append(tag_id)
            result.append({
                "id":          job_id,
                "company":     row.get("Company"),
                "role":        row.get("Role"),
                "location":    row.get("Location"),
                "apply_url":   url or None,
                "date_posted": self._parse_date(row.get("Age") or ""),
                "type":        "summer",
                "tags":        tags,
                "source_ids":  [self.SOURCE_ID],
            })
        return result
