# Autonomous Job Application Agent System 🤖💼

An end-to-end, fully autonomous job application and personal branding system. Moving beyond basic scripting, this system leverages **LangGraph** for multi-agent state management, **Playwright** for web navigation, **Pydantic AI** (powered by Gemini) for intelligent resume parsing and intent classification, and **RenderCV** for dynamic, tailored resume generation.

## 🌟 Key Features (6 Phases)

1. **Interactive Onboarding & Orchestration:** Parses your master PDF resume into a strict Pydantic model using Gemini and initializes the LangGraph state.
2. **High-Volume Job Discovery:** Scrapes LinkedIn, Indeed, and Glassdoor using `jobspy` to find 100 relevant jobs and enriches them by extracting raw job descriptions via Playwright stealth mode.
3. **Resume Tailoring & Generation:** Safely tailors your resume for specific job descriptions without hallucinating facts. Generates a fresh, targeted PDF using RenderCV.
4. **Auto-Apply & Dashboarding:** Automatically fills out application forms using Playwright, tracks all applications in a centralized local Excel dashboard, and sends real-time WhatsApp notifications.
5. **Timed Cold Emails:** Ingests HR contact lists and schedules delayed cold email outreach via APScheduler to avoid rate limits, whilst an AI Tracker classifies inbox replies (Interview, Rejected, Interested).
6. **Brand Visibility & Networking:** Maintains a daily GitHub contribution streak and auto-publishes tech-focused LinkedIn posts. Safely throttles automated LinkedIn connection requests (max 20/day) to target hiring managers.

## 🛠️ Tech Stack

- **Orchestration:** LangGraph (StateGraph)
- **AI & Parsing:** Pydantic AI, Google Gemini (`gemini-2.5-flash`), pdfplumber
- **Automation & Scraping:** Playwright (with `playwright-stealth`), python-jobspy
- **Document Generation:** RenderCV
- **Data & Scheduling:** Pandas, OpenPyXL, APScheduler
- **Package Management:** uv

## 🚀 Getting Started

### Prerequisites

- Python 3.10+
- [uv](https://github.com/astral-sh/uv) (Extremely fast Python package installer)

### Installation

1. **Clone the repository** (if applicable) and navigate to the project directory:
   ```bash
   cd "Job Automation Applying System"
   ```

2. **Initialize and install dependencies** using `uv`:
   ```bash
   uv sync
   # or if using uv for the first time:
   uv add langgraph pydantic pydantic-ai pdfplumber rich python-jobspy playwright playwright-stealth pandas openpyxl apscheduler rendercv google-api-python-client google-auth-oauthlib google-auth-httplib2 python-dotenv
   ```

3. **Install Playwright Browsers**:
   ```bash
   uv run playwright install chromium
   ```

### Configuration

Create a `.env` file in the root directory (or ensure the existing one is populated) with the following credentials:

```env
GEMINI_API_KEY=your_gemini_api_key_here
WHATSAPP_ACCESS_TOKEN=your_whatsapp_token_here
GITHUB_TOKEN=your_optional_github_token_for_streak
GITHUB_REPO=your_github_username/your_repo_name
```

*Note: For Phase 5 (Gmail integration), you will need to set up Google Cloud OAuth credentials and place the `credentials.json` in your working directory.*

### Running the System

Start the autonomous agent workflow via the CLI:

```bash
uv run main.py
```

The system will interactively prompt you for:
- The absolute path to your master resume PDF.
- Your target role (e.g., "Senior Python Developer").
- Your target experience level (e.g., "Mid-level").

It will then proceed through the multi-agent workflow automatically!

## ⚠️ Disclaimer and Safety

- **Rate Limits:** The system is explicitly configured to throttle connection requests (20/day) and schedule delayed emails (10m intervals) to evade spam detection algorithms on LinkedIn and Gmail.
- **Data Privacy:** All data processing occurs locally (dashboard saved as `application_dashboard.xlsx`) or via the authorized Gemini API.

## 📄 License

This project is open-source and free to use. See standard MIT License details.
