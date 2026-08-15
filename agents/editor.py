import os
import asyncio
from typing import List, Dict, Any, Optional
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

def generate_resume_html(
    profile: Any,
    template_style: str = "executive"
) -> str:
    """Generates pristine, print-ready HTML resume matching the candidate's uploaded resume template."""
    # Convert Pydantic model or dict to standard dict
    if hasattr(profile, "model_dump"):
        data = profile.model_dump()
    elif isinstance(profile, dict):
        data = profile
    else:
        data = {}

    name = data.get("name", "Candidate Name")
    email = data.get("email", "")
    phone = data.get("phone", "")
    location = data.get("location", "")
    linkedin = data.get("linkedin", "")
    github = data.get("github", "")
    summary = data.get("summary", "")
    skills = data.get("skills", [])
    if isinstance(skills, list):
        skills_str = ", ".join(skills)
    else:
        skills_str = str(skills)

    experiences = data.get("experience", [])
    educations = data.get("education", [])

    contact_parts = [p for p in [email, phone, location, linkedin, github] if p]
    contact_line = " &bull; ".join(contact_parts)

    # Build experience HTML
    exp_html = ""
    for exp in experiences:
        company = exp.get("company", "")
        role = exp.get("role") or exp.get("position", "")
        start_date = exp.get("start_date") or exp.get("date", "")
        end_date = exp.get("end_date", "")
        date_str = f"{start_date} — {end_date}" if end_date and start_date else (start_date or end_date or "")
        loc = exp.get("location", "")

        highlights = exp.get("responsibilities") or exp.get("highlights", [])
        if isinstance(highlights, list):
            bullets = "".join([f"<li>{h}</li>" for h in highlights if h])
        else:
            bullets = f"<li>{highlights}</li>"

        exp_html += f"""
        <div class="item">
            <div class="item-header">
                <div>
                    <span class="role">{role}</span>
                    <span class="company"> | {company}</span>
                </div>
                <div class="meta">{date_str}{f' | {loc}' if loc else ''}</div>
            </div>
            <ul>{bullets}</ul>
        </div>
        """

    # Build education HTML
    edu_html = ""
    for edu in educations:
        inst = edu.get("institution", "")
        degree = edu.get("degree") or edu.get("area", "")
        grad_date = edu.get("graduation_date") or edu.get("date", "")
        gpa = edu.get("gpa", "")

        edu_html += f"""
        <div class="item">
            <div class="item-header">
                <div>
                    <span class="role">{degree}</span>
                    <span class="company"> | {inst}</span>
                </div>
                <div class="meta">{grad_date}{f' (GPA: {gpa})' if gpa else ''}</div>
            </div>
        </div>
        """

    # Theme-specific CSS styling
    if template_style == "harvard":
        theme_css = """
        body { font-family: 'Georgia', 'Times New Roman', serif; color: #111; line-height: 1.45; }
        h1 { font-size: 22pt; text-align: center; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px; }
        .contact { text-align: center; font-size: 9.5pt; color: #444; border-bottom: 1.5px solid #111; padding-bottom: 8px; margin-bottom: 14px; }
        h2 { font-size: 11pt; text-transform: uppercase; letter-spacing: 1.5px; border-bottom: 1px solid #999; margin-top: 14px; margin-bottom: 6px; padding-bottom: 2px; color: #111; }
        .role { font-weight: bold; color: #000; }
        .company { font-style: italic; color: #222; }
        """
    elif template_style == "tech":
        theme_css = """
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0f172a; line-height: 1.4; }
        h1 { font-size: 20pt; font-weight: 800; color: #1e1b4b; margin-bottom: 2px; }
        .contact { font-size: 9pt; color: #4338ca; font-weight: 500; margin-bottom: 12px; border-bottom: 2px solid #6366f1; padding-bottom: 6px; }
        h2 { font-size: 11pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #312e81; margin-top: 14px; margin-bottom: 6px; border-bottom: 1px solid #e0e7ff; padding-bottom: 2px; }
        .role { font-weight: 700; color: #1e1b4b; }
        .company { font-weight: 600; color: #4f46e5; }
        .meta { color: #64748b; font-size: 8.5pt; font-family: monospace; }
        .skills-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px 12px; font-size: 9pt; }
        """
    elif template_style == "minimal":
        theme_css = """
        body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #262626; line-height: 1.35; font-size: 9.5pt; }
        h1 { font-size: 18pt; font-weight: 600; color: #000; margin-bottom: 2px; }
        .contact { font-size: 8.5pt; color: #525252; margin-bottom: 10px; border-bottom: 1px solid #e5e5e5; padding-bottom: 4px; }
        h2 { font-size: 10pt; font-weight: bold; text-transform: uppercase; color: #000; margin-top: 12px; margin-bottom: 4px; border-bottom: 1px solid #000; padding-bottom: 1px; }
        .role { font-weight: bold; color: #000; }
        .company { color: #525252; }
        """
    else:  # Executive (Default)
        theme_css = """
        body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 10pt; line-height: 1.42; color: #1e293b; }
        h1 { font-size: 21pt; font-weight: 700; text-transform: uppercase; color: #0f172a; margin-bottom: 2px; letter-spacing: 0.5px; }
        .contact { font-size: 9pt; color: #475569; margin-bottom: 14px; border-bottom: 2px solid #0f172a; padding-bottom: 5px; }
        h2 { font-size: 11pt; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #0f172a; border-bottom: 1px solid #cbd5e1; margin-top: 14px; margin-bottom: 6px; padding-bottom: 2px; }
        .role { font-weight: 700; color: #0f172a; }
        .company { color: #334155; font-weight: 500; }
        .meta { float: right; color: #64748b; font-size: 9pt; }
        """

    summary_section = f"""
    <h2>Executive Summary</h2>
    <div class="summary">{summary}</div>
    """ if summary else ""

    return f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Resume - {name}</title>
    <style>
        @page {{ size: A4; margin: 12mm 15mm; }}
        * {{ box-sizing: border-box; margin: 0; padding: 0; }}
        body {{ max-width: 820px; margin: 0 auto; padding: 24px; }}
        {theme_css}
        .item {{ margin-bottom: 8px; }}
        .item-header {{ display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 2px; }}
        .summary {{ font-size: 9.5pt; color: #334155; margin-bottom: 8px; line-height: 1.45; }}
        ul {{ margin-top: 2px; padding-left: 18px; }}
        li {{ margin-bottom: 2px; font-size: 9.5pt; color: #334155; }}
        .skills-content {{ font-size: 9.5pt; color: #334155; line-height: 1.4; }}
    </style>
</head>
<body>
    <h1>{name}</h1>
    <div class="contact">{contact_line}</div>
    {summary_section}
    <h2>Professional Experience</h2>
    {exp_html}
    <h2>Education</h2>
    {edu_html}
    <h2>Technical Skills & Core Competencies</h2>
    <div class="skills-box skills-content">{skills_str}</div>
</body>
</html>"""

def render_resume_pdf_weasyprint(tailored: Any, html_content: str, job_id: str) -> str:
    """Renders HTML resume into PDF using WeasyPrint AI Resume Architect engine, with HTML fallback for local environments."""
    output_dir = os.path.join(os.getcwd(), ".resumes")
    os.makedirs(output_dir, exist_ok=True)
    
    html_path = os.path.join(output_dir, f"resume_{job_id}.html")
    pdf_path = os.path.join(output_dir, f"resume_{job_id}.pdf")
    
    if "<html>" not in html_content:
        html_content = generate_resume_html(tailored, template_style="executive")

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
