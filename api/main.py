import asyncio
from fastapi import FastAPI, WebSocket, UploadFile, File, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
import uvicorn
from contextlib import asynccontextmanager

from core.graph import app as graph_app
from core.state import ApplicationState
from agents.onboarding import extraction_agent
import pdfplumber
import os

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

# In-memory store for demo (should be DB backed in prod)
active_state = {}

@app.post("/api/onboard")
async def onboard(
    background_tasks: BackgroundTasks,
    target_role: str,
    target_experience_level: str,
    file: UploadFile = File(...)
):
    temp_pdf_path = f"temp_{file.filename}"
    with open(temp_pdf_path, "wb") as f:
        f.write(await file.read())
        
    resume_text = ""
    with pdfplumber.open(temp_pdf_path) as pdf:
        for page in pdf.pages:
            text = page.extract_text()
            if text:
                resume_text += text + "\n"
                
    result = await extraction_agent.run(f"Resume Text:\n{resume_text}")
    user_profile = result.data
    
    # Store in memory for now
    active_state["current"] = {
        "master_resume_path": temp_pdf_path,
        "target_role": target_role,
        "target_experience_level": target_experience_level,
        "user_profile": user_profile,
        "daily_job_queue": [],
        "application_count": 0,
        "excel_dashboard_path": "application_dashboard.xlsx"
    }
    
    return {"message": "Onboarding successful", "profile": user_profile}

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
