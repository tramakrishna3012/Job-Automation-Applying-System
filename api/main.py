import asyncio
from fastapi import FastAPI, WebSocket, UploadFile, File, BackgroundTasks, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel
import uvicorn
from contextlib import asynccontextmanager
import pdfplumber
import os
import tempfile
import uuid

from core.graph import app as graph_app
from core.state import ApplicationState, UserProfile, Education, Experience, JobMatch
from agents.onboarding import parse_resume_text
from agents.editor import tailor_for_job
from agents.visibility import LINKEDIN_BRANDING_SYSTEM_PROMPT, GITHUB_BRANDING_SYSTEM_PROMPT
from agents.tracker import classify_email_intent
from core.ai_gateway import async_chat_completion
from core.db import get_db_connection, log_telemetry

@asynccontextmanager
async def lifespan(app: FastAPI):
    yield

app = FastAPI(title="Job Application Agent API (Requesty AI Gateway Enabled)", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class OnboardingRequest(BaseModel):
    target_role: str
    target_experience_level: str

@app.get("/api/health")
async def healthcheck():
    return {"status": "ok", "service": "job-automation-api", "gateway": "Requesty AI Router"}

@app.get("/api/stats")
async def get_stats():
    conn = get_db_connection()
    if not conn:
        return {"discovered": 0, "applied": 0, "interviews": 0}
        
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT COUNT(*) as discovered FROM job_applications")
            discovered = cur.fetchone()['discovered']
            
            cur.execute("SELECT COUNT(*) as applied FROM job_applications WHERE LOWER(status) LIKE 'app%'")
            applied = cur.fetchone()['applied']
            
            cur.execute("SELECT COUNT(*) as interviews FROM job_applications WHERE LOWER(status) LIKE 'interv%'")
            interviews = cur.fetchone()['interviews']
            
        return {"discovered": discovered, "applied": applied, "interviews": interviews}
    except Exception as e:
        return {"error": str(e)}
    finally:
        conn.close()

@app.get("/api/applications")
async def get_applications():
    conn = get_db_connection()
    if not conn:
        return {"applications": []}
        
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT id, company, role, url, status, date_applied FROM job_applications ORDER BY date_applied DESC LIMIT 50")
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
async def get_logs():
    conn = get_db_connection()
    if not conn:
        return {"logs": []}
        
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT agent_name, message, timestamp FROM agent_logs ORDER BY timestamp DESC LIMIT 30")
            rows = cur.fetchall()
            logs = [{"agent": row['agent_name'], "message": row['message'], "time": row['timestamp'].isoformat()} for row in rows]
        return {"logs": logs}
    except Exception as e:
        return {"error": str(e)}
    finally:
        conn.close()

active_state = {}

@app.post("/api/onboard")
async def onboard(
    background_tasks: BackgroundTasks,
    target_role: str = Form(...),
    target_experience_level: str = Form(...),
    file: UploadFile = File(...)
):
    try:
        fd, temp_pdf_path = tempfile.mkstemp(suffix=".pdf")
        os.close(fd)
        with open(temp_pdf_path, "wb") as f:
            f.write(await file.read())
            
        resume_text = ""
        with pdfplumber.open(temp_pdf_path) as pdf:
            for page in pdf.pages:
                text = page.extract_text()
                if text:
                    resume_text += text + "\n"
                    
        try:
            os.remove(temp_pdf_path)
        except Exception:
            pass
                    
        user_profile = await parse_resume_text(resume_text)
        
        active_state["current"] = {
            "master_resume_path": "uploaded_resume.pdf",
            "target_role": target_role,
            "target_experience_level": target_experience_level,
            "user_profile": user_profile,
            "daily_job_queue": [],
            "application_count": 0,
            "excel_dashboard_path": "application_dashboard.xlsx"
        }
        
        return {"message": "Onboarding successful via Requesty Router", "profile": user_profile}
        
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/start-agents")
async def start_agents(background_tasks: BackgroundTasks):
    if "current" not in active_state:
        return {"error": "Onboarding required first"}
    
    state = active_state["current"]
    
    def run_graph():
        log_telemetry("System", f"Agent Zero initialized. Target role: {state.get('target_role')}. Beginning automated workflow...")
        graph_app.invoke(state)
        
    background_tasks.add_task(run_graph)
    return {"message": "Agents started in background via Requesty AI Router"}

@app.post("/api/test-apply")
async def test_apply():
    """End-to-end AI agent test execution pipeline to test Requesty AI gateway, resume architect & database workflow."""
    log_telemetry("System", "Starting End-to-End AI Agent Test Workflow...")
    
    sample_profile = UserProfile(
        name="Alex Mercer",
        email="alex.mercer@example.com",
        phone="+1 (555) 234-5678",
        location="San Francisco, CA",
        skills=["Python", "FastAPI", "React", "PostgreSQL", "pgvector", "Docker", "OpenAI SDK"],
        experience=[
            Experience(
                company="Nexus AI Corp",
                role="Senior Full-Stack AI Engineer",
                start_date="2022",
                end_date="Present",
                responsibilities=[
                    "Engineered autonomous AI routing system handling multi-LLM gateways.",
                    "Designed high-throughput vector database search pipelines using pgvector."
                ]
            )
        ],
        education=[
            Education(
                institution="University of California, Berkeley",
                degree="B.S. Computer Science",
                graduation_date="2021"
            )
        ]
    )
    
    test_job_id = str(uuid.uuid4())[:8]
    test_job = JobMatch(
        id=test_job_id,
        title="Senior AI Systems Engineer",
        company="Requesty Cloud Labs",
        location="Remote (US)",
        url="https://example.com/careers/ai-engineer",
        description="We are looking for a Senior AI Engineer proficient in Python, FastAPI, OpenAI SDK, vector search, and containerized Docker deployments."
    )
    
    log_telemetry("Scout", f"Test Scout matched job: {test_job.title} at {test_job.company}")
    
    tailored_job = await tailor_for_job(test_job, sample_profile)
    log_telemetry("Editor", f"Resume Architect compiled tailored resume for {test_job.company}")
    
    conn = get_db_connection()
    if conn:
        try:
            with conn.cursor() as cur:
                cur.execute(
                    "INSERT INTO job_applications (company, role, url, status) VALUES (%s, %s, %s, %s)",
                    (test_job.company, test_job.title, test_job.url, "Applied")
                )
            log_telemetry("Dispatcher", f"Auto-Apply submitted test application to Neon DB for {test_job.company}")
        except Exception as e:
            log_telemetry("Dispatcher", f"DB insert note: {e}")
        finally:
            conn.close()
            
    linkedin_post = await async_chat_completion(
        messages=[{"role": "user", "content": "Create a post celebrating our new Requesty AI Unified Router deployment!"}],
        system_prompt=LINKEDIN_BRANDING_SYSTEM_PROMPT,
        temperature=0.7
    )
    log_telemetry("Visibility", "Generated Requesty LinkedIn Personal Branding post")
    
    intent = await classify_email_intent("We would love to invite you to an interview call for the AI Engineer role!")
    log_telemetry("Tracker", f"HR Response classified as: {intent}")
    
    return {
        "status": "success",
        "message": "Test job application and AI pipeline completed successfully!",
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

@app.get("/api/pipeline")
async def get_pipeline():
    """Returns applications grouped by pipeline stage for Kanban view."""
    conn = get_db_connection()
    if not conn:
        return {"stages": {"discovered": [], "evaluating": [], "generating": [], "applied": []}}

    try:
        with conn.cursor() as cur:
            cur.execute("SELECT id, company, role, url, status, date_applied FROM job_applications ORDER BY date_applied DESC LIMIT 100")
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

@app.get("/api/resume/{job_id}")
async def get_resume_html(job_id: str):
    """Returns the generated HTML resume for a job application."""
    import glob
    resume_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), ".resumes")
    pattern = os.path.join(resume_dir, f"resume_{job_id}*.html")
    matches = glob.glob(pattern)

    if matches:
        with open(matches[0], "r", encoding="utf-8") as f:
            html_content = f.read()
        return {"html": html_content, "job_title": "Tailored Resume", "company": job_id}

    return {"html": "<p>Resume not yet generated for this job.</p>", "job_title": "", "company": ""}

@app.get("/api/branding/posts")
async def get_branding_posts():
    """Returns branding-related agent logs for the Social Branding Hub."""
    conn = get_db_connection()
    if not conn:
        return {"posts": []}

    try:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT agent_name, message, timestamp FROM agent_logs
                WHERE agent_name = 'Visibility'
                   OR LOWER(message) LIKE '%%linkedin%%'
                   OR LOWER(message) LIKE '%%github%%'
                   OR LOWER(message) LIKE '%%branding%%'
                ORDER BY timestamp DESC LIMIT 20
            """)
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
async def generate_branding_post():
    """Generates a new LinkedIn branding post via Requesty AI."""
    try:
        post = await async_chat_completion(
            messages=[{"role": "user", "content": "Create a high-impact LinkedIn post about leveraging AI agents for autonomous career growth and technical branding."}],
            system_prompt=LINKEDIN_BRANDING_SYSTEM_PROMPT,
            temperature=0.7
        )
        log_telemetry("Visibility", f"Generated LinkedIn branding post: {post[:80]}...")
        return {"post": post}
    except Exception as e:
        return {"error": str(e)}

@app.websocket("/api/stream")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            data = await websocket.receive_text()
            await websocket.send_text(f"Message text was: {data}")
    except Exception:
        pass

if os.path.isdir("frontend/out"):
    app.mount("/", StaticFiles(directory="frontend/out", html=True), name="static")

if __name__ == "__main__":
    uvicorn.run("api.main:app", host="0.0.0.0", port=8000, reload=True)
