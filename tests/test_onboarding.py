import pytest
from unittest.mock import AsyncMock, patch
from agents.onboarding import parse_resume_text
from core.state import UserProfile

@pytest.mark.asyncio
async def test_parse_resume_text(sample_user_profile):
    with patch("agents.onboarding.async_structured_output", new_callable=AsyncMock) as mock_structured:
        mock_structured.return_value = sample_user_profile
        
        result = await parse_resume_text("Sample Resume Text Content")
        assert isinstance(result, UserProfile)
        assert result.name == "Alex Mercer"
        assert result.email == "alex.mercer@example.com"
        mock_structured.assert_called_once()
