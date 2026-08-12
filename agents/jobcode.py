import asyncio
import json
import uuid
from typing import List
from bs4 import BeautifulSoup
from playwright.async_api import async_playwright
from rich.console import Console

from core.state import ApplicationState, JobMatch
from core.db import log_telemetry, is_url_scraped, mark_url_scraped
from core.ai_gateway import async_chat_completion, async_structured_output
from pydantic import BaseModel

console = Console()

JOBCODE_SYSTEM_PROMPT = (
    "You are an AI Web Content & Job Listing Extractor. "
    "Given the text content of a Jobcode blog post, extract the target job details. "
    "Extract: job title, company name, location, job description summary, and the external application URL."
)

class JobcodeExtractedMatch(BaseModel):
    title: str
    company: str
    location: str
    description: str
    apply_url: str

async def scrape_jobcode_post(page, post_url: str) -> JobcodeExtractedMatch | None:
    """Scrapes a single Jobcode blog post using Playwright and LLM fallback extraction."""
    if is_url_scraped(post_url):
        console.print(f"[dim]Skipping already scraped Jobcode post: {post_url}[/dim]")
        return None

    try:
        await page.goto(post_url, wait_until="domcontentloaded", timeout=30000)
        content = await page.content()
        soup = BeautifulSoup(content, "html.parser")

        body_text = soup.body.get_text(separator="\n", strip=True) if soup.body else ""
        body_text = body_text[:15000]

        if not body_text:
            return None

        extracted = await async_structured_output(
            system_prompt=JOBCODE_SYSTEM_PROMPT,
            user_content=f"Jobcode Post URL: {post_url}\nPost Content:\n{body_text}",
            response_model=JobcodeExtractedMatch,
            temperature=0.2
        )

        mark_url_scraped(post_url, source="jobcode")
        return extracted
    except Exception as e:
        console.print(f"[yellow]Jobcode post scrape error ({post_url}): {e}[/yellow]")
        return None

async def scrape_jobcode(state: ApplicationState) -> List[JobMatch]:
    """Scrapes Jobcode blog for job postings and merges normalized matches into job queue."""
    console.print("\n[bold blue]📰 Scraping Jobcode Blog Postings...[/bold blue]")
    log_telemetry("Jobcode", "Initiating Playwright stealth crawl of Jobcode blog")

    jobcode_base_url = "https://jobcode.me"
    new_job_matches: List[JobMatch] = []

    try:
        async with async_playwright() as p:
            browser = await p.chromium.launch(
                headless=True,
                args=["--disable-blink-features=AutomationControlled"]
            )
            context = await browser.new_context(
                user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            )
            page = await context.new_page()

            # Attempt to navigate main listing
            try:
                await page.goto(jobcode_base_url, wait_until="domcontentloaded", timeout=20000)
                content = await page.content()
                soup = BeautifulSoup(content, "html.parser")

                # Extract blog post links
                post_links = []
                for a in soup.find_all("a", href=True):
                    href = a["href"]
                    if ("/job" in href or "/post" in href or "jobcode.me/" in href) and href not in post_links:
                        full_url = href if href.startswith("http") else f"{jobcode_base_url}{href}"
                        post_links.append(full_url)

                console.print(f"[cyan]Discovered {len(post_links)} Jobcode post links.[/cyan]")

                for link in post_links[:10]:
                    extracted = await scrape_jobcode_post(page, link)
                    if extracted and extracted.apply_url:
                        job_match = JobMatch(
                            id=str(uuid.uuid4())[:8],
                            title=extracted.title,
                            company=extracted.company,
                            location=extracted.location,
                            url=extracted.apply_url,
                            description=extracted.description
                        )
                        new_job_matches.append(job_match)
                        console.print(f"[green]Extracted Jobcode match: {job_match.title} at {job_match.company}[/green]")

            except Exception as e:
                console.print(f"[yellow]Jobcode blog main page fetch note: {e}[/yellow]")
            finally:
                await browser.close()
    except Exception as e:
        console.print(f"[yellow]Playwright setup exception for Jobcode: {e}[/yellow]")

    log_telemetry("Jobcode", f"Scraped {len(new_job_matches)} new matches from Jobcode blog")
    return new_job_matches

def run_jobcode(state: ApplicationState) -> ApplicationState:
    console.print("\n[bold blue]--- Phase 2b: Jobcode Blog Scraper ---[/bold blue]")
    jobcode_jobs = asyncio.run(scrape_jobcode(state))
    existing_queue = state.get("daily_job_queue", [])
    state["daily_job_queue"] = existing_queue + jobcode_jobs
    return state
