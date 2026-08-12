import pytest
import io
import pandas as pd
from fastapi.testclient import TestClient
from unittest.mock import patch
from api.main import app
from core.db import create_jwt_token

client = TestClient(app)
USER_1 = {"id": "11111111-1111-1111-1111-111111111111", "email": "user1@example.com", "name": "User 1"}
TOKEN_1 = create_jwt_token(USER_1["id"], USER_1["email"])

def test_hr_contacts_upload():
    df = pd.DataFrame([
        {"Contact Name": "Jane Doe", "Email": "jane@techcorp.com", "Company": "TechCorp", "Position": "VP Engineering"}
    ])
    csv_bytes = df.to_csv(index=False).encode("utf-8")

    with patch("api.main.get_user_by_id", return_value=USER_1), \
         patch("api.main.save_hr_contacts_batch") as mock_save:
        
        response = client.post(
            "/api/hr-contacts/upload",
            headers={"Authorization": f"Bearer {TOKEN_1}"},
            files={"file": ("contacts.csv", csv_bytes, "text/csv")}
        )
        assert response.status_code == 200
        assert response.json()["count"] == 1
        mock_save.assert_called_once()
