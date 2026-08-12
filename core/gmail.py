import os
import json
import base64
from email.mime.text import MIMEText
from typing import List, Dict, Any, Optional
from rich.console import Console

console = Console()

SCOPES = [
    "https://www.googleapis.com/auth/gmail.send",
    "https://www.googleapis.com/auth/gmail.readonly"
]

def get_gmail_service():
    """Authenticates and returns the Gmail API service instance."""
    try:
        from google.oauth2.credentials import Credentials
        from google_auth_oauthlib.flow import InstalledAppFlow
        from google.auth.transport.requests import Request
        from googleapiclient.discovery import build

        creds = None
        token_path = ".gmail_token.json"
        creds_path = "credentials.json"

        if os.path.exists(token_path):
            creds = Credentials.from_authorized_user_file(token_path, SCOPES)
            
        if not creds or not creds.valid:
            if creds and creds.expired and creds.refresh_token:
                creds.refresh(Request())
            elif os.path.exists(creds_path):
                flow = InstalledAppFlow.from_client_secrets_file(creds_path, SCOPES)
                creds = flow.run_local_server(port=0)
                with open(token_path, "w") as token_file:
                    token_file.write(creds.to_json())
            else:
                console.print("[yellow]Gmail credentials.json not found. Gmail integration disabled.[/yellow]")
                return None

        return build("gmail", "v1", credentials=creds)
    except Exception as e:
        console.print(f"[yellow]Gmail API authentication notice: {e}[/yellow]")
        return None

def send_gmail(to_email: str, subject: str, body: str) -> bool:
    """Sends an email via Gmail API."""
    service = get_gmail_service()
    if not service:
        console.print(f"[yellow]Gmail service unavailable. Simulating send to {to_email}[/yellow]")
        return False

    try:
        message = MIMEText(body)
        message["to"] = to_email
        message["subject"] = subject
        raw_message = base64.urlsafe_b64encode(message.as_bytes()).decode("utf-8")
        
        service.users().messages().send(
            userId="me",
            body={"raw": raw_message}
        ).execute()
        console.print(f"[green]Gmail sent successfully to {to_email}[/green]")
        return True
    except Exception as e:
        console.print(f"[red]Gmail API send failed: {e}[/red]")
        return False

def read_inbox(query: str = "is:unread", max_results: int = 10) -> List[Dict[str, Any]]:
    """Reads unread messages from Gmail matching query."""
    service = get_gmail_service()
    if not service:
        return []

    try:
        results = service.users().messages().list(userId="me", q=query, maxResults=max_results).execute()
        messages = results.get("messages", [])
        email_list = []

        for msg in messages:
            msg_detail = service.users().messages().get(userId="me", id=msg["id"]).execute()
            payload = msg_detail.get("payload", {})
            headers = {h["name"].lower(): h["value"] for h in payload.get("headers", [])}
            
            sender = headers.get("from", "Unknown")
            subject = headers.get("subject", "No Subject")
            
            body = ""
            parts = payload.get("parts", [])
            if parts:
                for part in parts:
                    if part.get("mimeType") == "text/plain":
                        data = part.get("body", {}).get("data", "")
                        body = base64.urlsafe_b64decode(data).decode("utf-8")
                        break
            else:
                data = payload.get("body", {}).get("data", "")
                if data:
                    body = base64.urlsafe_b64decode(data).decode("utf-8")

            email_list.append({
                "id": msg["id"],
                "from": sender,
                "subject": subject,
                "body": body
            })

        return email_list
    except Exception as e:
        console.print(f"[red]Gmail read inbox failed: {e}[/red]")
        return []
