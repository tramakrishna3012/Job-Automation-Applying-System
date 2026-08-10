import os
import asyncio
from typing import List
from rich.console import Console

from core.state import ApplicationState, TailoredResume, UserProfile, JobMatch
from core.db import log_telemetry
from core.ai_gateway import async_structured_output, async_chat_completion

console = Console()

EDITOR_SYSTEM_PROMPT = (
    "You are an expert AI Resume Architect and executive career advisor. "
    "Your task is to tailor a master UserProfile to perfectly match a specific Job Description. "
    "CRITICAL CONSTRAINT: You are STRICTLY PROHIBITED from hallucinating, inventing, or adding ANY skills, "
    "experiences, or degrees that are not present in the master UserProfile. "
    "Your role is ONLY to select, emphasize, and reorder the existing facts to highlight the most relevant points for this specific job. "
    "Generate a compelling professional summary based exclusively on the matched skills."
)

HTML_RESUME_PROMPT = (
    "You are a master Web & Document Designer. Convert the following structured resume JSON into a clean, modern, "
    "single-page executive resume HTML document styled with pure embedded CSS. "
    "Design instructions: Use a modern font like Arial/Helvetica, sleek dark blue/slate accent colors (#1e293b, #0f172a), "
    "crisp typography, clean section dividers, structured bullet points, and elegant spacing suitable for print/PDF conversion via WeasyPrint. "
    "Return ONLY the complete HTML string inside standard <html><body> tags, without any markdown formatting."
)

def render_resume_pdf_weasyprint(tailored: TailoredResume, html_content: str, job_id: str) -> str:
    """Renders HTML resume into PDF using WeasyPrint AI Resume Architect engine, with HTML fallback for local environments."""
    output_dir = os.path.join(os.getcwd(), ".resumes")
    os.makedirs(output_dir, exist_ok=True)
    
    html_path = os.path.join(output_dir, f"resume_{job_id}.html")
    pdf_path = os.path.join(output_dir, f"resume_{job_id}.pdf")
    
    if "<html>" not in html_content:
        skills_formatted = ", ".join(tailored.skills)
        exp_html = ""
        for exp in tailored.experience:
            bullets = "".join([f"<li>{h}</li>" for h in exp.highlights])
            exp_html += f"""
            <div class="job">
                <div class="job-header">
                    <strong>{exp.position}</strong> — <span>{exp.company}</span>
                    <span class="date">{exp.date} | {exp.location}</span>
                </div>
                <ul>{bullets}</ul>
            </div>
            """
            
        edu_html = ""
        for edu in tailored.education:
            edu_html += f"""
            <div class="edu">
                <strong>{edu.institution}</strong> — {edu.area} ({edu.date})
            </div>
            """
            
        html_content = f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Resume - {tailored.name}</title>
    <style>
        @page {{ size: A4; margin: 15mm; }}
        body {{ font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 10pt; line-height: 1.4; color: #1e293b; max-width: 800px; margin: 0 auto; padding: 20px; }}
        h1 {{ font-size: 20pt; text-transform: uppercase; color: #0f172a; margin-bottom: 2px; }}
        .contact {{ font-size: 9pt; color: #475569; margin-bottom: 15px; border-bottom: 2px solid #0f172a; padding-bottom: 5px; }}
        h2 {{ font-size: 12pt; text-transform: uppercase; color: #1e293b; border-bottom: 1px solid #cbd5e1; margin-top: 15px; margin-bottom: 8px; }}
        .summary {{ margin-bottom: 10px; font-style: italic; }}
        .job {{ margin-bottom: 10px; }}
        .job-header {{ font-size: 10pt; margin-bottom: 3px; }}
        .date {{ float: right; color: #64748b; font-size: 9pt; }}
        ul {{ margin-top: 3px; padding-left: 18px; }}
        li {{ margin-bottom: 2px; }}
        .skills {{ font-weight: 500; }}
    </style>
</head>
<body>
    <h1>{tailored.name}</h1>
    <div class="contact">
        {tailored.email} | {tailored.phone or ''} | {tailored.location or ''}
    </div>
    <h2>Executive Summary</h2>
    <div class="summary">{tailored.summary}</div>
    <h2>Professional Experience</h2>
    {exp_html}
    <h2>Education</h2>
    {edu_html}
    <h2>Core Competencies & Skills</h2>
    <div class="skills">{skills_formatted}</div>
</body>
</html>"""

    with open(html_path, "w", encoding="utf-8") as f:
        f.write(html_content)

    try:
        import weasyprint
        weasyprint.HTML(string=html_content).write_pdf(pdf_path)
        return pdf_path
    except (ImportError, OSError, Exception) as e:
        console.print(f"[yellow]WeasyPrint PDF engine notice: {e}. Saved HTML resume at {html_path}[/yellow]")
        return html_path

async def tailor_for_job(job: JobMatch, profile: UserProfile) -> JobMatch:
    if not job.description:
        console.print(f"[yellow]Skipping {job.company} - No JD extracted[/yellow]")
        return job
        
    console.print(f"Tailoring resume for {job.company} - {job.title} via Requesty AI Router...")
    log_telemetry("Editor", f"Tailoring Master Resume for {job.company} via Requesty Unified Router")
    
    user_prompt = f"""
    Master Profile:
    {profile.model_dump_json(indent=2)}
    
    Target Job Description ({job.title} at {job.company}):
    {job.description}
    """
    
    try:
        tailored_resume = await async_structured_output(
            system_prompt=EDITOR_SYSTEM_PROMPT,
            user_content=user_prompt,
            response_model=TailoredResume,
        )
        
        html_content = await async_chat_completion(
            messages=[{"role": "user", "content": f"Structured Tailored Resume:\n{tailored_resume.model_dump_json(indent=2)}"}],
            system_prompt=HTML_RESUME_PROMPT,
            temperature=0.3,
        )
        
        console.print(f"Compiling AI Resume Architect document for {job.company}...")
        doc_path = render_resume_pdf_weasyprint(tailored_resume, html_content, job.id)
        
        if os.path.exists(doc_path):
            job.tailored_resume_path = doc_path
            console.print(f"[bold green]Successfully generated resume architect document: {doc_path}[/bold green]")
        else:
            console.print(f"[red]Resume document generation failed for {job.company}[/red]")
            
    except Exception as e:
        console.print(f"[red]Failed to tailor resume for {job.company}: {e}[/red]")
        
    return job

def run_editor(state: ApplicationState) -> ApplicationState:
    console.print("\n[bold blue]--- Phase 3: AI Resume Architect & Document Generation ---[/bold blue]")
    
    queue = state.get("daily_job_queue", [])
    profile = state.get("user_profile")
    
    if not queue or not profile:
        console.print("[red]Missing job queue or user profile![/red]")
        return state
        
    async def process_all():
        tasks = [tailor_for_job(job, profile) for job in queue]
        results = []
        for i in range(0, len(tasks), 5):
            batch = tasks[i:i+5]
            batch_results = await asyncio.gather(*batch)
            results.extend(batch_results)
            await asyncio.sleep(1)
        return results

    updated_queue = asyncio.run(process_all())
    state["daily_job_queue"] = updated_queue
    
    return state
