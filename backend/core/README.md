# Core

Shared infrastructure that all backend modules depend on. Do not add feature-specific code here.

## Files

### config.py

Loads all settings from the `.env` file using `python-dotenv`. Exposes a `Config` class that Flask reads on startup.

Handles a specific quirk: Neon gives database URLs starting with `postgresql://`, but SQLAlchemy needs `postgresql+psycopg://` to use the psycopg3 driver. The config rewrites this automatically so you just paste the URL from Neon as-is.

### database.py

Creates a single shared `SQLAlchemy` instance (`db`). Import it in your module to define models or run queries:

```python
from core.database import db
```

The instance is connected to the Flask app during startup in `app.py`.

### auth.py

Creates a single shared `JWTManager` instance (`jwt`). This handles token verification on protected routes. You do not need to import this directly — use `@jwt_required()` from `flask_jwt_extended` on your routes, and use `generate_access_token()` from `security/jwt.py` to create tokens.

### errors.py

Registers JSON error handlers for HTTP status codes 400, 401, 403, 404, and 500. Without this, Flask returns HTML error pages which break the frontend.

All errors return this shape:
```json
{"error": "Not found", "message": "404 Not Found: ..."}
```

The 500 handler deliberately omits the `message` field to avoid leaking server internals.
