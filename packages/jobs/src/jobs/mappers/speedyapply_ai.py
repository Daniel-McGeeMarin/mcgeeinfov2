"""
speedyapply/2027-AI-College-Jobs README.md — three HTML-rich tables (FAANG+, Quant, Other).
Company cells are HTML links; Posting cells are image-linked hrefs; Age is relative ("6d").
"""
from __future__ import annotations

import re
from datetime import date, timedelta

from ..mapper_abstract import MapperAbstract

_EMOJI_TO_TAG: dict[str, str] = {
    "🛂": "no_sponsorship",
    "🇺🇸": "us_citizenship_required",
    "🔒": "closed",
    "🔥": "faang_plus",
}


class SpeedyApplyAIMapper(MapperAbstract):
    SOURCE_ID = "speedyapply_ai_2027"
    SOURCE_URL = "https://raw.githubusercontent.com/speedyapply/2027-AI-College-Jobs/main/README.md"
    CONFIG = {
        "table_start_marker": "| Company",
        "multi_table": True,
        "column_mapping": {
            "Company":  "company",
            "Position": "role",
            "Location": "location",
            "Posting":  "apply_url",
            "Age":      "date_posted",
        },
        "extract_apply_url": r'href="([^"]+)"',
        "strip_html_fields": ["Company"],
        "continuation_company": "↳",
        "row_type": "summer",
    }

    def _parse_date(self, raw: str) -> str | None:
        raw = (raw or "").strip()
        m = re.match(r"^(\d+)d$", raw)
        if m:
            return (date.today() - timedelta(days=int(m.group(1)))).isoformat()
        return None

    def _compute_tags(self, row: dict, config: dict) -> list[str]:
        tags: list[str] = []
        for col in ("Company", "Position"):
            for emoji, tag_id in _EMOJI_TO_TAG.items():
                if emoji in (row.get(col) or "") and tag_id not in tags:
                    tags.append(tag_id)
        return tags
