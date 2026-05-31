import asyncio
from pydantic_ai import Agent
from pydantic_ai.models.gemini import GeminiModel
from pydantic_ai.models.groq import GroqModel
from pydantic_ai.models.ollama import OllamaModel
from pydantic_ai.models.fallback import FallbackModel
from rich.console import Console

from core.config import GEMINI_API_KEY
from core.state import ApplicationState
from core.db import get_db_connection

console = Console()

# Intent Classification Agent
gemini_model = GeminiModel("gemini-1.5-pro")
groq_model = GroqModel("llama-3.3-70b-versatile")
ollama_model = OllamaModel("llama3.2")
model = FallbackModel(gemini_model, groq_model, ollama_model)
intent_agent = Agent(
    model,
    output_type=str,
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
        
        try:
            conn = get_db_connection()
            if conn:
                with conn.cursor() as cur:
                    cur.execute(
                        "UPDATE job_applications SET status = %s WHERE company = %s",
                        (intent, simulated_email['company'])
                    )
                console.print(f"[green]Dashboard updated for {simulated_email['company']}[/green]")
                conn.close()
            else:
                console.print("[yellow]Neon DB not configured. Skipping dashboard update.[/yellow]")
        except Exception as e:
            console.print(f"[red]Failed to update dashboard from tracker: {e}[/red]")
            
    except Exception as e:
        console.print(f"[red]Failed to classify intent: {e}[/red]")
        
# For demonstration, this can be called as part of the communicator or as a separate daemon.
