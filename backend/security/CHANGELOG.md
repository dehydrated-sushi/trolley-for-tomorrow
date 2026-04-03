# Security Changelog

## [1.0.0] - 2026-04-02

### Added
- security/jwt.py with JWT error handlers for expired, invalid, missing, and revoked tokens, all returning 401 with JSON responses
- security/jwt.py generate_access_token() helper that wraps Flask-JWT-Extended's create_access_token
- security/rate_limiter.py with Flask-Limiter configured at 100 requests per minute default using in-memory storage
- security/rate_limiter.py login_limit decorator set to 5 requests per minute for login endpoints
- security/sanitiser.py with strip_whitespace(), strip_html_tags(), and sanitise_string() for input cleaning
- security/sanitiser.py is_valid_email() using regex validation
- security/sanitiser.py is_valid_password() requiring minimum 8 characters and at least one digit
- Registered JWT error handlers and rate limiter initialisation in app.py create_app()
- Added Flask-Limiter 3.12 to requirements.txt
- __init__.py for security/ and security/tests/
- security/tests/conftest.py with shared app and client fixtures
- security/tests/test_jwt.py with 6 tests covering token generation, identity encoding, missing/invalid/expired token rejection, and valid token access
- security/tests/test_rate_limiter.py with 4 tests covering limiter instance, general requests, login rate limit 429 after 5 hits, and default limit application
- security/tests/test_sanitiser.py with 27 tests covering whitespace stripping, HTML tag removal, combined sanitisation, email validation, and password strength validation
- All 37 security tests pass, all 25 existing core tests still pass (62 total)

### Notes
- JWT error handlers register on the existing jwt instance from core/auth.py rather than creating a new JWTManager, avoiding duplication
- Rate limiter uses in-memory storage, suitable for single-process development; production with multiple workers will need a shared backend like Redis
- sanitiser.py uses regex-based HTML tag stripping, which handles common cases but is not a full HTML parser; for rendering user content in the frontend, output encoding on the frontend side is still required
- login_limit is exported as a decorator for modules to apply to their own login routes
