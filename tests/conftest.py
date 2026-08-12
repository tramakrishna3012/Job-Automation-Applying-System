import pytest
from unittest.mock import MagicMock
from core.state import UserProfile, JobMatch, Experience, Education

@pytest.fixture
def sample_user_profile():
    return UserProfile(
        name="Alex Mercer",
        email="alex.mercer@example.com",
        phone="+1 555-0199",
        location="San Francisco, CA",
        linkedin="https://linkedin.com/in/alexmercer",
        github="https://github.com/alexmercer",
        skills=["Python", "FastAPI", "React", "PostgreSQL"],
        experience=[
            Experience(
                company="TechCorp",
                role="Senior Engineer",
                start_date="2022-01",
                end_date="Present",
                responsibilities=["Built microservices", "Optimized queries"]
            )
        ],
        education=[
            Education(
                institution="UC Berkeley",
                degree="B.S. Computer Science",
                graduation_date="2021"
            )
        ]
    )

@pytest.fixture
def sample_job_match():
    return JobMatch(
        id="test-job-1",
        title="Senior Python Developer",
        company="Innovative AI Labs",
        location="Remote",
        url="https://example.com/jobs/senior-python-dev",
        description="We are seeking a Senior Python Developer experienced in FastAPI, Pydantic, and PostgreSQL.",
        match_score=85
    )
