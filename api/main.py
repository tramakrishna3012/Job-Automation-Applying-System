import asyncio
from fastapi import FastAPI, WebSocket, UploadFile, File, BackgroundTasks, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
import uvicorn
from contextlib import asynccontextmanager

from core.graph import app as graph_app
from core.state import ApplicationState
from agents.onboarding import extraction_agent
from core.db import get_db_connection
import pdfplumber
import os
import tempfile

@asynccontextmanager
async def lifespan(app: FastAPI):
    yield

app = FastAPI(title="Job Application Agent API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, restrict to frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class OnboardingRequest(BaseModel):
    target_role: str
    target_experience_level: str

@app.get("/api/health")
async def healthcheck():
    return {"status": "ok", "service": "job-automation-api"}

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

# In-memory store for demo (should be DB backed in prod)
active_state = {}

@app.post("/api/onboard")
async def onboard(
    background_tasks: BackgroundTasks,
    target_role: str = Form(...),
    target_experience_level: str = Form(...),
    file: UploadFile = File(...)
):
    try:
        # Save file securely
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
                    
        # Clean up temp file
        try:
            os.remove(temp_pdf_path)
        except:
            pass
                    
        result = await extraction_agent.run(f"Resume Text:\n{resume_text}")
        user_profile = result.output
        
        # Store in memory for now
        active_state["current"] = {
            "master_resume_path": "uploaded_resume.pdf",  # We aren't storing the physical file long-term right now
            "target_role": target_role,
            "target_experience_level": target_experience_level,
            "user_profile": user_profile,
            "daily_job_queue": [],
            "application_count": 0,
            "excel_dashboard_path": "application_dashboard.xlsx"
        }
        
        return {"message": "Onboarding successful", "profile": user_profile}
        
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        # Return a 500 status with details
        from fastapi import HTTPException
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/start-agents")
async def start_agents(background_tasks: BackgroundTasks):
    if "current" not in active_state:
        return {"error": "Onboarding required first"}
    
    state = active_state["current"]
    
    def run_graph():
        graph_app.invoke(state)
        
    background_tasks.add_task(run_graph)
    return {"message": "Agents started in background"}

@app.websocket("/api/stream")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    # Stub for streaming terminal logs.
    # We would integrate with Python logging to push messages here.
    try:
        while True:
            # Just keeping connection alive for now
            data = await websocket.receive_text()
            await websocket.send_text(f"Message text was: {data}")
    except Exception:
        pass

# Mount Next.js static export. Must be placed after API routes.
if os.path.isdir("frontend/out"):
    app.mount("/", StaticFiles(directory="frontend/out", html=True), name="static")

if __name__ == "__main__":
    uvicorn.run("api.main:app", host="0.0.0.0", port=8000, reload=True)
