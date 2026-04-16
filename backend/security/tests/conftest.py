import os

os.environ.setdefault("SECRET_KEY", "test-secret-key")
os.environ.setdefault("JWT_SECRET_KEY", "test-jwt-secret-key-that-is-32-bytes!")
os.environ.setdefault("DATABASE_URL", "sqlite://")
os.environ.setdefault("JWT_ACCESS_TOKEN_EXPIRES_MINUTES", "15")
os.environ.setdefault("CORS_ORIGINS", "http://localhost:3000")

import pytest

from app import create_app
from core.database import db as _db


@pytest.fixture()
def app():
    app = create_app()
    app.config.update({"TESTING": True})

    with app.app_context():
        _db.create_all()
        yield app
        _db.session.remove()
        _db.drop_all()


@pytest.fixture()
def client(app):
    return app.test_client()
