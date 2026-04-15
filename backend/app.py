import importlib
import os
import pkgutil

from flask import Flask, jsonify
from flask_bcrypt import Bcrypt
from flask_cors import CORS

from core.auth import jwt
from core.config import Config
from core.database import db
from core.errors import register_error_handlers
from security.jwt import register_jwt_error_handlers
from security.rate_limiter import limiter


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    # Initialise extensions
    db.init_app(app)
    jwt.init_app(app)
    limiter.init_app(app)
    Bcrypt(app)
    CORS(app, origins=Config.CORS_ORIGINS)

    # Register error handlers
    register_error_handlers(app)
    register_jwt_error_handlers()

    # Auto-discover and register module blueprints
    modules_dir = os.path.join(os.path.dirname(__file__), "modules")
    for module_info in pkgutil.iter_modules([modules_dir]):
        module = importlib.import_module(f"modules.{module_info.name}.routes")
        if hasattr(module, "bp"):
            app.register_blueprint(module.bp)

    # Health check
    @app.route("/health", methods=["GET"])
    def health():
        return jsonify({"status": "ok"}), 200

    return app


if __name__ == "__main__":
    app = create_app()
    app.run(debug=os.environ.get("FLASK_ENV") == "development")
