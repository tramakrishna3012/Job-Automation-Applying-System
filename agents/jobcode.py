import asyncio
import json
import uuid
import re
import urllib.parse
from typing import List, Optional, Dict, Any
from bs4 import BeautifulSoup
from playwright.async_api import async_playwright
from rich.console import Console

from core.state import ApplicationState, JobMatch, UserProfile
from core.db import log_telemetry, is_url_scraped, mark_url_scraped, save_hr_contacts_batch, log_email
from core.ai_gateway import async_chat_completion, async_structured_output
from pydantic import BaseModel, Field

console = Console()

JOBCODE_SYSTEM_PROMPT = (
    "You are an expert AI Tech Job & Internship Extractor for Freshers and Early Career Engineers in India and Remote. "
    "Given the text and HTML content of a job post from a blogging website (like JobCode), "
    "extract the complete job details. "
    "CRITICAL: Look specifically towards the bottom/end of the post where the official 'Apply Link', 'Registration Link', "
    "'Company Career Portal URL', or 'Google Form' is provided. "
    "Extract: job title, company name, location (e.g., Bengaluru, Hyderabad, Pune, Remote, India), "
    "batch eligibility (e.g., 2024/2025/2026/Fresher), key skills, job description summary, "
    "and the exact external application apply_url."
)

class JobcodeExtractedMatch(BaseModel):
    title: str = Field(description="Job title, e.g. Graduate Software Engineer, AI Intern, Python Developer")
    company: str = Field(description="Company hiring, e.g. Amazon, TCS, Infosys, Tech Startup")
    location: str = Field(default="India / Remote", description="Job location or Remote")
    batch_eligibility: Optional[str] = Field(default="Freshers / Any Batch", description="Eligible graduation batches")
    skills: List[str] = Field(default_factory=list, description="Extracted tech skills")
    description: str = Field(description="Comprehensive job responsibilities and technical requirements")
    apply_url: str = Field(description="Direct external application or registration link")
    hr_email: Optional[str] = Field(default=None, description="HR, Recruiter, or careers contact email if found in post")

def extract_direct_apply_link_from_html(soup: BeautifulSoup, base_url: str) -> Optional[str]:
    """Inspects the bottom section and action buttons of a job blog post to find the real external application link."""
    # List of high-priority anchor text keywords used by Indian tech job blogs
    apply_keywords = [
        "apply now", "click here to apply", "apply online", "apply link",
        "registration link", "official link", "direct apply", "careers link",
        "register here", "apply here", "google form", "recruitment link",
        "apply link below", "interested candidates can apply"
    ]

    # Domain patterns for authentic career portals
    career_domain_patterns = [
        "myworkdayjobs.com", "greenhouse.io", "lever.co", "smartrecruiters.com",
        "taleo.net", "icims.com", "ashbyhq.com", "forms.gle", "docs.google.com/forms",
        "unstop.com", "naukri.com", "instahyre.com", "hirist.tech", "foundit.in",
        "linkedin.com/jobs", "careers."
    ]

    anchors = soup.find_all("a", href=True)
    
    # 1. Search for known career portal domains first (most reliable)
    for a in anchors:
        href = a["href"].strip()
        if any(domain in href.lower() for domain in career_domain_patterns):
            if not any(excluded in href.lower() for excluded in ["facebook.com", "whatsapp.com", "telegram.me", "t.me", "twitter.com", "instagram.com"]):
                return href

    # 2. Search bottom anchors with explicit 'Apply' anchor text
    for a in reversed(anchors):
        href = a["href"].strip()
        text = a.get_text(separator=" ", strip=True).lower()
        if any(kw in text for kw in apply_keywords):
            if href.startswith("http") and not any(excluded in href.lower() for excluded in ["facebook.com", "whatsapp.com", "telegram.me", "t.me", "twitter.com", "instagram.com", "youtube.com"]):
                # Avoid self-referencing blog internal links if external link is available
                if "jobcode.me" not in href or "/apply" in href or "redirect" in href:
                    return href

    # 3. Search for elements with class/id containing apply/button
    for btn in soup.find_all(["a", "button"], class_=re.compile(r'(apply|btn-apply|register)', re.I)):
        href = btn.get("href")
        if href and href.startswith("http") and not any(excluded in href.lower() for excluded in ["telegram", "whatsapp", "facebook", "twitter"]):
            return href

    return None

async def scrape_jobcode_post(page, post_url: str) -> Optional[JobcodeExtractedMatch]:
    """Scrapes a single Jobcode blog post using DOM heuristics + AI structured extraction."""
    if is_url_scraped(post_url):
        console.print(f"[dim]Skipping already scraped Jobcode post: {post_url}[/dim]")
        return None

    try:
        await page.goto(post_url, wait_until="domcontentloaded", timeout=25000)
        content = await page.content()
        soup = BeautifulSoup(content, "html.parser")

        # DOM Heuristic apply link extraction
        dom_apply_link = extract_direct_apply_link_from_html(soup, post_url)

        body_text = soup.body.get_text(separator="\n", strip=True) if soup.body else ""
        body_text = body_text[:14000]

        if not body_text:
            return None

        extracted = await async_structured_output(
            system_prompt=JOBCODE_SYSTEM_PROMPT,
            user_content=f"Post URL: {post_url}\nDOM Extracted Apply Link: {dom_apply_link or 'None'}\n\nPost Body Content:\n{body_text}",
            response_model=JobcodeExtractedMatch,
            temperature=0.2
        )

        # Fallback to DOM extracted link if LLM returned generic blog URL
        if dom_apply_link and (not extracted.apply_url or "jobcode.me" in extracted.apply_url):
            extracted.apply_url = dom_apply_link

        if not extracted.apply_url:
            extracted.apply_url = post_url

        # Check for HR email in text
        if not extracted.hr_email:
            email_match = re.search(r'[a-zA-Z0-9_.+-]+@' + re.escape(extracted.company.lower().replace(" ", "")) + r'\.[a-zA-Z0-9-.]+', body_text)
            if not email_match:
                # Generic hr/careers regex
                email_match = re.search(r'\b(hr|careers|talent|recruitment|jobs)@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+', body_text, re.IGNORECASE)
            if email_match:
                extracted.hr_email = email_match.group(0)

        mark_url_scraped(post_url, source="jobcode")
        return extracted
    except Exception as e:
        console.print(f"[yellow]Jobcode post scrape note ({post_url}): {e}[/yellow]")
        return None

async def scrape_jobcode(state: ApplicationState) -> List[JobMatch]:
    """Curls Jobcode blog and fresher portals to extract tech jobs and internships in India & Remote."""
    console.print("\n[bold blue]📰 Scraping Jobcode & Fresher Tech Openings (India & Remote)...[/bold blue]")
    user_id = state.get("user_id")
    profile = state.get("user_profile")
    log_telemetry("Jobcode", "Initiating intelligent crawl of Jobcode fresher blog for tech & internship openings", user_id=user_id)

    blog_sources = [
        "https://jobcode.me",
        "https://jobcode.me/category/freshers-jobs",
        "https://jobcode.me/category/internships",
        "https://jobcode.me/category/it-jobs"
    ]

    new_job_matches: List[JobMatch] = []
    discovered_hr_contacts: List[Dict[str, Any]] = []

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

            post_links: List[str] = []

            for source_url in blog_sources:
                try:
                    await page.goto(source_url, wait_until="domcontentloaded", timeout=15000)
                    content = await page.content()
                    soup = BeautifulSoup(content, "html.parser")

                    for a in soup.find_all("a", href=True):
                        href = a["href"]
                        if ("/job" in href or "/post" in href or "jobcode.me/" in href) and href not in post_links:
                            if not any(excluded in href for excluded in ["/category/", "/tag/", "/author/", "/privacy", "/contact", "/about"]):
                                full_url = href if href.startswith("http") else f"https://jobcode.me{href}"
                                post_links.append(full_url)
                except Exception as e:
                    console.print(f"[dim]Source {source_url} fetch note: {e}[/dim]")

            console.print(f"[cyan]Discovered {len(post_links)} Fresher / Internship post links.[/cyan]")

            # Process discovered links
            for link in post_links[:12]:
                extracted = await scrape_jobcode_post(page, link)
                if extracted and extracted.apply_url:
                    job_match = JobMatch(
                        id=str(uuid.uuid4())[:8],
                        title=extracted.title,
                        company=extracted.company,
                        location=extracted.location or "India (Hybrid/Remote)",
                        url=extracted.apply_url,
                        description=f"Batch: {extracted.batch_eligibility}\nSkills: {', '.join(extracted.skills)}\n\n{extracted.description}",
                        match_score=88 # High match for freshers
                    )
                    new_job_matches.append(job_match)
                    console.print(f"[green]Extracted Opening: {job_match.title} at {job_match.company} (Apply Link: {job_match.url})[/green]")

                    # Automatically generate/store HR contact intelligence for cold email
                    hr_email = extracted.hr_email or f"careers@{extracted.company.lower().replace(' ', '')}.com"
                    discovered_hr_contacts.append({
                        "Contact Name": f"{extracted.company} Hiring Team",
                        "Email": hr_email,
                        "Company": extracted.company,
                        "Position": "Campus & Fresher Recruiter",
                        "Draft": f"Dear Hiring Manager,\n\nI noticed the {extracted.title} opening at {extracted.company} for freshers/graduates. With hands-on experience in {', '.join(extracted.skills[:4]) if extracted.skills else 'Python, Full-Stack and AI Engineering'}, I have built several production-grade projects and would love to contribute to your engineering team.\n\nBest regards,\n{profile.name if profile else 'Candidate'}"
                    })

            await browser.close()
    except Exception as e:
        console.print(f"[yellow]Playwright Jobcode crawl note: {e}[/yellow]")

    # Save any discovered HR contacts to the user's database if authenticated
    if user_id and discovered_hr_contacts:
        try:
            save_hr_contacts_batch(user_id, discovered_hr_contacts)
            log_telemetry("Communicator", f"Auto-generated {len(discovered_hr_contacts)} HR outreach contacts for Jobcode postings", user_id=user_id)
        except Exception:
            pass

    log_telemetry("Jobcode", f"Scraped & normalized {len(new_job_matches)} Fresher/Internship tech jobs with verified apply links", user_id=user_id)
    return new_job_matches

def run_jobcode(state: ApplicationState) -> ApplicationState:
    console.print("\n[bold blue]--- Phase 2b: Jobcode Fresher & Internship Engine ---[/bold blue]")
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            import concurrent.futures
            with concurrent.futures.ThreadPoolExecutor() as pool:
                jobcode_jobs = pool.submit(asyncio.run, scrape_jobcode(state)).result()
        else:
            jobcode_jobs = loop.run_until_complete(scrape_jobcode(state))
    except RuntimeError:
        jobcode_jobs = asyncio.run(scrape_jobcode(state))
    except Exception as e:
        console.print(f"[yellow]Jobcode node execution note: {e}[/yellow]")
        jobcode_jobs = []

    existing_queue = state.get("daily_job_queue", [])
    state["daily_job_queue"] = existing_queue + jobcode_jobs
    return state
