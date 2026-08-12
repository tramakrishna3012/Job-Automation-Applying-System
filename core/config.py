import os
from dotenv import load_dotenv

load_dotenv()

# Modal Qwen3.6 Model Gateway Configuration (vLLM OpenAI Compatible)
MODAL_ENDPOINT_URL = os.getenv("MODAL_ENDPOINT_URL", "https://modal.example.com/v1")
MODAL_API_KEY = os.getenv("MODAL_API_KEY")
MODAL_MODEL = os.getenv("MODAL_MODEL", "Qwen/Qwen3.6-35B-A3B-FP8")

# Authentication Security Configuration
JWT_SECRET = os.getenv("JWT_SECRET", "super-secret-jobauto-jwt-token-key-2026")
JWT_ALGORITHM = "HS256"

# Auto-Apply Safety Controls
AUTO_SUBMIT_ENABLED = os.getenv("AUTO_SUBMIT_ENABLED", "false").lower() == "true"
MIN_AUTO_SUBMIT_SCORE = int(os.getenv("MIN_AUTO_SUBMIT_SCORE", "80"))

WHATSAPP_ACCESS_TOKEN = os.getenv("WHATSAPP_ACCESS_TOKEN")
WHATSAPP_PHONE_NUMBER_ID = os.getenv("WHATSAPP_PHONE_NUMBER_ID")
WHATSAPP_DESTINATION_NUMBER = os.getenv("WHATSAPP_DESTINATION_NUMBER")

NEON_DATABASE_URL = os.getenv("NEON_DATABASE_URL")
