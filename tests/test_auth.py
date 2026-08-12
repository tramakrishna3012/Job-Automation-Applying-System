import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock
from api.main import app

client = TestClient(app)

@pytest.fixture
def mock_db_user():
    user_data = {
        "id": "11111111-1111-1111-1111-111111111111",
        "email": "test@example.com",
        "password_hash": "$2b$12$eImiTXuWVxfM37uY4JANjO5E.y5b/8w7W3K.1b/8w7W3K", # hashed password for 'secret123'
        "name": "Test User",
        "created_at": "2026-08-12T00:00:00Z"
    }
    with patch("api.main.get_user_by_email", return_value=None), \
         patch("api.main.create_user", return_value=user_data), \
         patch("api.main.get_user_by_id", return_value=user_data):
        yield user_data

def test_signup_success(mock_db_user):
    response = client.post("/api/auth/signup", json={
        "email": "newuser@example.com",
        "password": "secret123password",
        "name": "New User"
    })
    assert response.status_code == 200
    data = response.json()
    assert "token" in data
    assert data["user"]["email"] == "test@example.com"

def test_signup_duplicate_email():
    with patch("api.main.get_user_by_email", return_value={"id": "existing", "email": "dup@example.com"}):
        response = client.post("/api/auth/signup", json={
            "email": "dup@example.com",
            "password": "secret123password"
        })
        assert response.status_code == 400
        assert "already exists" in response.json()["detail"].lower()

def test_login_invalid_password():
    with patch("api.main.get_user_by_email", return_value={"id": "111", "email": "user@example.com", "password_hash": "hash"}), \
         patch("api.main.verify_password", return_value=False):
        response = client.post("/api/auth/login", json={
            "email": "user@example.com",
            "password": "wrongpassword"
        })
        assert response.status_code == 401
        assert "invalid email or password" in response.json()["detail"].lower()

def test_protected_endpoint_unauthenticated():
    response = client.get("/api/stats")
    assert response.status_code == 401
    assert "token" in response.json()["detail"].lower() or "user" in response.json()["detail"].lower()
