import os
from datetime import timedelta

from dotenv import load_dotenv

load_dotenv()


def _database_uri():
    """Resolve SQLAlchemy database URI.

    If ``DATABASE_URL`` is missing or empty (common on first Render deploy),
    fall back to a file-backed SQLite DB under ``/tmp`` so the process can
    boot and ``/health`` succeeds. Set a real ``DATABASE_URL`` for production.
    """
    raw = os.environ.get("DATABASE_URL")
    uri = raw.strip() if raw else ""
    if not uri:
        return "sqlite:////tmp/trolley_fallback.db"
    # SQLAlchemy 2.x uses psycopg (v3) by default with the +psycopg driver
    if uri.startswith("postgres://"):
        uri = uri.replace("postgres://", "postgresql+psycopg://", 1)
    elif uri.startswith("postgresql://"):
        uri = uri.replace("postgresql://", "postgresql+psycopg://", 1)
    return uri


class Config:
    SECRET_KEY = os.environ["SECRET_KEY"]
    SQLALCHEMY_DATABASE_URI = _database_uri()
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    JWT_SECRET_KEY = os.environ["JWT_SECRET_KEY"]
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(
        minutes=int(os.environ.get("JWT_ACCESS_TOKEN_EXPIRES_MINUTES", 30))
    )

    CORS_ORIGINS = os.environ.get("CORS_ORIGINS", "http://localhost:3000").split(",")
