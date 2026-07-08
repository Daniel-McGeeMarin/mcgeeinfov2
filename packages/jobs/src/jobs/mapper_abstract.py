"""
Base mapper. Subclasses set SOURCE_ID, SOURCE_URL, and CONFIG.
CONFIG-driven mappers get markdown pipe table → universal row parsing for free.
Override run() for HTML tables or unusual formats.
"""
from __future__ import annotations

import re
import urllib.request
from typing import Any

from .schema import canonical_url, make_fallback_id, make_job_id


class MapperAbstract:
    SOURCE_ID: str = ""
    SOURCE_URL: str = ""
    CONFIG: dict[str, Any] | None = None

    def run(self) -> list[dict[str, Any]]:
        if self.CONFIG is None:
            return self._run_custom()
        md = self._fetch_text(self.SOURCE_URL)
        raw_rows = self._parse_markdown_table(md, self.CONFIG)
        # Resolve continuation rows (e.g. "↳" means same company as previous)
        cont = self.CONFIG.get("continuation_company")
        mapping = self.CONFIG.get("column_mapping") or {}
        company_src = next((k for k, v in mapping.items() if v == "company"), None)
        last_company: str | None = None
        for row in raw_rows:
            val = (row.get(company_src) or "").strip() if company_src else ""
            if cont and val == cont:
                if last_company:
                    row[company_src] = last_company
            elif val:
                last_company = val
        return [self._to_universal(row, self.CONFIG) for row in raw_rows]

    def _run_custom(self) -> list[dict[str, Any]]:
        raise NotImplementedError("Set CONFIG or override run()")

    def _fetch_text(self, url: str) -> str:
        req = urllib.request.Request(url, headers={"User-Agent": "mcgeeinfov2-jobs/1.0"})
        with urllib.request.urlopen(req, timeout=30) as resp:
            return resp.read().decode("utf-8", errors="replace")

    def _parse_markdown_table(self, md: str, config: dict) -> list[dict[str, str]]:
        marker = config.get("table_start_marker") or "|"
        lines = md.splitlines()
        rows: list[dict[str, str]] = []

        if config.get("multi_table"):
            i = 0
            while i < len(lines):
                ln = lines[i]
                if marker in ln and ln.strip().startswith("|"):
                    headers = [c.strip() for c in ln.split("|")[1:-1]]
                    i += 2  # skip separator row
                    while i < len(lines) and lines[i].strip().startswith("|"):
                        cells = [c.strip() for c in lines[i].split("|")[1:-1]]
                        cells = (cells + [""] * len(headers))[: len(headers)]
                        rows.append(dict(zip(headers, cells)))
                        i += 1
                else:
                    i += 1
            return rows

        start = next(
            (i for i, ln in enumerate(lines) if marker in ln and ln.strip().startswith("|")),
            None,
        )
        if start is None:
            return []
        headers = [c.strip() for c in lines[start].split("|")[1:-1]]
        for ln in lines[start + 2:]:
            if not ln.strip().startswith("|"):
                break
            cells = [c.strip() for c in ln.split("|")[1:-1]]
            cells = (cells + [""] * len(headers))[: len(headers)]
            rows.append(dict(zip(headers, cells)))
        return rows

    def _to_universal(self, row: dict[str, str], config: dict) -> dict[str, Any]:
        mapping = config.get("column_mapping") or {}
        out: dict[str, Any] = {
            "company": None, "role": None, "location": None,
            "apply_url": None, "date_posted": None,
            "type": config.get("row_type"),
            "tags": [], "source_ids": [self.SOURCE_ID],
        }
        strip_html = config.get("strip_html_fields") or []
        for src_key, universal_key in mapping.items():
            val = row.get(src_key) or ""
            if src_key in strip_html and val:
                val = re.sub(r"<[^>]+>", "", val).strip()
            if universal_key == "apply_url" and val:
                extract_re = config.get("extract_apply_url")
                if extract_re:
                    patterns = [extract_re] if isinstance(extract_re, str) else extract_re
                    for pat in patterns:
                        m = re.search(pat, val)
                        if m:
                            val = m.group(1)
                            break
                # Fallback: pull href from inline HTML
                if val and ("href=" in val or "<a " in val):
                    m = re.search(r'href=["\']([^"\']+)["\']', val)
                    if m:
                        val = m.group(1)
            out[universal_key] = val or None

        if out.get("apply_url"):
            out["apply_url"] = canonical_url(out["apply_url"])
            out["id"] = make_job_id(out["apply_url"])
        else:
            out["id"] = make_fallback_id(out.get("company") or "", out.get("role") or "")

        if out.get("date_posted"):
            out["date_posted"] = self._parse_date(out["date_posted"]) or None

        if callable(getattr(self, "_compute_tags", None)):
            out["tags"] = self._compute_tags(row, config) or []

        return out

    def _parse_date(self, raw: str) -> str | None:
        return None
