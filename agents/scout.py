import asyncio
import json
from jobspy import scrape_jobs
from playwright.async_api import async_playwright
from bs4 import BeautifulSoup
from pydantic_ai import Agent
from pydantic_ai.models.gemini import GeminiModel

from core.state import ApplicationState, JobMatch
from core.config import GEMINI_API_KEY
from rich.console import Console

console = Console()

# We configure Pydantic AI for LLM fallback in job description extraction
model = GeminiModel("gemini-2.5-flash")
jd_extractor_agent = Agent(
    model,
    output_type=str,
    system_prompt=(
        "Extract the raw job description text from the following HTML body text. "
        "Remove navigation, footers, headers, and only return the core job responsibilities, "
        "requirements, and description."
    ),
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

    # Tier 1: JSON-LD extraction
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

    # Tier 2: CSS Selectors (common selectors for LinkedIn, Indeed, Glassdoor)
    common_selectors = [
        ".job-description", ".show-more-less-html__markup", 
        "#jobDescriptionText", ".jobDescriptionContent", ".desc"
    ]
    for selector in common_selectors:
        element = soup.select_one(selector)
        if element:
            return element.get_text(separator="\n").strip()

    # Tier 3: LLM DOM reading
    console.print("[yellow]Falling back to LLM for JD extraction...[/yellow]")
    body_text = soup.body.get_text(separator="\n", strip=True) if soup.body else ""
    # Truncate text if too long to save tokens
    body_text = body_text[:15000]
    
    if not body_text:
        return ""

    try:
        result = await jd_extractor_agent.run(f"HTML Body Text:\n{body_text}")
        return result.data
    except Exception as e:
        console.print(f"[red]LLM extraction failed: {e}[/red]")
        return ""

async def enrich_jobs_with_playwright(jobs: list[JobMatch]) -> list[JobMatch]:
    async with async_playwright() as p:
        # Launching with stealth arguments
        browser = await p.chromium.launch(
            headless=True,
            args=["--disable-blink-features=AutomationControlled"]
        )
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        )
        
        # We can process sequentially or in batches. Let's do small batches to be safe.
        for i, job in enumerate(jobs):
            console.print(f"Enriching job {i+1}/{len(jobs)}: {job.title} at {job.company}")
            page = await context.new_page()
            jd = await extract_jd(page, job.url)
            job.description = jd
            await page.close()
            # Small delay to avoid aggressive rate limiting
            await asyncio.sleep(2)
            
        await browser.close()
    return jobs

def run_scout(state: ApplicationState) -> ApplicationState:
    console.print("\n[bold blue]--- Phase 2: High-Volume Job Discovery ---[/bold blue]")
    target_role = state.get("target_role", "Software Engineer")
    target_exp = state.get("target_experience_level", "")
    
    search_term = f"{target_exp} {target_role}".strip()
    
    # We want 100 jobs. JobSpy can fetch chunks.
    console.print(f"Scraping jobs for: {search_term}...")
    
    jobs_df = scrape_jobs(
        site_name=["linkedin", "indeed", "glassdoor"],
        search_term=search_term,
        location="Remote", # Defaulting to remote
        results_wanted=100,
        hours_old=24, # Fresh jobs
        country_ecea='us' # Defaulting to US
    )
    
    if jobs_df.empty:
        console.print("[red]No jobs found![/red]")
        return state
        
    console.print(f"[green]Found {len(jobs_df)} jobs. Enriching...[/green]")
    
    # Convert dataframe to JobMatch objects
    queued_jobs = []
    # Take up to 100
    for _, row in jobs_df.head(100).iterrows():
        job_match = JobMatch(
            id=str(row.get('id', '')),
            title=str(row.get('title', '')),
            company=str(row.get('company', '')),
            location=str(row.get('location', '')),
            url=str(row.get('job_url', ''))
        )
        queued_jobs.append(job_match)
        
    # Enrich asynchronously
    enriched_jobs = asyncio.run(enrich_jobs_with_playwright(queued_jobs))
    
    state["daily_job_queue"] = enriched_jobs
    console.print(f"[bold green]Scout Phase Complete. {len(enriched_jobs)} jobs added to queue.[/bold green]")
    return state
