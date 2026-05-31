## **Architecture and Implementation Blueprint for an Autonomous Job Application Agent System** 

## **Executive Summary** 

This blueprint details the architecture for an end-to-end, fully autonomous job application and personal branding system. Moving beyond basic scripting, this system leverages LangGraph for multi-agent state management, Playwright for web navigation, and Typst/RenderCV for dynamic resume generation. 

Based on your new requirements, the system now features a unified onboarding flow, automated brand visibility (daily GitHub commits and LinkedIn posts), robust email scheduling, and phone notifications. It is configured to target 100 job applications daily while strictly adhering to platform safety limits for networking. 

## **Global System Architecture & Workflow Diagram** 

**==> picture [50 x 140] intentionally omitted <==**

**----- Start of picture text -----**<br>
ic —»<br>ene<br>oeILY<br>CRON JOB<br>- MORNING<br>TRIGGER<br>**----- End of picture text -----**<br>


## **Master System Context for Agentic IDE** 

- **Language:** Python 3.11+ (async preferred). 

- **Orchestration:** LangGraph (StateGraph). 

- **Validation:** Pydantic and Pydantic AI. 

- **Browser:** Playwright with playwright-stealth. 

- **Constraints:** All IDE prompts must be strictly followed. Code must be highly modular. 

## **Phase 1: Interactive Onboarding & State Orchestration** 

## **Requirements & Step-by-Step Guide:** 

1. **Dependencies:** pdfplumber (for parsing), langgraph, rich (for CLI UI). 

2. **Step 1:** Create an onboarding script that prompts the user for a master PDF resume, desired role, and target experience level. 

3. **Step 2:** Extract the text using pdfplumber and use an LLM to map it into a strict Pydantic model (UserProfile). 

4. **Step 3:** Initialize the LangGraph state containing user_profile, daily_job_queue (target: 100), excel_dashboard_path, and email_queue. 

## **IDE Prompt Directive:** 

Construct a Python CLI onboarding module using rich and pdfplumber. The system must prompt the user to upload a master resume and manually input their target role and experience parameters. Use Pydantic AI to parse the extracted PDF text into a strict UserProfile schema. Next, initialize a LangGraph StateGraph object to act as shared memory. The state must track the parsed profile, an application counter (target: 100/day), application dashboard logs, and queued tasks. Ensure the graph is highly modular, with discrete nodes for Job Discovery, Tailoring, Application, Emailing, and Networking. 

## **Phase 2: High-Volume Job Discovery (100/day Target)** 

## **Requirements & Step-by-Step Guide:** 

1. **Dependencies:** python-jobspy, playwright, playwright-stealth. 

2. **Step 1:** Configure JobSpy to pull jobs matching the user's role parameters until 100 viable URLs are queued. 

3. **Step 2:** Use Playwright with stealth mode to visit each URL and extract the Job Description. Use a cascade fallback (JSON-LD -> CSS -> LLM DOM reading) for robustness. 

## **IDE Prompt Directive:** 

Build the job discovery node. Integrate python-jobspy to scrape LinkedIn, Indeed, and Glassdoor, looping until exactly 100 target jobs are queued in the graph state. Create an asynchronous Playwright enrichment script utilizing playwright-stealth to visit each URL and extract the raw job description. Implement a 3-tier cascade fallback: attempt JSON-LD extraction, fallback to CSS selectors, and finally fallback to an LLM extracting the core text from the <body> element. 

## **Phase 3: Resume Tailoring & Document Generation** 

## **Requirements & Step-by-Step Guide:** 

1. **Dependencies:** rendercv or typst library. 

2. **Step 1:** Pass the Job Description and the UserProfile to an LLM with strict instructions to _only_ reorder/emphasize existing facts. 

3. **Step 2:** Map the LLM's Pydantic JSON output to a RenderCV YAML file. 

4. **Step 3:** Trigger the CLI build command to compile a targeted PDF. 

## **IDE Prompt Directive:** 

Build the tailoring node using Pydantic AI. The LLM must evaluate the job description and the UserProfile, mapping relevant experience to a new TailoredResume Pydantic model. Add a strict system prompt constraint prohibiting the hallucination of skills or experience. Once the structured data is validated, generate a YAML file formatted for rendercv and execute the local compilation command to generate a targeted PDF document. Save the local file path to the graph state. 

## **Phase 4: Auto-Apply, Excel Dashboard, & Phone Notifications** 

## **Requirements & Step-by-Step Guide:** 

1. **Dependencies:** playwright, pandas / openpyxl (for Excel), requests (for webhooks). 

2. **Step 1:** Navigate to the application URL, use AI DOM parsing to fill fields, and upload the tailored PDF. 

3. **Step 2:** Upon successful submission, append the Company, Role, Date, and Status to a local Excel file (.xlsx).[1] 

4. **Step 3:** Fire a POST request to a Telegram Bot API or WhatsApp webhook to notify the user's phone. 

## **IDE Prompt Directive:** 

Build the application submission node. Use Playwright to navigate the application form, dynamically mapping the Pydantic profile data to DOM elements and uploading the tailored PDF. Implement error boundaries to skip broken forms. Upon clicking submit, execute two postactions: 1) Append the application metadata (Company, Role, Date) to a centralized Excel spreadsheet using pandas to maintain a visual dashboard.[1] 2) Send a push notification payload via a standard requests.post webhook (e.g., Telegram API) informing the user of the successful application. 

## **Phase 5: Timed Cold Emails & HR Contact Ingestion** 

## **Requirements & Step-by-Step Guide:** 

1. **Dependencies:** apscheduler, pandas (for ingestion), googleapis (Gmail). 

2. **Step 1:** Create an ingestion endpoint to read uploaded Excel/PDF files containing manually sourced HR emails, names, and companies. 

3. **Step 2:** Use APScheduler to queue and send cold emails on specific days and times. 

4. **Step 3:** Poll the inbox to track replies and update the Excel dashboard. 

## **IDE Prompt Directive:** 

Build the email outreach and tracking module. First, write a parser utilizing pandas and pdfplumber to ingest manually uploaded Excel or PDF files containing HR contact lists (Company, Contact Name, Email). Integrate apscheduler to allow the user to schedule targeted cold emails for specific days and times to avoid rate limits. Integrate the Gmail API to send the scheduled emails. Set up a continuous polling loop to fetch incoming responses, parse the HR intent using a Pydantic AI classification model (e.g., Interview, Rejected, Interested), and update the master Excel dashboard accordingly. 

## **Phase 6: Brand Visibility & Automated Networking** 

## **Requirements & Step-by-Step Guide:** 

1. **Dependencies:** playwright (LinkedIn), GitHub REST API, LLM API. 

2. **Step 1 (GitHub):** Create a script that generates a minor code update or markdown note and pushes a commit to a GitHub repo daily. 

3. **Step 2 (LinkedIn Posts):** Use an LLM to generate a daily tech-focused post (projects, AI news) and use Playwright to post it on the user's LinkedIn feed. 

4. **Step 3 (Networking):** Identify hiring managers. Safely limit connection requests to 20-25 per day to prevent account bans. Monitor messages; if a target replies favorably, dispatch the tailored resume. 

## **IDE Prompt Directive:** 

Construct the visibility and networking node. Part 1: Integrate the GitHub REST API to authenticate and push a minor, automated commit daily to maintain a contribution streak. Part 2: Prompt the LLM to generate a daily professional LinkedIn post about IT/AI trends and use Playwright to publish it. Part 3: Implement an automated networking loop via Playwright. Identify hiring managers at target companies and send connection requests. **Crucial Safety Constraint:** Strictly throttle connection requests to a maximum of 20 per day to evade LinkedIn's spam detection and account restriction algorithms. Monitor the LinkedIn inbox; if a hiring manager replies with an introductory message (e.g., "thanks for connecting"), trigger an LLM to draft a follow-up pitch asking for openings and attaching the localized resume PDF. 

## **Works cited** 

1. GitHub - Tomiwajin/CareerSync: AI-powered job application tracker with Gmail integration. Automatically organize applications, track responses, and visualize your job search — completely stateless with zero data storage. 100% free and open source., accessed on May 31, 2026, 

https://github.com/Tomiwajin/CareerSync 

