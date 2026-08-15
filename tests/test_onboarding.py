import pytest
from unittest.mock import AsyncMock, patch
from agents.onboarding import parse_resume_text, heuristic_parse_resume
from core.state import UserProfile

@pytest.mark.asyncio
async def test_parse_resume_text_with_llm(sample_user_profile):
    with patch("agents.onboarding.async_structured_output", new_callable=AsyncMock) as mock_structured:
        mock_structured.return_value = sample_user_profile
        
        result = await parse_resume_text("Sample Resume Text Content")
        assert isinstance(result, UserProfile)
        assert result.name == "Sarah Connor"
        assert result.email == "sarah.connor@example.com"
        mock_structured.assert_called_once()

def test_heuristic_parse_resume():
    raw_text = """
    T Rama Krishna
    tramakrishna3012@gmail.com | +1 (555) 987-6543
    https://linkedin.com/in/tramakrishna

    SKILLS
    Python, FastAPI, React, PostgreSQL, Docker, Kubernetes, AWS, Next.js

    EXPERIENCE
    Lead AI Engineer - Autonomous Tech
    2022 - Present
    - Architected multi-agent autonomous application pipelines.
    - Optimized vector similarity search with pgvector.

    EDUCATION
    Bachelor of Technology in Computer Science - University Institute
    2021
    """
    profile = heuristic_parse_resume(raw_text)
    assert profile.name == "T Rama Krishna"
    assert profile.email == "tramakrishna3012@gmail.com"
    assert "Python" in profile.skills
    assert "FastAPI" in profile.skills
    assert len(profile.experience) >= 1
    assert len(profile.education) >= 1
