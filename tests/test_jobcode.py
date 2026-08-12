import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from agents.jobcode import scrape_jobcode_post, JobcodeExtractedMatch

@pytest.mark.asyncio
async def test_scrape_jobcode_post_deduplicated():
    mock_page = AsyncMock()
    with patch("agents.jobcode.is_url_scraped", return_value=True):
        result = await scrape_jobcode_post(mock_page, "https://jobcode.me/post-1")
        assert result is None
        mock_page.goto.assert_not_called()

@pytest.mark.asyncio
async def test_scrape_jobcode_post_extracted():
    mock_page = AsyncMock()
    mock_page.content = AsyncMock(return_value="<html><body><h1>Senior Python Job</h1><p>Company: AI Corp</p></body></html>")
    
    mock_match = JobcodeExtractedMatch(
        title="Senior Python Engineer",
        company="AI Corp",
        location="Remote",
        description="Great role building AI microservices.",
        apply_url="https://aicorp.com/careers/apply"
    )

    with patch("agents.jobcode.is_url_scraped", return_value=False), \
         patch("agents.jobcode.mark_url_scraped") as mock_mark, \
         patch("agents.jobcode.async_structured_output", new_callable=AsyncMock) as mock_structured:
        
        mock_structured.return_value = mock_match
        result = await scrape_jobcode_post(mock_page, "https://jobcode.me/post-2")
        
        assert result is not None
        assert result.title == "Senior Python Engineer"
        assert result.company == "AI Corp"
        mock_mark.assert_called_once_with("https://jobcode.me/post-2", source="jobcode")
