# Core Changelog

## [1.1.0] - 2026-04-16

### Changed
- CORS configuration in app.py changed from wildcard `origins="*"` to config-based `origins=Config.CORS_ORIGINS`, which reads allowed origins from the CORS_ORIGINS environment variable
- Rate limiter from security/rate_limiter.py now initialised in app.py create_app() via `limiter.init_app(app)`
- JWT error handlers from security/jwt_handlers.py now registered in app.py create_app() via `register_jwt_error_handlers()`
- routes/recipe_routes.py migrated from raw sqlite3 (get_db_connection) to SQLAlchemy db.session.execute with sqlalchemy.text
- modules/fridge/routes.py migrated from raw sqlite3 to SQLAlchemy db.session.execute with sqlalchemy.text
- modules/meal_plan/routes.py migrated from raw sqlite3 to SQLAlchemy db.session.execute with sqlalchemy.text
- modules/receipt/service.py migrated from raw sqlite3 INSERTs to SQLAlchemy ORM using the existing ReceiptItem model from modules/receipt/schema.py
- test_health.py updated to assert {"status": "healthy"} matching the current app.py response

### Removed
- Deleted legacy backend/db.py which provided raw sqlite3 connections via get_db_connection(). All database access now goes through the shared SQLAlchemy instance in core/database.py

### Added
- Flask-Limiter==3.12 added to requirements.txt
- core/README.md with documentation for config.py, database.py, auth.py, and errors.py
- security/README.md with usage examples for jwt_handlers.py, rate_limiter.py, and sanitiser.py
- backend/README.md with setup instructions, environment variables, running tests, project structure, and module guide

### Notes
- The database is now unified: all routes use SQLAlchemy (core.database.db) exclusively
- Raw sqlite3 `?` positional parameters were replaced with SQLAlchemy `:named` parameters
- `dict(row)` calls were replaced with `dict(row._mapping)` for SQLAlchemy Row objects

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
