import importlib
import os
import pkgutil

from dotenv import load_dotenv

# Load .env before app config/extensions
load_dotenv()

from flask import Flask, jsonify
from flask_bcrypt import Bcrypt
from flask_cors import CORS

from core.auth import jwt
from core.config import Config
from core.database import db
from core.errors import register_error_handlers
from security.jwt_handlers import register_jwt_error_handlers
from security.rate_limiter import limiter
from routes.test_routes import test_bp
from routes.receipt_routes import receipt_bp
from routes.recipe_routes import recipe_bp


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    # Initialise extensions
    db.init_app(app)
    jwt.init_app(app)
    limiter.init_app(app)
    Bcrypt(app)

    # CORS config: read from CORS_ORIGINS env variable
    cors_origins = [
        origin.strip()
        for origin in os.getenv(
            "CORS_ORIGINS",
            "http://localhost:5173,http://127.0.0.1:5173,http://localhost:5174,http://127.0.0.1:5174",
        ).split(",")
        if origin.strip()
    ]

    CORS(
        app,
        origins=cors_origins,
        supports_credentials=True,
        allow_headers=["Content-Type", "Authorization"],
        methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    )

    print("CORS origins:", cors_origins)

    # Register error handlers
    register_error_handlers(app)
    register_jwt_error_handlers()

    # Register blueprints
    app.register_blueprint(test_bp)
    app.register_blueprint(receipt_bp, url_prefix="/api/receipts")
    app.register_blueprint(recipe_bp)

    # Auto-discover and register module blueprints
    modules_dir = os.path.join(os.path.dirname(__file__), "modules")
    for module_info in pkgutil.iter_modules([modules_dir]):
        module = importlib.import_module(f"modules.{module_info.name}.routes")
        if hasattr(module, "bp"):
            app.register_blueprint(module.bp)

    # Basic routes
    @app.route("/", methods=["GET"])
    def home():
        return jsonify({
            "message": "Backend is running",
            "status": "ok"
        }), 200

    @app.route("/health", methods=["GET"])
    def health():
        return jsonify({"status": "healthy"}), 200

    @app.route("/api/health", methods=["GET"])
    def api_health():
        return jsonify({"status": "api healthy"}), 200

    @app.route("/api/routes", methods=["GET"])
    def list_routes():
        routes = []
        for rule in app.url_map.iter_rules():
            routes.append({
                "endpoint": rule.endpoint,
                "methods": sorted(list(rule.methods)),
                "route": str(rule),
            })
        return jsonify({"routes": routes}), 200

    return app


app = create_app()

if __name__ == "__main__":
    # Port 5000 on macOS can be used by AirPlay Receiver, so default to 5001 locally.
    port = int(os.environ.get("PORT", 5001))
    app.run(
        host="127.0.0.1",
        port=port,
        debug=os.environ.get("FLASK_ENV") == "development",
    )