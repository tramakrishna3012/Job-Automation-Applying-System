import os
import asyncio
import pandas as pd
from rich.console import Console
from rich.prompt import Prompt
from apscheduler.schedulers.asyncio import AsyncIOScheduler

from core.state import ApplicationState
from core.ai_gateway import async_chat_completion

console = Console()
scheduler = AsyncIOScheduler()

COLD_EMAIL_SYSTEM_PROMPT = (
    "You are an executive career communicator. "
    "Write a highly personalized, compelling 3-paragraph cold email to a prospective hiring manager or HR lead. "
    "Paragraph 1: Warm introduction and appreciation of their team's work. "
    "Paragraph 2: Highlight candidate background, technical value, and top achievements matching the target role. "
    "Paragraph 3: Low-friction call to action asking for a brief 10-minute introduction call."
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
    """Generates personalized cold email via Requesty AI Router Gateway."""
    profile = state.get("user_profile")
    target_role = state.get("target_role", "Software Engineer")
    skills = ", ".join(profile.skills) if profile else "Software Development, AI, Cloud Architecture"
    
    prompt = f"Candidate Name: {profile.name if profile else 'Candidate'}\nTarget Role: {target_role}\nTarget Company: {company}\nRecipient: {contact_name}\nKey Skills: {skills}"
    return await async_chat_completion(
        messages=[{"role": "user", "content": prompt}],
        system_prompt=COLD_EMAIL_SYSTEM_PROMPT,
        temperature=0.7
    )

def send_cold_email(contact_name: str, email: str, company: str, state: ApplicationState):
    """Sends a cold email to the HR contact."""
    try:
        email_body = asyncio.run(generate_personalized_cold_email(contact_name, company, state))
        console.print(f"[cyan]📧 Sending Requesty-generated cold email to {contact_name} ({email}) at {company}:[/cyan]")
        console.print(f"[dim]{email_body[:120]}...[/dim]\n")
    except Exception as e:
        console.print(f"[red]Failed to generate or send cold email: {e}[/red]")

def run_communicator(state: ApplicationState) -> ApplicationState:
    console.print("\n[bold blue]--- Phase 5: Timed Cold Emails via Requesty AI Gateway ---[/bold blue]")
    
    do_outreach = Prompt.ask("Do you have an HR contact list for cold outreach? (y/n)", choices=["y", "n"], default="n")
    if do_outreach == "y":
        hr_list_path = Prompt.ask("Please provide the path to your HR list (.xlsx or .csv)")
        df = ingest_hr_list(hr_list_path)
        
        if not df.empty and 'Email' in df.columns and 'Contact Name' in df.columns and 'Company' in df.columns:
            console.print(f"[green]Loaded {len(df)} contacts.[/green]")
            if not scheduler.running:
                scheduler.start()
                
            for idx, row in df.iterrows():
                scheduler.add_job(
                    send_cold_email,
                    'interval', 
                    minutes=10 * (idx + 1),
                    args=[row['Contact Name'], row['Email'], row['Company'], state],
                    max_instances=1
                )
            console.print("[green]Cold emails scheduled successfully![/green]")
        else:
            console.print("[red]Invalid HR list format. Expected columns: 'Contact Name', 'Email', 'Company'.[/red]")
            
    return state
