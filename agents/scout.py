import asyncio
import json
import os
from jobspy import scrape_jobs
from playwright.async_api import async_playwright
from bs4 import BeautifulSoup
from rich.console import Console

from core.state import ApplicationState, JobMatch
from core.db import get_db_connection, log_telemetry
from core.ai_gateway import async_chat_completion, generate_embedding

console = Console()

SCOUT_JD_SYSTEM_PROMPT = (
    "You are an AI Web Content & Job Description Extractor. "
    "Extract the core job description text from the provided HTML body text. "
    "Remove site navigation, headers, footers, sidebars, related posts, and advertisements. "
    "Return strictly the target job role, responsibilities, technical requirements, and qualifications."
)

async def extract_jd(page, url: str) -> str:
    """3-tier cascade fallback for extracting job descriptions."""
    try:
        await page.goto(url, wait_until="domcontentloaded", timeout=30000)
    except Exception as e:
        console.print(f"[yellow]Timeout/Error loading {url}: {e}[/yellow]")
        return ""

    content = await page.content()
    soup = BeautifulSoup(content, 'html.parser')

    json_ld_scripts = soup.find_all('script', type='application/ld+json')
    for script in json_ld_scripts:
        try:
            data = json.loads(script.string)
            if isinstance(data, dict):
                if data.get('@type') == 'JobPosting' and 'description' in data:
                    return data['description']
            elif isinstance(data, list):
                for item in data:
                    if isinstance(item, dict) and item.get('@type') == 'JobPosting' and 'description' in item:
                        return item['description']
        except Exception:
            continue

    common_selectors = [
        ".job-description", ".show-more-less-html__markup", 
        "#jobDescriptionText", ".jobDescriptionContent", ".desc"
    ]
    for selector in common_selectors:
        element = soup.select_one(selector)
        if element:
            return element.get_text(separator="\n").strip()

    console.print("[yellow]Falling back to Requesty AI Router for JD extraction...[/yellow]")
    body_text = soup.body.get_text(separator="\n", strip=True) if soup.body else ""
    body_text = body_text[:15000]
    
    if not body_text:
        return ""

    try:
        extracted = await async_chat_completion(
            messages=[{"role": "user", "content": f"HTML Body Text:\n{body_text}"}],
            system_prompt=SCOUT_JD_SYSTEM_PROMPT,
            temperature=0.2
        )
        return extracted
    except Exception as e:
        console.print(f"[red]Requesty LLM extraction failed: {e}[/red]")
        return ""

async def enrich_jobs_with_playwright(jobs: list[JobMatch]) -> list[JobMatch]:
    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=True,
            args=["--disable-blink-features=AutomationControlled"]
        )
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        )
        
        for i, job in enumerate(jobs):
            console.print(f"Enriching job {i+1}/{len(jobs)}: {job.title} at {job.company}")
            page = await context.new_page()
            jd = await extract_jd(page, job.url)
            job.description = jd
            await page.close()
            await asyncio.sleep(2)
            
        await browser.close()
    return jobs

def run_scout(state: ApplicationState) -> ApplicationState:
    console.print("\n[bold blue]--- Phase 2: High-Volume Job Discovery & Requesty AI Enrichment ---[/bold blue]")
    target_role = state.get("target_role", "Software Engineer")
    target_exp = state.get("target_experience_level", "")
    
    search_term = f"{target_exp} {target_role}".strip()
    
    console.print(f"Scraping jobs for: {search_term}...")
    log_telemetry("Scout", f"Initiating job search for: {search_term}")
    
    try:
        jobs_df = scrape_jobs(
            site_name=["linkedin", "indeed", "glassdoor"],
            search_term=search_term,
            location="Remote",
            results_wanted=100,
            hours_old=24,
            country_ecea='us'
        )
    except Exception as e:
        console.print(f"[yellow]JobSpy scrape exception: {e}. Using queue state if populated.[/yellow]")
        return state
    
    if jobs_df.empty:
        console.print("[red]No jobs found![/red]")
        return state
        
    console.print(f"[green]Found {len(jobs_df)} jobs. Enriching...[/green]")
    log_telemetry("Scout", f"Discovered {len(jobs_df)} raw job matches. Enriching data...")
    
    queued_jobs = []
    for _, row in jobs_df.head(100).iterrows():
        job_match = JobMatch(
            id=str(row.get('id', '')),
            title=str(row.get('title', '')),
            company=str(row.get('company', '')),
            location=str(row.get('location', '')),
            url=str(row.get('job_url', ''))
        )
        queued_jobs.append(job_match)
        
    enriched_jobs = asyncio.run(enrich_jobs_with_playwright(queued_jobs))
    
    state["daily_job_queue"] = enriched_jobs
    console.print(f"[bold green]Scout Phase Complete. {len(enriched_jobs)} jobs added to queue.[/bold green]")
    log_telemetry("Scout", f"Scout Phase Complete. {len(enriched_jobs)} high-quality jobs added to queue.")
    return state
