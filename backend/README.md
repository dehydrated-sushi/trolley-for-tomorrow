# Backend

Flask backend running on Python 3.14.

## Setup

```bash
cd backend
python3 -m venv venv
source venv/bin/activate        # Mac/Linux
# venv\Scripts\activate         # Windows
pip install -r requirements.txt
```

## Environment Variables

Copy the template and fill in real values:

```bash
cp .env.example .env
```

| Variable | What it is |
|----------|-----------|
| `SECRET_KEY` | Flask session signing key. Use a long random string |
| `DATABASE_URL` | Database connection string (see Database Setup below) |
| `JWT_SECRET_KEY` | Signing key for auth tokens. Different from SECRET_KEY |
| `JWT_ACCESS_TOKEN_EXPIRES_MINUTES` | How long a login token lasts. Default 30 |
| `CORS_ORIGINS` | Comma-separated frontend URLs allowed to call the API |

## Database Setup

- The app uses `instance/food_app.db` for local development (`DATABASE_URL=sqlite:///food_app.db` in `.env`)
- `food_app.db` is not committed to git due to file size (217MB). It contains 231,636 recipes, 14,851 known ingredients, and the receipt_items table
- Contact Das to obtain the database file for local setup
- Place the file at `backend/instance/food_app.db`

## Running

```bash
python app.py
```

Server starts at `http://127.0.0.1:5000`. Check it works:

```bash
curl http://127.0.0.1:5000/health
# {"status": "healthy"}
```

## Running Tests

From the `backend/` directory:

```bash
# Core tests (25 tests)
python -m pytest tests/ -v

# Security tests (37 tests)
python -m pytest security/tests/ -v

# All tests together (62 tests)
python -m pytest tests/ security/tests/ -v
```

Tests use an in-memory SQLite database so you do not need PostgreSQL running locally.

## Dependencies

Key packages in `requirements.txt`:

| Package | Version | Purpose |
|---------|---------|---------|
| Flask | 3.1.1 | Web framework |
| Flask-SQLAlchemy | 3.1.1 | ORM — all database access goes through `core.database.db` |
| Flask-JWT-Extended | 4.7.1 | JWT authentication |
| Flask-Cors | 5.0.1 | CORS handling — restricted to origins listed in `CORS_ORIGINS` env var |
| Flask-Bcrypt | 1.0.1 | Password hashing |
| Flask-Limiter | 3.12 | Rate limiting — 100 req/min global, 5 req/min on login routes |
| python-dotenv | 1.1.0 | Env file loading |
| psycopg[binary] | 3.3.3 | PostgreSQL driver (v3, required because psycopg2 has no wheels for Python 3.14) |
| gunicorn | 23.0.0 | Production WSGI server |
| pytest | 8.3.5 | Testing |

## Structure

```
backend/
├── app.py              # App factory — creates and configures the Flask app
├── requirements.txt    # Pinned dependencies
├── .env.example        # Template for environment variables
├── core/               # Shared infrastructure (config, database, auth, errors)
├── security/           # JWT error handling, rate limiting, input sanitisation
│   └── tests/          # 37 security tests
├── modules/            # Feature modules (auth, fridge, meal_plan, etc.)
├── recommendation/     # Scoring and ranking engines (food_score, meal_ranker, etc.)
├── routes/             # Active API route blueprints
└── tests/              # 25 core tests
```

See `core/README.md` and `security/README.md` for details on those layers.

## Security Layer

The security package (`security/`) provides three utilities that are integrated into the app:

- **JWT error handlers** (`security/jwt_handlers.py`) — custom JSON responses for expired, invalid, missing, and revoked tokens. Registered automatically in `app.py`.
- **Rate limiter** (`security/rate_limiter.py`) — 100 requests/min global limit on all endpoints. Import `login_limit` to apply 5 requests/min on auth routes.
- **Input sanitiser** (`security/sanitiser.py`) — `sanitise_string()`, `is_valid_email()`, `is_valid_password()`. Use these before processing any user input.

See `security/README.md` for usage examples.

## Adding a New Module Route

Each module under `modules/` has a `routes.py` file. The app auto-discovers any Blueprint exported as `bp`. Example:

```python
# modules/auth/routes.py
from flask import Blueprint

bp = Blueprint("auth", __name__, url_prefix="/auth")

@bp.route("/login", methods=["POST"])
def login():
    return {"msg": "login endpoint"}
```

No changes to `app.py` needed. The blueprint is picked up automatically.
