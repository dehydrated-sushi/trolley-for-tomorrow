# Trolley for Tomorrow — Project Status

**Last updated:** 2026-04-03

---

## What Has Been Built

### Backend Core Infrastructure (`backend/core/`)

| Component | File | What It Does |
|-----------|------|-------------|
| App Factory | `backend/app.py` | `create_app()` initialises Flask, extensions, error handlers, auto-discovers module blueprints, exposes `GET /health` |
| Config | `backend/core/config.py` | Loads all settings from `.env` via python-dotenv. Rewrites `postgres://` and `postgresql://` URIs to `postgresql+psycopg://` for psycopg3 driver |
| Database | `backend/core/database.py` | Shared SQLAlchemy instance |
| Auth | `backend/core/auth.py` | Shared JWTManager instance |
| Error Handlers | `backend/core/errors.py` | JSON error responses for 400, 401, 403, 404, 500 |

### Backend Security Layer (`backend/security/`)

| Component | File | What It Does |
|-----------|------|-------------|
| JWT Helpers | `backend/security/jwt.py` | Custom JWT error handlers (expired, invalid, missing, revoked tokens). `generate_access_token()` utility |
| Rate Limiter | `backend/security/rate_limiter.py` | 100 requests/min global limit, 5 requests/min login limit, in-memory storage |
| Input Sanitiser | `backend/security/sanitiser.py` | `strip_whitespace()`, `strip_html_tags()`, `sanitise_string()`, `is_valid_email()`, `is_valid_password()` (min 8 chars, must contain digit) |

### Dependencies (`backend/requirements.txt`)

| Package | Version | Purpose |
|---------|---------|---------|
| Flask | 3.1.1 | Web framework |
| Flask-SQLAlchemy | 3.1.1 | ORM |
| Flask-JWT-Extended | 4.7.1 | JWT authentication |
| Flask-Cors | 5.0.1 | CORS handling |
| Flask-Bcrypt | 1.0.1 | Password hashing |
| Flask-Limiter | 3.12 | Rate limiting |
| python-dotenv | 1.1.0 | Env file loading |
| psycopg[binary] | 3.3.3 | PostgreSQL driver (v3, used because psycopg2 has no wheels for Python 3.14) |
| gunicorn | 23.0.0 | Production WSGI server |
| pytest | 8.3.5 | Testing |

### Environment Variables (`.env.example`)

| Variable | Example Value |
|----------|--------------|
| `FLASK_ENV` | `development` |
| `SECRET_KEY` | `change-me-to-a-random-secret` |
| `DATABASE_URL` | `postgresql://user:password@host:5432/dbname` |
| `JWT_SECRET_KEY` | `change-me-to-a-random-jwt-secret` |
| `JWT_ACCESS_TOKEN_EXPIRES_MINUTES` | `30` |
| `CORS_ORIGINS` | `http://localhost:3000` |

### Tests — 62 total, all passing

**Core tests (`backend/tests/`) — 25 tests:**

| File | Count | Covers |
|------|-------|--------|
| `test_health.py` | 3 | Status code, JSON body, content type |
| `test_config.py` | 7 | All config values, postgres:// URI rewriting, CORS parsing |
| `test_database.py` | 3 | SQLAlchemy instance, connection, table CRUD roundtrip |
| `test_auth.py` | 4 | Token creation, identity encoding, rejection without token, acceptance with token |
| `test_cors.py` | 3 | Allowed origins, blocked unknown origins |
| `test_errors.py` | 5 | All error handlers return correct status + JSON |

**Security tests (`backend/security/tests/`) — 37 tests:**

| File | Count | Covers |
|------|-------|--------|
| `test_jwt.py` | 6 | Token generation, missing/invalid/expired token handling, valid token access |
| `test_rate_limiter.py` | 4 | Limiter instance, general rate limit, login rate limit (429 after 5 attempts) |
| `test_sanitiser.py` | 27 | Whitespace stripping (5), HTML tag removal (5), string sanitisation (2), email validation (9), password validation (7) |

### Project Scaffolding (structure created, files empty)

**Backend modules (`backend/modules/`):**
- `auth/` — models.py, routes.py, schemas.py, service.py
- `fridge/` — same structure
- `meal_plan/` — same structure
- `profile/` — same structure
- `receipt/` — same structure
- `shopping_list/` — same structure
- `waste_tracker/` — same structure

**Recommendation engine (`backend/recommendation/`):**
- `food_score/` — calculator.py, guidelines.py
- `meal_ranker/` — affordability.py, feasibility.py, nutrition.py, ranker.py
- `ocr_engine/` — matcher.py, parser.py
- `waste_calculator/` — calculator.py

**Frontend (`frontend/`):**
- `public/` — empty
- `src/shared/` — api/, components/, context/, hooks/, utils/
- `src/modules/` — auth, fridge, meal_plan, profile, receipt, shopping_list, waste_tracker (each with components/, hooks/, services/, state/, tests/)
- No `package.json` or React setup yet

**Data (`data/`):**
- `raw/` — empty (gitignored)
- `processed/` — empty
- `pipelines/` — clean_nutrition.py, clean_pricing.py, clean_recipes.py (all empty)
- `notebooks/` — empty

**Docs (`docs/`):**
- api.md, architecture.md, data_schema.md — all empty

**Project-level tests (`tests/`):**
- `e2e/` — empty
- `integration/` — empty

---

## Key Design Decisions

1. **psycopg v3** over psycopg2 — psycopg2 lacks prebuilt wheels for Python 3.14
2. **URI rewriting** in config.py — converts `postgres://` and `postgresql://` to `postgresql+psycopg://` so SQLAlchemy uses the psycopg3 driver
3. **Blueprint auto-discovery** — `app.py` scans `backend/modules/`, imports `routes.py` from each subdirectory, registers any exported `bp` Blueprint
4. **SQLite in-memory for tests** — tests run without requiring PostgreSQL
5. **Factory pattern** — `create_app()` enables multiple app instances for testing

---

## Known Minor Issue

- Core test conftest uses a JWT secret key shorter than 32 bytes, producing `InsecureKeyLengthWarning` from PyJWT. Not a production concern (production keys should be long), but could be fixed in `backend/tests/conftest.py` by using a longer test key.

---

## Team

| Name | Role |
|------|------|
| Das | Data Science |
| Arsh | Data Science |
| Jasmine | IT |
| Karl | IT |
| Shimmin | BIS |

Branch strategy: individual feature branches (`das`, `arsh`, `jasmine`, `karl`, `shimmin`) merging into `main`.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React (TBC) |
| Backend | Flask (Python 3.14) |
| Database | PostgreSQL — Neon (typical hosting) and/or PostgreSQL 17.6 on AWS RDS (instance `trolley-for-tomorrow`, `ap-southeast-2`), per environment |
| Hosting | Render |
