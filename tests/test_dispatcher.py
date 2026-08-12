import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from agents.dispatcher import auto_apply
from core.state import JobMatch, UserProfile

@pytest.mark.asyncio
async def test_auto_apply_simulated_submit(sample_job_match, sample_user_profile):
    mock_page = AsyncMock()
    mock_locator = MagicMock()
    mock_locator.count = AsyncMock(return_value=1)
    mock_locator.first = MagicMock()
    mock_locator.first.fill = AsyncMock()
    mock_locator.first.click = AsyncMock()
    mock_locator.first.set_input_files = AsyncMock()
    mock_page.locator = MagicMock(return_value=mock_locator)

    with patch("agents.dispatcher.AUTO_SUBMIT_ENABLED", False):
        result = await auto_apply(mock_page, sample_job_match, sample_user_profile)
        assert result is True
        mock_locator.first.click.assert_not_called()

@pytest.mark.asyncio
async def test_auto_apply_real_submit_gated(sample_job_match, sample_user_profile):
    mock_page = AsyncMock()
    mock_locator = MagicMock()
    mock_locator.count = AsyncMock(return_value=1)
    mock_locator.first = MagicMock()
    mock_locator.first.fill = AsyncMock()
    mock_locator.first.click = AsyncMock()
    mock_locator.first.set_input_files = AsyncMock()
    mock_page.locator = MagicMock(return_value=mock_locator)

    sample_job_match.match_score = 90

    with patch("agents.dispatcher.AUTO_SUBMIT_ENABLED", True), \
         patch("agents.dispatcher.MIN_AUTO_SUBMIT_SCORE", 80):
        result = await auto_apply(mock_page, sample_job_match, sample_user_profile)
        assert result is True
        # Real click should be triggered when enabled and score >= threshold
        mock_locator.first.click.assert_called_once()
