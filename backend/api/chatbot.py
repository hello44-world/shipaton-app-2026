"""
AI chat assistant — casual conversation plus on-demand appliance/energy
calculations, grounded in whatever's actually happening on the user's
dashboard right now (power source, available capacity, registered
appliances).
"""
from flask import Blueprint, request, jsonify
from google.genai import types
from services.gemini_client import get_gemini_client, MODEL_NAME

chat_bp = Blueprint("chat", __name__)

SYSTEM_INSTRUCTIONS = """You are the WattGuard energy assistant.

1. Respond naturally to greetings and small talk ("hello", "how are you") — keep it brief and friendly, then steer back to being useful.
2. Your main job is calculation: given the user's current power source, available capacity, and registered appliances (provided below as context), tell them what they can run right now and what they can't.
3. If the user asks about an appliance that is NOT in their registered list, don't refuse — estimate its typical wattage yourself from general knowledge, check it against the current available capacity, and give a real, specific answer.
4. Always be honest. If something can't run, say so directly and explain why (not enough capacity right now) — never say something will work when the numbers say it won't.
5. When asked about a bill increase, be specific: point to the actual usage pattern behind it rather than a vague generic answer.
6. Never use local utility-board names — always say "the utility grid" / "electricity bill" / "kWh".
7. Keep answers short and direct — a few sentences, not long paragraphs, unless the user explicitly asks for a full breakdown."""


@chat_bp.route("/message", methods=["POST"])
def send_message():
    """
    POST /api/chat/message
    Body: {
      "message": "can I run my hair dryer?",
      "context": {
        "power_source": "solar",
        "available_watts": 1800,
        "appliances": [{"name": "Air conditioner", "watts": 1500, "safe_to_run": true}, ...]
      }
    }
    """
    body = request.get_json(force=True) or {}
    message = (body.get("message") or "").strip()
    if not message:
        return jsonify({"error": "message is required"}), 400

    context_summary = _summarize_context(body.get("context") or {})
    prompt = f"Current dashboard state:\n{context_summary}\n\nUser: {message}"

    try:
        client = get_gemini_client()
        response = client.models.generate_content(
            model=MODEL_NAME,
            contents=prompt,
            config=types.GenerateContentConfig(system_instruction=SYSTEM_INSTRUCTIONS),
        )
        reply = (response.text or "").strip()
    except Exception as e:
        return jsonify({"error": f"chat failed: {e}"}), 502

    return jsonify({"reply": reply})


def _summarize_context(context):
    lines = []
    source = context.get("power_source")
    if source:
        lines.append(f"- Power source right now: {source}")
    available = context.get("available_watts")
    if available is not None:
        lines.append(f"- Available capacity: {available}W")
    appliances = context.get("appliances") or []
    if appliances:
        lines.append("- Registered appliances:")
        for a in appliances:
            status = "safe to run" if a.get("safe_to_run") else "not safe right now"
            lines.append(f"  - {a.get('name')} ({a.get('watts')}W) — {status}")
    return "\n".join(lines) if lines else "No dashboard data available yet."
