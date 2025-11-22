import os
import json
import httpx
import pandas as pd
import traceback
from io import BytesIO
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from typing import List
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables from .env file (if it exists)
load_dotenv()

# --- Configuration ---
DATA_DIR = Path(__file__).resolve().parent.parent / "data" / "parsed"

GEMINI_API_KEY = os.environ.get('GEMINI_API_KEY')
if not GEMINI_API_KEY:
    raise EnvironmentError("GEMINI_API_KEY environment variable not set. Please set it or ensure your .env file is configured.")

MODEL_NAME = "gemini-2.5-flash-preview-09-2025"
API_ENDPOINT = f"https://generativelanguage.googleapis.com/v1beta/models/{MODEL_NAME}:generateContent?key={GEMINI_API_KEY}"

# ElevenLabs configuration (optional - only needed for TTS endpoints)
ELEVENLABS_API_KEY = os.environ.get('ELEVENLABS_API_KEY')
ELEVENLABS_VOICE_ID = os.environ.get('ELEVENLABS_VOICE_ID')

# --- Pydantic Schemas ---

class ScheduleEntry(BaseModel):
    """Defines the structure for a single day in the generated schedule."""
    day: str = Field(..., description="The day of the week (e.g., Monday).")
    target_bed_time: str = Field(..., description="The suggested target bedtime (e.g., 10:30 PM).")
    target_wake_time: str = Field(..., description="The suggested target wake time (e.g., 6:30 AM).")
    reasoning: str = Field(..., description="A short explanation for the suggested times.")
    daily_actions: List[str] = Field(..., description="3 specific, actionable sleep hygiene tips for that day (e.g., 'No caffeine after 2 PM').")

class ScheduleResponse(BaseModel):
    """The overall structure for the AI's schedule output."""
    personalized_schedule: List[ScheduleEntry] = Field(..., description="A 7-day schedule to improve sleep.")

class ASMRRequest(BaseModel):
    """Request model for generating ASMR sleep audio."""
    username: str = Field(..., description="Username to generate personalized sleep story for")
    duration_seconds: int = Field(default=300, description="Duration of the sleep story in seconds (10-1800)")
    mood: str = Field(default="tired after a long day", description="Current mood or state of mind")

# --- FastAPI Setup ---
app = FastAPI(
    title="Sleepi Backend API",
    description="Sleep data API and AI-powered sleep schedule generator.",
)

# Enable CORS (Cross-Origin Resource Sharing)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Helper Functions ---

def get_available_users():
    """
    Returns a list of usernames by scanning the CSV filenames.
    Example: sleep_by_night_eileen.csv → eileen
    """
    users = []
    for file in DATA_DIR.glob("sleep_by_night_*.csv"):
        # Extract "eileen" from "sleep_by_night_eileen.csv"
        username = file.stem.replace("sleep_by_night_", "")
        users.append(username)
    return users


def get_sleep_value(username: str, column_name: str):
    """
    Helper function to get a specific sleep value column for a user.
    Returns the data or raises HTTPException if user/file not found.
    """
    file_path = DATA_DIR / f"sleep_by_night_{username}.csv"

    if not file_path.exists():
        raise HTTPException(
            status_code=404,
            detail=f"No sleep data found for user '{username}'. Expected file: {file_path.name}"
        )

    df = pd.read_csv(file_path)
    
    if column_name not in df.columns:
        raise HTTPException(
            status_code=400,
            detail=f"Column '{column_name}' not found in data"
        )
    
    # Return night and the specific sleep value
    result = df[["night", column_name]].to_dict(orient="records")
    return result


async def generate_sleep_script(username: str, duration_seconds: int, mood: str) -> str:
    """
    Generates an ASMR-style sleep narration script using Gemini.
    Uses the user's sleep data to personalize the script.
    
    Args:
        username: Username to personalize the script for
        duration_seconds: Target duration in seconds (10-1800)
        mood: Current mood or state of mind
    
    Returns:
        Generated script text
    """
    # Validate duration
    if duration_seconds < 10 or duration_seconds > 1800:
        raise HTTPException(
            status_code=400,
            detail="Duration must be between 10 seconds and 30 minutes (1800 seconds)"
        )
    
    # Calculate word count based on TTS reading speed
    # Typical TTS reading speed is ~150-160 words per minute
    # For ASMR/sleep content, we use a slightly slower pace (~140 words/min)
    duration_minutes = duration_seconds / 60.0
    words_per_minute = 140  # Slightly slower for ASMR/sleep content
    target_word_count = int(duration_minutes * words_per_minute)
    
    # Try to get user's sleep data for personalization
    file_path = DATA_DIR / f"sleep_by_night_{username}.csv"
    user_context = ""
    
    if file_path.exists():
        try:
            df = pd.read_csv(file_path)
            if len(df) > 0:
                avg_sleep = df['TotalSleepHours'].mean() if 'TotalSleepHours' in df.columns else 0
                user_context = f"""
- The user's average sleep duration is {avg_sleep:.1f} hours.
- Based on their sleep history, they may benefit from guidance to improve sleep quality.
"""
        except Exception:
            pass  # If we can't read the data, continue without it
    
    # Format duration for display
    if duration_seconds < 60:
        duration_display = f"{duration_seconds} seconds"
    elif duration_seconds < 3600:
        minutes = int(duration_seconds / 60)
        seconds = duration_seconds % 60
        duration_display = f"{minutes} minute{'s' if minutes != 1 else ''}" + (f" {seconds} second{'s' if seconds != 1 else ''}" if seconds > 0 else "")
    else:
        hours = int(duration_seconds / 3600)
        minutes = int((duration_seconds % 3600) / 60)
        duration_display = f"{hours} hour{'s' if hours != 1 else ''}" + (f" {minutes} minute{'s' if minutes != 1 else ''}" if minutes > 0 else "")
    
    prompt = f"""
Create an ASMR-style sleep narration script.

Requirements:
- Address the listener as "{username}" or "you".
- Tone: ultra-soft, comforting, whisper-like.
- Focus on slow breathing, calming imagery, and gentle reassurance.
- Reflect that they feel: "{mood}".
{user_context}
- Duration: The script should be approximately {duration_display} long when read at a calm, slow pace for sleep.
- Word count: Generate approximately {target_word_count} words. This ensures the audio will be about {duration_display} when converted to speech.
- DO NOT include scene directions or markup. Only the spoken script text.
- Pace the content slowly and calmly, with natural pauses for breathing and relaxation.

Write the script now:
"""

    try:
        gemini_payload = {
            "contents": [{"role": "user", "parts": [{"text": prompt}]}],
            "generationConfig": {
                "temperature": 0.7,
            }
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                API_ENDPOINT,
                json=gemini_payload,
                timeout=30.0
            )
            response.raise_for_status()
            gemini_result = response.json()
            
            # Handle potential errors in response structure
            if 'candidates' not in gemini_result or len(gemini_result['candidates']) == 0:
                print(f"Unexpected Gemini response structure: {gemini_result}")
                raise HTTPException(status_code=500, detail="Unexpected response from Gemini API")
            
            candidate = gemini_result['candidates'][0]
            if 'content' not in candidate or 'parts' not in candidate['content']:
                print(f"Unexpected Gemini response structure: {gemini_result}")
                raise HTTPException(status_code=500, detail="Unexpected response structure from Gemini API")
            
            return candidate['content']['parts'][0]['text']
    except httpx.HTTPStatusError as e:
        error_detail = e.response.text if e.response else str(e)
        print(f"Gemini HTTP error: {e}")
        print(f"Response: {error_detail}")
        print(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Failed to generate ASMR script: {error_detail[:200]}")
    except KeyError as e:
        print(f"Gemini response parsing error: {e}")
        print(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Failed to parse Gemini response: {str(e)}")
    except Exception as e:
        print(f"Gemini error: {e}")
        print(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Failed to generate ASMR script: {str(e)}")


async def tts_with_elevenlabs(text: str) -> bytes:
    """
    Converts text to speech using ElevenLabs API.
    Returns the audio bytes.
    """
    if not ELEVENLABS_API_KEY or not ELEVENLABS_VOICE_ID:
        raise HTTPException(
            status_code=500,
            detail="ElevenLabs API key or voice ID not configured"
        )
    
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
    
    async with httpx.AsyncClient(timeout=90.0) as client:
        try:
            resp = await client.post(url, headers=headers, json=payload)
            if resp.status_code != 200:
                print(f"ElevenLabs error status {resp.status_code}: {resp.text}")
                raise HTTPException(status_code=500, detail=f"Failed to generate audio: {resp.text[:200]}")
            return resp.content
        except httpx.HTTPStatusError as e:
            error_detail = e.response.text if e.response else str(e)
            print(f"ElevenLabs HTTP error: {e}")
            print(f"Response: {error_detail}")
            print(f"Traceback: {traceback.format_exc()}")
            raise HTTPException(status_code=500, detail=f"Failed to generate audio: {error_detail[:200]}")
        except Exception as e:
            print(f"ElevenLabs error: {e}")
            print(f"Traceback: {traceback.format_exc()}")
            raise HTTPException(status_code=500, detail=f"Failed to generate audio: {str(e)}")

# --- Routes ---

@app.get("/")
async def root():
    """Simple root endpoint to confirm the server is running."""
    return {"message": "Sleepi Backend API is running with FastAPI."}


# --- Sleep Data Endpoints ---

@app.get("/sleep/users")
def list_users():
    """
    Returns list of users who have CSV files.
    """
    return {"users": get_available_users()}


@app.get("/sleep/{username}")
def get_sleep_for_user(username: str):
    """
    Returns sleep data for the given username by loading the correct CSV.
    Expects files named like: sleep_by_night_<username>.csv
    """
    file_path = DATA_DIR / f"sleep_by_night_{username}.csv"

    if not file_path.exists():
        raise HTTPException(
            status_code=404,
            detail=f"No sleep data found for user '{username}'. Expected file: {file_path.name}"
        )

    df = pd.read_csv(file_path)
    return df.to_dict(orient="records")


@app.get("/sleep/{username}/awake")
def get_awake(username: str):
    """Returns awake time (in hours) per night for the given user."""
    return get_sleep_value(username, "Awake")


@app.get("/sleep/{username}/core")
def get_core(username: str):
    """Returns core sleep time (in hours) per night for the given user."""
    return get_sleep_value(username, "Core")


@app.get("/sleep/{username}/deep")
def get_deep(username: str):
    """Returns deep sleep time (in hours) per night for the given user."""
    return get_sleep_value(username, "Deep")


@app.get("/sleep/{username}/rem")
def get_rem(username: str):
    """Returns REM sleep time (in hours) per night for the given user."""
    return get_sleep_value(username, "REM")


@app.get("/sleep/{username}/inbed")
def get_inbed(username: str):
    """Returns time in bed (in hours) per night for the given user."""
    return get_sleep_value(username, "InBed")


@app.get("/sleep/{username}/asleep-unspecified")
def get_asleep_unspecified(username: str):
    """Returns unspecified sleep time (in hours) per night for the given user."""
    return get_sleep_value(username, "AsleepUnspecified")


@app.get("/sleep/{username}/total")
def get_total(username: str):
    """Returns total sleep hours per night for the given user."""
    return get_sleep_value(username, "TotalSleepHours")


# --- AI Coach Endpoints ---

@app.get('/generate_schedule/{username}')
async def generate_schedule(username: str):
    """
    Reads CSV file for the given username, analyzes the sleep data, creates a prompt,
    requests a structured JSON schedule from Gemini, and returns the schedule.
    """
    try:
        # --- PHASE 1: Data Ingestion and Analysis (using Pandas) ---
        
        # Read the CSV file from disk
        file_path = DATA_DIR / f"sleep_by_night_{username}.csv"
        
        if not file_path.exists():
            raise HTTPException(
                status_code=404,
                detail=f"No sleep data found for user '{username}'. Expected file: {file_path.name}"
            )
        
        # Read the CSV file into a Pandas DataFrame
        df = pd.read_csv(file_path)
        
        # Clean up column names by removing spaces/special characters
        df.columns = df.columns.str.replace('[^A-Za-z0-9_]+', '', regex=True)

        # Check for required columns based on the file snippet
        if 'TotalSleepHours' not in df.columns or 'InBed' not in df.columns:
             raise ValueError("CSV is missing required columns: 'TotalSleepHours' or 'InBed'.")

        # Convert hours (which are floats in the data) to readable format if needed, but we'll use averages
        
        # Calculate key metrics
        avg_sleep_duration = df['TotalSleepHours'].mean()
        avg_time_in_bed = df['InBed'].mean()
        
        # Calculate average awake time (approximate: TimeInBed - TotalSleepHours)
        # Note: We must handle potential negative values or NaN if data is incomplete
        df['AwakeTime'] = df['InBed'] - df['TotalSleepHours']
        avg_awake_time = df['AwakeTime'].mean() if not df['AwakeTime'].empty else 0
        
        # Calculate sleep efficiency (Ratio of time slept to total time in bed)
        sleep_efficiency = (avg_sleep_duration / avg_time_in_bed) * 100 if avg_time_in_bed > 0 else 0

        # Create a summary of the user's sleep profile
        sleep_profile = f"""
        USER SLEEP PROFILE ANALYSIS (based on the last {len(df)} nights of Apple Watch data):
        - Average Total Sleep Duration: {avg_sleep_duration:.2f} hours (Target 7.5 to 8.5 hours).
        - Average Time Awake During Night (Approx): {avg_awake_time:.2f} hours.
        - Average Time in Bed: {avg_time_in_bed:.2f} hours.
        - Sleep Efficiency: {sleep_efficiency:.1f}% (Target >85%).
        """
        
        # --- PHASE 2: AI Prompt Construction and Structured API Call ---

        # 1. Create the detailed user query for the AI
        user_query = f"""
        Analyze the following sleep profile data:
        {sleep_profile}

        Based on this data, generate a 7-day personalized sleep schedule. The goal is to:
        1. Increase the user's average sleep duration to at least 7.5 hours.
        2. Improve Sleep Efficiency above 85%.
        3. Suggest a consistent 'Target Bed Time' and 'Target Wake Time' that gradually achieves these goals.

        IMPORTANT: For the 'daily_actions', provide 3 simple, straightforward steps that anyone can follow. 
        Assume the user has no prior knowledge about sleep science. Each action should be:
        - Clear and specific (e.g., "Stop drinking coffee after 2 PM" not "Limit caffeine")
        - Actionable with a specific time or trigger (e.g., "Turn off all screens at 10:15 PM" not "Reduce screen time")
        - Easy to understand without sleep expertise (e.g., "Set your bedroom temperature to 67°F" not "Optimize thermal regulation")
        - Practical and immediately implementable
        
        Examples of good daily_actions:
        - "Stop drinking any liquids after 8:00 PM to avoid bathroom trips"
        - "Turn off your phone, TV, and computer at 10:15 PM and put them in another room"
        - "Set your bedroom thermostat to 67°F (19°C) before going to bed"
        - "Do not eat any food after 9:00 PM"
        - "Read a physical book (not on a screen) for 20 minutes starting at 10:25 PM"
        
        Provide a short 'reasoning' for the schedule and 3 specific 'daily_actions' following these guidelines.
        """

        # 2. Define the system instruction (Sleep Coach Persona)
        system_instruction = {
            "parts": [{ "text": "You are an expert Sleep Wellness Coach who explains things simply. Your task is to analyze the provided sleep data and generate a 7-day improvement plan with clear, actionable steps that anyone can follow. Write daily_actions as if explaining to someone who has never researched sleep before. You must strictly adhere to the requested JSON format." }]
        }
        
        # 3. Define the structured output configuration (using a Gemini-compatible schema)
        # Gemini doesn't support $defs, so we need to inline the schema
        gemini_schema = {
            "type": "object",
            "properties": {
                "personalized_schedule": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "day": {"type": "string", "description": "The day of the week (e.g., Monday)."},
                            "target_bed_time": {"type": "string", "description": "The suggested target bedtime (e.g., 10:30 PM)."},
                            "target_wake_time": {"type": "string", "description": "The suggested target wake time (e.g., 6:30 AM)."},
                            "reasoning": {"type": "string", "description": "A short explanation for the suggested times."},
                            "daily_actions": {
                                "type": "array",
                                "items": {"type": "string"},
                                "description": "3 specific, actionable sleep hygiene tips for that day (e.g., 'No caffeine after 2 PM')."
                            }
                        },
                        "required": ["day", "target_bed_time", "target_wake_time", "reasoning", "daily_actions"]
                    },
                    "description": "A 7-day schedule to improve sleep."
                }
            },
            "required": ["personalized_schedule"]
        }
        
        generation_config = {
            "responseMimeType": "application/json",
            "responseSchema": gemini_schema
        }

        # 4. Build the final payload for the Gemini API call
        gemini_payload = {
            "contents": [{"role": "user", "parts": [{"text": user_query}]}],
            "systemInstruction": system_instruction,
            "generationConfig": generation_config
        }

        # 5. Make the asynchronous API call
        async with httpx.AsyncClient() as client:
            response = await client.post(
                API_ENDPOINT, 
                json=gemini_payload,
                timeout=45.0 # Increased timeout for complex generation
            )
            response.raise_for_status()

            # --- Extract and Return Structured JSON Data ---
            gemini_result = response.json()
            
            # The structured JSON is inside the first part's text field
            raw_json_string = gemini_result['candidates'][0]['content']['parts'][0]['text']
            
            # FastAPI will automatically validate and serialize this JSON
            return json.loads(raw_json_string)

    except ValueError as ve:
        # Handle custom validation errors (like missing columns)
        print(f"Data processing error: {ve}")
        raise HTTPException(status_code=400, detail=str(ve))
    except httpx.HTTPStatusError as err:
        # Handle Gemini API errors
        error_detail = err.response.text if err.response else str(err)
        print(f"HTTP Error calling Gemini API: {err}")
        print(f"Error response: {error_detail}")
        raise HTTPException(status_code=err.response.status_code, detail=f"Gemini API error: {err.response.status_code} - {error_detail[:200]}")
    except Exception as e:
        # Handle all other errors (e.g., Pandas failure, JSON parse errors)
        print(f"An unexpected error occurred: {e}")
        raise HTTPException(status_code=500, detail="An internal server error occurred during analysis or generation.")


# --- ASMR / TTS Endpoints ---

@app.post("/api/sleep-asmr")
async def create_sleep_asmr(req: ASMRRequest):
    """
    Generates a personalized ASMR sleep story for the user.
    Uses Gemini to generate the script and ElevenLabs to convert it to speech.
    Returns the audio as a streaming MP3 response.
    """
    try:
        # Generate the sleep script using Gemini
        script = await generate_sleep_script(req.username, req.duration_seconds, req.mood)
        
        # Convert to speech using ElevenLabs
        audio_bytes = await tts_with_elevenlabs(script)
        
        # Return as streaming audio response
        return StreamingResponse(
            BytesIO(audio_bytes),
            media_type="audio/mpeg",
            headers={"Content-Disposition": 'inline; filename="asmr.mp3"'},
        )
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error generating ASMR: {e}")
        print(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Failed to generate ASMR audio: {str(e)}")
