"""
Shared Gemini API client setup so the chatbot and bill-photo features don't
each reinvent API key loading and client configuration.

Uses Google's current Gen AI SDK (`google-genai`). The older
`google-generativeai` package is deprecated (no more updates/bug fixes as
of late 2025) — don't reintroduce it.
"""
import os
from google import genai

MODEL_NAME = "gemini-3.6-flash"

_client = None


def get_gemini_client():
    """Lazily creates (and reuses) a single genai.Client for the app's lifetime."""
    global _client
    if _client is None:
        api_key = os.environ.get("GEMINI_API_KEY")
        if not api_key:
            raise RuntimeError(
                "GEMINI_API_KEY is not set. Add it to backend/.env, e.g.\n"
                "GEMINI_API_KEY=your_key_here"
            )
        _client = genai.Client(api_key=api_key)
    return _client