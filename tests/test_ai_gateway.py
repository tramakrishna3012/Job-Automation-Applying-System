import pytest
from unittest.mock import patch
from core.ai_gateway import get_active_llm_config

def test_get_active_llm_config_default_requesty():
    with patch("core.ai_gateway.AI_PROVIDER", "requesty"):
        base_url, api_key, model = get_active_llm_config()
        assert "requesty" in base_url

def test_get_active_llm_config_modal():
    with patch("core.ai_gateway.AI_PROVIDER", "modal"), \
         patch("core.ai_gateway.MODAL_ENDPOINT_URL", "https://modal.example.com/v1"):
        base_url, api_key, model = get_active_llm_config()
        assert base_url == "https://modal.example.com/v1"
        assert model == "Qwen/Qwen3.6-35B-A3B-FP8"
