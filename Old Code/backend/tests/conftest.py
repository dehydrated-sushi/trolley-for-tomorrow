import os

# Set test environment variables before anything imports core.config
os.environ["SECRET_KEY"] = "test-secret-key"
os.environ["JWT_SECRET_KEY"] = "test-jwt-secret-key"
os.environ["DATABASE_URL"] = "sqlite://"
os.environ["JWT_ACCESS_TOKEN_EXPIRES_MINUTES"] = "15"
os.environ["CORS_ORIGINS"] = "http://localhost:3000,http://localhost:5173"

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
