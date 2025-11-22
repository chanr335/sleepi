import os
import json
import httpx
import pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
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
