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
from routes.test_routes import test_bp
from routes.receipt_routes import receipt_bp






def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    # Initialise extensions
    db.init_app(app)
    jwt.init_app(app)
    Bcrypt(app)
    CORS(app, origins=Config.CORS_ORIGINS)

    # Register error handlers
    register_error_handlers(app)

    # Register test blueprint
    app.register_blueprint(test_bp)
    app.register_blueprint(receipt_bp, url_prefix="/api/receipts")

    # Auto-discover and register module blueprints
    modules_dir = os.path.join(os.path.dirname(__file__), "modules")
    for module_info in pkgutil.iter_modules([modules_dir]):
        module = importlib.import_module(f"modules.{module_info.name}.routes")
        if hasattr(module, "bp"):
            app.register_blueprint(module.bp)
    CORS(app, resources={r"/api/*": {"origins": "*"}})

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
                "route": str(rule)
            })
        return jsonify({"routes": routes}), 200

    return app


app = create_app()

if __name__ == "__main__":
    app.run(debug=os.environ.get("FLASK_ENV") == "development")
