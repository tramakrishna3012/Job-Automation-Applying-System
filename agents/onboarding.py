import os
import pdfplumber
from rich.console import Console
from rich.prompt import Prompt
from pydantic_ai import Agent
from pydantic_ai.models.gemini import GeminiModel

from core.state import UserProfile
from core.config import GEMINI_API_KEY

console = Console()

# We configure Pydantic AI to use Gemini
model = GeminiModel("gemini-2.5-flash")
extraction_agent = Agent(
    model,
    result_type=UserProfile,
    system_prompt=(
        "You are an expert resume parser. "
        "Extract the user's details from the provided resume text and map them exactly to the UserProfile schema. "
        "Do not hallucinate skills or experience."
    ),
)

async def run_onboarding() -> dict:
    console.print("[bold blue]Welcome to the Autonomous Job Application Agent System![/bold blue]")
    console.print("Let's get started by setting up your profile.\n")

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

    console.print("[yellow]Parsing resume using Gemini API...[/yellow]")
    try:
        # Pydantic AI Agent Run
        result = await extraction_agent.run(f"Resume Text:\n{resume_text}")
        user_profile = result.data
        console.print("[bold green]Profile successfully parsed![/bold green]")
    except Exception as e:
        console.print(f"[bold red]Failed to parse profile:[/] {e}")
        return {}
    
    # Define excel dashboard path
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
