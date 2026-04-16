from flask_jwt_extended import create_access_token, decode_token


def test_jwt_token_can_be_created(app):
    with app.app_context():
        token = create_access_token(identity="user@example.com")
        assert token is not None
        assert isinstance(token, str)


def test_jwt_token_contains_correct_identity(app):
    with app.app_context():
        token = create_access_token(identity="user@example.com")
        decoded = decode_token(token)
        assert decoded["sub"] == "user@example.com"


def test_jwt_protected_route_rejects_without_token(app, client):
    from flask_jwt_extended import jwt_required

    @app.route("/protected")
    @jwt_required()
    def protected():
        return {"msg": "ok"}

    response = client.get("/protected")
    assert response.status_code == 401


def test_jwt_protected_route_accepts_valid_token(app, client):
    from flask_jwt_extended import jwt_required, get_jwt_identity

    @app.route("/protected-ok")
    @jwt_required()
    def protected_ok():
        return {"identity": get_jwt_identity()}

    with app.app_context():
        token = create_access_token(identity="user@example.com")

    response = client.get(
        "/protected-ok",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    assert response.get_json()["identity"] == "user@example.com"
