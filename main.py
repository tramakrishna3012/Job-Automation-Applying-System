import asyncio
from rich.console import Console

from agents.onboarding import run_onboarding
from core.graph import app

console = Console()

async def main():
    # Phase 1: Onboarding
    initial_state = await run_onboarding()
    
    if not initial_state:
        console.print("[bold red]Onboarding failed. Exiting...[/bold red]")
        return
        
    console.print("\n[bold green]Starting Autonomous Agent Workflow...[/bold green]\n")
    
    # Run the graph
    try:
        final_state = app.invoke(initial_state)
        console.print("\n[bold green]Workflow completed successfully![/bold green]")
    except Exception as e:
        console.print(f"\n[bold red]Workflow encountered an error:[/bold red] {e}")

if __name__ == "__main__":
    asyncio.run(main())
