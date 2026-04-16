from datetime import timedelta


def test_secret_key_loaded(app):
    assert app.config["SECRET_KEY"] == "test-secret-key"


def test_jwt_secret_key_loaded(app):
    assert app.config["JWT_SECRET_KEY"] == "test-jwt-secret-key"


def test_jwt_expiry_loaded_from_env(app):
    assert app.config["JWT_ACCESS_TOKEN_EXPIRES"] == timedelta(minutes=15)


def test_database_uri_loaded(app):
    assert app.config["SQLALCHEMY_DATABASE_URI"] == "sqlite://"


def test_track_modifications_disabled(app):
    assert app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] is False


def test_database_uri_rewrites_postgres_scheme():
    from core.config import _database_uri
    import os

    original = os.environ["DATABASE_URL"]
    try:
        os.environ["DATABASE_URL"] = "postgres://u:p@host/db"
        assert _database_uri() == "postgresql+psycopg://u:p@host/db"

        os.environ["DATABASE_URL"] = "postgresql://u:p@host/db"
        assert _database_uri() == "postgresql+psycopg://u:p@host/db"
    finally:
        os.environ["DATABASE_URL"] = original


def test_cors_origins_parsed():
    from core.config import Config

    assert "http://localhost:3000" in Config.CORS_ORIGINS
    assert "http://localhost:5173" in Config.CORS_ORIGINS
