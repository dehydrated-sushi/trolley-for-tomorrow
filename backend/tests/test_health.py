def test_health_returns_200(client):
    response = client.get("/health")
    assert response.status_code == 200


def test_health_returns_ok_status(client):
    response = client.get("/health")
    data = response.get_json()
    assert data == {"status": "ok"}


def test_health_returns_json_content_type(client):
    response = client.get("/health")
    assert response.content_type == "application/json"
