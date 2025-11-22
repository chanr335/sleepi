import pandas as pd
import numpy as np
from pathlib import Path
from datetime import date, timedelta

# Get paths
SCRIPT_DIR = Path(__file__).parent
PROJECT_ROOT = SCRIPT_DIR.parent
OUTPUT_DIR = PROJECT_ROOT / "data" / "parsed"

# Names for the 5 new files
names = ["alex", "sarah", "mike", "jessica", "david"]

def generate_sleep_data(name, start_date, num_days=365):
    """
    Generate realistic sleep data for a person.
    """
    dates = []
    data = []
    
    current_date = start_date
    for i in range(num_days):
        # Skip some days randomly (not everyone sleeps every night)
        if np.random.random() < 0.05:  # 5% chance of missing a night
            current_date += timedelta(days=1)
            continue
        
        # Generate realistic sleep patterns
        # InBed: typically 6-10 hours
        in_bed = np.random.normal(7.5, 1.0)
        in_bed = max(4.0, min(12.0, in_bed))
        
        # Sleep stages (should sum to less than InBed)
        # Core sleep: 40-60% of total sleep
        core = np.random.normal(0.5 * in_bed, 0.3)
        core = max(0, min(in_bed * 0.7, core))
        
        # Deep sleep: 10-20% of total sleep
        deep = np.random.normal(0.15 * in_bed, 0.1)
        deep = max(0, min(in_bed * 0.25, deep))
        
        # REM sleep: 20-25% of total sleep
        rem = np.random.normal(0.22 * in_bed, 0.08)
        rem = max(0, min(in_bed * 0.3, rem))
        
        # Awake time: small amount
        awake = np.random.exponential(0.2)
        awake = max(0, min(in_bed * 0.1, awake))
        
        # AsleepUnspecified: remainder
        total_sleep = core + deep + rem
        asleep_unspecified = max(0, in_bed - total_sleep - awake)
        
        # Ensure TotalSleepHours matches
        total_sleep_hours = core + deep + rem + asleep_unspecified
        
        data.append({
            "night": current_date,
            "AsleepUnspecified": round(asleep_unspecified, 6),
            "Awake": round(awake, 6),
            "Core": round(core, 6),
            "Deep": round(deep, 6),
            "InBed": round(in_bed, 6),
            "REM": round(rem, 6),
            "TotalSleepHours": round(total_sleep_hours, 6)
        })
        
        current_date += timedelta(days=1)
    
    return pd.DataFrame(data)

# Generate data for each person with different start dates and patterns
np.random.seed(42)  # For reproducibility

start_dates = [
    date(2021, 1, 1),  # alex
    date(2020, 6, 15),  # sarah
    date(2022, 3, 10),  # mike
    date(2021, 9, 1),   # jessica
    date(2020, 11, 20), # david
]

for name, start_date in zip(names, start_dates):
    print(f"Generating data for {name}...")
    df = generate_sleep_data(name, start_date, num_days=400)
    
    output_path = OUTPUT_DIR / f"sleep_by_night_{name}.csv"
    df.to_csv(output_path, index=False)
    print(f"Created {output_path} with {len(df)} nights of data")

print("\nDone! Generated 5 new sleep data files.")

