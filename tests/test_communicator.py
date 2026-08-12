import pytest
import os
import tempfile
import pandas as pd
from agents.communicator import ingest_hr_list

def test_ingest_hr_list_csv():
    df_data = pd.DataFrame([
        {"Contact Name": "Jane Doe", "Email": "jane@company.com", "Company": "Company Inc"}
    ])
    with tempfile.NamedTemporaryFile(suffix=".csv", delete=False, mode="w") as f:
        df_data.to_csv(f.name, index=False)
        temp_path = f.name
        
    try:
        df = ingest_hr_list(temp_path)
        assert not df.empty
        assert len(df) == 1
        assert df.iloc[0]["Contact Name"] == "Jane Doe"
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)

def test_ingest_hr_list_invalid_format():
    df = ingest_hr_list("non_existent_file.txt")
    assert df.empty
