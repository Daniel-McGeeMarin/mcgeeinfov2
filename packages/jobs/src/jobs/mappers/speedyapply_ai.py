"""
speedyapply/2027-AI-College-Jobs INTERN_USA.md — AI/ML-focused internships.
Same format assumption as speedyapply_swe; same column-name caveat applies.
"""
from __future__ import annotations

from datetime import datetime

from ..date_resolution import to_iso_date
from ..mapper_abstract import MapperAbstract

_EMOJI_TO_TAG: dict[str, str] = {
    "🛂": "no_sponsorship",
    "🇺🇸": "us_citizenship_required",
    "🔒": "closed",
    "🔥": "faang_plus",
}
_DATE_FORMATS = ("%b %d, %Y", "%b %d", "%B %d, %Y", "%B %d", "%m/%d/%Y", "%Y-%m-%d")


class SpeedyApplyAIMapper(MapperAbstract):
    SOURCE_ID = "speedyapply_ai_2027"
    SOURCE_URL = "https://raw.githubusercontent.com/speedyapply/2027-AI-College-Jobs/main/INTERN_USA.md"
    CONFIG = {
        "table_start_marker": "| Company",
        "column_mapping": {
            "Company":      "company",
            "Role":         "role",
            "Location":     "location",
            "Application":  "apply_url",
            "Date Posted":  "date_posted",
        },
        "extract_apply_url": r"\[.*?\]\((https?://[^)]+)\)",
        "continuation_company": "↳",
        "row_type": "summer",
    }

    def _parse_date(self, raw: str) -> str | None:
        raw = (raw or "").strip()
        for fmt in _DATE_FORMATS:
            try:
                dt = datetime.strptime(raw, fmt)
                year = dt.year if any(t in fmt for t in ("%Y", "%y")) else None
                return to_iso_date(dt.month, dt.day, year=year)
            except ValueError:
                continue
        return None

    def _compute_tags(self, row: dict, config: dict) -> list[str]:
        tags: list[str] = []
        for col in ("Company", "Role"):
            for emoji, tag_id in _EMOJI_TO_TAG.items():
                if emoji in (row.get(col) or "") and tag_id not in tags:
                    tags.append(tag_id)
        return tags
