import os
import pdfplumber
import asyncio
from rich.console import Console
from rich.prompt import Prompt

from core.state import UserProfile
from core.ai_gateway import async_structured_output, generate_embedding
from core.db import save_candidate_profile_vector

console = Console()

ONBOARDING_SYSTEM_PROMPT = (
    "You are an expert resume parser and candidate profiler. "
    "Extract the user's details from the provided resume text and map them exactly to the UserProfile schema. "
    "CRITICAL: Do NOT hallucinate skills or experience. Only extract facts present in the text."
)

async def parse_resume_text(resume_text: str) -> UserProfile:
    """Uses Requesty AI Gateway to extract structured UserProfile from resume text."""
    return await async_structured_output(
        system_prompt=ONBOARDING_SYSTEM_PROMPT,
        user_content=f"Resume Text:\n{resume_text}",
        response_model=UserProfile,
    )

async def run_onboarding() -> dict:
    console.print("[bold blue]Welcome to the Autonomous Job Application Agent System (Requesty Router Enabled)![/bold blue]")
    console.print("Let's get started by setting up your candidate profile.\n")

    master_resume_path = Prompt.ask("Please provide the absolute path to your master PDF resume")
    
    if not os.path.exists(master_resume_path):
        console.print(f"[bold red]Error:[/] File not found at {master_resume_path}")
        return {}

    target_role = Prompt.ask("What is your target role? (e.g., Senior Python Developer)")
    target_exp = Prompt.ask("What is your target experience level? (e.g., Mid-level, Senior)")

    console.print("\n[yellow]Extracting text from PDF...[/yellow]")
    
    resume_text = ""
    try:
        with pdfplumber.open(master_resume_path) as pdf:
            for page in pdf.pages:
                text = page.extract_text()
                if text:
                    resume_text += text + "\n"
    except Exception as e:
        console.print(f"[bold red]Failed to read PDF:[/] {e}")
        return {}

    console.print("[yellow]Parsing candidate profile via Requesty AI Router Gateway...[/yellow]")
    try:
        user_profile = await parse_resume_text(resume_text)
        console.print("[bold green]Candidate profile successfully parsed via Requesty![/bold green]")
        
        # Generate pgvector embedding for candidate skills & experience
        skills_text = f"{target_role} {user_profile.name} Skills: {', '.join(user_profile.skills)}"
        embedding = await generate_embedding(skills_text)
        save_candidate_profile_vector(user_profile.email, user_profile.model_dump(), skills_text, embedding)
        
    except Exception as e:
        console.print(f"[bold red]Failed to parse profile:[/] {e}")
        return {}
    
    dashboard_path = os.path.join(os.getcwd(), "application_dashboard.xlsx")

    state_init = {
        "master_resume_path": master_resume_path,
        "target_role": target_role,
        "target_experience_level": target_exp,
        "user_profile": user_profile,
        "daily_job_queue": [],
        "application_count": 0,
        "excel_dashboard_path": dashboard_path
    }
    
    return state_init
