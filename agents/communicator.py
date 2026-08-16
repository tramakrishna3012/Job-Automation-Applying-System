import os
import asyncio
import pandas as pd
from rich.console import Console
from apscheduler.schedulers.asyncio import AsyncIOScheduler

from core.state import ApplicationState
from core.ai_gateway import async_chat_completion
from core.db import log_email, log_telemetry, get_hr_contacts, normalize_contact_record, update_hr_contact_status
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
    """Reads and normalizes an HR contact list from Excel (.xlsx, .xls) or CSV (.csv)."""
    try:
        df = pd.DataFrame()
        lower_path = file_path.lower()
        if lower_path.endswith(('.xlsx', '.xls')):
            df = pd.read_excel(file_path)
        elif lower_path.endswith('.csv'):
            try:
                df = pd.read_csv(file_path)
            except Exception:
                df = pd.read_csv(file_path, sep=None, engine='python')
        else:
            try:
                df = pd.read_csv(file_path)
            except Exception:
                df = pd.read_excel(file_path)

        if df.empty:
            return df

        # Clean string columns: strip whitespace
        df = df.map(lambda x: x.strip() if isinstance(x, str) else x)
        return df
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

def send_cold_email(contact_name: str, email: str, company: str, state: ApplicationState, contact_id: str = ""):
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
        candidate_name = state.get('user_profile').name if (state.get('user_profile') and hasattr(state.get('user_profile'), 'name')) else 'Candidate'
        subject = f"Application / Expression of Interest: {target_role} - {candidate_name}"

        try:
            console.print(f"[cyan][Outreach] Generating cold email to {contact_name} ({email}) at {company}...[/cyan]")
        except Exception:
            pass

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

        if user_id and contact_id:
            update_hr_contact_status(user_id, contact_id, status=status, email_draft=email_body)

        log_telemetry("Communicator", f"Cold outreach email ({status}) prepared for {contact_name} at {company}", user_id=user_id)
        return {"status": status, "subject": subject, "body": email_body}
    except Exception as e:
        try:
            console.print(f"[red]Failed to generate or send cold email: {e}[/red]")
        except Exception:
            pass
        return {"status": "failed", "error": str(e)}

def run_communicator(state: ApplicationState) -> ApplicationState:
    console.print("\n[bold blue]--- Phase 5: Intelligent Cold Outreach & HR Campaigns ---[/bold blue]")
    user_id = state.get("user_id")

    contacts_to_schedule = []

    # 1. Check if uploaded CSV/Excel HR list exists
    hr_list_path = state.get("hr_list_path")
    if hr_list_path and os.path.exists(hr_list_path):
        df = ingest_hr_list(hr_list_path)
        if not df.empty:
            for _, row in df.iterrows():
                norm = normalize_contact_record(row.to_dict())
                if norm.get("email"):
                    contacts_to_schedule.append({
                        "id": "",
                        "name": norm["contact_name"],
                        "email": norm["email"],
                        "company": norm["company"],
                        "position": norm["position"]
                    })

    # 2. If no uploaded file, query auto-discovered contacts from database
    if not contacts_to_schedule and user_id:
        db_contacts = get_hr_contacts(user_id)
        for c in db_contacts[:25]:
            email_val = (c.get("email") or "").strip()
            if email_val:
                contacts_to_schedule.append({
                    "id": str(c.get("id", "")),
                    "name": c.get("contact_name") or "Hiring Manager",
                    "email": email_val,
                    "company": c.get("company") or "Tech Company",
                    "position": c.get("position") or "Hiring Manager"
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
                    send_cold_email(contact["name"], contact["email"], contact["company"], state, contact["id"])
                else:
                    scheduler.add_job(
                        send_cold_email,
                        'interval',
                        minutes=5 * (idx + 1),
                        args=[contact["name"], contact["email"], contact["company"], state, contact["id"]],
                        max_instances=1
                    )
            except Exception as e:
                console.print(f"[yellow]Schedule error for {contact['email']}: {e}[/yellow]")

        console.print("[green]Cold email outreach campaign queued successfully with anti-spam pacing![/green]")
    else:
        console.print("[yellow]No HR contacts queued. Upload an HR list or run Jobcode to auto-discover recruiter contacts.[/yellow]")

    return state
