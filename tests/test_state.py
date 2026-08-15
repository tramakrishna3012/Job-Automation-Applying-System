import pytest
from core.state import UserProfile, JobMatch, TailoredResume, TailoredExperience, TailoredEducation

def test_user_profile_model(sample_user_profile):
    assert sample_user_profile.name == "Sarah Connor"
    assert sample_user_profile.email == "sarah.connor@example.com"
    assert len(sample_user_profile.skills) == 4
    assert sample_user_profile.experience[0].company == "TechCorp"

def test_job_match_model(sample_job_match):
    assert sample_job_match.id == "test-job-1"
    assert sample_job_match.company == "Innovative AI Labs"
    assert sample_job_match.match_score == 85

def test_tailored_resume_model():
    tailored = TailoredResume(
        name="Alex Mercer",
        email="alex.mercer@example.com",
        summary="Senior Python Engineer specializing in scalable APIs.",
        experience=[
            TailoredExperience(
                company="TechCorp",
                position="Senior Engineer",
                location="San Francisco, CA",
                date="2022 - Present",
                highlights=["Built microservices"]
            )
        ],
        education=[
            TailoredEducation(
                institution="UC Berkeley",
                area="Computer Science",
                date="2021"
            )
        ],
        skills=["Python", "FastAPI"]
    )
    assert tailored.name == "Alex Mercer"
    assert len(tailored.experience) == 1
