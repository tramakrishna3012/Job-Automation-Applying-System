import os
import pandas as pd
from rich.console import Console
from rich.prompt import Prompt
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from core.state import ApplicationState

# Stub for Gmail API
# from googleapiclient.discovery import build
# from google.oauth2.credentials import Credentials

console = Console()
scheduler = AsyncIOScheduler()

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

def send_cold_email(contact_name: str, email: str, company: str, state: ApplicationState):
    """Sends a cold email to the HR contact via Gmail API."""
    profile = state.get("user_profile")
    if not profile:
        return
        
    subject = f"Inquiry regarding {state.get('target_role', 'open roles')} at {company}"
    body = f"Hi {contact_name},\n\nI am {profile.name}, an experienced professional in {state.get('target_role')}. " \
           f"I noticed {company} is doing great work and wanted to share my resume in case of any openings.\n\n" \
           f"Best,\n{profile.name}\n{profile.linkedin}"
           
    console.print(f"[cyan]📧 Sending email to {contact_name} ({email}) at {company}[/cyan]")
    # Gmail API logic would go here:
    # service = build('gmail', 'v1', credentials=creds)
    # message = create_message("me", email, subject, body)
    # send_message(service, "me", message)
    
def run_communicator(state: ApplicationState) -> ApplicationState:
    console.print("\n[bold blue]--- Phase 5: Timed Cold Emails ---[/bold blue]")
    
    do_outreach = Prompt.ask("Do you have an HR contact list for cold outreach? (y/n)", choices=["y", "n"], default="n")
    if do_outreach == "y":
        hr_list_path = Prompt.ask("Please provide the path to your HR list (.xlsx or .csv)")
        
        df = ingest_hr_list(hr_list_path)
        
        if not df.empty and 'Email' in df.columns and 'Contact Name' in df.columns and 'Company' in df.columns:
            console.print(f"[green]Loaded {len(df)} contacts.[/green]")
            
            # Start scheduler
            if not scheduler.running:
                scheduler.start()
                
            # Schedule emails spaced by 10 minutes to avoid rate limits
            for idx, row in df.iterrows():
                # For demo purposes, we will just execute them synchronously or schedule them very soon
                scheduler.add_job(
                    send_cold_email,
                    'interval', 
                    minutes=10 * (idx + 1), # delay each by 10m * idx
                    args=[row['Contact Name'], row['Email'], row['Company'], state],
                    max_instances=1
                )
            console.print("[green]Cold emails scheduled successfully![/green]")
        else:
            console.print("[red]Invalid HR list format. Expected columns: 'Contact Name', 'Email', 'Company'.[/red]")
            
    return state
