import asyncio
import json
import os
import pandas as pd
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
        await page.goto(url, wait_until="domcontentloaded", timeout=25000)
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

    body_text = soup.body.get_text(separator="\n", strip=True) if soup.body else ""
    body_text = body_text[:14000]
    
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
    if not jobs:
        return []
    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=True,
            args=["--disable-blink-features=AutomationControlled"]
        )
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        )
        
        for i, job in enumerate(jobs[:10]):
            console.print(f"Enriching job {i+1}/{min(len(jobs), 10)}: {job.title} at {job.company}")
            page = await context.new_page()
            jd = await extract_jd(page, job.url)
            if jd:
                job.description = jd
            await page.close()
            await asyncio.sleep(1)
            
        await browser.close()
    return jobs

def run_scout(state: ApplicationState) -> ApplicationState:
    console.print("\n[bold blue]--- Phase 2: High-Volume Job Discovery & Requesty AI Enrichment (India & Remote) ---[/bold blue]")
    user_id = state.get("user_id")
    target_role = state.get("target_role", "Software Engineer")
    target_exp = state.get("target_experience_level", "Fresher")
    
    # Fresher & Early Career Search Term Enhancements
    is_fresher = any(term in target_exp.lower() for term in ["fresher", "intern", "0", "graduate", "entry", "student"])
    if is_fresher:
        search_terms = [
            f"{target_role} Fresher",
            f"{target_role} Intern",
            f"Junior {target_role}"
        ]
    else:
        search_terms = [f"{target_exp} {target_role}".strip()]

    all_scraped_jobs: list[JobMatch] = []

    for search_term in search_terms[:2]:
        console.print(f"Scraping jobs for: {search_term} (India & Remote)...")
        log_telemetry("Scout", f"Initiating high-volume scout for: '{search_term}' (India & Remote)", user_id=user_id)
        
        # Scrape India tech openings
        try:
            jobs_in = scrape_jobs(
                site_name=["linkedin", "indeed", "glassdoor"],
                search_term=search_term,
                location="India",
                results_wanted=30,
                hours_old=48,
                country_ecea='in'
            )
            if not jobs_in.empty:
                for _, row in jobs_in.iterrows():
                    all_scraped_jobs.append(
                        JobMatch(
                            id=str(row.get('id', ''))[:8] or str(uuid.uuid4())[:8],
                            title=str(row.get('title', target_role)),
                            company=str(row.get('company', 'Tech Company')),
                            location=str(row.get('location', 'India')),
                            url=str(row.get('job_url', ''))
                        )
                    )
        except Exception as e:
            console.print(f"[yellow]JobSpy India scrape note ({search_term}): {e}[/yellow]")

        # Scrape Remote tech openings
        try:
            jobs_remote = scrape_jobs(
                site_name=["linkedin", "indeed"],
                search_term=search_term,
                location="Remote",
                results_wanted=20,
                hours_old=48,
                country_ecea='us'
            )
            if not jobs_remote.empty:
                for _, row in jobs_remote.iterrows():
                    all_scraped_jobs.append(
                        JobMatch(
                            id=str(row.get('id', ''))[:8] or str(uuid.uuid4())[:8],
                            title=str(row.get('title', target_role)),
                            company=str(row.get('company', 'Tech Company')),
                            location="Remote",
                            url=str(row.get('job_url', ''))
                        )
                    )
        except Exception as e:
            console.print(f"[yellow]JobSpy Remote scrape note ({search_term}): {e}[/yellow]")

    # Deduplicate by URL
    seen_urls = set()
    unique_jobs = []
    for j in all_scraped_jobs:
        if j.url and j.url not in seen_urls:
            seen_urls.add(j.url)
            unique_jobs.append(j)

    if not unique_jobs:
        console.print("[yellow]No raw jobs returned from external scrapers. Existing queue preserved.[/yellow]")
        return state

    console.print(f"[green]Found {len(unique_jobs)} unique job listings. Enriching descriptions...[/green]")
    log_telemetry("Scout", f"Discovered {len(unique_jobs)} raw job listings. Running Playwright AI enrichment...", user_id=user_id)

    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            import concurrent.futures
            with concurrent.futures.ThreadPoolExecutor() as pool:
                enriched_jobs = pool.submit(asyncio.run, enrich_jobs_with_playwright(unique_jobs)).result()
        else:
            enriched_jobs = loop.run_until_complete(enrich_jobs_with_playwright(unique_jobs))
    except RuntimeError:
        enriched_jobs = asyncio.run(enrich_jobs_with_playwright(unique_jobs))
    except Exception:
        enriched_jobs = unique_jobs

    existing_queue = state.get("daily_job_queue", [])
    state["daily_job_queue"] = existing_queue + enriched_jobs
    console.print(f"[bold green]Scout Phase Complete. {len(enriched_jobs)} jobs added to queue.[/bold green]")
    log_telemetry("Scout", f"Scout Phase Complete. {len(enriched_jobs)} curated jobs added to queue.", user_id=user_id)
    return state
