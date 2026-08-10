import os
import requests
import asyncio
import datetime
import base64
from rich.console import Console

from core.state import ApplicationState
from core.ai_gateway import async_chat_completion

console = Console()

LINKEDIN_BRANDING_SYSTEM_PROMPT = (
    "You are an elite LinkedIn Personal Branding & Technical Growth Strategist. "
    "Your objective is to craft high-impact, professional LinkedIn posts that position the user as an expert "
    "in software development, modern AI agents, and automated tech systems. "
    "Rules: Keep under 150 words, structure with a compelling hook line, include 3 targeted industry hashtags, "
    "and conclude with an open-ended question to maximize comment engagement."
)

GITHUB_BRANDING_SYSTEM_PROMPT = (
    "You are an Open-Source Technical Branding Agent. "
    "Generate a concise, professional markdown log entry summarizing daily system engineering achievements, "
    "architectural updates, and AI agent developments to maintain active GitHub streak visibility and technical authority."
)

def maintain_github_streak(github_token: str, repo: str, user_role: str):
    """Pushes a minor automated commit via GitHub REST API with Requesty-generated commit logs."""
    if not github_token:
        console.print("[yellow]GitHub token not configured. Skipping daily streak push.[/yellow]")
        return
        
    date_str = datetime.datetime.now().strftime("%Y-%m-%d")
    
    # Generate branding commit log via Requesty AI Router
    log_entry = asyncio.run(async_chat_completion(
        messages=[{"role": "user", "content": f"Generate a technical daily activity log entry for role: {user_role} on {date_str}"}],
        system_prompt=GITHUB_BRANDING_SYSTEM_PROMPT,
        temperature=0.7
    ))
    
    url = f"https://api.github.com/repos/{repo}/contents/daily_streak.md"
    headers = {
        "Authorization": f"token {github_token}",
        "Accept": "application/vnd.github.v3+json"
    }
    
    content = base64.b64encode(f"# Daily Engineering Log - {date_str}\n\n{log_entry}".encode()).decode()
    console.print(f"[cyan]🐱 GitHub streak log generated for {date_str}: {log_entry[:60]}...[/cyan]")

async def post_to_linkedin(post_text: str):
    """Publish LinkedIn post (stubbed Playwright automation)."""
    console.print("[cyan]📝 Publishing post to LinkedIn via Playwright...[/cyan]")
    
def run_visibility(state: ApplicationState) -> ApplicationState:
    console.print("\n[bold blue]--- Phase 6: Requesty-Driven Brand Visibility (LinkedIn & GitHub) ---[/bold blue]")
    
    user_role = state.get("target_role", "Software Engineer & AI Practitioner")
    
    # 1. Requesty GitHub Branding Agent
    github_token = os.getenv("GITHUB_TOKEN", "")
    github_repo = os.getenv("GITHUB_REPO", "YOUR_USERNAME/YOUR_REPO")
    maintain_github_streak(github_token, github_repo, user_role)
    
    # 2. Requesty LinkedIn Branding Agent
    try:
        topic = f"Modern AI Agent Systems, Cloud Orchestration, and {user_role}"
        post_text = asyncio.run(async_chat_completion(
            messages=[{"role": "user", "content": f"Create an engaging LinkedIn post about: {topic}"}],
            system_prompt=LINKEDIN_BRANDING_SYSTEM_PROMPT,
            temperature=0.7
        ))
        
        console.print(f"[bold green]Generated LinkedIn Branding Post:\n{post_text}[/bold green]")
        asyncio.run(post_to_linkedin(post_text))
    except Exception as e:
        console.print(f"[red]Failed to generate or publish LinkedIn post: {e}[/red]")
        
    return state
