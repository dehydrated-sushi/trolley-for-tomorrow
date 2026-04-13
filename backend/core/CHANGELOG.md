# Core Changelog

## [1.1.0] - 2026-04-13

### Added
- AWS RDS PostgreSQL instance connected
- SSL certificate required for all database connections
- rds-ca.pem added to .gitignore
- trolley database created on RDS instance
- DATABASE_URL updated in .env to use SSL verify-ca mode

## [1.0.0] - 2026-04-02

### Added
- Python virtual environment created at backend/venv/ using Python 3.14
- requirements.txt with pinned versions: Flask 3.1.1, Flask-SQLAlchemy 3.1.1, Flask-JWT-Extended 4.7.1, Flask-Cors 5.0.1, Flask-Bcrypt 1.0.1, python-dotenv 1.1.0, psycopg[binary] 3.3.3, gunicorn 23.0.0, pytest 8.3.5
- .env.example with all required environment variables: SECRET_KEY, DATABASE_URL, JWT_SECRET_KEY, JWT_ACCESS_TOKEN_EXPIRES_MINUTES, CORS_ORIGINS
- core/config.py with Config class that loads all settings from environment variables via python-dotenv
- core/database.py with shared SQLAlchemy instance
- core/auth.py with shared JWTManager instance
- core/errors.py with JSON error handlers for 400, 401, 403, 404, and 500
- app.py with create_app() factory function that initialises all extensions, registers error handlers, auto-discovers module blueprints from backend/modules/, and exposes GET /health returning 200
- __init__.py files for core/, modules/, and all seven module subdirectories (auth, fridge, meal_plan, profile, receipt, shopping_list, waste_tracker)
- tests/conftest.py with shared pytest fixtures (app and client) using SQLite in-memory for test isolation
- tests/test_health.py with 3 tests covering status code, JSON body, and content type
- tests/test_config.py with 7 tests covering all config values, postgres:// URI rewriting, and CORS origins parsing
- tests/test_database.py with 3 tests covering SQLAlchemy instance, connection, and table create/insert/query roundtrip
- tests/test_auth.py with 4 tests covering JWT token creation, identity encoding, rejection without token, and acceptance with valid token
- tests/test_cors.py with 3 tests covering allowed origins and blocked unknown origins
- tests/test_errors.py with 5 tests covering all registered error handlers return correct status codes and JSON

### Notes
- Used psycopg (v3) instead of psycopg2-binary because psycopg2 does not have prebuilt wheels for Python 3.14
- config.py rewrites postgres:// and postgresql:// DATABASE_URL schemes to postgresql+psycopg:// so SQLAlchemy uses the psycopg3 driver
- Module auto-discovery in app.py imports routes.py from each subdirectory under backend/modules/ and registers any Blueprint exported as bp
- Tests use SQLite in-memory so they run without a PostgreSQL instance
- All 25 tests pass
