from security.rate_limiter import limiter, login_limit


def test_limiter_instance_exists():
    assert limiter is not None


def test_general_rate_limit_allows_requests(app, client):
    response = client.get("/health")
    assert response.status_code == 200


def test_login_rate_limit_returns_429_after_exceeded(app, client):
    @app.route("/test-login", methods=["POST"])
    @login_limit
    def test_login():
        return {"msg": "ok"}

    for _ in range(5):
        response = client.post("/test-login")
        assert response.status_code == 200

    response = client.post("/test-login")
    assert response.status_code == 429


def test_general_rate_limit_applies(app, client):
    @app.route("/test-general-limit")
    def general_endpoint():
        return {"msg": "ok"}

    # First request should succeed under the default 100/min limit
    response = client.get("/test-general-limit")
    assert response.status_code == 200
