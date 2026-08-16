import asyncio
from fastapi import FastAPI, WebSocket, UploadFile, File, BackgroundTasks, Form, HTTPException, Depends, Request, Response, Header, Cookie
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel, EmailStr
import uvicorn
from contextlib import asynccontextmanager
import pdfplumber
import os
import tempfile
import uuid
from typing import Optional, Dict, Any, List

from core.graph import app as graph_app
from core.state import ApplicationState, UserProfile, Education, Experience, JobMatch
from agents.onboarding import parse_resume_text, extract_text_from_pdf_bytes
from agents.editor import tailor_for_job, generate_resume_html
from agents.visibility import LINKEDIN_BRANDING_SYSTEM_PROMPT, GITHUB_BRANDING_SYSTEM_PROMPT
from agents.tracker import classify_email_intent
from core.ai_gateway import async_chat_completion
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from agents.communicator import ingest_hr_list, send_cold_email
from core.db import (
    get_db_connection, log_telemetry, get_emails, register_telemetry_listener,
    create_user, get_user_by_email, get_user_by_id, verify_password, create_jwt_token, decode_jwt_token,
    save_candidate_profile_vector, get_candidate_profile, save_hr_contacts_batch, get_hr_contacts,
    get_hr_contact_by_id, update_hr_contact_status
)

active_connections = set()
scheduler = AsyncIOScheduler()
scheduler_enabled = True
user_active_states: Dict[str, ApplicationState] = {}

def broadcast_telemetry(agent_name: str, message: str, user_id: Optional[str] = None):
    import json
    data = json.dumps({
        "agent": agent_name,
        "message": message,
        "user_id": user_id,
        "time": asyncio.get_event_loop().time() if asyncio.get_event_loop().is_running() else 0
    })
    for ws in list(active_connections):
        try:
            asyncio.create_task(ws.send_text(data))
        except Exception:
            pass

register_telemetry_listener(broadcast_telemetry)

async def run_recurring_pipeline():
    if not scheduler_enabled:
        return
    for u_id, state in list(user_active_states.items()):
        log_telemetry("Scheduler", f"Triggering automated 6-hour pipeline execution for role '{state.get('target_role')}'", user_id=u_id)
        try:
            graph_app.invoke(state)
        except Exception as e:
            log_telemetry("Scheduler", f"Pipeline error for user {u_id}: {e}", user_id=u_id)

@asynccontextmanager
async def lifespan(app: FastAPI):
    if not scheduler.running:
        scheduler.add_job(run_recurring_pipeline, 'interval', hours=6, id='pipeline_cycle')
        scheduler.start()
        log_telemetry("System", "APScheduler autonomous pipeline runner initialized (6-hour cycle)")
    yield
    if scheduler.running:
        scheduler.shutdown()

app = FastAPI(title="Job Application Agent API (Modal Qwen3.6 AI Gateway Enabled)", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Auth Pydantic Schemas & Dependency ───────────────────
class AuthSignupRequest(BaseModel):
    email: str
    password: str
    name: Optional[str] = None

class AuthLoginRequest(BaseModel):
    email: str
    password: str

async def get_current_user(
    request: Request,
    authorization: Optional[str] = Header(None),
    session_token: Optional[str] = Cookie(None)
) -> Dict[str, Any]:
    token = None
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ")[1]
    elif session_token:
        token = session_token

    if not token:
        raise HTTPException(status_code=401, detail="Authentication token required. Please log in.")

    payload = decode_jwt_token(token)
    if not payload or "sub" not in payload:
        raise HTTPException(status_code=401, detail="Invalid or expired session token. Please log in again.")

    user = get_user_by_id(payload["sub"])
    if not user:
        raise HTTPException(status_code=401, detail="User account not found.")

    return user

# ── Auth Endpoints ───────────────────────────────────────
@app.post("/api/auth/signup")
async def signup(payload: AuthSignupRequest, response: Response):
    if not payload.email or "@" not in payload.email:
        raise HTTPException(status_code=400, detail="Invalid email address.")
    if not payload.password or len(payload.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters long.")

    existing = get_user_by_email(payload.email)
    if existing:
        raise HTTPException(status_code=400, detail="An account with this email already exists.")

    user = create_user(payload.email, payload.password, payload.name)
    if not user:
        raise HTTPException(status_code=500, detail="Failed to create account in database.")

    token = create_jwt_token(str(user["id"]), user["email"])
    response.set_cookie(key="session_token", value=token, httponly=True, max_age=30*86400, samesite="lax")

    return {
        "message": "Account created successfully",
        "token": token,
        "user": {
            "id": str(user["id"]),
            "email": user["email"],
            "name": user["name"]
        }
    }

@app.post("/api/auth/login")
async def login(payload: AuthLoginRequest, response: Response):
    user = get_user_by_email(payload.email)
    if not user or not verify_password(payload.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password.")

    token = create_jwt_token(str(user["id"]), user["email"])
    response.set_cookie(key="session_token", value=token, httponly=True, max_age=30*86400, samesite="lax")

    return {
        "message": "Login successful",
        "token": token,
        "user": {
            "id": str(user["id"]),
            "email": user["email"],
            "name": user["name"]
        }
    }

@app.get("/api/auth/me")
async def get_me(current_user: Dict[str, Any] = Depends(get_current_user)):
    return {"user": current_user}

# ── Healthcheck ──────────────────────────────────────────
@app.get("/api/health")
async def healthcheck():
    return {"status": "ok", "service": "job-automation-api", "gateway": "Modal Qwen3.6-35B vLLM Gateway"}

# ── Multi-Tenant Stats & Dashboard ───────────────────────
@app.get("/api/stats")
async def get_stats(current_user: Dict[str, Any] = Depends(get_current_user)):
    user_id = str(current_user["id"])
    conn = get_db_connection()
    if not conn:
        return {"discovered": 0, "applied": 0, "interviews": 0}

    try:
        with conn.cursor() as cur:
            cur.execute("SELECT COUNT(*) as discovered FROM job_applications WHERE user_id = %s::uuid", (user_id,))
            discovered = cur.fetchone()['discovered']

            cur.execute("SELECT COUNT(*) as applied FROM job_applications WHERE user_id = %s::uuid AND LOWER(status) LIKE 'app%%'", (user_id,))
            applied = cur.fetchone()['applied']

            cur.execute("SELECT COUNT(*) as interviews FROM job_applications WHERE user_id = %s::uuid AND LOWER(status) LIKE 'interv%%'", (user_id,))
            interviews = cur.fetchone()['interviews']

        return {"discovered": discovered, "applied": applied, "interviews": interviews}
    except Exception as e:
        return {"error": str(e)}
    finally:
        conn.close()

@app.get("/api/applications")
async def get_applications(current_user: Dict[str, Any] = Depends(get_current_user)):
    user_id = str(current_user["id"])
    conn = get_db_connection()
    if not conn:
        return {"applications": []}

    try:
        with conn.cursor() as cur:
            cur.execute("SELECT id, company, role, url, status, date_applied FROM job_applications WHERE user_id = %s::uuid ORDER BY date_applied DESC LIMIT 50", (user_id,))
            rows = cur.fetchall()
            applications = [
                {
                    "id": str(row['id']),
                    "company": row['company'],
                    "role": row['role'],
                    "url": row['url'],
                    "status": row['status'],
                    "date_applied": row['date_applied'].isoformat() if row['date_applied'] else None
                } for row in rows
            ]
        return {"applications": applications}
    except Exception as e:
        return {"error": str(e)}
    finally:
        conn.close()

@app.get("/api/logs")
async def get_logs(current_user: Dict[str, Any] = Depends(get_current_user)):
    user_id = str(current_user["id"])
    conn = get_db_connection()
    if not conn:
        return {"logs": []}

    try:
        with conn.cursor() as cur:
            cur.execute("SELECT agent_name, message, timestamp FROM agent_logs WHERE user_id = %s::uuid OR user_id IS NULL ORDER BY timestamp DESC LIMIT 30", (user_id,))
            rows = cur.fetchall()
            logs = [{"agent": row['agent_name'], "message": row['message'], "time": row['timestamp'].isoformat()} for row in rows]
        return {"logs": logs}
    except Exception as e:
        return {"error": str(e)}
    finally:
        conn.close()

# ── Multi-Tenant Profile & Resume Endpoints ───────────────
class TailorResumeRequest(BaseModel):
    job_title: str
    company: str
    description: str
    template_style: Optional[str] = "executive"

@app.get("/api/profile")
async def get_profile(current_user: Dict[str, Any] = Depends(get_current_user)):
    user_id = str(current_user["id"])
    profile = get_candidate_profile(user_id)
    if not profile:
        profile = {
            "name": current_user.get("name") or current_user["email"].split("@")[0].capitalize(),
            "email": current_user["email"],
            "skills": ["Python", "FastAPI", "React", "PostgreSQL", "Docker"],
            "experience": [],
            "education": []
        }
    return {"profile": profile}

@app.post("/api/resume/upload")
async def upload_resume(
    file: UploadFile = File(...),
    target_role: Optional[str] = Form(None),
    target_experience_level: Optional[str] = Form(None),
    template_style: Optional[str] = Form("executive"),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Uploads, parses with AI, and stores candidate master resume."""
    user_id = str(current_user["id"])
    try:
        file_bytes = await file.read()
        filename = (file.filename or "resume.pdf").lower()
        
        if filename.endswith(".pdf"):
            resume_text = extract_text_from_pdf_bytes(file_bytes)
        else:
            resume_text = file_bytes.decode("utf-8", errors="ignore")

        if not resume_text.strip():
            raise HTTPException(status_code=400, detail="Could not extract text from uploaded resume. Please ensure the file contains readable text.")

        user_profile = await parse_resume_text(
            resume_text,
            default_name=current_user.get("name"),
            default_email=current_user.get("email")
        )

        # If name or email were not detected, use account details
        if not user_profile.name or user_profile.name in ["Candidate Name", "Alex Mercer"]:
            user_profile.name = current_user.get("name") or current_user["email"].split("@")[0].capitalize()
        if not user_profile.email or user_profile.email == "alex.mercer@example.com":
            user_profile.email = current_user["email"]

        # Save profile tied to user_id in Neon DB
        skills_str = ", ".join(user_profile.skills)
        save_candidate_profile_vector(
            user_id=user_id,
            email=current_user["email"],
            profile_json=user_profile.model_dump(),
            skills_text=skills_str,
            embedding=[]
        )

        user_active_states[user_id] = {
            "user_id": user_id,
            "master_resume_path": "uploaded_resume.pdf",
            "target_role": target_role or "AI Systems Engineer",
            "target_experience_level": target_experience_level or "Senior",
            "user_profile": user_profile,
            "daily_job_queue": [],
            "application_count": 0,
            "excel_dashboard_path": f"dashboard_{user_id[:8]}.xlsx"
        }

        resume_html = generate_resume_html(user_profile, template_style=template_style or "executive")

        log_telemetry("Editor", f"Master Resume uploaded & parsed successfully for {current_user['email']} ({len(user_profile.skills)} skills extracted)", user_id=user_id)
        return {
            "message": "Resume uploaded and profile parsed successfully",
            "profile": user_profile,
            "html": resume_html
        }

    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Resume processing failed: {str(e)}")

@app.get("/api/resume/preview")
async def preview_resume(
    template: str = "executive",
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Returns HTML preview of candidate's current master resume."""
    user_id = str(current_user["id"])
    saved_profile = get_candidate_profile(user_id)
    if saved_profile:
        p_obj = UserProfile(**saved_profile)
    else:
        # Fallback profile using user's account info
        p_obj = UserProfile(
            name=current_user.get("name") or current_user["email"].split("@")[0].capitalize(),
            email=current_user["email"],
            phone="+1 (555) 019-2834",
            location="Remote / Hybrid",
            skills=["Python", "FastAPI", "React", "PostgreSQL", "pgvector", "Docker", "AI Agents"],
            experience=[
                Experience(
                    company="Technology Solutions",
                    role="Senior Software & AI Engineer",
                    start_date="2022",
                    end_date="Present",
                    responsibilities=[
                        "Engineered full-stack applications with FastAPI, Next.js, and PostgreSQL.",
                        "Implemented autonomous AI workflows and automated application pipelines."
                    ]
                )
            ],
            education=[
                Education(
                    institution="University Department of Computer Science",
                    degree="B.S. in Computer Science",
                    graduation_date="2021"
                )
            ]
        )

    html_content = generate_resume_html(p_obj, template_style=template)
    return {"profile": p_obj, "html": html_content}

@app.post("/api/resume/tailor")
async def tailor_resume_endpoint(
    payload: TailorResumeRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Tailors the user's master resume specifically to a Target Job Description."""
    user_id = str(current_user["id"])
    saved_profile = get_candidate_profile(user_id)
    if not saved_profile:
        # Create profile from current user
        p_obj = UserProfile(
            name=current_user.get("name") or current_user["email"].split("@")[0].capitalize(),
            email=current_user["email"],
            skills=["Python", "FastAPI", "React", "PostgreSQL", "Docker", "AI Agents"],
            experience=[
                Experience(
                    company="AI Tech Labs",
                    role="Full-Stack AI Engineer",
                    start_date="2022",
                    end_date="Present",
                    responsibilities=["Developed high-performance AI services and PostgreSQL database systems."]
                )
            ],
            education=[
                Education(
                    institution="Computer Science Institute",
                    degree="B.S. Computer Science",
                    graduation_date="2021"
                )
            ]
        )
    else:
        p_obj = UserProfile(**saved_profile)

    test_job = JobMatch(
        id=str(uuid.uuid4())[:8],
        title=payload.job_title,
        company=payload.company,
        url="https://example.com/job",
        description=payload.description
    )

    log_telemetry("Editor", f"Live tailoring resume for '{payload.job_title}' at {payload.company}", user_id=user_id)
    tailored_job = await tailor_for_job(test_job, p_obj)

    # Keywords analysis
    jd_lower = payload.description.lower()
    matched = [s for s in p_obj.skills if s.lower() in jd_lower]
    missing = [s for s in ["Python", "FastAPI", "PostgreSQL", "Docker", "Kubernetes", "AWS", "CI/CD", "Next.js", "AI"] if s.lower() in jd_lower and s not in matched]

    html_content = generate_resume_html(p_obj, template_style=payload.template_style or "executive")
    
    # Check if tailored HTML file was generated
    if tailored_job.tailored_resume_path and os.path.exists(tailored_job.tailored_resume_path):
        if tailored_job.tailored_resume_path.endswith(".html"):
            with open(tailored_job.tailored_resume_path, "r", encoding="utf-8") as f:
                html_content = f.read()

    return {
        "job": {
            "id": test_job.id,
            "title": test_job.title,
            "company": test_job.company,
            "tailored_resume_path": tailored_job.tailored_resume_path
        },
        "html": html_content,
        "matched_keywords": matched,
        "missing_keywords": missing
    }

@app.get("/api/resume/{job_id}")
async def get_resume_by_job(job_id: str, current_user: Dict[str, Any] = Depends(get_current_user)):
    user_id = str(current_user["id"])
    conn = get_db_connection()
    company = "Company"
    role = "Software Engineer"
    if conn:
        try:
            with conn.cursor() as cur:
                cur.execute("SELECT company, role FROM job_applications WHERE id::text = %s AND user_id = %s::uuid", (job_id, user_id))
                row = cur.fetchone()
                if row:
                    company = row["company"]
                    role = row["role"]
        finally:
            conn.close()

    # Look for generated resume in .resumes
    doc_path = os.path.join(os.getcwd(), ".resumes", f"resume_{job_id}.html")
    if os.path.exists(doc_path):
        with open(doc_path, "r", encoding="utf-8") as f:
            html = f.read()
    else:
        saved_profile = get_candidate_profile(user_id)
        p_obj = UserProfile(**saved_profile) if saved_profile else UserProfile(
            name=current_user.get("name", "Candidate"),
            email=current_user["email"],
            skills=["Python", "FastAPI", "React"],
            experience=[],
            education=[]
        )
        html = generate_resume_html(p_obj, template_style="executive")

    return {"html": html, "job_title": role, "company": company}

@app.post("/api/onboard")
async def onboard(
    background_tasks: BackgroundTasks,
    target_role: str = Form(...),
    target_experience_level: str = Form(...),
    file: UploadFile = File(...),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    user_id = str(current_user["id"])
    try:
        file_bytes = await file.read()
        filename = (file.filename or "resume.pdf").lower()
        
        if filename.endswith(".pdf"):
            resume_text = extract_text_from_pdf_bytes(file_bytes)
        else:
            resume_text = file_bytes.decode("utf-8", errors="ignore")

        if not resume_text.strip():
            raise HTTPException(status_code=400, detail="Could not extract text from uploaded resume. Please ensure the file contains readable text.")

        user_profile = await parse_resume_text(
            resume_text,
            default_name=current_user.get("name"),
            default_email=current_user.get("email")
        )

        if not user_profile.name or user_profile.name in ["Candidate Name", "Alex Mercer"]:
            user_profile.name = current_user.get("name") or current_user["email"].split("@")[0].capitalize()
        if not user_profile.email or user_profile.email == "alex.mercer@example.com":
            user_profile.email = current_user["email"]

        # Save profile tied to user_id in Neon DB
        skills_str = ", ".join(user_profile.skills)
        save_candidate_profile_vector(
            user_id=user_id,
            email=current_user["email"],
            profile_json=user_profile.model_dump(),
            skills_text=skills_str,
            embedding=[]
        )

        user_active_states[user_id] = {
            "user_id": user_id,
            "master_resume_path": "uploaded_resume.pdf",
            "target_role": target_role,
            "target_experience_level": target_experience_level,
            "user_profile": user_profile,
            "daily_job_queue": [],
            "application_count": 0,
            "excel_dashboard_path": f"dashboard_{user_id[:8]}.xlsx"
        }

        log_telemetry("System", f"Resume parsed and profile saved for {current_user['email']}", user_id=user_id)
        return {"message": "Onboarding successful via AI Gateway", "profile": user_profile}

    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/start-agents")
async def start_agents(
    background_tasks: BackgroundTasks,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    user_id = str(current_user["id"])
    if user_id not in user_active_states:
        saved_profile = get_candidate_profile(user_id)
        if saved_profile:
            p_obj = UserProfile(**saved_profile)
            user_active_states[user_id] = {
                "user_id": user_id,
                "master_resume_path": "uploaded_resume.pdf",
                "target_role": "Senior AI Engineer",
                "target_experience_level": "Senior",
                "user_profile": p_obj,
                "daily_job_queue": [],
                "application_count": 0,
                "excel_dashboard_path": f"dashboard_{user_id[:8]}.xlsx"
            }
        else:
            return {"error": "Onboarding required first"}

    state = user_active_states[user_id]

    def run_graph():
        log_telemetry("System", f"Agent Zero initialized for user {current_user['email']}. Target role: {state.get('target_role')}.", user_id=user_id)
        graph_app.invoke(state)

    background_tasks.add_task(run_graph)
    return {"message": "Agents started in background via AI Gateway"}

# ── End-to-End Test Execution ────────────────────────────
@app.post("/api/test-apply")
async def test_apply(current_user: Dict[str, Any] = Depends(get_current_user)):
    user_id = str(current_user["id"])
    user_email = current_user["email"]
    user_name = current_user.get("name") or user_email.split("@")[0].capitalize()
    
    log_telemetry("System", f"Starting End-to-End AI Agent Test Workflow for {user_name} ({user_email})...", user_id=user_id)

    # Use candidate's real profile from DB if uploaded
    saved_profile = get_candidate_profile(user_id)
    if saved_profile:
        candidate_profile = UserProfile(**saved_profile)
        log_telemetry("Editor", f"Loaded custom master resume for {candidate_profile.name} with {len(candidate_profile.skills)} skills", user_id=user_id)
    else:
        candidate_profile = UserProfile(
            name=user_name,
            email=user_email,
            phone="+1 (555) 234-5678",
            location="San Francisco, CA",
            skills=["Python", "FastAPI", "React", "PostgreSQL", "pgvector", "Docker", "AI Agents"],
            experience=[
                Experience(
                    company="Autonomous AI Labs",
                    role="Senior Full-Stack AI Engineer",
                    start_date="2022",
                    end_date="Present",
                    responsibilities=[
                        "Engineered autonomous AI routing systems and multi-agent pipelines.",
                        "Designed high-throughput vector database search pipelines using pgvector."
                    ]
                )
            ],
            education=[
                Education(
                    institution="University Computer Science Department",
                    degree="B.S. Computer Science",
                    graduation_date="2021"
                )
            ]
        )
        log_telemetry("System", f"Note: Master resume not yet uploaded. Using profile for {user_name}. You can upload your master resume in Resume Architect.", user_id=user_id)

    test_job_id = str(uuid.uuid4())[:8]
    test_job = JobMatch(
        id=test_job_id,
        title="Senior AI Systems Engineer",
        company="Modal Cloud Infrastructure",
        location="Remote (US)",
        url="https://example.com/careers/ai-engineer",
        description="We are looking for a Senior AI Engineer proficient in Python, FastAPI, OpenAI SDK, vector search, and containerized Docker deployments."
    )

    log_telemetry("Scout", f"Test Scout matched job: {test_job.title} at {test_job.company}", user_id=user_id)

    tailored_job = await tailor_for_job(test_job, candidate_profile)
    log_telemetry("Editor", f"Resume Architect compiled tailored resume for {test_job.company}", user_id=user_id)

    conn = get_db_connection()
    if conn:
        try:
            with conn.cursor() as cur:
                cur.execute(
                    "INSERT INTO job_applications (user_id, company, role, url, status) VALUES (%s::uuid, %s, %s, %s, %s)",
                    (user_id, test_job.company, test_job.title, test_job.url, "Applied")
                )
            log_telemetry("Dispatcher", f"Auto-Apply submitted test application to Neon DB for {test_job.company}", user_id=user_id)
        except Exception as e:
            log_telemetry("Dispatcher", f"DB insert note: {e}", user_id=user_id)
        finally:
            conn.close()

    linkedin_post = await async_chat_completion(
        messages=[{"role": "user", "content": "Create a post celebrating our new AI Gateway deployment!"}],
        system_prompt=LINKEDIN_BRANDING_SYSTEM_PROMPT,
        temperature=0.7
    )
    log_telemetry("Visibility", f"Generated LinkedIn Personal Branding post for {user_name}", user_id=user_id)

    intent = await classify_email_intent("We would love to invite you to an interview call for the AI Engineer role!")
    log_telemetry("Tracker", f"HR Response classified as: {intent}", user_id=user_id)

    return {
        "status": "success",
        "message": f"Test job application and AI pipeline completed for {user_name}!",
        "job": {
            "id": test_job.id,
            "title": test_job.title,
            "company": test_job.company,
            "status": "Applied",
            "tailored_resume_path": tailored_job.tailored_resume_path
        },
        "branding": {
            "linkedin_post": linkedin_post
        },
        "tracker_intent": intent
    }

# ── Pipeline & Resume Views ──────────────────────────────
@app.get("/api/pipeline")
async def get_pipeline(current_user: Dict[str, Any] = Depends(get_current_user)):
    user_id = str(current_user["id"])

    conn = get_db_connection()
    if not conn:
        return {"stages": {"discovered": [], "evaluating": [], "generating": [], "applied": []}}

    try:
        with conn.cursor() as cur:
            cur.execute("SELECT id, company, role, url, status, date_applied FROM job_applications WHERE user_id = %s::uuid ORDER BY date_applied DESC LIMIT 100", (user_id,))
            rows = cur.fetchall()

        stages = {"discovered": [], "evaluating": [], "generating": [], "applied": []}
        for row in rows:
            app = {
                "id": str(row['id']),
                "company": row['company'],
                "role": row['role'],
                "url": row['url'],
                "status": row['status'],
                "date_applied": row['date_applied'].isoformat() if row['date_applied'] else None
            }
            s = (row['status'] or '').lower()
            if 'applied' in s or 'success' in s:
                stages['applied'].append(app)
            elif 'generat' in s or 'resum' in s:
                stages['generating'].append(app)
            elif 'evaluat' in s or 'match' in s:
                stages['evaluating'].append(app)
            else:
                stages['discovered'].append(app)

        return {"stages": stages}
    except Exception as e:
        return {"error": str(e)}
    finally:
        conn.close()

# ── HR Contacts & Outreach Campaign ─────────────────────
@app.post("/api/hr-contacts/upload")
async def upload_hr_contacts(
    file: UploadFile = File(...),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    user_id = str(current_user["id"])
    try:
        suffix = ".xlsx" if file.filename.endswith(".xlsx") else ".csv"
        fd, temp_path = tempfile.mkstemp(suffix=suffix)
        os.close(fd)
        with open(temp_path, "wb") as f:
            f.write(await file.read())

        df = ingest_hr_list(temp_path)
        if df.empty:
            raise HTTPException(status_code=400, detail="Invalid or empty HR contact list format.")

        contacts_list = df.to_dict(orient="records")
        save_hr_contacts_batch(user_id, contacts_list)

        if user_id in user_active_states:
            user_active_states[user_id]["hr_list_path"] = temp_path

        log_telemetry("Communicator", f"Ingested {len(df)} HR contacts from uploaded file: {file.filename}", user_id=user_id)
        return {"message": "HR contacts uploaded successfully", "count": len(df), "path": temp_path}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/hr-contacts")
async def list_hr_contacts(current_user: Dict[str, Any] = Depends(get_current_user)):
    user_id = str(current_user["id"])
    contacts = get_hr_contacts(user_id)
    return {"contacts": contacts}

@app.post("/api/hr-contacts/send/{contact_id}")
async def send_single_hr_email(
    contact_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    user_id = str(current_user["id"])
    contact = get_hr_contact_by_id(user_id, contact_id)
    if not contact:
        raise HTTPException(status_code=404, detail="HR Contact not found")
    
    email_address = (contact.get("email") or "").strip()
    if not email_address:
        raise HTTPException(status_code=400, detail="This contact does not have a valid email address.")

    user_profile = get_candidate_profile(user_id) or UserProfile(
        name=current_user.get("name") or "Candidate",
        email=current_user.get("email") or "",
        skills=["Python", "FastAPI", "React", "AI Engineering", "PostgreSQL"],
        experience=[],
        education=[]
    )
    state = user_active_states.get(user_id, {
        "user_id": user_id,
        "user_profile": user_profile,
        "target_role": "Software / AI Engineer",
        "target_experience_level": "fresher"
    })
    state["user_id"] = user_id
    state["user_profile"] = user_profile

    result = send_cold_email(
        contact_name=contact.get("contact_name") or "Hiring Manager",
        email=email_address,
        company=contact.get("company") or "Target Company",
        state=state,
        contact_id=contact_id
    )
    return {"message": "Cold outreach email processed successfully", "result": result}

@app.post("/api/hr-contacts/send-all")
async def send_all_hr_emails_endpoint(
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    user_id = str(current_user["id"])
    contacts = get_hr_contacts(user_id)
    valid_contacts = [c for c in contacts if (c.get("email") or "").strip()]
    if not valid_contacts:
        raise HTTPException(status_code=400, detail="No HR contacts with valid email addresses found.")

    user_profile = get_candidate_profile(user_id) or UserProfile(
        name=current_user.get("name") or "Candidate",
        email=current_user.get("email") or "",
        skills=["Python", "FastAPI", "React", "AI Engineering", "PostgreSQL"],
        experience=[],
        education=[]
    )
    state = user_active_states.get(user_id, {
        "user_id": user_id,
        "user_profile": user_profile,
        "target_role": "Software / AI Engineer",
        "target_experience_level": "fresher"
    })
    state["user_id"] = user_id
    state["user_profile"] = user_profile

    processed = 0
    for c in valid_contacts:
        try:
            send_cold_email(
                contact_name=c.get("contact_name") or "Hiring Manager",
                email=c["email"].strip(),
                company=c.get("company") or "Target Company",
                state=state,
                contact_id=str(c.get("id", ""))
            )
            processed += 1
        except Exception:
            pass

    return {"message": f"Dispatched cold email outreach campaign for {processed} contacts", "count": processed}

@app.get("/api/emails")
async def get_emails_endpoint(
    direction: Optional[str] = None,
    classification: Optional[str] = None,
    limit: int = 50,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    user_id = str(current_user["id"])
    emails = get_emails(user_id=user_id, direction=direction, classification=classification, limit=limit)
    return {"emails": emails}

# ── Social Branding Hub ──────────────────────────────────
@app.get("/api/branding/posts")
async def get_branding_posts(current_user: Dict[str, Any] = Depends(get_current_user)):
    user_id = str(current_user["id"])
    conn = get_db_connection()
    if not conn:
        return {"posts": []}

    try:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT agent_name, message, timestamp FROM agent_logs
                WHERE (user_id = %s::uuid OR user_id IS NULL)
                  AND (agent_name = 'Visibility'
                       OR LOWER(message) LIKE '%%linkedin%%'
                       OR LOWER(message) LIKE '%%github%%'
                       OR LOWER(message) LIKE '%%branding%%')
                ORDER BY timestamp DESC LIMIT 20
            """, (user_id,))
            rows = cur.fetchall()
            posts = [{
                "agent": row['agent_name'],
                "message": row['message'],
                "time": row['timestamp'].isoformat(),
                "type": "linkedin" if "linkedin" in row['message'].lower() else "github"
            } for row in rows]
        return {"posts": posts}
    except Exception as e:
        return {"error": str(e)}
    finally:
        conn.close()

@app.post("/api/branding/generate")
async def generate_branding_post(current_user: Dict[str, Any] = Depends(get_current_user)):
    user_id = str(current_user["id"])
    try:
        post = await async_chat_completion(
            messages=[{"role": "user", "content": "Create a high-impact LinkedIn post about leveraging AI agents for autonomous career growth and technical branding."}],
            system_prompt=LINKEDIN_BRANDING_SYSTEM_PROMPT,
            temperature=0.7
        )
        log_telemetry("Visibility", f"Generated LinkedIn branding post: {post[:80]}...", user_id=user_id)
        return {"post": post, "post_content": post}
    except Exception as e:
        return {"error": str(e), "post_content": ""}

@app.websocket("/api/stream")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    active_connections.add(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            await websocket.send_text(f"Telemetry stream active: {data}")
    except Exception:
        pass
    finally:
        active_connections.discard(websocket)

# ── Next.js Static Export Serving ────────────────────────
# Next.js 16 generates page.html (not page/index.html), plus RSC .txt
# data files in subdirectories. We need a custom handler to resolve all
# these paths correctly instead of relying on StaticFiles(html=True).

STATIC_DIR = "frontend/out"

def _resolve_static_file(path: str) -> Optional[str]:
    """Resolve a URL path to a file in the Next.js static export directory."""
    # Security: prevent directory traversal
    safe_path = os.path.normpath(path).lstrip(os.sep).lstrip("/")
    if not safe_path or safe_path == ".":
        return os.path.join(STATIC_DIR, "index.html")

    # 1. Exact file match (static assets, images, _next/static/*, etc.)
    exact = os.path.join(STATIC_DIR, safe_path)
    if os.path.isfile(exact):
        return exact

    # 2. Try appending .html (Next.js 16: /connections → connections.html)
    html_path = exact + ".html"
    if os.path.isfile(html_path):
        return html_path

    # 3. Try appending .txt (Next.js RSC data files)
    txt_path = exact + ".txt"
    if os.path.isfile(txt_path):
        return txt_path

    # 4. Try directory/index.html
    index_path = os.path.join(exact, "index.html")
    if os.path.isfile(index_path):
        return index_path

    return None

if os.path.isdir(STATIC_DIR):
    # Mount _next directory directly for fast static asset serving (JS/CSS chunks)
    next_static = os.path.join(STATIC_DIR, "_next")
    if os.path.isdir(next_static):
        app.mount("/_next", StaticFiles(directory=next_static), name="next_static")

    @app.api_route("/{path:path}", methods=["GET", "HEAD"])
    async def serve_nextjs(request: Request, path: str):
        """Catch-all handler for Next.js static export files."""
        # Root path or empty path → serve index.html
        if not path or path == "":
            index = os.path.join(STATIC_DIR, "index.html")
            if os.path.isfile(index):
                return FileResponse(index)

        resolved = _resolve_static_file(path)
        if resolved:
            return FileResponse(resolved)

        # SPA fallback: serve index.html for client-side routing
        fallback = os.path.join(STATIC_DIR, "index.html")
        if os.path.isfile(fallback):
            return FileResponse(fallback)

        return JSONResponse({"detail": "Not Found"}, status_code=404)

if __name__ == "__main__":
    uvicorn.run("api.main:app", host="0.0.0.0", port=8000, reload=True)
