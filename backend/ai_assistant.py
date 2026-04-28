"""
ai_assistant.py — Enhanced AI chatbot backend for Smart Resource Allocation.
Uses full project data (needs, volunteers, matches, stats) as context for Gemini.
"""

import os
import google.generativeai as genai
from dotenv import load_dotenv

_ENV_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env")
load_dotenv(dotenv_path=_ENV_PATH, override=True)

# Lazy-initialized model — fetched fresh each call to survive hot-reloads
_model = None

def _get_model():
    """Return a configured Gemini model, or None if key is missing."""
    global _model
    if _model is not None:
        return _model
    key = os.getenv("GEMINI_API_KEY")
    if not key:
        # Re-read .env in case env wasn't set at import time
        load_dotenv(dotenv_path=_ENV_PATH, override=True)
        key = os.getenv("GEMINI_API_KEY")
    if key:
        genai.configure(api_key=key)
        _model = genai.GenerativeModel('gemini-2.5-flash')
    return _model


SYSTEM_PROMPT_TEMPLATE = """
You are AID-NEXUS Assistant, an intelligent AI chatbot embedded inside the Smart Resource Allocation platform used by NGO coordinators to manage community needs, volunteers, and aid distribution.

Your role:
- Answer questions about the current state of needs, volunteers, and matches using the live data provided below
- Help coordinators prioritize actions, identify gaps, and make decisions
- Provide concise, actionable, and data-driven responses
- Format responses clearly using bullet points, bold text, and structure where helpful
- Be empathetic and mission-focused — lives may depend on good decisions

You have access to real-time data from the platform:

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 DASHBOARD OVERVIEW
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
{dashboard_stats}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚨 OPEN NEEDS (ALL — sorted by urgency)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
{open_needs_context}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
👥 VOLUNTEERS (AVAILABLE)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
{volunteers_context}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔗 RECENT MATCHES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
{matches_context}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

When answering:
- Reference specific IDs, areas, and numbers from the data above
- If something is not in the data, say so honestly
- Keep answers under 300 words unless detailed analysis is needed
- Use markdown formatting (bold, bullets, headers) for readability
"""


def build_context(open_needs, all_volunteers, recent_matches, stats) -> dict:
    """Build rich context strings from all project data."""

    # Dashboard stats
    if stats:
        dashboard = (
            f"- Total Needs: {stats.get('total_needs', 0)} "
            f"(Open: {stats.get('open_needs', 0)}, "
            f"In Progress: {stats.get('in_progress_needs', 0)}, "
            f"Resolved: {stats.get('resolved_needs', 0)})\n"
            f"- Volunteers: {stats.get('total_volunteers', 0)} total "
            f"({stats.get('available_volunteers', 0)} available, "
            f"{stats.get('assigned_volunteers', 0)} assigned)\n"
            f"- Active Matches: {stats.get('active_matches', 0)} "
            f"/ Total: {stats.get('total_matches', 0)}\n"
            f"- Critical/High Coverage: {stats.get('coverage_pct', 0)}%\n"
            f"- Needs by Category: {stats.get('needs_by_category', {})}"
        )
    else:
        dashboard = "Stats unavailable."

    # Open needs
    if open_needs:
        lines = []
        for n in open_needs[:30]:  # limit to 30 for token efficiency
            lines.append(
                f"  [{n.get('urgency_badge', 'N/A')}] ID:{n.get('need_id')} | "
                f"{n.get('category', '').upper()} in {n.get('area')} | "
                f"Score:{n.get('urgency_score', 0):.1f} | "
                f"Reported by {n.get('reported_count', 0)} people | "
                f"Source: {n.get('source')} | "
                f"\"{n.get('description', '')}\""
            )
        open_needs_ctx = "\n".join(lines)
        if len(open_needs) > 30:
            open_needs_ctx += f"\n  ... and {len(open_needs) - 30} more open needs."
    else:
        open_needs_ctx = "No open needs currently."

    # Available volunteers
    if all_volunteers:
        avail = [v for v in all_volunteers if v.get('status') == 'available']
        assigned = [v for v in all_volunteers if v.get('status') == 'assigned']
        lines = []
        for v in avail[:20]:
            skills = ", ".join(v.get('skills') or [])
            lines.append(
                f"  ID:{v.get('volunteer_id')} | {v.get('name')} | "
                f"Skills: [{skills}] | Avail: {v.get('availability')} | "
                f"Max dist: {v.get('max_distance_km')}km"
            )
        volunteers_ctx = f"Available ({len(avail)}):\n" + "\n".join(lines)
        if len(avail) > 20:
            volunteers_ctx += f"\n  ... and {len(avail) - 20} more available."
        volunteers_ctx += f"\n\nAssigned: {len(assigned)} volunteers currently on tasks."
    else:
        volunteers_ctx = "No volunteer data available."

    # Recent matches
    if recent_matches:
        lines = []
        for m in recent_matches[:15]:
            lines.append(
                f"  Match:{m.get('match_id')} | Need:{m.get('need_id')} → "
                f"Vol:{m.get('volunteer_id')} | "
                f"Score:{m.get('match_score', 0):.2f} | "
                f"Dist:{m.get('distance_km', 0):.1f}km | "
                f"Status:{m.get('status')} | "
                f"Skills: {m.get('skill_overlap', [])}"
            )
        matches_ctx = "\n".join(lines)
    else:
        matches_ctx = "No matches yet."

    return {
        "dashboard_stats": dashboard,
        "open_needs_context": open_needs_ctx,
        "volunteers_context": volunteers_ctx,
        "matches_context": matches_ctx,
    }


def ask_gemini_chatbot(
    prompt: str,
    open_needs: list,
    all_volunteers: list,
    recent_matches: list,
    stats: dict,
    conversation_history: list = None,
) -> str:
    """
    Ask Gemini with full project context and optional conversation history.
    
    conversation_history: list of {"role": "user"|"assistant", "text": "..."} dicts
    """
    model = _get_model()
    if not model:
        return (
            "⚠️ **Gemini API Key not configured.** "
            "Please add `GEMINI_API_KEY` to your `.env` file to enable the AI assistant."
        )

    ctx = build_context(open_needs, all_volunteers, recent_matches, stats)
    system_prompt = SYSTEM_PROMPT_TEMPLATE.format(**ctx)

    # Build conversation for Gemini
    # We'll embed history in a single prompt for simplicity (stateless API)
    history_text = ""
    if conversation_history:
        for msg in conversation_history[-6:]:  # last 6 messages for context
            role_label = "User" if msg.get("role") == "user" else "Assistant"
            history_text += f"\n{role_label}: {msg.get('text', '')}"

    full_prompt = f"{system_prompt}"
    if history_text:
        full_prompt += f"\n\nConversation so far:{history_text}"
    full_prompt += f"\n\nUser: {prompt}\nAssistant:"

    try:
        response = model.generate_content(full_prompt)
        return response.text.strip()
    except Exception as e:
        return f"⚠️ Error communicating with Gemini AI: {str(e)}"


# Legacy function kept for backward compatibility
def ask_gemini(prompt: str, needs_context: str) -> str:
    model = _get_model()
    if not model:
        return "Gemini API Key is not configured. Please add GEMINI_API_KEY to your .env file."
    system_prompt = f"""
You are an AI assistant for a Smart Resource Allocation system used by NGOs.
You help coordinators understand the current situation based on the provided context of open community needs.
Keep your answers concise, actionable, and friendly.

Context (Current Open Needs):
{needs_context}
"""
    try:
        response = model.generate_content(f"{system_prompt}\n\nUser Question: {prompt}")
        return response.text
    except Exception as e:
        return f"Error communicating with Gemini AI: {str(e)}"
