import asyncio
import pandas as pd
from pydantic_ai import Agent
from pydantic_ai.models.gemini import GeminiModel
from rich.console import Console

from core.config import GEMINI_API_KEY
from core.state import ApplicationState

console = Console()

# Intent Classification Agent
model = GeminiModel("gemini-2.5-flash")
intent_agent = Agent(
    model,
    result_type=str,
    system_prompt=(
        "Classify the intent of the following HR email response into one of three categories: "
        "'Interview', 'Rejected', or 'Interested'. "
        "If it is a generic auto-reply, classify as 'Pending'. "
        "Only return the exact category string."
    )
)

async def check_inbox_and_classify(state: ApplicationState):
    """Polls inbox and updates Excel dashboard based on classified intent."""
    dashboard_path = state.get("excel_dashboard_path")
    
    if not dashboard_path:
        return
        
    console.print("[cyan]🔍 Polling inbox for HR responses...[/cyan]")
    # Stub: Fetch emails from Gmail API matching HR contacts
    # ...
    
    # Example simulated incoming email
    simulated_email = {
        "company": "TechCorp",
        "body": "Thank you for reaching out. We would love to schedule a call with you next week."
    }
    
    try:
        result = await intent_agent.run(simulated_email["body"])
        intent = result.data
        console.print(f"[green]Detected intent for {simulated_email['company']}: {intent}[/green]")
        
        # Update Excel
        try:
            df = pd.read_excel(dashboard_path)
            # Find the row for the company and update status
            mask = df['Company'] == simulated_email['company']
            if mask.any():
                df.loc[mask, 'Status'] = intent
                df.to_excel(dashboard_path, index=False)
                console.print(f"[green]Dashboard updated for {simulated_email['company']}[/green]")
        except Exception as e:
            console.print(f"[red]Failed to update dashboard from tracker: {e}[/red]")
            
    except Exception as e:
        console.print(f"[red]Failed to classify intent: {e}[/red]")
        
# For demonstration, this can be called as part of the communicator or as a separate daemon.
