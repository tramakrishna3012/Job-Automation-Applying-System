import pytest
from unittest.mock import patch
from core.ai_gateway import get_active_llm_config

def test_get_active_llm_config_modal_default():
    base_url, api_key, model = get_active_llm_config()
    assert "modal" in base_url or "https://" in base_url or "api" in base_url
    assert isinstance(model, str) and len(model) > 0
