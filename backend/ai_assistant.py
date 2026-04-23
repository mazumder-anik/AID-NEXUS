import os
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)
    model = genai.GenerativeModel('gemini-1.5-flash')
else:
    model = None

def ask_gemini(prompt: str, needs_context: str) -> str:
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
