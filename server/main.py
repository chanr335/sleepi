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
from typing import List, Optional
from pathlib import Path
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# Add this Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins (for development only)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ... rest of your endpoints

# Load environment variables from .env file (if it exists)
load_dotenv()

# --- Configuration ---
# NOTE: This directory path must exist on your server for the file reading to work.
DATA_DIR = Path(__file__).resolve().parent.parent / "data" / "parsed" 

GEMINI_API_KEY = os.environ.get('GEMINI_API_KEY')
if not GEMINI_API_KEY:
    raise EnvironmentError("GEMINI_API_KEY environment variable not set. Please set it or ensure your .env file is configured.")

MODEL_NAME = "gemini-2.5-flash-lite"
API_ENDPOINT = f"https://generativelanguage.googleapis.com/v1beta/models/{MODEL_NAME}:generateContent?key={GEMINI_API_KEY}"

# ElevenLabs configuration (optional - only needed for TTS endpoints)
ELEVENLABS_API_KEY = os.environ.get('ELEVENLABS_API_KEY')  # API key for all voices
ELEVENLABS_VOICE_ID_DELILAH = os.environ.get('ELEVENLABS_VOICE_ID_DELILAH')
ELEVENLABS_VOICE_ID_VINCENT = os.environ.get('ELEVENLABS_VOICE_ID_VINCENT')
ELEVENLABS_VOICE_ID_TIZA = os.environ.get('ELEVENLABS_VOICE_ID_TIZA')

# --- Pydantic Schemas ---

class WeeklyInsight(BaseModel):
    """Insight comparing the latest day to the day from 7 days ago."""
    assessment: str = Field(..., description="Assessment of the change (e.g., 'improved', 'worsened', 'unchanged').")
    insight: str = Field(..., description="Brief insight comparing the latest day to the day from the prior week.")
    percentage_change: Optional[float] = Field(..., description="Percentage change in sleep quality (positive = better, negative = worse). Can be None if no comparison data available.")

class ScheduleResponse(BaseModel):
    """The overall structure for the AI's schedule output."""
    daily_tip: str = Field(..., description="A general daily tip on how to improve sleep.")
    weekly_insight: WeeklyInsight = Field(..., description="Insight comparing the most recent week of sleep data.")
    daily_schedule: List[str] = Field(..., description="3-4 actionable items throughout the day with SPECIFIC CLOCK TIMES to benefit sleep.")

class ASMRRequest(BaseModel):
    """Request model for generating ASMR sleep audio."""
    username: str = Field(..., description="Username to generate personalized sleep story for")
    duration_seconds: int = Field(default=300, description="Duration of the sleep story in seconds (10-1800)")
    mood: str = Field(default="tired after a long day", description="Current mood or state of mind")
    voice: str = Field(default="delilah", description="Voice to use: 'delilah', 'vincent', or 'tiza'")
class SleepLogEntry(BaseModel):
    """Structure for logging a new sleep entry. Only night and TotalSleepHours are required."""
    night: str = Field(..., description="Date of the night (e.g., '2025-01-15').")
    TotalSleepHours: float = Field(..., description="Total sleep hours.")
    AsleepUnspecified: float = Field(default=0.0, description="Unspecified sleep time in hours.")
    Awake: float = Field(default=0.0, description="Time awake during night in hours.")
    Core: float = Field(default=0.0, description="Core sleep time in hours.")
    Deep: float = Field(default=0.0, description="Deep sleep time in hours.")
    InBed: float = Field(default=0.0, description="Time in bed in hours.")
    REM: float = Field(default=0.0, description="REM sleep time in hours.")

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


async def tts_with_elevenlabs(text: str, voice: str = "delilah") -> bytes:
    """
    Converts text to speech using ElevenLabs API.
    Returns the audio bytes.
    
    Args:
        text: The text to convert to speech
        voice: The voice to use ('delilah', 'vincent', or 'tiza')
    """
    # Select voice ID based on voice selection
    voice_id_map = {
        "delilah": ELEVENLABS_VOICE_ID_DELILAH,
        "vincent": ELEVENLABS_VOICE_ID_VINCENT,
        "tiza": ELEVENLABS_VOICE_ID_TIZA,
    }
    
    voice_id = voice_id_map.get(voice.lower())
    
    if not voice_id:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid voice '{voice}'. Must be one of: delilah, vincent, tiza"
        )
    
    if not ELEVENLABS_API_KEY:
        raise HTTPException(
            status_code=500,
            detail="ElevenLabs API key not configured. Please set ELEVENLABS_API_KEY in environment variables."
        )
    
    url = f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}"
    
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

    # Read CSV and ensure 'night' column stays as string to avoid date conversion issues
    df = pd.read_csv(file_path, dtype={'night': str})
    # Ensure night column is in YYYY-MM-DD format (first 10 chars)
    df['night'] = df['night'].astype(str).str[:10]
    
    # Sort by date to ensure most recent is last
    try:
        df['_night_datetime'] = pd.to_datetime(df['night'], format='%Y-%m-%d', errors='coerce')
        df = df.sort_values('_night_datetime').reset_index(drop=True)
        df = df.drop(columns=['_night_datetime'])
        # Ensure night is still string format
        df['night'] = df['night'].astype(str).str[:10]
    except Exception as e:
        print(f"Warning: Could not sort by date: {e}")
        # Keep data as-is if sorting fails
    
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


@app.post("/sleep/{username}/log")
def log_sleep(username: str, sleep_entry: SleepLogEntry):
    """
    Logs or updates a sleep entry for the given user.
    If an entry for the same date already exists, it will be updated.
    Otherwise, a new entry will be added.
    Creates the file if it doesn't exist.
    
    Required fields:
    - night: Date of the night (e.g., '2025-01-15')
    - TotalSleepHours: Total sleep hours
    
    All other fields (AsleepUnspecified, Awake, Core, Deep, InBed, REM) default to 0.0 if not provided.
    
    Expected CSV columns (in order): night, AsleepUnspecified, Awake, Core, Deep, InBed, REM, TotalSleepHours
    """
    file_path = DATA_DIR / f"sleep_by_night_{username}.csv"
    
    # Define column order to match existing CSV format
    column_order = ["night", "AsleepUnspecified", "Awake", "Core", "Deep", "InBed", "REM", "TotalSleepHours"]
    
    # Prepare the new row as a dictionary
    new_row = {
        "night": sleep_entry.night,
        "AsleepUnspecified": sleep_entry.AsleepUnspecified,
        "Awake": sleep_entry.Awake,
        "Core": sleep_entry.Core,
        "Deep": sleep_entry.Deep,
        "InBed": sleep_entry.InBed,
        "REM": sleep_entry.REM,
        "TotalSleepHours": sleep_entry.TotalSleepHours
    }
    
    try:
        # Check if file exists
        if file_path.exists():
            # Read existing CSV
            df = pd.read_csv(file_path)
            
            # Ensure we have the night column as string for comparison
            # Normalize dates to YYYY-MM-DD format (first 10 characters)
            df['night'] = df['night'].astype(str).str[:10]
            
            # Check if an entry for this date already exists
            # Normalize both dates to string format for comparison (YYYY-MM-DD only)
            entry_date_str = str(sleep_entry.night)[:10]  # Take only date part, no time
            existing_mask = df['night'] == entry_date_str
            
            if existing_mask.any():
                # Update existing row(s) - if multiple exist, update all (shouldn't happen, but handle it)
                matching_indices = df[existing_mask].index
                if len(matching_indices) > 1:
                    # If duplicates exist, keep only the first one and update it
                    print(f"Warning: Found {len(matching_indices)} entries for date {entry_date_str}, removing duplicates")
                    df = df[~existing_mask | (df.index == matching_indices[0])]
                    existing_mask = df.index == matching_indices[0]
                
                # Update the row
                for col in new_row.keys():
                    if col in df.columns:
                        df.loc[existing_mask, col] = new_row[col]
                action = "updated"
            else:
                # Append new row
                new_df = pd.DataFrame([new_row])
                df = pd.concat([df, new_df], ignore_index=True)
                action = "added"
        else:
            # Create new DataFrame with the entry
            df = pd.DataFrame([new_row])
            action = "added"
        
        # Ensure columns are in the correct order
        df = df[column_order]
        
        # Sort by date to keep data organized
        # Convert to datetime for sorting, then back to string format
        # Use format='%Y-%m-%d' to avoid timezone issues
        try:
            # Store original night values as strings
            df['night'] = df['night'].astype(str)
            # Convert to datetime for sorting - use format to avoid timezone conversion
            df['_night_datetime'] = pd.to_datetime(df['night'], format='%Y-%m-%d', errors='coerce')
            # Sort by datetime
            df = df.sort_values('_night_datetime').reset_index(drop=True)
            # Drop the temporary datetime column
            df = df.drop(columns=['_night_datetime'])
            # Convert back to string format, preserving YYYY-MM-DD exactly
            # Extract just the date part to avoid any timezone shifts
            df['night'] = df['night'].astype(str).str[:10]  # Take first 10 chars (YYYY-MM-DD)
        except Exception as date_error:
            # If date sorting fails, just keep the data as-is but log the error
            print(f"Warning: Date sorting failed: {date_error}")
            import traceback
            print(traceback.format_exc())
            # Ensure night is still a string in YYYY-MM-DD format
            df['night'] = df['night'].astype(str).str[:10]
        
        # Save to CSV - ensure we're writing to the correct path
        print(f"Writing to CSV file: {file_path}")
        print(f"DataFrame shape: {df.shape}")
        print(f"DataFrame columns: {df.columns.tolist()}")
        df.to_csv(file_path, index=False)
        print(f"Successfully wrote to {file_path}")
        
        return {
            "message": f"Sleep entry {action} successfully for {username}",
            "night": sleep_entry.night,
            "total_sleep_hours": sleep_entry.TotalSleepHours,
            "action": action
        }
    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        print(f"Error in log_sleep: {e}")
        print(f"Traceback: {error_trace}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to log sleep entry: {str(e)}"
        )


# --- AI Coach Endpoints ---

@app.get('/generate_schedule/{username}')
async def generate_schedule(username: str):
    """
    Reads CSV file for the given username, analyzes the sleep data (comparing most recent week),
    creates a prompt, requests structured JSON from Gemini, and returns:
    - daily_tip: A general tip on how to improve sleep
    - weekly_insight: Assessment and score comparing the most recent week's sleep data
    - daily_schedule: 3-4 actionable items throughout the day with SPECIFIC CLOCK TIMES to benefit sleep
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
        
        # Sort by date to get most recent data first (assuming 'night' column is date)
        df['night'] = pd.to_datetime(df['night'])
        df = df.sort_values('night', ascending=False).reset_index(drop=True)
        
        # Get the most recent day (latest day)
        if len(df) == 0:
            raise ValueError("No sleep data available")
        
        latest_day = df.iloc[0]
        latest_date = latest_day['night']
        latest_sleep = latest_day['TotalSleepHours']
        latest_in_bed = latest_day['InBed']
        latest_efficiency = (latest_sleep / latest_in_bed * 100) if latest_in_bed > 0 else 0
        
        # Find the day from approximately 7 days ago
        # Look for the closest day to 7 days before the latest day
        target_date = latest_date - pd.Timedelta(days=7)
        week_ago_day = None
        week_ago_sleep = None
        week_ago_in_bed = None
        week_ago_efficiency = None
        week_ago_date = None
        
        # Find the closest day to 7 days ago (within 3 days range)
        for idx, row in df.iterrows():
            days_diff = abs((row['night'] - target_date).days)
            if days_diff <= 3:  # Allow 3 days tolerance
                week_ago_day = row
                week_ago_date = row['night']
                week_ago_sleep = row['TotalSleepHours']
                week_ago_in_bed = row['InBed']
                week_ago_efficiency = (week_ago_sleep / week_ago_in_bed * 100) if week_ago_in_bed > 0 else 0
                break
        
        # Calculate percentage change (positive = better, negative = worse)
        # Use a composite score based on sleep duration and efficiency
        if week_ago_day is not None:
            # Calculate a simple sleep quality score (0-100) for comparison
            # Weight: 60% sleep duration (target 7.5-8.5 hours), 40% efficiency (target >85%)
            def calculate_sleep_score(sleep_hours, efficiency):
                # Sleep duration score (0-60 points)
                if sleep_hours >= 7.5 and sleep_hours <= 8.5:
                    duration_score = 60  # Perfect range
                elif sleep_hours < 7.5:
                    duration_score = max(0, (sleep_hours / 7.5) * 60)  # Linear scale
                else:  # > 8.5
                    duration_score = max(0, 60 - ((sleep_hours - 8.5) / 2.5) * 20)  # Penalize oversleeping
                
                # Efficiency score (0-40 points)
                efficiency_score = min(40, (efficiency / 85) * 40) if efficiency <= 85 else 40
                
                return duration_score + efficiency_score
            
            latest_score = calculate_sleep_score(latest_sleep, latest_efficiency)
            week_ago_score = calculate_sleep_score(week_ago_sleep, week_ago_efficiency)
            
            # Calculate percentage change
            if week_ago_score > 0:
                percentage_change = ((latest_score - week_ago_score) / week_ago_score) * 100
            else:
                percentage_change = 0 if latest_score == 0 else 100
            
            comparison_available = True
        else:
            # No data from 7 days ago available
            percentage_change = 0.0
            comparison_available = False
        
        # Calculate key metrics for all data
        avg_sleep_duration = df['TotalSleepHours'].mean()
        avg_time_in_bed = df['InBed'].mean()
        
        # Calculate average awake time (approximate: TimeInBed - TotalSleepHours)
        df['AwakeTime'] = df['InBed'] - df['TotalSleepHours']
        avg_awake_time = df['AwakeTime'].mean() if not df['AwakeTime'].empty else 0
        
        # Calculate sleep efficiency (Ratio of time slept to total time in bed)
        sleep_efficiency = (avg_sleep_duration / avg_time_in_bed) * 100 if avg_time_in_bed > 0 else 0

        # Get the most recent week (last 7 days with data) for context
        recent_week = df.head(7).copy()
        recent_week_sleep = recent_week['TotalSleepHours'].mean()
        recent_week_in_bed = recent_week['InBed'].mean()
        recent_week['AwakeTime'] = recent_week['InBed'] - recent_week['TotalSleepHours']
        recent_week_awake = recent_week['AwakeTime'].mean() if not recent_week['AwakeTime'].empty else 0
        recent_week_efficiency = (recent_week_sleep / recent_week_in_bed) * 100 if recent_week_in_bed > 0 else 0

        # Create a summary of the user's sleep profile
        if comparison_available:
            change_status = 'improved' if percentage_change > 0 else 'worsened' if percentage_change < 0 else 'unchanged'
            comparison_text = f"""
        DAY-TO-DAY COMPARISON:
        - Latest Day ({latest_date.strftime('%Y-%m-%d')}): {latest_sleep:.2f} hours sleep, {latest_efficiency:.1f}% efficiency
        - Week Ago ({week_ago_date.strftime('%Y-%m-%d')}): {week_ago_sleep:.2f} hours sleep, {week_ago_efficiency:.1f}% efficiency
        - Change: {percentage_change:+.1f}% ({change_status})
        """
        else:
            comparison_text = f"""
        DAY-TO-DAY COMPARISON:
        - Latest Day ({latest_date.strftime('%Y-%m-%d')}): {latest_sleep:.2f} hours sleep, {latest_efficiency:.1f}% efficiency
        - Week Ago: No data available for comparison (need at least 7 days of historical data)
        """
        
        sleep_profile = f"""
        USER SLEEP PROFILE ANALYSIS (based on the last {len(df)} nights of Apple Watch data):
        - Average Total Sleep Duration: {avg_sleep_duration:.2f} hours (Target 7.5 to 8.5 hours).
        - Average Time Awake During Night (Approx): {avg_awake_time:.2f} hours.
        - Average Time in Bed: {avg_time_in_bed:.2f} hours.
        - Sleep Efficiency: {sleep_efficiency:.1f}% (Target >85%).
        
        MOST RECENT WEEK ANALYSIS (last 7 days):
        - Average Total Sleep Duration: {recent_week_sleep:.2f} hours.
        - Average Time Awake During Night: {recent_week_awake:.2f} hours.
        - Average Time in Bed: {recent_week_in_bed:.2f} hours.
        - Sleep Efficiency: {recent_week_efficiency:.1f}%.
        {comparison_text}
        """
        
        # --- PHASE 2: AI Prompt Construction and Structured API Call ---

        # 1. Create the detailed user query for the AI
        user_query = f"""
        Analyze the following sleep profile data:
        {sleep_profile}

        Based on this data, generate a personalized sleep improvement response with three components:

        1. DAILY TIP: Provide one general, helpful tip on how to improve sleep (keep it brief, 1-2 sentences).

        2. WEEKLY INSIGHT: Compare the latest day to the day from 7 days ago and provide insight:
           - The comparison data above shows the calculated percentage change (already calculated)
           - Use the percentage_change value from the comparison data in your response
           - Assess whether the sleep has improved, worsened, or stayed the same based on the percentage
           - Provide a brief insight about what this comparison means for the user's sleep
           - If the comparison shows "No data available", set percentage_change to 0 and note that in the insight

        3. DAILY SCHEDULE: Provide exactly 4 actionable items that are scheduled with **SPECIFIC CLOCK TIMES** throughout the day to benefit sleep. Use the average sleep duration and efficiency to calculate the best times for the user to implement these actions.
           - The actions must be sequenced from morning to night.
           - The specific times must be realistic (e.g., 7:15 AM, 2:30 PM, 7:00 PM, 10:30 PM).
           - All steps must use items/resources available in a typical home (no special equipment, apps, or purchases needed).
           - Each action should be:
             * Clear and specific (e.g., "Stop drinking coffee after 2:00 PM" not "Limit caffeine")
             * Actionable with a specific time (e.g., "Turn off all screens at 10:15 PM" not "Reduce screen time")
             * Easy to understand without sleep expertise
             * Practical and immediately implementable
        
        Examples of good daily_schedule items with specific times:
        - "7:15 AM: Get 15 minutes of natural sunlight (look outside a window or step onto a balcony/yard)."
        - "2:30 PM: Stop drinking any caffeinated beverages for the rest of the day."
        - "7:00 PM: Stop eating any large meals. Only have light snacks, if necessary."
        - "10:30 PM: Turn off your phone, TV, and computer and begin your wind-down routine (e.g., read a physical book)."
        
        Keep all responses concise and actionable.
        """

        # 2. Define the system instruction (Sleep Coach Persona)
        system_instruction = {
            "parts": [{ "text": "You are an expert Sleep Wellness Coach who explains things simply. Your task is to analyze the provided sleep data and generate: (1) a daily tip, (2) weekly insight with assessment and score, and (3) a concise daily schedule with 4 actions, each tied to a SPECIFIC CLOCK TIME. All steps must be easily done at home with no special equipment. Write as if explaining to someone who has never researched sleep before. You must strictly adhere to the requested JSON format." }]
        }
        
        # 3. Define the structured output configuration (using a Gemini-compatible schema)
        # Note: The daily_schedule description is updated to reflect the new time requirement.
        gemini_schema = {
            "type": "object",
            "properties": {
                "daily_tip": {
                    "type": "string",
                    "description": "A general daily tip on how to improve sleep (1-2 sentences)."
                },
                "weekly_insight": {
                    "type": "object",
                    "properties": {
                        "assessment": {
                            "type": "string",
                            "description": "Assessment of the change (e.g., 'improved', 'worsened', 'unchanged')."
                        },
                        "insight": {
                            "type": "string",
                            "description": "Brief insight comparing the latest day to the day from the prior week."
                        },
                        "percentage_change": {
                            "type": "number",
                            "description": "Percentage change in sleep quality (positive = better, negative = worse). Use 0 if no comparison data available."
                        }
                    },
                    "required": ["assessment", "insight", "percentage_change"],
                    "description": "Insight comparing the latest day to the day from 7 days ago."
                },
                "daily_schedule": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "Exactly 4 actionable items, each beginning with a SPECIFIC CLOCK TIME (e.g., '7:00 AM:')."
                }
            },
            "required": ["daily_tip", "weekly_insight", "daily_schedule"]
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
            
            # Parse the JSON response
            result = json.loads(raw_json_string)
            
            # Inject the calculated percentage_change to ensure accuracy
            if 'weekly_insight' in result:
                # The percentage_change is calculated server-side for accuracy
                result['weekly_insight']['percentage_change'] = round(percentage_change, 2)
            
            # FastAPI will automatically validate and serialize this JSON
            return result

    except ValueError as ve:
        # Handle custom validation errors (like missing columns or no data)
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
        
        # Convert to speech using ElevenLabs with selected voice
        audio_bytes = await tts_with_elevenlabs(script, req.voice)
        
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
