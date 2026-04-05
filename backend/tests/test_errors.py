from flask import abort


def test_400_returns_json(app, client):
    @app.route("/err/400")
    def trigger_400():
        abort(400)

    response = client.get("/err/400")
    assert response.status_code == 400
    data = response.get_json()
    assert data["error"] == "Bad request"


def test_401_returns_json(app, client):
    @app.route("/err/401")
    def trigger_401():
        abort(401)

    response = client.get("/err/401")
    assert response.status_code == 401
    data = response.get_json()
    assert data["error"] == "Unauthorised"


def test_403_returns_json(app, client):
    @app.route("/err/403")
    def trigger_403():
        abort(403)

    response = client.get("/err/403")
    assert response.status_code == 403
    data = response.get_json()
    assert data["error"] == "Forbidden"


def test_404_returns_json(client):
    response = client.get("/nonexistent-route")
    assert response.status_code == 404
    data = response.get_json()
    assert data["error"] == "Not found"


def test_500_returns_json_without_message(app, client):
    @app.route("/err/500")
    def trigger_500():
        abort(500)

    response = client.get("/err/500")
    assert response.status_code == 500
    data = response.get_json()
    assert data["error"] == "Internal server error"
    assert "message" not in data
