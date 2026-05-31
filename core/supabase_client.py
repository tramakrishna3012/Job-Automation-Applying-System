import os
from supabase import create_client, Client
from core.config import SUPABASE_URL, SUPABASE_KEY
from rich.console import Console

console = Console()

def get_supabase_client() -> Client | None:
    if not SUPABASE_URL or not SUPABASE_KEY:
        console.print("[yellow]Supabase credentials not configured.[/yellow]")
        return None
    try:
        return create_client(SUPABASE_URL, SUPABASE_KEY)
    except Exception as e:
        console.print(f"[red]Failed to initialize Supabase client: {e}[/red]")
        return None

supabase: Client | None = get_supabase_client()
