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
| `DATABASE_URL` | PostgreSQL connection string (see Database Setup below) |
| `JWT_SECRET_KEY` | Signing key for auth tokens. Different from SECRET_KEY |
| `JWT_ACCESS_TOKEN_EXPIRES_MINUTES` | How long a login token lasts. Default 30 |
| `CORS_ORIGINS` | Comma-separated frontend URLs allowed to call the API |

## Running

```bash
python app.py
```

Server starts at `http://127.0.0.1:5000`. Check it works:

```bash
curl http://127.0.0.1:5000/health
# {"status": "ok"}
```

## Running Tests

```bash
python -m pytest tests/ security/tests/ -v
```

62 tests total (25 core + 37 security). Tests use an in-memory SQLite database so you do not need PostgreSQL running locally.

## Structure

```
backend/
├── app.py              # App factory — creates and configures the Flask app
├── requirements.txt    # Pinned dependencies
├── .env.example        # Template for environment variables
├── core/               # Shared infrastructure (config, database, auth, errors)
├── security/           # JWT error handling, rate limiting, input sanitisation
├── modules/            # Feature modules (auth, fridge, meal_plan, etc.)
├── recommendation/     # Scoring and ranking engines (food_score, meal_ranker, etc.)
└── tests/              # Core test suite
```

See `core/README.md` and `security/README.md` for details on those layers.

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

## Database Setup

The project uses **AWS RDS PostgreSQL 17.6** in the **ap-southeast-2 (Sydney)** region on a **db.t3.micro** instance. SSL is required for all connections.

### Download the SSL certificate

Each developer must download the RDS CA certificate locally. This file is gitignored and will not be committed:

```bash
curl -o backend/rds-ca.pem https://truststore.pki.rds.amazonaws.com/ap-southeast-2/ap-southeast-2-bundle.pem
```

### DATABASE_URL format

Set `DATABASE_URL` in your `backend/.env` using this format:

```
postgresql://USER:PASSWORD@HOST:5432/trolley?sslmode=verify-ca&sslrootcert=backend/rds-ca.pem
```

Replace `USER`, `PASSWORD`, and `HOST` with the actual credentials. Request these from Das privately — do not share them in any public channel or commit them to the repository.

### Important

- `rds-ca.pem` is gitignored and **must be downloaded locally** by each developer
- SSL (`sslmode=verify-ca`) is enforced — connections without the certificate will be rejected
