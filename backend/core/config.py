import os
from datetime import timedelta
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()

BASE_DIR = Path(__file__).resolve().parents[1]


def _database_uri():
    print("DATABASE_URL =", os.environ.get("DATABASE_URL", "NOT FOUND"))
    uri = os.environ["DATABASE_URL"]
    if uri.startswith("sqlite:///") and not uri.startswith("sqlite:////"):
        raw_path = uri.removeprefix("sqlite:///")
        db_path = Path(raw_path)
        if not db_path.is_absolute():
            backend_dir = Path(__file__).resolve().parents[1]
            db_path = backend_dir / db_path
        return f"sqlite:///{db_path}"

    # SQLAlchemy 2.x uses psycopg (v3) by default with the +psycopg driver
    if uri.startswith("postgres://"):
        uri = uri.replace("postgres://", "postgresql+psycopg://", 1)
    elif uri.startswith("postgresql://"):
        uri = uri.replace("postgresql://", "postgresql+psycopg://", 1)
    print("Final URI =", uri)
    return uri


class Config:
    SECRET_KEY = os.environ["SECRET_KEY"]
    SQLALCHEMY_DATABASE_URI = _database_uri()
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    MAX_CONTENT_LENGTH = 10 * 1024 * 1024
    FOOD_WASTE_MODEL_PATH = Path(os.environ.get("FOOD_WASTE_MODEL_PATH", BASE_DIR / "models" / "best.pt"))
    FOOD_WASTE_PREDICTIONS_DIR = Path(
        os.environ.get("FOOD_WASTE_PREDICTIONS_DIR", BASE_DIR / "static" / "predictions")
    )
    FOOD_WASTE_TEMP_UPLOAD_DIR = Path(
        os.environ.get("FOOD_WASTE_TEMP_UPLOAD_DIR", BASE_DIR / "temp_uploads")
    )

    JWT_SECRET_KEY = os.environ["JWT_SECRET_KEY"]
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(
        minutes=int(os.environ.get("JWT_ACCESS_TOKEN_EXPIRES_MINUTES", 30))
    )

    CORS_ORIGINS = os.environ.get("CORS_ORIGINS", "http://localhost:3000").split(",")
