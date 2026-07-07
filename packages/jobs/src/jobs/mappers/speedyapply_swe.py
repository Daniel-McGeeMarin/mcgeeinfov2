"""
speedyapply/2027-SWE-College-Jobs INTERN_USA.md — markdown pipe table.
Updated daily. Column names assumed from SpeedyApply conventions; if the mapper
returns 0 rows, fetch the raw README and compare actual header names to CONFIG.
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

# Try multiple header variants — SpeedyApply may use slightly different column names.
# table_start_marker is intentionally broad so we catch whichever header line is used.
_DATE_FORMATS = ("%b %d, %Y", "%b %d", "%B %d, %Y", "%B %d", "%m/%d/%Y", "%Y-%m-%d")


class SpeedyApplySWEMapper(MapperAbstract):
    SOURCE_ID = "speedyapply_swe_2027"
    SOURCE_URL = "https://raw.githubusercontent.com/speedyapply/2027-SWE-College-Jobs/main/INTERN_USA.md"
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
