from flask_jwt_extended import decode_token

from security.jwt import generate_access_token


def test_generate_access_token_returns_string(app):
    with app.app_context():
        token = generate_access_token("user@example.com")
        assert isinstance(token, str)


def test_generate_access_token_contains_identity(app):
    with app.app_context():
        token = generate_access_token("user@example.com")
        decoded = decode_token(token)
        assert decoded["sub"] == "user@example.com"


def test_missing_token_returns_401(app, client):
    from flask_jwt_extended import jwt_required

    @app.route("/sec/protected")
    @jwt_required()
    def protected():
        return {"msg": "ok"}

    response = client.get("/sec/protected")
    assert response.status_code == 401
    data = response.get_json()
    assert data["error"] == "Missing token"


def test_invalid_token_returns_401(app, client):
    from flask_jwt_extended import jwt_required

    @app.route("/sec/protected2")
    @jwt_required()
    def protected2():
        return {"msg": "ok"}

    response = client.get(
        "/sec/protected2",
        headers={"Authorization": "Bearer not-a-real-token"},
    )
    assert response.status_code == 401
    data = response.get_json()
    assert data["error"] == "Invalid token"


def test_expired_token_returns_401(app, client):
    from datetime import timedelta

    from flask_jwt_extended import create_access_token, jwt_required

    @app.route("/sec/protected3")
    @jwt_required()
    def protected3():
        return {"msg": "ok"}

    with app.app_context():
        token = create_access_token(
            identity="user@example.com",
            expires_delta=timedelta(seconds=-1),
        )

    response = client.get(
        "/sec/protected3",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 401
    data = response.get_json()
    assert data["error"] == "Token has expired"


def test_valid_token_allows_access(app, client):
    from flask_jwt_extended import get_jwt_identity, jwt_required

    @app.route("/sec/protected4")
    @jwt_required()
    def protected4():
        return {"identity": get_jwt_identity()}

    with app.app_context():
        token = generate_access_token("user@example.com")

    response = client.get(
        "/sec/protected4",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    assert response.get_json()["identity"] == "user@example.com"
