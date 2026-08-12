import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch
from api.main import app
from core.db import create_jwt_token

client = TestClient(app)

USER_1 = {"id": "11111111-1111-1111-1111-111111111111", "email": "user1@example.com", "name": "User 1"}
USER_2 = {"id": "22222222-2222-2222-2222-222222222222", "email": "user2@example.com", "name": "User 2"}

TOKEN_1 = create_jwt_token(USER_1["id"], USER_1["email"])
TOKEN_2 = create_jwt_token(USER_2["id"], USER_2["email"])

def test_multi_user_data_isolation():
    def mock_get_user(user_id):
        if str(user_id) == USER_1["id"]:
            return USER_1
        return USER_2

    with patch("api.main.get_user_by_id", side_effect=mock_get_user), \
         patch("api.main.get_emails") as mock_get_emails:
        
        mock_get_emails.return_value = [{"id": "email1", "recipient_name": "User1 Contact", "user_id": USER_1["id"]}]
        
        # User 1 requests emails
        res1 = client.get("/api/emails", headers={"Authorization": f"Bearer {TOKEN_1}"})
        assert res1.status_code == 200
        mock_get_emails.assert_called_with(user_id=USER_1["id"], direction=None, classification=None, limit=50)

        # User 2 requests emails
        res2 = client.get("/api/emails", headers={"Authorization": f"Bearer {TOKEN_2}"})
        assert res2.status_code == 200
        mock_get_emails.assert_called_with(user_id=USER_2["id"], direction=None, classification=None, limit=50)
