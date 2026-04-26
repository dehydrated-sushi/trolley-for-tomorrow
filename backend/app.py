import importlib
import os
import pkgutil

from dotenv import load_dotenv
from flask import Flask, jsonify
from flask_bcrypt import Bcrypt
from flask_cors import CORS

load_dotenv()

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

    db.init_app(app)
    jwt.init_app(app)
    limiter.init_app(app)
    Bcrypt(app)

    cors_origins = os.getenv(
        "CORS_ORIGINS",
        "http://localhost:5173,http://127.0.0.1:5173"
    ).split(",")

    CORS(app, resources={
        r"/api/*": {
            "origins": cors_origins
        },
        r"/health": {
            "origins": cors_origins
        },
        r"/": {
            "origins": cors_origins
        }
    })

    register_error_handlers(app)
    register_jwt_error_handlers()

    app.register_blueprint(test_bp)
    app.register_blueprint(receipt_bp, url_prefix="/api/receipts")
    app.register_blueprint(recipe_bp)

    modules_dir = os.path.join(os.path.dirname(__file__), "modules")

    if os.path.isdir(modules_dir):
        for module_info in pkgutil.iter_modules([modules_dir]):
            try:
                module = importlib.import_module(f"modules.{module_info.name}.routes")
                if hasattr(module, "bp"):
                    app.register_blueprint(module.bp)
            except ModuleNotFoundError:
                print(f"Skipping module without routes: {module_info.name}")

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
                "route": str(rule)
            })
        return jsonify({"routes": routes}), 200

    return app


print("DATABASE_URL being used:", os.getenv("DATABASE_URL"))

app = create_app()

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5001))
    app.run(
        host="0.0.0.0",
        port=port,
        debug=os.environ.get("FLASK_ENV") == "development",
    )