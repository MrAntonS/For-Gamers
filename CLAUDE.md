# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Gamer Nexus is a full-stack ecommerce/deals aggregator that pulls real-time data from Steam (via CheapShark) and eBay. It surfaces game and hardware deals and includes a "MinMax" tool that recommends the minimum hardware needed to run a selected set of games.

- **Backend**: Python 3.11 / Flask + Flask-SQLAlchemy, served by Gunicorn in prod.
- **Frontend**: React 19 + Vite + TypeScript + Tailwind CSS v4, served behind Nginx in prod.
- **Database**: PostgreSQL in production, SQLite locally (auto-selected by `DATABASE_URL`).

## Commands

### Backend (run from `backend/`)
```bash
pip install -r requirements.txt
python app.py                 # dev server on http://localhost:5000 (debug, auto-reload)
python background_worker.py   # standalone deal-fetch worker (used in prod alongside Gunicorn)
```
Requires a `backend/.env` with `DATABASE_URL`, `SECRET_KEY`, `STEAM_API_KEY`, `EBAY_CLIENT_ID`, `EBAY_CLIENT_SECRET`, `EBAY_API_ENV`. Leave `DATABASE_URL` blank to fall back to local SQLite (stored under `backend/instance/`).

There is no test framework configured. The `backend/test_*.py`, `debug_*.py`, `verify_*.py`, and `inspect_db.py` files are standalone diagnostic scripts run directly with `python <file>.py`, not a pytest suite.

### Frontend (run from `frontend/`)
```bash
npm install
npm run dev      # Vite dev server on http://localhost:5173
npm run build    # tsc -b && vite build
npm run lint     # eslint
npm run preview
```
Set `VITE_API_URL=http://localhost:5000/api` in `frontend/.env` (consumed via `src/config.ts`).

### Docker
```bash
docker compose -f docker-compose.yml up --build        # local full stack
docker compose -f docker-compose.prod.yml up --build    # production compose
```

## Architecture

### Backend (`backend/`)
- **`app.py`** — `create_app()` builds the Flask app, configures logging (rotating file handler in `logs/`), runs `run_migrations()`, registers blueprints, and **starts the background deal-fetch thread**. The thread is guarded by a file lock (`instance/.background_task.lock`, via `fcntl` on Linux / `msvcrt` on Windows) so only one process runs it even under multiple Gunicorn workers. Under the Flask debug reloader it only starts in the `WERKZEUG_RUN_MAIN` process.
- **`background_task` / `background_worker.py`** — the same fetch loop (every 10 min): fetch CheapShark deals, fill in Steam game details, verify/expire stale deals, and periodically reactivate deals. `background_worker.py` is the standalone version used in production; the in-process thread in `app.py` is used for local dev.
- **`models.py`** — SQLAlchemy models: `User`, `Game`, `DealHistory`, `Hardware`.
- **`migrate_db.py`** — `run_migrations(app)` applies conservative, add-only schema changes at every startup; it inspects the schema and skips already-applied changes. Handles both SQLite and Postgres. Add schema migrations here, not as destructive ALTERs.
- **`routes/`** — Flask blueprints: `products.py` (products listing/search/pagination), `minmax.py` (`/api/minmax/games`, `/api/minmax/calculate`), `auth.py` (signup/login/logout/session, bcrypt + server sessions), `external.py`, `variations.py`.
- **`services/`** — external integrations and business logic: `steam_service.py` (CheapShark + Steam fetching/verification), `ebay_service.py` (eBay Buy API + listing deactivation), `hardware_matcher.py` (groups/matches hardware listings to specific models, e.g. "RTX 3080").
- API contract is documented in `backend/API.md`; eBay credential setup in `backend/EBAY_SETUP.md`.

### Frontend (`frontend/src/`)
- **`App.tsx`** — React Router routes (see `frontend/PAGES.md` for the route→component map): `/` (Hero), `/deals` (ProductList), `/deals/games` (GameDeals), `/deals/hardware` (HardwareDeals), `/minmax` (MinMaxTab).
- **`contexts/`** — `AuthContext` and `CartContext` provide global state.
- **`config.ts`** — central API base URL (`VITE_API_URL`).
- All API calls go to the `/api` prefix on the backend.

## CI/CD

GitHub Actions in `.github/workflows/` (`ci.yml`, `cd.yml`, `manual-diagnostics.yml`). `cd.yml` triggers on push to `main`: builds Docker images, transfers them to an Oracle Cloud VM, applies DB migrations, restarts via `docker-compose.prod.yml` behind Nginx, then health-checks. Note the default working branch here is `dev`.
