import os
from dotenv import load_dotenv

load_dotenv()

# Requesty Unified AI Router Gateway Configuration
REQUESTY_API_KEY = os.getenv("REQUESTY_API_KEY")
REQUESTY_BASE_URL = os.getenv("REQUESTY_BASE_URL", "https://router.requesty.ai/v1")
REQUESTY_MODEL = os.getenv("REQUESTY_MODEL", "openai/gpt-4o-mini")

# Modal Qwen3.6 Model Hosting Configuration
MODAL_ENDPOINT_URL = os.getenv("MODAL_ENDPOINT_URL")
MODAL_API_KEY = os.getenv("MODAL_API_KEY")
MODAL_MODEL = os.getenv("MODAL_MODEL", "Qwen/Qwen3.6-35B-A3B-FP8")

# Unified AI Provider Choice ("requesty" or "modal")
AI_PROVIDER = os.getenv("AI_PROVIDER", "requesty")

# Auto-Apply Safety Controls
AUTO_SUBMIT_ENABLED = os.getenv("AUTO_SUBMIT_ENABLED", "false").lower() == "true"
MIN_AUTO_SUBMIT_SCORE = int(os.getenv("MIN_AUTO_SUBMIT_SCORE", "80"))

WHATSAPP_ACCESS_TOKEN = os.getenv("WHATSAPP_ACCESS_TOKEN")
WHATSAPP_PHONE_NUMBER_ID = os.getenv("WHATSAPP_PHONE_NUMBER_ID")
WHATSAPP_DESTINATION_NUMBER = os.getenv("WHATSAPP_DESTINATION_NUMBER")

NEON_DATABASE_URL = os.getenv("NEON_DATABASE_URL")

