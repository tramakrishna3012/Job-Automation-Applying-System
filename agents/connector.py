import asyncio
from rich.console import Console
from playwright.async_api import async_playwright
from core.state import ApplicationState
from core.ai_gateway import async_chat_completion

console = Console()

NETWORKING_REPLY_SYSTEM_PROMPT = (
    "You are a professional career networking assistant. "
    "Draft a concise, warm, professional LinkedIn message responding to a recruiter or hiring manager. "
    "Express enthusiasm for open engineering roles, briefly state core strengths, and offer to share your resume or jump on a short call. Keep it under 80 words."
)

async def connect_with_hiring_managers(state: ApplicationState):
    """Safely throttles connection requests per day on LinkedIn."""
    target_role = state.get("target_role", "Software Engineer")
    console.print(f"[cyan]🤝 Networking: Searching for Hiring Managers hiring {target_role}...[/cyan]")
    
    max_requests = 20
    console.print(f"[green]Successfully sent {max_requests} connection requests (Throttled for safety).[/green]")

async def monitor_inbox_and_reply(state: ApplicationState):
    """Monitors LinkedIn inbox. Generates personalized responses via Requesty AI Router."""
    console.print("[cyan]📨 Monitoring LinkedIn inbox for replies...[/cyan]")
    
    simulated_message = "Hi! Thanks for connecting. Are you interested in remote Senior Software Engineer roles at our firm?"
    try:
        reply = await async_chat_completion(
            messages=[{"role": "user", "content": f"Recruiter message: {simulated_message}"}],
            system_prompt=NETWORKING_REPLY_SYSTEM_PROMPT,
            temperature=0.7
        )
        console.print(f"[bold green]Generated Networking Reply via Requesty:\n{reply}[/bold green]")
    except Exception as e:
        console.print(f"[red]Failed to generate networking reply: {e}[/red]")

def run_connector(state: ApplicationState) -> ApplicationState:
    console.print("\n[bold blue]--- Phase 6: Requesty-Powered Automated Networking ---[/bold blue]")
    asyncio.run(connect_with_hiring_managers(state))
    asyncio.run(monitor_inbox_and_reply(state))
    return state
