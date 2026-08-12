import os
import datetime
import pandas as pd
import requests
import asyncio
from playwright.async_api import async_playwright
from rich.console import Console

from core.state import ApplicationState, JobMatch, UserProfile
from core.db import get_db_connection, log_telemetry
from core.config import (
    WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_DESTINATION_NUMBER,
    AUTO_SUBMIT_ENABLED, MIN_AUTO_SUBMIT_SCORE
)

console = Console()

def update_neon_dashboard(job: JobMatch, status: str):
    """Appends application status to Neon PostgreSQL dashboard."""
    conn = get_db_connection()
    if not conn:
        console.print("[yellow]Neon DB not configured. Skipping DB update.[/yellow]")
        return
        
    try:
        with conn.cursor() as cur:
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
        console.print("[yellow]WhatsApp token not configured, skipping notification.[/yellow]")
        return
        
    # Assuming standard WhatsApp Cloud API endpoint and a pre-configured phone ID and recipient.
    # We will stub the API call but show the implementation.
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
            "name": "job_applied", # Assuming a pre-approved template
            "language": {
                "code": "en_US"
            },
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
    
    # Try sending the request
    try:
        requests.post(url, headers=headers, json=payload)
        console.print(f"[cyan]📱 WhatsApp Notification sent for {job.company}[/cyan]")
    except Exception as e:
        console.print(f"[red]Failed to send WhatsApp notification: {e}[/red]")

async def auto_apply(page, job: JobMatch, profile: UserProfile) -> bool:
    """Attempts to auto-fill an application form using Playwright."""
    console.print(f"[cyan]Applying to {job.company} via {job.url}...[/cyan]")
    log_telemetry("Dispatcher", f"Attempting auto-fill on {job.url} for {job.company}")
    try:
        await page.goto(job.url, wait_until="domcontentloaded", timeout=45000)
        
        # Example: Try to locate common application inputs by name or label
        # 1. Fill Name
        for selector in ['input[name*="name"]', 'input[id*="name"]']:
            if await page.locator(selector).count() > 0:
                await page.locator(selector).first.fill(profile.name)
                break
                
        # 2. Fill Email
        for selector in ['input[name*="email"]', 'input[id*="email"]']:
            if await page.locator(selector).count() > 0:
                await page.locator(selector).first.fill(profile.email)
                break
                
        # 3. Upload Resume
        if job.tailored_resume_path and os.path.exists(job.tailored_resume_path):
            file_inputs = page.locator('input[type="file"]')
            if await file_inputs.count() > 0:
                await file_inputs.first.set_input_files(job.tailored_resume_path)

        # 4. Submit
        submit_buttons = page.locator('button:has-text("Submit"), button:has-text("Apply")')
        if await submit_buttons.count() > 0:
            match_score = job.match_score or 0
            if AUTO_SUBMIT_ENABLED and match_score >= MIN_AUTO_SUBMIT_SCORE:
                await submit_buttons.first.click()
                console.print(f"[bold green]REAL Submit clicked for {job.company} (Match Score: {match_score}%)[/bold green]")
                log_telemetry("Dispatcher", f"Real application submitted to {job.company} (Score: {match_score}%)")
            else:
                console.print(f"[green]Simulated Submit for {job.company} (Score: {match_score}%, Required: {MIN_AUTO_SUBMIT_SCORE}%, Enabled: {AUTO_SUBMIT_ENABLED})[/green]")
                log_telemetry("Dispatcher", f"Simulated submission completed for {job.company}")
            return True
            
        return False
    except Exception as e:
        console.print(f"[yellow]Auto-apply failed for {job.company}: {e}[/yellow]")
        return False

async def process_applications(state: ApplicationState) -> ApplicationState:
    queue = state.get("daily_job_queue", [])
    profile = state.get("user_profile")
    dashboard_path = state.get("excel_dashboard_path")
    
    if not queue or not profile:
        return state
        
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context()
        
        for job in queue:
            # We skip if no tailored resume is found
            if not job.tailored_resume_path:
                continue
                
            page = await context.new_page()
            success = await auto_apply(page, job, profile)
            
            if success:
                state["application_count"] += 1
                update_neon_dashboard(job, "Applied")
                send_whatsapp_notification(job)
            else:
                update_neon_dashboard(job, "Failed Auto-Apply")
                
            await page.close()
            await asyncio.sleep(1) # Be nice to servers
            
        await browser.close()
        
    return state

def run_dispatcher(state: ApplicationState) -> ApplicationState:
    console.print("\n[bold blue]--- Phase 4: Auto-Apply & Dispatcher Engine ---[/bold blue]")
    return asyncio.run(process_applications(state))
