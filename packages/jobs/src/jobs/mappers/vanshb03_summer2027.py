"""
vanshb03/Summer2027-Internships README (dev branch) — markdown pipe table.
Columns: Company | Role | Location | Application/Link | Date Posted
"""
from __future__ import annotations

from datetime import datetime

from ..date_resolution import to_iso_date
from ..mapper_abstract import MapperAbstract

_EMOJI_TO_TAG: dict[str, str] = {
    "🛂": "no_sponsorship",
    "🇺🇸": "us_citizenship_required",
    "🔒": "closed",
}
_DATE_FORMATS = ("%b %d", "%B %d", "%m/%d/%Y", "%m/%d", "%Y-%m-%d", "%d-%b")


class Vanshb03Summer2027Mapper(MapperAbstract):
    SOURCE_ID = "vanshb03_summer2027"
    SOURCE_URL = "https://raw.githubusercontent.com/vanshb03/Summer2027-Internships/dev/README.md"
    CONFIG = {
        "table_start_marker": "| Company |",
        "column_mapping": {
            "Company": "company",
            "Role": "role",
            "Location": "location",
            "Application/Link": "apply_url",
            "Date Posted": "date_posted",
        },
        "extract_apply_url": r"\[Apply\]\((https?://[^)]+)\)",
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
        for emoji, tag_id in _EMOJI_TO_TAG.items():
            if emoji in (row.get("Role") or "") and tag_id not in tags:
                tags.append(tag_id)
        return tags
