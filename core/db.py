import json
import re
import psycopg2
import bcrypt
import jwt
import datetime
from psycopg2.extras import RealDictCursor
from core.config import NEON_DATABASE_URL, JWT_SECRET, JWT_ALGORITHM
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
                
                # 1. Users Table
                cur.execute("""
                    CREATE TABLE IF NOT EXISTS users (
                        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
                        email TEXT UNIQUE NOT NULL,
                        password_hash TEXT NOT NULL,
                        name TEXT,
                        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                    )
                """)
                
                # 2. Job Applications Table with user_id
                cur.execute("""
                    CREATE TABLE IF NOT EXISTS job_applications (
                        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
                        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
                        date_applied TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                        company TEXT NOT NULL,
                        role TEXT NOT NULL,
                        url TEXT,
                        status TEXT
                    )
                """)
                cur.execute("ALTER TABLE job_applications ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE;")
                
                # 3. Agent Telemetry Logs Table with user_id
                cur.execute("""
                    CREATE TABLE IF NOT EXISTS agent_logs (
                        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
                        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
                        timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                        agent_name TEXT NOT NULL,
                        message TEXT NOT NULL
                    )
                """)
                cur.execute("ALTER TABLE agent_logs ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE;")
                
                # 4. Candidate Vector Profiles with user_id
                cur.execute("""
                    CREATE TABLE IF NOT EXISTS candidate_profiles (
                        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
                        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
                        user_email TEXT NOT NULL,
                        profile_json JSONB NOT NULL,
                        skills_text TEXT NOT NULL,
                        embedding vector(1536)
                    )
                """)
                cur.execute("ALTER TABLE candidate_profiles ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE;")
                cur.execute("CREATE UNIQUE INDEX IF NOT EXISTS candidate_profiles_user_id_idx ON candidate_profiles(user_id);")
                
                # 5. Job Description Vector Embeddings
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

                # 6. Emails Table with user_id
                cur.execute("""
                    CREATE TABLE IF NOT EXISTS emails (
                        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
                        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
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
                cur.execute("ALTER TABLE emails ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE;")

                # 7. HR Contacts Outreach Table
                cur.execute("""
                    CREATE TABLE IF NOT EXISTS hr_contacts (
                        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
                        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
                        contact_name TEXT NOT NULL,
                        email TEXT NOT NULL,
                        company TEXT NOT NULL,
                        position TEXT,
                        status TEXT DEFAULT 'pending',
                        email_draft TEXT,
                        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                    )
                """)

                # 8. Scraped URLs Table
                cur.execute("""
                    CREATE TABLE IF NOT EXISTS scraped_urls (
                        url TEXT PRIMARY KEY,
                        source TEXT NOT NULL,
                        scraped_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                    )
                """)
                
            console.print("[green]Neon DB schema with multi-user user_id constraints initialized successfully.[/green]")
        except Exception as e:
            console.print(f"[red]Failed to initialize schema: {e}[/red]")
        finally:
            conn.close()

# Initialize schema on module load
init_db()

# ── User Auth Helpers ────────────────────────────────────
def hash_password(password: str) -> str:
    """Hashes plain text password using bcrypt."""
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")

def verify_password(password: str, hashed: str) -> bool:
    """Verifies plain text password against bcrypt hash."""
    try:
        return bcrypt.checkpw(password.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False

def create_jwt_token(user_id: str, email: str) -> str:
    """Creates JWT access token valid for 30 days."""
    payload = {
        "sub": user_id,
        "email": email,
        "exp": datetime.datetime.utcnow() + datetime.timedelta(days=30),
        "iat": datetime.datetime.utcnow(),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def decode_jwt_token(token: str) -> Optional[Dict[str, Any]]:
    """Decodes JWT access token."""
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except Exception:
        return None

def create_user(email: str, password: str, name: Optional[str] = None) -> Optional[Dict[str, Any]]:
    """Registers a new user in Neon DB."""
    conn = get_db_connection()
    if not conn:
        return None
    try:
        hashed = hash_password(password)
        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO users (email, password_hash, name) VALUES (%s, %s, %s) RETURNING id, email, name, created_at",
                (email.lower().strip(), hashed, name or email.split("@")[0].capitalize())
            )
            row = cur.fetchone()
            return dict(row) if row else None
    except Exception as e:
        console.print(f"[red]User registration failed: {e}[/red]")
        return None
    finally:
        conn.close()

def get_user_by_email(email: str) -> Optional[Dict[str, Any]]:
    """Fetches user by email."""
    conn = get_db_connection()
    if not conn:
        return None
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT id, email, password_hash, name, created_at FROM users WHERE LOWER(email) = %s", (email.lower().strip(),))
            row = cur.fetchone()
            return dict(row) if row else None
    except Exception:
        return None
    finally:
        conn.close()

def get_user_by_id(user_id: str) -> Optional[Dict[str, Any]]:
    """Fetches user by ID."""
    conn = get_db_connection()
    if not conn:
        return None
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT id, email, name, created_at FROM users WHERE id = %s::uuid", (user_id,))
            row = cur.fetchone()
            return dict(row) if row else None
    except Exception:
        return None
    finally:
        conn.close()

# ── Telemetry & Listener Registry ────────────────────────
telemetry_listeners = set()

def register_telemetry_listener(callback):
    telemetry_listeners.add(callback)

def unregister_telemetry_listener(callback):
    telemetry_listeners.discard(callback)

def log_telemetry(agent_name: str, message: str, user_id: Optional[str] = None):
    conn = get_db_connection()
    if conn:
        try:
            with conn.cursor() as cur:
                if user_id:
                    cur.execute(
                        "INSERT INTO agent_logs (user_id, agent_name, message) VALUES (%s::uuid, %s, %s)",
                        (user_id, agent_name, message)
                    )
                else:
                    cur.execute(
                        "INSERT INTO agent_logs (agent_name, message) VALUES (%s, %s)",
                        (agent_name, message)
                    )
        except Exception as e:
            console.print(f"[red]Failed to insert telemetry: {e}[/red]")
        finally:
            conn.close()

    for callback in list(telemetry_listeners):
        try:
            callback(agent_name, message, user_id)
        except Exception:
            pass

# ── Multi-Tenant Profile & Applications Helpers ──────────
def save_candidate_profile_vector(user_id: str, email: str, profile_json: dict, skills_text: str, embedding: List[float]):
    """Stores candidate profile tied to user_id in pgvector DB."""
    conn = get_db_connection()
    if conn:
        try:
            with conn.cursor() as cur:
                # Ensure unique index exists on user_id
                cur.execute("CREATE UNIQUE INDEX IF NOT EXISTS candidate_profiles_user_id_idx ON candidate_profiles(user_id);")
                vector_str = f"[{','.join(map(str, embedding))}]" if embedding else None
                try:
                    cur.execute("""
                        INSERT INTO candidate_profiles (user_id, user_email, profile_json, skills_text, embedding)
                        VALUES (%s::uuid, %s, %s, %s, %s::vector)
                        ON CONFLICT (user_id) DO UPDATE 
                        SET profile_json = EXCLUDED.profile_json,
                            skills_text = EXCLUDED.skills_text,
                            embedding = EXCLUDED.embedding,
                            user_email = EXCLUDED.user_email
                    """, (user_id, email, json.dumps(profile_json), skills_text, vector_str))
                except Exception:
                    # Fallback upsert if constraint differs
                    cur.execute("SELECT id FROM candidate_profiles WHERE user_id = %s::uuid OR LOWER(user_email) = %s", (user_id, email.lower().strip()))
                    existing = cur.fetchone()
                    if existing:
                        cur.execute("""
                            UPDATE candidate_profiles 
                            SET user_id = %s::uuid,
                                user_email = %s,
                                profile_json = %s,
                                skills_text = %s,
                                embedding = %s::vector
                            WHERE id = %s
                        """, (user_id, email, json.dumps(profile_json), skills_text, vector_str, existing["id"]))
                    else:
                        cur.execute("""
                            INSERT INTO candidate_profiles (user_id, user_email, profile_json, skills_text, embedding)
                            VALUES (%s::uuid, %s, %s, %s, %s::vector)
                        """, (user_id, email, json.dumps(profile_json), skills_text, vector_str))
            console.print(f"[green]Stored candidate profile for user {user_id}[/green]")
        except Exception as e:
            console.print(f"[red]Failed to save candidate vector profile: {e}[/red]")
            raise e
        finally:
            conn.close()

def get_candidate_profile(user_id: str) -> Optional[dict]:
    """Retrieves saved UserProfile for user_id."""
    conn = get_db_connection()
    if not conn:
        return None
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT profile_json FROM candidate_profiles WHERE user_id = %s::uuid", (user_id,))
            row = cur.fetchone()
            if row and row.get("profile_json"):
                return row["profile_json"]
            # Fallback check by matching user email from users table
            cur.execute("""
                SELECT cp.profile_json 
                FROM candidate_profiles cp 
                JOIN users u ON LOWER(cp.user_email) = LOWER(u.email) 
                WHERE u.id = %s::uuid
            """, (user_id,))
            row = cur.fetchone()
            return row["profile_json"] if row else None
    except Exception as e:
        console.print(f"[red]Failed to get candidate profile: {e}[/red]")
        return None
    finally:
        conn.close()

# ── Multi-Tenant Emails & HR Contact Helpers ─────────────
def log_email(
    direction: str,
    recipient_name: Optional[str],
    recipient_email: Optional[str],
    company: Optional[str],
    subject: Optional[str],
    body: Optional[str],
    classification: Optional[str] = None,
    status: str = "draft",
    user_id: Optional[str] = None
):
    """Logs cold email outbound send or inbound reply into Neon DB scoped to user_id."""
    conn = get_db_connection()
    if conn:
        try:
            with conn.cursor() as cur:
                cur.execute("""
                    INSERT INTO emails (user_id, direction, recipient_name, recipient_email, company, subject, body, classification, status)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                """, (user_id, direction, recipient_name, recipient_email, company, subject, body, classification, status))
        except Exception as e:
            console.print(f"[red]Failed to log email: {e}[/red]")
        finally:
            conn.close()

def get_emails(user_id: Optional[str] = None, direction: Optional[str] = None, classification: Optional[str] = None, limit: int = 50) -> List[Dict[str, Any]]:
    """Retrieves logged emails for user_id."""
    conn = get_db_connection()
    if not conn:
        return []
    try:
        with conn.cursor() as cur:
            query = "SELECT * FROM emails WHERE 1=1"
            params = []
            if user_id:
                query += " AND user_id = %s::uuid"
                params.append(user_id)
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

def normalize_contact_record(c: Dict[str, Any]) -> Dict[str, str]:
    """Normalizes any contact dictionary extracted from CSV/Excel into standardized fields."""
    name = None
    email = None
    company = None
    position = None
    draft = str(c.get("Draft") or c.get("draft") or c.get("email_draft") or "").strip()

    for k, v in c.items():
        if v is None:
            continue
        val_str = str(v).strip()
        if not val_str or val_str.lower() in ["nan", "none", "null"]:
            continue
        
        k_clean = str(k).lower().replace("_", " ").replace("-", " ").replace(".", " ").strip()

        # Match email
        if not email and ("email" in k_clean or "mail" in k_clean or "@" in val_str):
            m = re.search(r'[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+', val_str)
            if m:
                email = m.group(0)

        # Match name
        elif not name and ("name" in k_clean or "contact" in k_clean or "person" in k_clean or "lead" in k_clean or "recruiter" in k_clean):
            if "@" not in val_str:
                name = val_str

        # Match company
        elif not company and ("company" in k_clean or "org" in k_clean or "firm" in k_clean or "employer" in k_clean or "client" in k_clean or "business" in k_clean):
            company = val_str

        # Match position / designation / role
        elif not position and ("position" in k_clean or "role" in k_clean or "title" in k_clean or "designation" in k_clean or "post" in k_clean):
            position = val_str

    # Fallback scan: if email is still None, scan all values in the dict for an email pattern
    if not email:
        for v in c.values():
            if v is not None:
                m = re.search(r'[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+', str(v))
                if m:
                    email = m.group(0)
                    break

    # Fallback name if missing
    if not name:
        if company:
            name = f"{company} Hiring Team"
        else:
            name = "Hiring Manager"

    company = company or "Target Company"
    position = position or "Hiring Manager"
    email = email or ""

    return {
        "contact_name": name,
        "email": email,
        "company": company,
        "position": position,
        "draft": draft
    }

def save_hr_contacts_batch(user_id: str, contacts: List[Dict[str, Any]]):
    """Inserts a batch of HR contacts scoped to user_id, intelligently extracting fields from any dict keys."""
    conn = get_db_connection()
    if conn:
        try:
            with conn.cursor() as cur:
                for c in contacts:
                    norm = normalize_contact_record(c)
                    cur.execute("""
                        INSERT INTO hr_contacts (user_id, contact_name, email, company, position, status, email_draft)
                        VALUES (%s::uuid, %s, %s, %s, %s, %s, %s)
                    """, (user_id, norm["contact_name"], norm["email"], norm["company"], norm["position"], "pending", norm["draft"]))
            console.print(f"[green]Saved {len(contacts)} HR contacts for user {user_id}[/green]")
        except Exception as e:
            console.print(f"[red]Failed to save HR contacts: {e}[/red]")
        finally:
            conn.close()

def get_hr_contacts(user_id: str) -> List[Dict[str, Any]]:
    """Retrieves HR contacts for user_id."""
    conn = get_db_connection()
    if not conn:
        return []
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT * FROM hr_contacts WHERE user_id = %s::uuid ORDER BY created_at DESC", (user_id,))
            return cur.fetchall()
    except Exception:
        return []
    finally:
        conn.close()

def get_hr_contact_by_id(user_id: str, contact_id: str) -> Optional[Dict[str, Any]]:
    """Retrieves a single HR contact for user_id."""
    conn = get_db_connection()
    if not conn:
        return None
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT * FROM hr_contacts WHERE user_id = %s::uuid AND id = %s::uuid", (user_id, contact_id))
            row = cur.fetchone()
            return dict(row) if row else None
    except Exception:
        return None
    finally:
        conn.close()

def update_hr_contact_status(user_id: str, contact_id: str, status: str = "sent", email_draft: str = ""):
    """Updates status and email draft for an HR contact by ID."""
    conn = get_db_connection()
    if conn:
        try:
            with conn.cursor() as cur:
                cur.execute("""
                    UPDATE hr_contacts 
                    SET status = %s, email_draft = %s 
                    WHERE user_id = %s::uuid AND id = %s::uuid
                """, (status, email_draft, user_id, contact_id))
        except Exception as e:
            console.print(f"[red]Failed to update HR contact status: {e}[/red]")
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
