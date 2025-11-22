import os
from io import BytesIO
from typing import Dict

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
import httpx
import google.generativeai as genai

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
ELEVENLABS_API_KEY = os.getenv("ELEVENLABS_API_KEY")
ELEVENLABS_VOICE_ID = os.getenv("ELEVENLABS_VOICE_ID")

if not GEMINI_API_KEY:
    raise Exception("Missing GEMINI_API_KEY")

genai.configure(api_key=GEMINI_API_KEY)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Fake "user settings database"
USER_DB = {
    "demo-user-1": {
        "name": "Sleepy Person",
        "usual_bedtime": "11:00 PM",
        "goal_hours": 8,
        "recent_stress_level": "medium",
    }
}

from pydantic import BaseModel
class ASMRRequest(BaseModel):
    user_id: str = "demo-user-1"
    minutes: int = 5
    mood: str = "tired after a long day"


async def generate_sleep_script(user_data: Dict, minutes: int, mood: str) -> str:
    name = user_data["name"]
    bedtime = user_data["usual_bedtime"]
    goal_hours = user_data["goal_hours"]

    prompt = f"""
Create an ASMR-style sleep narration script.

Requirements:
- Address the listener as "{name}" or "you".
- Tone: ultra-soft, comforting, whisper-like.
- Focus on slow breathing, calming imagery, and gentle reassurance.
- Reflect that they feel: "{mood}".
- Mention they usually go to bed around {bedtime}.
- Mention their sleep goal is {goal_hours} hours.
- Duration: approx. {minutes} minutes long when read slowly (~600 words).
- DO NOT include scene directions or markup. Only the spoken script text.

Write the script now:
"""

    try:
        model = genai.GenerativeModel("gemini-pro")
        result = model.generate_content(prompt)
        return result.text
    except Exception as e:
        print("Gemini error:", e)
        raise HTTPException(500, "Failed to generate ASMR script")


async def tts_with_elevenlabs(text: str) -> bytes:
    url = f"https://api.elevenlabs.io/v1/text-to-speech/{ELEVENLABS_VOICE_ID}"

    headers = {
        "xi-api-key": ELEVENLABS_API_KEY,
        "Content-Type": "application/json",
        "Accept": "audio/mpeg",
    }

    payload = {
        "text": text,
        "voice_settings": {
            "stability": 0.3,
            "similarity_boost": 0.95,
        }
    }

    async with httpx.AsyncClient(timeout=90) as client:
        resp = await client.post(url, headers=headers, json=payload)
        if resp.status_code != 200:
            print(resp.text)
            raise HTTPException(500, "Failed to generate audio")
        return resp.content


@app.post("/api/sleep-asmr")
async def create_sleep_asmr(req: ASMRRequest):
    user_data = USER_DB.get(req.user_id)
    if not user_data:
        raise HTTPException(404, "User not found")

    script = await generate_sleep_script(user_data, req.minutes, req.mood)
    audio_bytes = await tts_with_elevenlabs(script)

    return StreamingResponse(
        BytesIO(audio_bytes),
        media_type="audio/mpeg",
        headers={"Content-Disposition": 'inline; filename="asmr.mp3"'},
    )
