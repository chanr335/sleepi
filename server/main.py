from fastapi import FastAPI, HTTPException
import pandas as pd
from pathlib import Path

app = FastAPI()

# folder where CSVs exist
DATA_DIR = Path(__file__).resolve().parent.parent / "data" / "parsed"

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
