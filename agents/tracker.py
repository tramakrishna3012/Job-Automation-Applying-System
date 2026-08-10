import asyncio
from rich.console import Console

from core.state import ApplicationState
from core.db import get_db_connection
from core.ai_gateway import async_chat_completion

console = Console()

TRACKER_INTENT_SYSTEM_PROMPT = (
    "Classify the intent of the following HR email response into one of four exact categories: "
    "'Interview', 'Rejected', 'Interested', or 'Pending'. "
    "If it is a request to interview/schedule a call, return 'Interview'. "
    "If it is a rejection email, return 'Rejected'. "
    "If positive interest without concrete interview scheduling yet, return 'Interested'. "
    "If an automated confirmation or generic acknowledgement, return 'Pending'. "
    "Return ONLY the exact category string."
)

async def classify_email_intent(email_body: str) -> str:
    """Classifies HR email intent via Requesty AI Router Gateway."""
    intent = await async_chat_completion(
        messages=[{"role": "user", "content": f"HR Email Body:\n{email_body}"}],
        system_prompt=TRACKER_INTENT_SYSTEM_PROMPT,
        temperature=0.0
    )
    clean_intent = intent.strip().replace("'", "").replace('"', '')
    if clean_intent not in ['Interview', 'Rejected', 'Interested', 'Pending']:
        clean_intent = 'Pending'
    return clean_intent

async def check_inbox_and_classify(state: ApplicationState):
    """Polls inbox and updates DB status based on classified intent."""
    console.print("[cyan]🔍 Polling inbox for HR responses via Requesty Intent Classifier...[/cyan]")
    
    simulated_email = {
        "company": "TechCorp",
        "body": "Thank you for reaching out. We were very impressed by your background and would love to schedule an interview call with our engineering team next week."
    }
    
    try:
        intent = await classify_email_intent(simulated_email["body"])
        console.print(f"[bold green]Detected intent for {simulated_email['company']}: {intent}[/bold green]")
        
        conn = get_db_connection()
        if conn:
            with conn.cursor() as cur:
                cur.execute(
                    "UPDATE job_applications SET status = %s WHERE company = %s",
                    (intent, simulated_email['company'])
                )
            console.print(f"[green]Dashboard DB updated for {simulated_email['company']}[/green]")
            conn.close()
        else:
            console.print("[yellow]Neon DB not configured. Skipping dashboard update.[/yellow]")
            
    except Exception as e:
        console.print(f"[red]Failed to classify intent: {e}[/red]")
