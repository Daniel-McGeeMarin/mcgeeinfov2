# jobs package — implementation plan

**Purpose:** Aggregate tech internship listings from multiple GitHub sources, enrich them with AI-powered tagging, and present a personal application queue — all integrated into the mcgeeinfov2 monorepo as `packages/jobs` + an API router + a React view.

---

## What this is (and is NOT)

This is a **personal tool for Dan** hosted on the same site as the rest of mcgeeinfov2. It is not a public job board. The backend aggregates listings from open GitHub repos, runs enrichment, and exposes a private-ish API. The frontend lives inside `apps/web` alongside the poker demo and other projects.

It is **not** a resume-style feature for recruiters — the recruiter-facing site surface is minimal (maybe one card linking to it). The depth is for Dan's own use.

---

## Architecture in the monorepo

```
packages/jobs/          <- this package, uv workspace member
  src/jobs/
    schema.py           <- job row schema + tag catalog
    ingester.py         <- runs mappers, persists to DB
    mapper_abstract.py  <- base class for all mappers
    mappers/            <- one file per source
      vanshb03_summer2027.py
      vanshb03_offseason2027.py
      simplifyjobs_summer2027.py   (if/when repo exists)
      speedyapply_swe.py
      speedyapply_ai.py
      ... etc
    enrichment.py       <- job page scraping + enrichment pipeline
    db.py               <- SQLite layer (replaces AppData JSON)
    queue.py            <- application queue management

apps/api/src/api/routers/jobs.py   <- FastAPI router, mounts here
apps/web/src/views/Jobs.jsx        <- React view
apps/web/src/views/JobQueue.jsx    <- queue management view
```

`packages/jobs` follows the same pattern as `packages/poker`: add it to `apps/api/pyproject.toml` as a workspace dependency, import it in `apps/api/src/api/main.py`, mount the router at `/api/jobs`.

---

## Data model

### Deduplication design

The same internship posting often appears across multiple sources simultaneously (e.g., Google SWE Intern in vanshb03, SimplifyJobs, and SpeedyApply). The solution is **one row per unique job, identified by its canonical apply URL** — sources become a field on the row, not the key.

**Why URL-based, not company+role:**
- Same job = same URL. Title phrasing varies across sources ("SWE Intern" vs "Software Engineer Intern 2027") but the Greenhouse/Lever/Workday URL is stable and unambiguous.
- No fuzzy matching needed. Hash of cleaned URL is exact.
- Better precision: Google posts 50 different intern roles; company+role conflates them. Each has a distinct URL.

**Why Simplify wrapper URLs are not a problem:**
The SimplifyJobs README has two apply buttons per row — a direct link (Greenhouse/Lever/etc.) and a Simplify auto-fill button. The existing mapper already extracts the **first href**, which is the direct upstream URL. So `apply_url` from SimplifyJobs is already canonical, same as what vanshb03 would list for the same job. No redirect-following needed.

**Single ID:**

```python
import hashlib, re
from urllib.parse import urlparse, urlencode, parse_qsl

# Tracking/noise params to strip before hashing
_STRIP_PARAMS = {"utm_source", "utm_medium", "utm_campaign", "utm_content",
                 "utm_term", "ref", "source", "gh_src", "referer", "sid"}

def canonical_url(raw: str) -> str:
    """Strip tracking params, normalize scheme+host, return cleaned URL string."""
    try:
        p = urlparse(raw.strip())
        qs = [(k, v) for k, v in parse_qsl(p.query) if k.lower() not in _STRIP_PARAMS]
        cleaned = p._replace(
            scheme="https",
            netloc=p.netloc.lower().lstrip("www."),
            query=urlencode(sorted(qs)),
            fragment="",
        )
        return cleaned.geturl().rstrip("/")
    except Exception:
        return raw.strip()

def make_job_id(apply_url: str) -> str:
    """Stable ID: sha256 of the canonical apply URL, hex[:16]."""
    return hashlib.sha256(canonical_url(apply_url).encode()).hexdigest()[:16]
```

**Fallback for listings with no URL yet:** a small number of listings are posted without a link ("Coming soon"). For these, fall back to `sha256(company_norm + "|" + role_norm)[:16]`. These are second-class rows — they should be updated to URL-keyed once a link appears (match on company+role, merge).

**Ingestion upsert logic:**
- On each ingest: compute `id = make_job_id(apply_url)` for each row
- If `id` exists in DB: update `source_ids` (add this source to the set), update `last_seen_at`, update any fields that are now more complete (e.g., better date)
- If `id` is new: insert fresh row
- **Never delete rows.** `last_seen_at` gets stale for jobs that drop off sources — UI can dim/filter these, but they stay in the DB permanently. Once in, always in.

**`source_ids` field:** a JSON list of which sources have seen this job, e.g. `["vanshb03_summer2027", "simplifyjobs_summer2027"]`. Updated on every ingest that sees the job. The UI can show "seen in 3 sources" as a confidence signal.

### Universal job row (upgrade from old schema)

```python
UNIVERSAL_JOB_ROW_KEYS = [
    "id",              # sha256(canonical_url)[:16] — one row per unique job posting
    "company",
    "role",
    "location",
    "apply_url",       # canonical (cleaned) apply URL
    "date_posted",     # ISO YYYY-MM-DD — best value seen across sources
    "type",            # "summer" | "new_grad" | "offseason"
    "source_ids",      # JSON list — all sources that have listed this job
    "tags",            # union of tags seen across all sources
    "first_seen_at",   # ISO timestamp — when first ingested
    "last_seen_at",    # ISO timestamp — last time any source included this job
    # enrichment fields (null until page scrape runs):
    "skills",          # list of strings extracted from the job page
    "experience",      # "entry" | "mid" | "senior" | null
    "apply_type",      # "fast_apply" | "standard" | "js_required" | null
    "salary_range",    # string or null, e.g. "$120k–$160k"
    "enriched_at",     # ISO timestamp or null
    "enrichment_status", # null | "done" | "failed" | "js_required"
]
```

### Tag catalog upgrades

Keep the old tags from `schema.TAG_CATALOG`, add:
- `fast_apply` — Simplify button / Lever / Greenhouse single-page apply detected
- `high_impact` — company on a maintained "tier 1" list (FAANG+, top quant, top SaaS)
- `new_grad` — role is explicitly new grad (sometimes mislabeled as internship)
- `remote` — location is fully remote

Term tags (`term_*`) stay as dynamic tags (not enumerated), same convention as old code.

### Persistence: SQLite (not JSON)

Replace `AppData`'s JSON flat file with SQLite via Python's built-in `sqlite3`. Three tables:

- `jobs` — all aggregated job rows (upserted by `id`)
- `queue` — Dan's personal application queue (`id` FK, `status`, `priority`, `notes`, `added_at`)
- `ingester_state` — mapper last_run timestamps, persisted across restarts

SQLite gives us proper filtering/sorting queries (e.g., `WHERE "fast_apply" IN tags`) without loading thousands of rows into memory. No ORM needed — raw SQL for this scale.

---

## Ingestion system

### What to keep from old code

The `MapperAbstract` + CONFIG pattern from `src/mapper_abstract.py` is actually solid. Keep the concept:
- `CONFIG` dict drives markdown pipe table → universal rows (zero code for well-behaved sources)
- Custom `run()` override for HTML tables or unusual formats (SimplifyJobs pattern)
- `_compute_tags(row, config)` hook for per-source tag parsing
- `_parse_date_posted(raw)` hook per mapper (each source has its own format)

The `date_resolution.py` helpers (`to_iso_date`, `iso_from_days_ago`, etc.) are clean — port them verbatim.

### What to rewrite

1. **No Flask** — FastAPI only, matching the monorepo's API server
2. **No mapper registration via a global `_register` decorator** — too implicit. Instead: a plain `MAPPERS` list in `mappers/__init__.py` that's imported explicitly. Easier to read and test.
3. **No `create_mapper_instance(type_id, name)` factory** — the old code's "add mapper by name at runtime" UI was overengineered for a personal tool. Pre-register all active mappers at startup; the API exposes run-controls and status, not mapper CRUD.
4. **SQLite over JSON** — see above.

### GitHub-linking feature (beta/extra)

**Primary mapping method is the hardcoded mappers** for vanshb03, SimplifyJobs, SpeedyApply, etc. This feature is a convenience for adding new sources without writing Python. Implement it, but don't let it block v1.

The flow:
1. User navigates to the "Add source" form in the UI
2. User clicks **"Copy AI prompt"** — copies a pre-engineered prompt to clipboard (no backend call needed; this is a static string baked into the frontend)
3. User opens any AI of their choice, pastes the prompt + the raw GitHub README URL/content
4. AI returns a mapping blob in the expected JSON format (the prompt instructs it on the exact schema)
5. User pastes the mapping blob into the text box in the UI
6. Backend validates it (checks required keys, known column names, etc.) and saves it as a custom mapper
7. System runs the new mapper immediately

**Mapping format (the paste target):**
```json
{
  "source_id": "my_custom_source",
  "source_url": "https://raw.githubusercontent.com/org/repo/branch/README.md",
  "table_format": "markdown_pipe" | "html_table",
  "column_mapping": {
    "Company": "company",
    "Role": "role",
    "Location": "location",
    "Application/Link": "apply_url",
    "Date Posted": "date_posted"
  },
  "extract_apply_url": "[optional regex to pull URL from the cell, e.g. \\[Apply\\]\\((https?://[^)]+)\\)]",
  "continuation_company": "↳",
  "row_type": "summer" | "new_grad" | "offseason",
  "date_formats": ["%b %d", "%Y-%m-%d"],
  "tag_emoji_map": {
    "🛂": "no_sponsorship",
    "🔒": "closed"
  },
  "tag_source_columns": ["Role"]
}
```

**The "Copy AI prompt" button** generates a prompt that:
- Explains the mapping format schema above with field-by-field descriptions
- Tells the AI to inspect the README table headers and match them to universal keys
- Asks it to detect the date format, emoji tags, continuation pattern, and table format
- Returns only the JSON blob, no explanation (paste-ready)

The prompt is a static template string in the frontend — no backend involvement. Engineer it carefully upfront so the AI output is reliably valid on the first try. Include a few worked examples of known mappings (vanshb03, SpeedyApply) as few-shot examples in the prompt body.

Backend validation on paste: check that `source_url` is reachable, `column_mapping` has at least `company` and `apply_url`, `row_type` is a known value. Return specific error messages so the user knows what to fix.

---

## Enrichment pipeline

Runs as a background step after ingestion (or on-demand). For each newly ingested row with `enriched_at = null`:

1. **`apply_type` detection — URL pattern (free, instant):** inspect `apply_url` domain/path before even fetching anything:
   - `simplify.jobs` or `app.simplify.jobs` → `fast_apply`
   - `jobs.lever.co`, `boards.greenhouse.io` → `fast_apply` (single-page forms)
   - Workday (`myworkday.com`), Taleo, iCIMS, SAP SuccessFactors → `standard`
   - Unknown → null (will be filled in after page fetch below)

2. **`high_impact` tag — curated list (free, instant):** hardcoded set of company name patterns. Seed list: FAANG+, top quant (Jane Street, Citadel, HRT, Two Sigma, DRW, Optiver), top SaaS (Stripe, Snowflake, Databricks, Palantir, etc.). Stored as a plain Python set in the package — easy to extend.

3. **Job page scraping — HTTP fetch + parsing:** actually retrieve the `apply_url` and extract structured data from the posting. This is the primary enrichment mechanism. Engineering notes:
   - Start with `httpx` (async, better than `urllib`) + `BeautifulSoup` for HTML parsing
   - Most ATS platforms have predictable DOM structure — write per-platform extractors (Lever, Greenhouse, Workday, LinkedIn, etc.) keyed by the `apply_type` already detected
   - Fallback: regex over the raw HTML to extract common patterns (e.g., skill keywords from `<li>` items in a requirements section)
   - Extract: `skills` (list), `experience_level`, `salary_range` (if present), `full_description` (truncated to ~500 chars for display)
   - Rate-limit: 1 req/sec per domain, respect `robots.txt` — these are public job pages
   - Some pages will be JS-rendered (especially Workday, LinkedIn) and won't work with plain HTTP. For those, mark `enrichment_status = "js_required"` and skip rather than blocking on Playwright/headless browser. That's a later problem.
   - Cache the raw fetched HTML in the DB so re-enrichment doesn't re-fetch

4. **Failure handling:** if a page fetch fails (404, redirect loop, JS wall), set `enrichment_status = "failed"` with an error code. Don't retry more than twice. The row is still useful — it just has no enrichment.

---

## Application queue

Minimal but useful. Each entry in `queue`:
- `job_id` — FK to `jobs.id` (the canonical URL hash). Since there's one row per job, this is unambiguous. If sources all drop the listing, the row still exists in the DB (never deleted), so the FK is never dangling.
- `status` — `"saved"` | `"applied"` | `"interviewing"` | `"rejected"` | `"offer"`
- `priority` — int (1–5, user-set)
- `notes` — freetext
- `added_at`, `updated_at` — timestamps

API routes:
- `GET /api/jobs/queue` — return queue with joined job data
- `POST /api/jobs/queue` — add a job to queue `{"job_id": "...", "priority": 3}`
- `PATCH /api/jobs/queue/{job_id}` — update status/priority/notes
- `DELETE /api/jobs/queue/{job_id}` — remove from queue

UI: a separate tab/view from the job browser. Think kanban-lite: columns for each status. Drag-and-drop is nice-to-have but not required for v1 — a dropdown is fine.

---

## API routes (FastAPI router)

Mounted at `/api/jobs` in `apps/api/src/api/main.py`.

```
GET  /api/jobs                  list/search jobs (filter: type, tags, source, q)
GET  /api/jobs/{id}             single job detail
GET  /api/jobs/sources          list active mapper sources + last_run
POST /api/jobs/refresh          trigger full re-ingestion (background task)
POST /api/jobs/refresh/{source} trigger one source refresh
POST /api/jobs/enrich           trigger enrichment pass on unenriched rows

GET  /api/jobs/queue            Dan's application queue
POST /api/jobs/queue            add to queue
PATCH /api/jobs/queue/{job_id}  update queue entry
DELETE /api/jobs/queue/{job_id} remove from queue

POST /api/jobs/sources/custom   validate + save a custom mapper from a pasted mapping blob
```

Auth: **this entire tool is locked behind Authelia at the reverse proxy level.** Do not add any in-app auth — Authelia handles it before requests reach the API or frontend. This means:
- No API keys, no login forms, no session handling in the FastAPI router or React views.
- The Authelia policy (configured on the server, outside this repo) should gate both `apps/web /jobs*` and `apps/api /api/jobs*`.
- Do not expose the queue or job browser publicly until deliberately removed from Authelia config.
- The "this is a personal site" caveat in the README card should say "private tool" rather than linking directly — or omit the link entirely for now.

---

## Frontend (apps/web)

Two views, linked from the main nav or the projects section:

### Job Browser (`/jobs`)
- Filters sidebar: type (summer/new_grad/offseason), tags, source, search by company/role
- Table/card list with: company, role, location, date posted, tags (badges), apply link
- "Add to queue" button per row
- "Refresh" button triggers `/api/jobs/refresh` (shows spinner)

### Queue (`/jobs/queue`)
- Shows Dan's saved applications in status columns
- Each card: company, role, priority, notes field, status dropdown
- Quick-apply link to `apply_url`

These are for Dan's personal use — they don't need to be recruiter-polished. Tailwind utility classes, consistent with the rest of the site's dark theme.

---

## Known sources for Summer 2027

These are the repos to build mappers for. All found via web search as of July 2026:

### High priority (same orgs as old tool, same formats expected)

| Source | Repo | Format | Notes |
|--------|------|--------|-------|
| `vanshb03_summer2027` | [vanshb03/Summer2027-Internships](https://github.com/vanshb03/Summer2027-Internships) (branch: `dev`, file: `README.md`) | Markdown pipe table | Same format as 2026 predecessor — `Company | Role | Location | Application/Link | Date Posted` |
| `vanshb03_offseason2027` | Same repo, file `OFFSEASON_README.md` | Markdown pipe table | Offseason (fall/spring/winter) |
| `simplifyjobs_summer2027` | [SimplifyJobs/Summer2026-Internships](https://github.com/SimplifyJobs/Summer2026-Internships) (branch: `dev`) — repo keeps its 2026 name but is updated continuously with 2027 listings | HTML tables | Same HTML table format as before — `Company | Role | Location | Application | Age` |

### Medium priority (new sources found for 2027)

| Source | Repo | Format | Notes |
|--------|------|--------|-------|
| `speedyapply_swe` | [speedyapply/2027-SWE-College-Jobs](https://github.com/speedyapply/2027-SWE-College-Jobs) | Multiple markdown files (`INTERN_INTL.md`, `NEW_GRAD_USA.md`, etc.) | Updated daily; separate files for intern vs new grad, US vs intl |
| `speedyapply_ai` | [speedyapply/2027-AI-College-Jobs](https://github.com/speedyapply/2027-AI-College-Jobs) | Likely same as above | AI/ML-focused roles |
| `sndsh404_summer2027` | [sndsh404/summer-2027-internships](https://github.com/sndsh404/summer-2027-internships) | Unknown — inspect README | Software, data/ML, hardware, quant, product |

### Low priority / investigate first

| Source | Repo | Notes |
|--------|------|-------|
| `zapplyjobs` | [zapplyjobs/Internships-2027](https://github.com/zapplyjobs/Internships-2027) | Unknown format and update cadence |
| `zshah101` | [zshah101/summer-2027-fall-2026-internships](https://github.com/zshah101/summer-2027-fall-2026-internships) | "Automated engine" — may require different parsing |

**When building a mapper, always fetch the raw README first and inspect the actual table format before writing code.** The URLs above for raw content will follow the pattern `https://raw.githubusercontent.com/{org}/{repo}/{branch}/README.md`.

---

## What to port from old code vs rewrite

| Old module | Decision | Reasoning |
|------------|----------|-----------|
| `src/schema.py` | Port + extend | Schema concept is solid; add `id`, enrichment fields, new tags |
| `src/date_resolution.py` | Port verbatim | Pure, clean, well-tested math helpers |
| `src/mapper_abstract.py` | Port + clean | Remove ABCMeta boilerplate, simplify `_register` pattern |
| `src/mappers/summer2026_*` | New files only | URLs change, type IDs change; don't copy-paste stale code |
| `src/mappers/simplifyjobs_*` | Rewrite for 2027 | Same parsing approach, new URL |
| `src/ingester.py` | Rewrite | Replace `AppData` calls with SQLite; drop mapper CRUD API |
| `src/appdata.py` | Replace with `db.py` | SQLite > JSON for this use case |
| `app.py` (Flask) | Discard | FastAPI router in `apps/api/routers/jobs.py` |
| `web/` (old React) | Discard | New views live in `apps/web/src/views/` |

---

## Implementation order (suggested)

1. **Schema + DB** — `schema.py` and `db.py` with SQLite. Get the data model right before writing any mappers.
2. **Ingester core** — `ingester.py` that can run a list of mappers and upsert to DB.
3. **First two mappers** — `vanshb03_summer2027.py` (markdown table, simplest) and `simplifyjobs_summer2027.py` (HTML table, same pattern as old code). Verify data flows end-to-end.
4. **FastAPI router** — thin routes for list/refresh/queue. Wire into `apps/api`.
5. **React job browser** — basic table with filters. Get the happy path working.
6. **Enrichment pipeline** — `apply_type` detection first (no API cost), then `high_impact` list, then Claude Haiku skills/experience.
7. **Queue UI** — `JobQueue.jsx` view.
8. **GitHub-linking feature** — `probe-github` endpoint + column-mapper form. This is the most novel piece; build it after everything else works.
9. **Remaining mappers** — add `speedyapply_swe`, `speedyapply_ai`, `sndsh404`, etc. once the mapper base class is stable.

---

## Open questions to resolve before coding

1. **SimplifyJobs repo name** — confirmed: `SimplifyJobs/Summer2026-Internships` keeps its name and is just updated in place. Point the mapper at the existing repo/dev branch. No rename expected.
2. **SpeedyApply table format** — inspect `INTERN_USA.md` in `speedyapply/2027-SWE-College-Jobs` to see if it's markdown pipe tables or something else before writing the mapper.
3. **Authelia config** — both `/jobs*` (web) and `/api/jobs*` (API) need to be added to the Authelia policy on the server. Confirm this is in place before any data goes into the queue. The app itself does zero auth — Authelia is the perimeter.
4. **Enrichment scheduling** — does refresh run on a schedule (cron via FastAPI background scheduler) or only when Dan manually hits "Refresh"? For v1, manual is fine.
