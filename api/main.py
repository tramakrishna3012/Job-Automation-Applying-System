import asyncio
from fastapi import FastAPI, WebSocket, UploadFile, File, BackgroundTasks, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
import uvicorn
from contextlib import asynccontextmanager
import pdfplumber
import os
import tempfile

from core.graph import app as graph_app
from core.state import ApplicationState
from agents.onboarding import parse_resume_text
from core.db import get_db_connection

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
            
            cur.execute("SELECT COUNT(*) as applied FROM job_applications WHERE status = 'applied'")
            applied = cur.fetchone()['applied']
            
            cur.execute("SELECT COUNT(*) as interviews FROM job_applications WHERE status = 'Interview'")
            interviews = cur.fetchone()['interviews']
            
        return {"discovered": discovered, "applied": applied, "interviews": interviews}
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
            cur.execute("SELECT agent_name, message, timestamp FROM agent_logs ORDER BY timestamp DESC LIMIT 10")
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
        from core.db import log_telemetry
        log_telemetry("System", f"Agent Zero initialized. Target role: {state.get('target_role')}. Beginning automated workflow...")
        graph_app.invoke(state)
        
    background_tasks.add_task(run_graph)
    return {"message": "Agents started in background via Requesty AI Router"}

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
