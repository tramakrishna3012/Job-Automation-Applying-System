from typing import List, Optional, TypedDict
from pydantic import BaseModel, Field

class Education(BaseModel):
    institution: str
    degree: str
    graduation_date: Optional[str] = None
    gpa: Optional[str] = None

class Experience(BaseModel):
    company: str
    role: str
    start_date: str
    end_date: Optional[str] = "Present"
    responsibilities: List[str]

class UserProfile(BaseModel):
    name: str
    email: str
    phone: Optional[str] = None
    location: Optional[str] = None
    linkedin: Optional[str] = None
    github: Optional[str] = None
    skills: List[str]
    experience: List[Experience]
    education: List[Education]
    
class JobMatch(BaseModel):
    id: str
    title: str
    company: str
    location: Optional[str] = None
    url: str
    description: Optional[str] = None
    match_score: Optional[int] = None
    tailored_resume_path: Optional[str] = None

class TailoredExperience(BaseModel):
    company: str
    position: str
    location: str
    date: str
    highlights: List[str] = Field(description="Only reorder or select existing responsibilities, NEVER invent new ones.")

class TailoredEducation(BaseModel):
    institution: str
    area: str
    date: str

class TailoredResume(BaseModel):
    name: str
    email: str
    phone: Optional[str] = None
    location: Optional[str] = None
    summary: str
    experience: List[TailoredExperience]
    education: List[TailoredEducation]
    skills: List[str]
    
class ApplicationState(TypedDict):
    master_resume_path: str
    target_role: str
    target_experience_level: str
    user_profile: Optional[UserProfile]
    daily_job_queue: List[JobMatch]
    application_count: int
    excel_dashboard_path: str
