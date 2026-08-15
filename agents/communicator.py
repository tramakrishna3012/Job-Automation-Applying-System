import os
import asyncio
import pandas as pd
from rich.console import Console
from apscheduler.schedulers.asyncio import AsyncIOScheduler

from core.state import ApplicationState
from core.ai_gateway import async_chat_completion
from core.db import log_email, log_telemetry, get_hr_contacts
from core.gmail import send_gmail

console = Console()
scheduler = AsyncIOScheduler()

COLD_EMAIL_SYSTEM_PROMPT = (
    "You are an expert career strategist and technical communicator specializing in fresher, internship, "
    "and early career tech applications in India and global remote companies. "
    "Write a highly personalized, compelling 3-paragraph cold email to a hiring manager, campus recruiter, or engineering lead. "
    "Paragraph 1: Warm introduction expressing enthusiasm for their engineering team and recent work/opening. "
    "Paragraph 2: Highlight the candidate's core technical skills, hands-on production/academic projects, GitHub/portfolio work, and problem-solving mindset. "
    "Paragraph 3: Low-friction call to action requesting a brief 10-minute introductory conversation or interview. "
    "Tone: Professional, passionate, articulate, humble yet confident."
)

def ingest_hr_list(file_path: str) -> pd.DataFrame:
    """Reads an HR contact list from Excel or CSV."""
    try:
        if file_path.endswith('.xlsx'):
            return pd.read_excel(file_path)
        elif file_path.endswith('.csv'):
            return pd.read_csv(file_path)
        else:
            console.print("[red]Unsupported file format for HR list. Use .xlsx or .csv[/red]")
            return pd.DataFrame()
    except Exception as e:
        console.print(f"[red]Failed to read HR list: {e}[/red]")
        return pd.DataFrame()

async def generate_personalized_cold_email(contact_name: str, company: str, state: ApplicationState) -> str:
    """Generates personalized fresher cold email via AI Gateway."""
    profile = state.get("user_profile")
    target_role = state.get("target_role", "Software Engineer")
    skills = ", ".join(profile.skills) if profile and hasattr(profile, "skills") else "Python, FastAPI, React, PostgreSQL, AI Systems"
    
    prompt = (
        f"Candidate Name: {profile.name if profile and hasattr(profile, 'name') else 'Candidate'}\n"
        f"Target Position: {target_role} (Fresher / Intern / Early Career)\n"
        f"Target Company: {company}\n"
        f"Recipient: {contact_name}\n"
        f"Candidate Technical Skills: {skills}\n"
        f"Location: India / Remote\n"
        f"Availability: Immediate Joining"
    )
    return await async_chat_completion(
        messages=[{"role": "user", "content": prompt}],
        system_prompt=COLD_EMAIL_SYSTEM_PROMPT,
        temperature=0.7
    )

def send_cold_email(contact_name: str, email: str, company: str, state: ApplicationState):
    """Generates personalized cold email and sends via Gmail API, logging outcome to DB."""
    user_id = state.get("user_id")
    try:
        try:
            loop = asyncio.get_event_loop()
            if loop.is_running():
                import concurrent.futures
                with concurrent.futures.ThreadPoolExecutor() as pool:
                    email_body = pool.submit(asyncio.run, generate_personalized_cold_email(contact_name, company, state)).result()
            else:
                email_body = loop.run_until_complete(generate_personalized_cold_email(contact_name, company, state))
        except RuntimeError:
            email_body = asyncio.run(generate_personalized_cold_email(contact_name, company, state))

        target_role = state.get("target_role", "Software Engineer")
        subject = f"Application / Expression of Interest: {target_role} - {state.get('user_profile').name if state.get('user_profile') else 'Candidate'}"

        console.print(f"[cyan]📧 Generating cold email to {contact_name} ({email}) at {company}...[/cyan]")
        sent_success = send_gmail(to_email=email, subject=subject, body=email_body)

        status = "sent" if sent_success else "draft"
        log_email(
            direction="outbound",
            recipient_name=contact_name,
            recipient_email=email,
            company=company,
            subject=subject,
            body=email_body,
            status=status,
            user_id=user_id
        )
        log_telemetry("Communicator", f"Cold outreach email ({status}) prepared for {contact_name} at {company}", user_id=user_id)
    except Exception as e:
        console.print(f"[red]Failed to generate or send cold email: {e}[/red]")

def run_communicator(state: ApplicationState) -> ApplicationState:
    console.print("\n[bold blue]--- Phase 5: Intelligent Cold Outreach & HR Campaigns ---[/bold blue]")
    user_id = state.get("user_id")

    contacts_to_schedule = []

    # 1. Check if uploaded CSV/Excel HR list exists
    hr_list_path = state.get("hr_list_path")
    if hr_list_path and os.path.exists(hr_list_path):
        df = ingest_hr_list(hr_list_path)
        if not df.empty and 'Email' in df.columns and 'Company' in df.columns:
            for _, row in df.iterrows():
                contacts_to_schedule.append({
                    "name": row.get("Contact Name", "Hiring Lead"),
                    "email": str(row["Email"]).strip(),
                    "company": str(row["Company"]).strip()
                })

    # 2. If no uploaded file, query auto-discovered contacts from Jobcode/Scout
    if not contacts_to_schedule and user_id:
        db_contacts = get_hr_contacts(user_id)
        for c in db_contacts[:15]:
            if c.get("email"):
                contacts_to_schedule.append({
                    "name": c.get("contact_name", "Hiring Manager"),
                    "email": c["email"],
                    "company": c.get("company", "Tech Company")
                })

    if contacts_to_schedule:
        console.print(f"[green]Scheduling personalized outreach for {len(contacts_to_schedule)} HR / recruiter contacts...[/green]")
        log_telemetry("Communicator", f"Scheduling cold email outreach campaign for {len(contacts_to_schedule)} contacts", user_id=user_id)

        if not scheduler.running:
            try:
                scheduler.start()
            except Exception:
                pass

        for idx, contact in enumerate(contacts_to_schedule):
            try:
                # Dispatch first email immediately, pace subsequent emails with anti-spam delays
                if idx == 0:
                    send_cold_email(contact["name"], contact["email"], contact["company"], state)
                else:
                    scheduler.add_job(
                        send_cold_email,
                        'interval',
                        minutes=5 * (idx + 1),
                        args=[contact["name"], contact["email"], contact["company"], state],
                        max_instances=1
                    )
            except Exception as e:
                console.print(f"[yellow]Schedule error for {contact['email']}: {e}[/yellow]")

        console.print("[green]Cold email outreach campaign queued successfully with anti-spam pacing![/green]")
    else:
        console.print("[yellow]No HR contacts queued. Upload an HR list or run Jobcode to auto-discover recruiter contacts.[/yellow]")

    return state
