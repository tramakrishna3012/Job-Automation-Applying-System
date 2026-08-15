import os
import datetime
import pandas as pd
import requests
import asyncio
import re
from typing import Optional, Dict, Any, List
from playwright.async_api import async_playwright
from rich.console import Console

from core.state import ApplicationState, JobMatch, UserProfile
from core.db import get_db_connection, log_telemetry
from core.config import (
    WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_DESTINATION_NUMBER,
    AUTO_SUBMIT_ENABLED, MIN_AUTO_SUBMIT_SCORE
)

console = Console()

def update_neon_dashboard(job: JobMatch, status: str, user_id: Optional[str] = None):
    """Appends application status to Neon PostgreSQL dashboard scoped to user_id."""
    conn = get_db_connection()
    if not conn:
        console.print("[yellow]Neon DB not configured. Skipping DB update.[/yellow]")
        return
        
    try:
        with conn.cursor() as cur:
            if user_id:
                cur.execute(
                    "INSERT INTO job_applications (user_id, company, role, url, status) VALUES (%s::uuid, %s, %s, %s, %s)",
                    (user_id, job.company, job.title, job.url, status)
                )
            else:
                cur.execute(
                    "INSERT INTO job_applications (company, role, url, status) VALUES (%s, %s, %s, %s)",
                    (job.company, job.title, job.url, status)
                )
        console.print(f"[green]Neon DB updated: {status} for {job.company}[/green]")
    except Exception as e:
        console.print(f"[red]Failed to update Neon dashboard: {e}[/red]")
    finally:
        conn.close()

def send_whatsapp_notification(job: JobMatch):
    """Sends a WhatsApp message via WhatsApp Cloud API."""
    if not WHATSAPP_ACCESS_TOKEN:
        return
        
    url = f"https://graph.facebook.com/v17.0/{WHATSAPP_PHONE_NUMBER_ID}/messages"
    headers = {
        "Authorization": f"Bearer {WHATSAPP_ACCESS_TOKEN}",
        "Content-Type": "application/json"
    }
    payload = {
        "messaging_product": "whatsapp",
        "to": WHATSAPP_DESTINATION_NUMBER,
        "type": "template",
        "template": {
            "name": "job_applied",
            "language": {"code": "en_US"},
            "components": [
                {
                    "type": "body",
                    "parameters": [
                        {"type": "text", "text": job.company},
                        {"type": "text", "text": job.title}
                    ]
                }
            ]
        }
    }
    
    try:
        requests.post(url, headers=headers, json=payload, timeout=10)
        console.print(f"[cyan]📱 WhatsApp Notification sent for {job.company}[/cyan]")
    except Exception as e:
        console.print(f"[red]Failed to send WhatsApp notification: {e}[/red]")

async def auto_apply(page, job: JobMatch, profile: UserProfile) -> bool:
    """Attempts to auto-fill an application or signup form using Playwright intelligent heuristics."""
    console.print(f"[cyan]Applying to {job.company} via {job.url}...[/cyan]")
    log_telemetry("Dispatcher", f"Attempting auto-fill on {job.url} for {job.company}")
    try:
        await page.goto(job.url, wait_until="domcontentloaded", timeout=40000)

        name_parts = profile.name.split() if profile.name else ["Candidate"]
        first_name = name_parts[0]
        last_name = " ".join(name_parts[1:]) if len(name_parts) > 1 else first_name

        phone_num = profile.phone or "+91 9876543210"
        location_val = profile.location or "India"
        college_val = profile.education[0].institution if profile.education else "Institute of Technology"
        degree_val = profile.education[0].degree if profile.education else "B.Tech Computer Science"
        grad_year = profile.education[0].graduation_date if profile.education else "2024"

        # 1. Fill Name Fields
        name_inputs = page.locator('input[name*="name"], input[id*="name"], input[placeholder*="name" i]')
        if await name_inputs.count() > 0:
            await name_inputs.first.fill(profile.name)

        # 2. Fill Email
        email_inputs = page.locator('input[type="email"], input[name*="email"], input[id*="email"], input[placeholder*="email" i]')
        if await email_inputs.count() > 0:
            await email_inputs.first.fill(profile.email)

        # 3. Fill Phone
        phone_inputs = page.locator('input[type="tel"], input[name*="phone"], input[name*="mobile"], input[id*="phone"]')
        if await phone_inputs.count() > 0:
            await phone_inputs.first.fill(phone_num)

        # 4. Fill Links (LinkedIn / GitHub)
        if profile.linkedin:
            linkedin_inputs = page.locator('input[name*="linkedin" i], input[id*="linkedin" i]')
            if await linkedin_inputs.count() > 0:
                await linkedin_inputs.first.fill(profile.linkedin)

        if profile.github:
            github_inputs = page.locator('input[name*="github" i], input[id*="github" i]')
            if await github_inputs.count() > 0:
                await github_inputs.first.fill(profile.github)

        # 5. Upload Resume
        if job.tailored_resume_path and os.path.exists(job.tailored_resume_path):
            file_inputs = page.locator('input[type="file"]')
            if await file_inputs.count() > 0:
                await file_inputs.first.set_input_files(job.tailored_resume_path)

        # 6. Submit Button Action
        submit_buttons = page.locator('button:has-text("Submit"), button:has-text("Apply"), input[type="submit"]')
        if await submit_buttons.count() > 0:
            match_score = job.match_score or 85
            if AUTO_SUBMIT_ENABLED and match_score >= MIN_AUTO_SUBMIT_SCORE:
                await submit_buttons.first.click()
                console.print(f"[bold green]REAL Submit executed for {job.company} (Match Score: {match_score}%)[/bold green]")
                log_telemetry("Dispatcher", f"Real application submitted to {job.company} (Score: {match_score}%)")
            else:
                console.print(f"[green]Simulated Submission completed for {job.company} (Score: {match_score}%, Required: {MIN_AUTO_SUBMIT_SCORE}%, Enabled: {AUTO_SUBMIT_ENABLED})[/green]")
                log_telemetry("Dispatcher", f"Simulated submission completed for {job.company}")
            return True
            
        return False
    except Exception as e:
        console.print(f"[yellow]Auto-apply note for {job.company}: {e}[/yellow]")
        return False

async def process_applications(state: ApplicationState) -> ApplicationState:
    queue = state.get("daily_job_queue", [])
    profile = state.get("user_profile")
    user_id = state.get("user_id")
    
    if not queue or not profile:
        return state
        
    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=True,
            args=["--disable-blink-features=AutomationControlled"]
        )
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        )
        
        for job in queue:
            if not job.url:
                continue
                
            page = await context.new_page()
            success = await auto_apply(page, job, profile)
            
            if success:
                state["application_count"] = state.get("application_count", 0) + 1
                status = "Applied" if AUTO_SUBMIT_ENABLED else "Simulated"
                update_neon_dashboard(job, status, user_id=user_id)
                send_whatsapp_notification(job)
            else:
                update_neon_dashboard(job, "Failed Auto-Apply", user_id=user_id)
                
            await page.close()
            await asyncio.sleep(1)
            
        await browser.close()
        
    return state

def run_dispatcher(state: ApplicationState) -> ApplicationState:
    console.print("\n[bold blue]--- Phase 4: Auto-Apply & Dispatcher Engine ---[/bold blue]")
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            import concurrent.futures
            with concurrent.futures.ThreadPoolExecutor() as pool:
                return pool.submit(asyncio.run, process_applications(state)).result()
        else:
            return loop.run_until_complete(process_applications(state))
    except RuntimeError:
        return asyncio.run(process_applications(state))
    except Exception as e:
        console.print(f"[yellow]Dispatcher run note: {e}[/yellow]")
        return state
