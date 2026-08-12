import json
import psycopg2
from psycopg2.extras import RealDictCursor
from core.config import NEON_DATABASE_URL
from rich.console import Console
from typing import List, Dict, Any, Optional

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
                # Enable pgvector extension
                cur.execute("CREATE EXTENSION IF NOT EXISTS vector;")
                
                # Job Applications table
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
                
                # Agent Telemetry Logs table
                cur.execute("""
                    CREATE TABLE IF NOT EXISTS agent_logs (
                        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
                        timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                        agent_name TEXT NOT NULL,
                        message TEXT NOT NULL
                    )
                """)
                
                # Candidate Vector Profiles for pgvector matching
                cur.execute("""
                    CREATE TABLE IF NOT EXISTS candidate_profiles (
                        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
                        user_email TEXT NOT NULL UNIQUE,
                        profile_json JSONB NOT NULL,
                        skills_text TEXT NOT NULL,
                        embedding vector(1536)
                    )
                """)
                
                # Job Description Vector Embeddings for hybrid search
                cur.execute("""
                    CREATE TABLE IF NOT EXISTS job_embeddings (
                        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
                        company TEXT NOT NULL,
                        title TEXT NOT NULL,
                        description TEXT NOT NULL,
                        url TEXT UNIQUE,
                        embedding vector(1536),
                        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                    )
                """)
                # Emails table (Cold Outreach & Inbound Classified Replies)
                cur.execute("""
                    CREATE TABLE IF NOT EXISTS emails (
                        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
                        timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                        direction TEXT NOT NULL,
                        recipient_name TEXT,
                        recipient_email TEXT,
                        company TEXT,
                        subject TEXT,
                        body TEXT,
                        classification TEXT,
                        status TEXT DEFAULT 'draft'
                    )
                """)

                # Scraped URLs deduplication table (Jobcode blog + other job sources)
                cur.execute("""
                    CREATE TABLE IF NOT EXISTS scraped_urls (
                        url TEXT PRIMARY KEY,
                        source TEXT NOT NULL,
                        scraped_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                    )
                """)
                
            console.print("[green]Neon DB with pgvector extension initialized successfully.[/green]")
        except Exception as e:
            console.print(f"[red]Failed to initialize schema or pgvector: {e}[/red]")
        finally:
            conn.close()

# Initialize schema on load
init_db()

telemetry_listeners = set()

def register_telemetry_listener(callback):
    telemetry_listeners.add(callback)

def unregister_telemetry_listener(callback):
    telemetry_listeners.discard(callback)

def log_telemetry(agent_name: str, message: str):
    conn = get_db_connection()
    if conn:
        try:
            with conn.cursor() as cur:
                cur.execute(
                    "INSERT INTO agent_logs (agent_name, message) VALUES (%s, %s)",
                    (agent_name, message)
                )
        except Exception as e:
            console.print(f"[red]Failed to insert telemetry: {e}[/red]")
        finally:
            conn.close()

    # Notify live WebSocket listeners
    for callback in list(telemetry_listeners):
        try:
            callback(agent_name, message)
        except Exception:
            pass

def save_candidate_profile_vector(email: str, profile_json: dict, skills_text: str, embedding: List[float]):
    """Stores candidate profile and vector embedding in pgvector DB."""
    conn = get_db_connection()
    if conn:
        try:
            with conn.cursor() as cur:
                vector_str = f"[{','.join(map(str, embedding))}]" if embedding else None
                cur.execute("""
                    INSERT INTO candidate_profiles (user_email, profile_json, skills_text, embedding)
                    VALUES (%s, %s, %s, %s::vector)
                    ON CONFLICT (user_email) DO UPDATE 
                    SET profile_json = EXCLUDED.profile_json,
                        skills_text = EXCLUDED.skills_text,
                        embedding = EXCLUDED.embedding
                """, (email, json.dumps(profile_json), skills_text, vector_str))
            console.print(f"[green]Stored candidate vector profile for {email}[/green]")
        except Exception as e:
            console.print(f"[red]Failed to save candidate vector profile: {e}[/red]")
        finally:
            conn.close()

def hybrid_job_match_search(query_keywords: str, query_embedding: List[float], limit: int = 10) -> List[Dict[str, Any]]:
    """Performs hybrid search combining PostgreSQL full-text search with pgvector cosine similarity."""
    conn = get_db_connection()
    if not conn:
        return []
        
    try:
        with conn.cursor() as cur:
            vector_str = f"[{','.join(map(str, query_embedding))}]" if query_embedding else None
            
            sql = """
                SELECT 
                    id, company, title, description, url,
                    ts_rank_cd(to_tsvector('english', description), plainto_tsquery('english', %s)) AS keyword_score,
                    (1 - (embedding <=> %s::vector)) AS vector_score,
                    (0.5 * ts_rank_cd(to_tsvector('english', description), plainto_tsquery('english', %s)) +
                     0.5 * (1 - (embedding <=> %s::vector))) AS hybrid_score
                FROM job_embeddings
                WHERE embedding IS NOT NULL
                ORDER BY hybrid_score DESC
                LIMIT %s;
            """
            cur.execute(sql, (query_keywords, vector_str, query_keywords, vector_str, limit))
            return cur.fetchall()
    except Exception as e:
        console.print(f"[red]Hybrid pgvector search failed: {e}[/red]")
        return []
    finally:
        conn.close()
def log_email(
    direction: str,
    recipient_name: Optional[str],
    recipient_email: Optional[str],
    company: Optional[str],
    subject: Optional[str],
    body: Optional[str],
    classification: Optional[str] = None,
    status: str = "draft"
):
    """Logs cold email outbound send or inbound reply into Neon DB."""
    conn = get_db_connection()
    if conn:
        try:
            with conn.cursor() as cur:
                cur.execute("""
                    INSERT INTO emails (direction, recipient_name, recipient_email, company, subject, body, classification, status)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                """, (direction, recipient_name, recipient_email, company, subject, body, classification, status))
        except Exception as e:
            console.print(f"[red]Failed to log email: {e}[/red]")
        finally:
            conn.close()

def get_emails(direction: Optional[str] = None, classification: Optional[str] = None, limit: int = 50) -> List[Dict[str, Any]]:
    """Retrieves logged emails filtered by direction or intent classification."""
    conn = get_db_connection()
    if not conn:
        return []
    try:
        with conn.cursor() as cur:
            query = "SELECT * FROM emails WHERE 1=1"
            params = []
            if direction:
                query += " AND direction = %s"
                params.append(direction)
            if classification:
                query += " AND classification = %s"
                params.append(classification)
            query += " ORDER BY timestamp DESC LIMIT %s"
            params.append(limit)
            cur.execute(query, params)
            return cur.fetchall()
    except Exception as e:
        console.print(f"[red]Failed to fetch emails: {e}[/red]")
        return []
    finally:
        conn.close()

def is_url_scraped(url: str) -> bool:
    """Checks if a job URL has already been processed."""
    conn = get_db_connection()
    if not conn:
        return False
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT 1 FROM scraped_urls WHERE url = %s", (url,))
            return cur.fetchone() is not None
    except Exception:
        return False
    finally:
        conn.close()

def mark_url_scraped(url: str, source: str = "jobcode"):
    """Marks a URL as scraped in Neon DB."""
    conn = get_db_connection()
    if conn:
        try:
            with conn.cursor() as cur:
                cur.execute("INSERT INTO scraped_urls (url, source) VALUES (%s, %s) ON CONFLICT DO NOTHING", (url, source))
        except Exception:
            pass
        finally:
            conn.close()
