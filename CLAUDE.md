# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Dan McGee Marin's personal site, v2. Two goals, in tension:
1. Host live, playable demos of his personal projects.
2. Serve as a lightweight, recruiter-facing landing page.

**Explicit content constraint: this is not a second resume.** Don't add exhaustive job-history
prose or bullet points — that's what the resume PDF is for. Content here should be things *not*
already on the resume, or more personable/opinionated takes ("what I think of X"), and should favor
a working demo over a paragraph describing one. See `apps/web/src/content.js` for the current
voice/tone (first-person, informal-but-competent, short).

The previous iteration of this site lives at `../mcgeedaninfosite` (sibling directory, Hugo + R
blogdown, Bootstrap theme). It is a content/copy reference only (bio text, project descriptions,
screenshots under `content/` and `static/`, the resume PDF) — not a design reference. The new site
is React/Tailwind and intentionally looks nothing like it.

## Nix

This is a Nix system, and this repo (like Dan's other repos — `AutoJobApplyer`, `MarketMakerApp`,
`graphed`, `MCIC`) is developed through a flake. `flake.nix` at the repo root defines one devShell
providing `nodejs`, `uv`, and `python312` — enough for both `apps/web` and `apps/api` +
`packages/*`. Run internal commands (npm, uv, node, python) through it rather than assuming those
binaries are on `$PATH`:

Deliberately kept minimal to avoid Nix store bloat (this has bitten Dan before):
`nixpkgs` is pinned to `nixos-25.11` (the host's own stable channel, not `nixos-unstable`) with a
committed `flake.lock`, so it isn't drifting to a fresh revision on every `nix flake update` the way
an unpinned/unstable input would. And the shell only exposes bare interpreters/CLI tools — it does
**not** build a bespoke `python3.withPackages`/pip-in-shellHook closure the way `graphed` and
`MarketMakerApp` do. All real Python deps come from `uv` (its own cache, per the uv workspace) and
all Node deps from `npm`/`node_modules` — neither lives in the Nix store. Don't add nix-managed
language packages to this flake; if a package needs a dependency, add it via `uv add` /
`npm install`, not `pkgs.python3.withPackages`.

```bash
nix develop                      # drop into the dev shell
nix develop -c <command>         # or run a single command through it non-interactively
```

**Gotcha:** uv installs real PyPI wheels (not nixpkgs derivations) into `.venv`, so any package with
a compiled C-extension (numpy, etc.) fails at import with `ImportError: libstdc++.so.6` /
`libz.so.1` — NixOS has no `/lib` for the dynamic linker to fall back to. The shellHook exports
`LD_LIBRARY_PATH` (currently `stdenv.cc.cc.lib` + `zlib`) to cover this. If a new dependency fails
the same way, add its `.so` to that `makeLibraryPath` list rather than working around it elsewhere.

## Commands

Run these inside `nix develop` (or prefix each with `nix develop -c`):

```bash
# frontend (apps/web) — npm workspace, run from repo root or apps/web
npm run dev --workspace=apps/web      # vite dev server
npm run build --workspace=apps/web    # production build -> apps/web/dist
npm run preview --workspace=apps/web  # preview a production build

# backend (apps/api) — uv workspace (root pyproject.toml members: apps/api, packages/*)
cd apps/api && uv run uvicorn api.main:app --reload   # dev server

# work on a single package (e.g. packages/poker) without going through apps/api
uv run --package poker python -c '...'
```

There is no lint or test tooling configured yet (no eslint config, no vitest/pytest setup, no test
files) — don't assume `npm test` or `pytest` work until that's added.

## Architecture

This is a monorepo with three tiers. The key thing to understand: **`packages/*` are not a second
backend.** There is exactly one backend process (`apps/api`); each showcased project's actual logic
lives in its own `packages/<name>` library, which `apps/api` imports and mounts as routes.

```
apps/web/       React + Vite + Tailwind SPA — the only frontend, the only recruiter-facing surface
apps/api/       FastAPI backend — single deploy, imports packages/* and exposes them as routers
packages/*/     one Python library per showcased project (uv workspace members)
```

- `apps/web` is an npm workspace member (root `package.json` → `"workspaces": ["apps/web"]`).
- `apps/api` + `packages/*` form a uv workspace (root `pyproject.toml` →
  `[tool.uv.workspace] members = ["apps/api", "packages/*"]`). `apps/api/pyproject.toml` depends on
  `poker` and `resume` via `{ workspace = true }` — that's the pattern for wiring a package into the
  backend.
- CI (`.github/workflows/build.yml`) builds `apps/web` and `apps/api` as two independent Docker
  images pushed to GHCR (`mcgeeinfov2-web`, `mcgeeinfov2-api`). `apps/api/Dockerfile` builds with
  repo root as context so it can `COPY` in `packages/*` alongside `apps/api` and `uv pip install`
  them all into one image — the packages are compiled into the single API container, not deployed
  separately. **Note:** this workflow only builds and pushes images — nothing in this repo deploys
  them. Whatever pulls new images onto the actual running server lives outside this repo.
- `apps/web` and `apps/api` are two separately deployed services (not same-origin), so the frontend
  calls the API by absolute URL via `apps/web/src/api.js`'s `VITE_API_URL` (Vite build-time env var,
  defaults to `http://localhost:8000` for local dev). Set `VITE_API_URL` wherever `apps/web` is
  actually built for production to point at the real API URL — CORS in `apps/api/src/api/main.py`
  already allows `https://mcgeedan.com` as an origin, but doesn't know the API's own public URL.

**To add a new showcased project:** create `packages/<name>` as a new uv workspace member with the
ported logic, add it as a dependency of `apps/api` and mount a router for it in
`apps/api/src/api/main.py`, then add a card/section for it in `apps/web` (see `Projects.jsx` and
`content.js`). Don't stand up a separate backend or frontend per project — everything hangs off the
one API and one SPA.

### Root directory

`package.json`, `package-lock.json`, `pyproject.toml`, and `node_modules/` sit at the repo root and
are meant to stay there: npm and uv workspaces both require the workspace-root manifest to be an
ancestor of every member (`apps/web`, `apps/api`, `packages/*`), so they can't be tucked into a
subdirectory without also moving `apps/` and `packages/` underneath it. Don't try to relocate them.
A stray root-level `dist/` (a duplicate of `apps/web/dist`, left over from before the monorepo
restructure) was removed for this reason — if one reappears at the root instead of under
`apps/web/`, something is building from the wrong working directory.

### Current state

- `apps/api/src/api/main.py`: CORS middleware, `/api/health`, and the poker router
  (`apps/api/src/api/routers/poker.py`, mounted via `app.include_router`). This is the pattern for
  wiring up future packages: a router module per package, imported and included in `main.py`.
- `packages/poker` is live: `engine.py` is Dan's original `MonteCarloPoker.py`
  (`../shortProjs/MonteCarloPoker.py`) ported near-verbatim (only the bottom-level `print(...)` call
  got wrapped in `if __name__ == "__main__":` so importing the module doesn't execute it).
  `__init__.py` adds a new, separate `simulate_equity()`/`parse_card()` wrapper — it does not modify
  `engine.py`'s logic, just parameterizes what `MonteCarloSim()` hardcoded. Fronted by
  `/apps/poker` in `apps/web` (`PokerTable.jsx` + `PlayingCard`/`CardPicker` components), which
  calls the API via `apps/web/src/api.js` (`VITE_API_URL`, defaults to `http://localhost:8000`).
  **Note:** `GameEngine.runGame()`'s `max()` tie-break assigns an exact tie to the lowest-index
  hand rather than splitting equity — a pre-existing property of the original algorithm, not
  something introduced during porting.
  Every `packages/*` and `apps/api` pyproject.toml needs a `[build-system]`/`hatchling` section
  (added when this was wired up) — without one, uv treats the project as "virtual" and won't
  install its own code as an importable package, only its dependencies.
- `packages/resume` still exists as an empty stub package (`__init__.py` only, no logic ported in,
  no router mounted).
- Other sibling repos surveyed as candidates for future `packages/*` (not yet migrated):
  - `../AutoJobApplyer` — Python job-application-automation app (`app.py`, `src/`, `web/`).
  - `../MarketMakerApp` — Python `backend/` + separate `frontend/`; if folded in, its frontend
    needs to be reconciled into `apps/web` rather than kept standalone.
  - `../graphed` (lowercase) — a TypeScript VSCode extension; doesn't fit the
    package-mounted-in-FastAPI pattern, would more likely be showcased as an external link than
    ported in.
  - `../Graphed`, `../Graphed-Planning`, `../LibraryOfMestionora`, `../MCIC`, `../MCModPackDan` —
    empty, planning-only, or not portfolio-relevant (Minecraft modpack configs); not migration
    candidates.
