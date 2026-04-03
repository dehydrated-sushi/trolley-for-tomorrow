# Security

Security utilities for the backend. These are ready to use in your modules.

## jwt.py

Custom error responses for JWT failures (expired, invalid, missing, revoked tokens). All return 401 with a JSON body.

Also provides a helper to create tokens:

```python
from security.jwt import generate_access_token

token = generate_access_token(identity="user@example.com")
```

The `identity` is whatever you want to identify the user by (usually their email). It gets embedded in the token and can be read back later with `get_jwt_identity()`.

## rate_limiter.py

Rate limiting using Flask-Limiter. Two limits are set up:

- **Global default**: 100 requests per minute per IP on all endpoints.
- **Login limit**: 5 requests per minute per IP. Apply it to login-type routes:

```python
from security.rate_limiter import login_limit

@bp.route("/login", methods=["POST"])
@login_limit
def login():
    # after 5 attempts in a minute, returns 429 Too Many Requests
    ...
```

Uses in-memory storage. Works fine for development and single-process deployments.

## sanitiser.py

Input cleaning and validation functions. Use these before processing any user input.

| Function | What it does |
|----------|-------------|
| `sanitise_string(value)` | Strips leading/trailing whitespace and removes HTML tags |
| `is_valid_email(email)` | Returns `True` if the string looks like a valid email |
| `is_valid_password(password)` | Returns `True` if 8+ characters and contains at least one digit |

```python
from security.sanitiser import sanitise_string, is_valid_email, is_valid_password

name = sanitise_string(request.json["name"])      # "  <b>Jo</b>  " -> "Jo"
if not is_valid_email(request.json["email"]):
    abort(400)
if not is_valid_password(request.json["password"]):
    abort(400)
```

## Tests

37 tests in `security/tests/`. Run them with:

```bash
python -m pytest security/tests/ -v
```
