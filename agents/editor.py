import os
import yaml
import asyncio
from pydantic_ai import Agent
from pydantic_ai.models.gemini import GeminiModel
from pydantic_ai.models.groq import GroqModel
from pydantic_ai.models.ollama import OllamaModel
from pydantic_ai.providers.ollama import OllamaProvider
from pydantic_ai.models.fallback import FallbackModel
import os
import subprocess

from core.state import ApplicationState, TailoredResume, UserProfile, JobMatch
from core.db import log_telemetry
from core.config import GEMINI_API_KEY
from rich.console import Console

console = Console()

# We configure Pydantic AI for Resume Tailoring
gemini_model = GeminiModel("gemini-1.5-pro")
groq_model = GroqModel("llama-3.3-70b-versatile")
ollama_provider = OllamaProvider(base_url=os.getenv("OLLAMA_BASE_URL", "http://localhost:11434"))
ollama_model = OllamaModel("llama3.2", provider=ollama_provider)
model = FallbackModel(gemini_model, groq_model, ollama_model)
editor_agent = Agent(
    model,
    output_type=TailoredResume,
    system_prompt=(
        "You are an expert resume editor and career coach. "
        "Your task is to tailor a master UserProfile to perfectly match a specific Job Description. "
        "CRITICAL CONSTRAINT: You are STRICTLY PROHIBITED from hallucinating, inventing, or adding ANY skills, experiences, or degrees that are not present in the master UserProfile. "
        "Your role is ONLY to select, emphasize, and reorder the existing facts to highlight the most relevant points for this specific job. "
        "Generate a professional summary based on the matched skills."
    ),
)

def generate_rendercv_yaml(tailored: TailoredResume, job_id: str) -> str:
    """Converts the TailoredResume into a RenderCV YAML format and saves it."""
    
    cv_data = {
        "cv": {
            "name": tailored.name,
            "location": tailored.location or "Remote",
            "email": tailored.email,
            "phone": tailored.phone or "",
            "sections": {
                "summary": [tailored.summary],
                "experience": [],
                "education": [],
                "skills": [
                    {"details": ", ".join(tailored.skills)}
                ]
            }
        }
    }
    
    # Add experience
    for exp in tailored.experience:
        cv_data["cv"]["sections"]["experience"].append({
            "company": exp.company,
            "position": exp.position,
            "location": exp.location,
            "date": exp.date,
            "highlights": exp.highlights
        })
        
    # Add education
    for edu in tailored.education:
        cv_data["cv"]["sections"]["education"].append({
            "institution": edu.institution,
            "area": edu.area,
            "date": edu.date
        })
        
    output_dir = os.path.join(os.getcwd(), ".resumes")
    os.makedirs(output_dir, exist_ok=True)
    
    yaml_path = os.path.join(output_dir, f"resume_{job_id}.yaml")
    
    with open(yaml_path, 'w') as f:
        yaml.dump(cv_data, f, default_flow_style=False, sort_keys=False)
        
    return yaml_path

async def tailor_for_job(job: JobMatch, profile: UserProfile) -> JobMatch:
    if not job.description:
        console.print(f"[yellow]Skipping {job.company} - No JD extracted[/yellow]")
        return job
        
    console.print(f"Tailoring resume for {job.company} - {job.title}...")
    log_telemetry("Editor", f"Tailoring Master Resume for {job.company} using Gemini-2.5-Flash")
    
    prompt = f"""
    Master Profile:
    {profile.model_dump_json(indent=2)}
    
    Job Description:
    {job.description}
    """
    
    try:
        result = await editor_agent.run(prompt)
        tailored_resume = result.data
        
        # Generate YAML
        yaml_path = generate_rendercv_yaml(tailored_resume, job.id)
        
        # Render PDF
        console.print(f"Compiling PDF for {job.company}...")
        # uv run rendercv render path.yaml --pdf-path out.pdf
        output_pdf_path = yaml_path.replace(".yaml", ".pdf")
        
        process = subprocess.run(
            ["uv", "run", "rendercv", "render", yaml_path],
            capture_output=True,
            text=True
        )
        
        # RenderCV creates the pdf in a rendercv_output folder usually, let's copy it or assume default path
        # By default rendercv creates a folder next to the yaml: <filename>_cv
        rendered_folder = yaml_path.replace(".yaml", "_cv")
        default_pdf = os.path.join(rendered_folder, f"{tailored_resume.name.replace(' ', '_')}_CV.pdf")
        
        if os.path.exists(default_pdf):
            job.tailored_resume_path = default_pdf
            console.print(f"[green]Successfully generated: {default_pdf}[/green]")
        else:
            console.print(f"[red]RenderCV PDF not found at {default_pdf}[/red]")
            console.print(process.stdout)
            
    except Exception as e:
        console.print(f"[red]Failed to tailor resume for {job.company}: {e}[/red]")
        
    return job

def run_editor(state: ApplicationState) -> ApplicationState:
    console.print("\n[bold blue]--- Phase 3: Resume Tailoring & Document Generation ---[/bold blue]")
    
    queue = state.get("daily_job_queue", [])
    profile = state.get("user_profile")
    
    if not queue or not profile:
        console.print("[red]Missing job queue or user profile![/red]")
        return state
        
    async def process_all():
        tasks = [tailor_for_job(job, profile) for job in queue]
        # We process in batches of 5 to avoid rate limits
        results = []
        for i in range(0, len(tasks), 5):
            batch = tasks[i:i+5]
            batch_results = await asyncio.gather(*batch)
            results.extend(batch_results)
            await asyncio.sleep(2)
        return results

    updated_queue = asyncio.run(process_all())
    state["daily_job_queue"] = updated_queue
    
    return state
