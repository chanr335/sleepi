import pandas as pd

# 1. Input & output file names
INPUT_CSV = "sleep_data.csv"       # your existing file
OUTPUT_CSV = "sleep_by_night.csv"  # new file we will create

def main():
    # 2. Load the CSV
    df = pd.read_csv(INPUT_CSV)

    # Expecting columns: startDate, endDate, value, sourceName, device
    # 3. Parse the date strings into real datetimes
    df["startDate"] = pd.to_datetime(df["startDate"])
    df["endDate"] = pd.to_datetime(df["endDate"])

    # 4. Compute duration of each record in HOURS
    df["duration_hours"] = (df["endDate"] - df["startDate"]).dt.total_seconds() / 3600.0

    # 5. Map Apple Health values to nicer labels
    mapping = {
        "HKCategoryValueSleepAnalysisInBed": "InBed",
        "HKCategoryValueSleepAnalysisAsleepCore": "Core",
        "HKCategoryValueSleepAnalysisAsleepDeep": "Deep",
        "HKCategoryValueSleepAnalysisAwake": "Awake",
        "HKCategoryValueSleepAnalysisAsleepREM": "REM",
        "HKCategoryValueSleepAnalysisAsleepUnspecified": "AsleepUnspecified",
    }
    df["stage"] = df["value"].map(mapping).fillna(df["value"])

    # 6. Define which "night" each row belongs to
    # Here we use the date of startDate as the night label.
    # Example: start 2025-01-10 23:30 → night = 2025-01-10
    df["night"] = df["startDate"].dt.date

    # 7. Pivot: sum hours per night per sleep stage
    # This creates columns like Core, Deep, REM, Awake, InBed, etc.
    summary = df.pivot_table(
        index="night",
        columns="stage",
        values="duration_hours",
        aggfunc="sum"
    ).fillna(0)

    # 8. Also add a "TotalSleepHours" column (Core + Deep + REM + AsleepUnspecified)
    # You can tweak which stages count as "sleep".
    sleep_stage_cols = [c for c in summary.columns if c in ["Core", "Deep", "REM", "AsleepUnspecified"]]
    summary["TotalSleepHours"] = summary[sleep_stage_cols].sum(axis=1)

    # 9. Reset index so 'night' becomes a normal column
    summary = summary.reset_index()

    # 10. Save to CSV
    summary.to_csv(OUTPUT_CSV, index=False)
    print(f"Done! Wrote nightly sleep breakdown to {OUTPUT_CSV}")

if __name__ == "__main__":
    main()
