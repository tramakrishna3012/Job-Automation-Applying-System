import psycopg2
from psycopg2.extras import RealDictCursor
from core.config import NEON_DATABASE_URL
from rich.console import Console

console = Console()

def get_db_connection():
    if not NEON_DATABASE_URL:
        console.print("[yellow]Neon DB URL not configured.[/yellow]")
        return None
    try:
        conn = psycopg2.connect(NEON_DATABASE_URL, cursor_factory=RealDictCursor)
        conn.autocommit = True
        return conn
    except Exception as e:
        console.print(f"[red]Failed to connect to Neon Database: {e}[/red]")
        return None

def init_db():
    conn = get_db_connection()
    if conn:
        try:
            with conn.cursor() as cur:
                cur.execute("""
                    CREATE TABLE IF NOT EXISTS job_applications (
                        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
                        date_applied TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                        company TEXT NOT NULL,
                        role TEXT NOT NULL,
                        url TEXT,
                        status TEXT
                    )
                """)
            console.print("[green]Neon DB initialized successfully.[/green]")
        except Exception as e:
            console.print(f"[red]Failed to initialize schema: {e}[/red]")
        finally:
            conn.close()

# Initialize schema on load
init_db()
