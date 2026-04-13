from flask import Blueprint, jsonify

test_bp = Blueprint("test", __name__, url_prefix="/api/test")


@test_bp.route("/ping", methods=["GET"])
def ping():
    return jsonify({"message": "pong"}), 200


@test_bp.route("/hello", methods=["GET"])
def hello():
    return jsonify({"message": "hello from test routes"}), 200
    