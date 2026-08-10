import os
from dotenv import load_dotenv

load_dotenv()

# Requesty Unified AI Router Gateway Configuration
REQUESTY_API_KEY = os.getenv("REQUESTY_API_KEY")
REQUESTY_BASE_URL = os.getenv("REQUESTY_BASE_URL", "https://router.requesty.ai/v1")
REQUESTY_MODEL = os.getenv("REQUESTY_MODEL", "openai/gpt-4o-mini")

WHATSAPP_ACCESS_TOKEN = os.getenv("WHATSAPP_ACCESS_TOKEN")
WHATSAPP_PHONE_NUMBER_ID = os.getenv("WHATSAPP_PHONE_NUMBER_ID")
WHATSAPP_DESTINATION_NUMBER = os.getenv("WHATSAPP_DESTINATION_NUMBER")

NEON_DATABASE_URL = os.getenv("NEON_DATABASE_URL")
