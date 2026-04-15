from flask import jsonify
from flask_jwt_extended import create_access_token

from core.auth import jwt


def register_jwt_error_handlers():
    @jwt.expired_token_loader
    def expired_token(jwt_header, jwt_payload):
        return jsonify({"error": "Token has expired"}), 401

    @jwt.invalid_token_loader
    def invalid_token(reason):
        return jsonify({"error": "Invalid token", "message": reason}), 401

    @jwt.unauthorized_loader
    def missing_token(reason):
        return jsonify({"error": "Missing token", "message": reason}), 401

    @jwt.revoked_token_loader
    def revoked_token(jwt_header, jwt_payload):
        return jsonify({"error": "Token has been revoked"}), 401


def generate_access_token(identity):
    return create_access_token(identity=identity)
