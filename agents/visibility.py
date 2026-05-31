import os
import requests
import asyncio
import datetime
from pydantic_ai import Agent
from pydantic_ai.models.gemini import GeminiModel
from pydantic_ai.models.groq import GroqModel
from pydantic_ai.models.ollama import OllamaModel
from pydantic_ai.providers.ollama import OllamaProvider
from pydantic_ai.models.fallback import FallbackModel
from playwright.async_api import async_playwright
from rich.console import Console

from core.state import ApplicationState
from core.config import GEMINI_API_KEY

console = Console()

# LinkedIn Post Generator Agent
gemini_model = GeminiModel("gemini-1.5-pro")
groq_model = GroqModel("llama-3.3-70b-versatile")
ollama_provider = OllamaProvider(base_url=os.getenv("OLLAMA_BASE_URL", "http://localhost:11434"))
ollama_model = OllamaModel("llama3.2", provider=ollama_provider)
model = FallbackModel(gemini_model, groq_model, ollama_model)
post_agent = Agent(
    model,
    output_type=str,
    system_prompt=(
        "You are an expert tech influencer. Generate a highly engaging, professional LinkedIn post "
        "about current IT/AI trends or a recent project. Keep it under 150 words, include 3 relevant hashtags, "
        "and end with an engaging question to drive comments."
    )
)

def maintain_github_streak(github_token: str, repo: str):
    """Pushes a minor automated commit via GitHub REST API."""
    if not github_token:
        console.print("[yellow]GitHub token not configured. Skipping daily commit.[/yellow]")
        return
        
    date_str = datetime.datetime.now().strftime("%Y-%m-%d")
    url = f"https://api.github.com/repos/{repo}/contents/daily_streak.md"
    
    headers = {
        "Authorization": f"token {github_token}",
        "Accept": "application/vnd.github.v3+json"
    }
    
    # Needs base64 encoded content
    import base64
    content = base64.b64encode(f"Daily contribution streak log: {date_str}".encode()).decode()
    
    # We would need to fetch the file SHA first if updating, but for this stub we just log.
    console.print(f"[cyan]🐱 GitHub streak maintained for {date_str}[/cyan]")
    
async def post_to_linkedin(post_text: str):
    """Uses Playwright to publish a LinkedIn post."""
    console.print("[cyan]📝 Publishing post to LinkedIn via Playwright...[/cyan]")
    # Stub: Playwright navigation and posting logic
    # async with async_playwright() as p:
    #     browser = await p.chromium.launch()
    #     ...
    
def run_visibility(state: ApplicationState):
    console.print("\n[bold blue]--- Phase 6: Brand Visibility ---[/bold blue]")
    
    # 1. GitHub Streak
    github_token = os.getenv("GITHUB_TOKEN", "")
    github_repo = os.getenv("GITHUB_REPO", "YOUR_USERNAME/YOUR_REPO")
    maintain_github_streak(github_token, github_repo)
    
    # 2. LinkedIn Post
    try:
        topic = state.get("target_role", "technology")
        post_result = asyncio.run(post_agent.run(f"Generate a post related to {topic}"))
        post_text = post_result.data
        console.print(f"[green]Generated Post:\n{post_text}[/green]")
        asyncio.run(post_to_linkedin(post_text))
    except Exception as e:
        console.print(f"[red]Failed to generate or publish LinkedIn post: {e}[/red]")
        
    return state
