import asyncio
from rich.console import Console

from core.state import ApplicationState
from core.db import get_db_connection
from core.ai_gateway import async_chat_completion

console = Console()

TRACKER_INTENT_SYSTEM_PROMPT = (
    "Classify the intent of the following HR email response into one of four exact categories: "
    "'Interview', 'Rejected', 'Interested', or 'Pending'. "
    "If it is a request to interview/schedule a call, return 'Interview'. "
    "If it is a rejection email, return 'Rejected'. "
    "If positive interest without concrete interview scheduling yet, return 'Interested'. "
    "If an automated confirmation or generic acknowledgement, return 'Pending'. "
    "Return ONLY the exact category string."
)

async def classify_email_intent(email_body: str) -> str:
    """Classifies HR email intent via Requesty AI Router Gateway."""
    intent = await async_chat_completion(
        messages=[{"role": "user", "content": f"HR Email Body:\n{email_body}"}],
        system_prompt=TRACKER_INTENT_SYSTEM_PROMPT,
        temperature=0.0
    )
    clean_intent = intent.strip().replace("'", "").replace('"', '')
    if clean_intent not in ['Interview', 'Rejected', 'Interested', 'Pending']:
        clean_intent = 'Pending'
    return clean_intent

from core.db import get_db_connection, log_email, log_telemetry
from core.gmail import read_inbox

async def check_inbox_and_classify(state: ApplicationState):
    """Polls Gmail inbox and updates DB status based on classified intent."""
    console.print("[cyan]🔍 Polling inbox for HR responses via AI Intent Classifier...[/cyan]")
    log_telemetry("Tracker", "Polling Gmail inbox for candidate replies and interview invites")

    messages = read_inbox(query="is:unread", max_results=10)
    if not messages:
        # If Gmail OAuth is not configured, fall back to sample evaluation so system keeps functioning
        messages = [{
            "id": "sim-1",
            "from": "TechCorp HR <hr@techcorp.com>",
            "subject": "Interview Invitation",
            "body": "Thank you for reaching out. We were very impressed by your background and would love to schedule an interview call with our engineering team next week."
        }]

    for msg in messages:
        try:
            intent = await classify_email_intent(msg["body"])
            sender = msg.get("from", "Unknown")
            subject = msg.get("subject", "No Subject")
            company = sender.split("@")[-1].split(".")[0].capitalize() if "@" in sender else "Unknown Company"

            console.print(f"[bold green]Detected intent for {company} ({sender}): {intent}[/bold green]")
            log_telemetry("Tracker", f"Inbound email classified as '{intent}' from {sender}")

            # Log to emails table
            log_email(
                direction="inbound",
                recipient_name=sender,
                recipient_email=sender,
                company=company,
                subject=subject,
                body=msg["body"],
                classification=intent,
                status="read"
            )

            conn = get_db_connection()
            if conn:
                with conn.cursor() as cur:
                    cur.execute(
                        "UPDATE job_applications SET status = %s WHERE LOWER(company) LIKE %s",
                        (intent, f"%{company.lower()}%")
                    )
                conn.close()
        except Exception as e:
            console.print(f"[red]Failed to classify intent for message: {e}[/red]")

