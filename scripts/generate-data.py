#!/usr/bin/env python3
"""
Generate optimized JSON data files from Parquet files.

This script reads the station-hourly.parquet and station-hourly-exits.parquet files,
combines entry and exit data, and outputs separate pre-aggregated JSON files for each 
station and line at all aggregation levels (hourly, daily, weekly, monthly).

Run from the root directory: pnpm generate-data
Or directly: python3 scripts/generate-data.py
"""

import polars as pl
import json
import os
import sys
import re
from datetime import timedelta, datetime
import urllib.request
import tempfile

# Line opening dates
DATES = {
    'yellow': {
        'opening_date': '2025-08-11'
    }
}

# Line station lists
LINES = {
    'green': [
        "Madavara", "Chikkabidarakallu", "Manjunathanagara", "Nagasandra",
        "Dasarahalli", "Jalahalli", "Peenya Industry", "Peenya",
        "Goraguntepalya", "Yeshwantpur", "Sandal Soap Factory", "Mahalakshmi",
        "Rajajinagar", "Mahakavi Kuvempu Road", "Srirampura",
        "Mantri Square Sampige Road", "Nadaprabhu Kempegowda Station, Majestic",
        "Chickpete", "Krishna Rajendra Market", "National College", "Lalbagh",
        "South End Circle", "Jayanagar", "Rashtreeya Vidyalaya Road",
        "Banashankari", "Jaya Prakash Nagar", "Yelachenahalli",
        "Konanakunte Cross", "Doddakallasandra", "Vajarahalli",
        "Thalaghattapura", "Silk Institute"
    ],
    'purple': [
        "Challaghatta", "Kengeri", "Kengeri Bus Terminal", "Pattanagere",
        "Jnanabharathi", "Rajarajeshwari Nagar", "Pantharapalya - Nayandahalli",
        "Mysore Road", "Deepanjali Nagar", "Attiguppe", "Vijayanagar",
        "Sri Balagangadharanatha Swamiji Station, Hosahalli", "Magadi Road",
        "Krantivira Sangolli Rayanna Railway Station",
        "Nadaprabhu Kempegowda Station, Majestic",
        "Sir M. Visvesvaraya Stn., Central College",
        "Dr. B. R. Ambedkar Station, Vidhana Soudha", "Cubbon Park",
        "Mahatma Gandhi Road", "Trinity", "Halasuru", "Indiranagar",
        "Swami Vivekananda Road", "Baiyappanahalli", "Benniganahalli",
        "Krishnarajapura", "Singayyanapalya", "Garudacharpalya", "Hoodi",
        "Seetharampalya", "Kundalahalli", "Nallurahalli",
        "Sri Sathya Sai Hospital", "Pattandur Agrahara", "Kadugodi Tree Park",
        "Hopefarm Channasandra", "Whitefield (Kadugodi)"
    ],
    'yellow': [
        "Rashtreeya Vidyalaya Road", "Ragigudda", "Jayadeva Hospital",
        "BTM Layout", "Central Silk Board", "Bommanahalli", "Hongasandra",
        "Kudlu Gate", "Singasandra", "Hosa Road", "Beratena Agrahara",
        "Electronic City", "Infosys Foundation Konappana Agrahara",
        "Huskur Road", "Biocon Hebbagodi", "Delta Electronics Bommasandra"
    ]
}

def sanitize_filename(name):
    """Convert station/line name to safe filename"""
    # Remove special characters and replace spaces with hyphens
    name = re.sub(r'[^\w\s-]', '', name)
    name = re.sub(r'[\s]+', '-', name)
    return name.lower()

def aggregate_hourly(df):
    """Aggregate data by hour - returns list with period (datetime string) and avgRidership"""
    # Group by Date and Hour, sum ridership
    grouped = df.group_by(['Date', 'Hour']).agg(pl.col('Ridership').sum()).sort(['Date', 'Hour'])
    
    # Create datetime string: "YYYY-MM-DD HH:00"
    result = []
    for row in grouped.iter_rows(named=True):
        period = f"{row['Date']} {str(row['Hour']).zfill(2)}:00"
        result.append({
            'p': period,  # period
            'r': int(row['Ridership'])  # avgRidership (for hourly it's just the sum)
        })
    
    return result

def aggregate_daily(df):
    """Aggregate data by day - returns list with period (date string) and total ridership"""
    # Group by Date, sum ridership across all hours
    grouped = df.group_by('Date').agg(pl.col('Ridership').sum()).sort('Date')
    
    result = []
    for row in grouped.iter_rows(named=True):
        result.append({
            'p': row['Date'],  # period
            'r': int(row['Ridership'])  # total ridership for the day
        })
    
    return result

def aggregate_weekly(df):
    """Aggregate data by week (Monday-Sunday) - returns list with period and total ridership"""
    # Convert Date to datetime and get week start (Monday)
    df_with_week = df.with_columns([
        pl.col('Date').str.strptime(pl.Date, '%Y-%m-%d')
        .dt.truncate('1w')
        .dt.strftime('%Y-%m-%d')
        .alias('WeekStart')
    ])
    
    # Group by week, sum ridership
    grouped = df_with_week.group_by('WeekStart').agg(pl.col('Ridership').sum()).sort('WeekStart')
    
    result = []
    for row in grouped.iter_rows(named=True):
        result.append({
            'p': row['WeekStart'],  # period
            'r': int(row['Ridership'])  # total ridership for the week
        })
    
    return result

def aggregate_monthly(df):
    """Aggregate data by month - returns list with period (YYYY-MM) and total ridership"""
    # Convert Date to datetime and extract month
    df_with_month = df.with_columns([
        pl.col('Date').str.strptime(pl.Date, '%Y-%m-%d')
        .dt.strftime('%Y-%m')
        .alias('Month')
    ])
    
    # Group by month, sum ridership
    grouped = df_with_month.group_by('Month').agg(pl.col('Ridership').sum()).sort('Month')
    
    result = []
    for row in grouped.iter_rows(named=True):
        result.append({
            'p': row['Month'],  # period
            'r': int(row['Ridership'])  # total ridership for the month
        })
    
    return result

def download_file(url, filename):
    """Download a file from GitHub and return the path to the downloaded file"""
    print(f"   Downloading {filename}...")
    try:
        temp_file = os.path.join(tempfile.gettempdir(), filename)
        urllib.request.urlretrieve(url, temp_file)
        print(f"   ✓ Downloaded {filename}")
        return temp_file
    except Exception as e:
        print(f"❌ Error downloading {filename}: {e}")
        sys.exit(1)

def main():
    # Get the repository root
    script_dir = os.path.dirname(os.path.abspath(__file__))
    output_dir = os.path.join('static', 'data')
    
    # GitHub raw URLs
    base_url = 'https://raw.githubusercontent.com/Vonter/bmrcl-ridership-hourly/main/data'
    entry_url = f'{base_url}/station-hourly.parquet'
    exit_url = f'{base_url}/station-hourly-exits.parquet'
    
    print("🚇 BMRCL Ridership Data Generator")
    print("=" * 50)
    print(f"📂 Downloading Parquet files from GitHub...")
    
    # Download parquet files
    entry_path = download_file(entry_url, 'station-hourly.parquet')
    exit_path = download_file(exit_url, 'station-hourly-exits.parquet')
    
    print(f"\n📂 Reading Parquet files...")
    
    # Read parquet files
    entry_df = pl.read_parquet(entry_path)
    exit_df = pl.read_parquet(exit_path)
    
    print(f"   Entry records: {len(entry_df):,}")
    print(f"   Exit records: {len(exit_df):,}")
    
    # Combine entry and exit data for station-level statistics
    print(f"\n🔄 Combining entry and exit data for stations...")
    combined = pl.concat([entry_df, exit_df])
    
    # Group by Date, Hour, Station and sum ridership (entries + exits)
    result = combined.group_by(['Date', 'Hour', 'Station']).agg(
        pl.col('Ridership').sum()
    ).with_columns([
        pl.col('Ridership').cast(pl.Int64),
        pl.col('Hour').cast(pl.Int64)
    ])
    
    print(f"   Combined records: {len(result):,}")
    
    # Prepare entry-only data for line-level statistics
    print(f"\n🚪 Preparing entry-only data for lines...")
    entry_only = entry_df.group_by(['Date', 'Hour', 'Station']).agg(
        pl.col('Ridership').sum()
    ).with_columns([
        pl.col('Ridership').cast(pl.Int64),
        pl.col('Hour').cast(pl.Int64)
    ])
    
    print(f"   Entry-only records: {len(entry_only):,}")
    
    # Get metadata
    stations = sorted(result['Station'].unique().to_list())
    dates = sorted(result['Date'].unique().to_list())
    
    # Ensure output directory exists
    os.makedirs(output_dir, exist_ok=True)
    os.makedirs(os.path.join(output_dir, 'stations'), exist_ok=True)
    os.makedirs(os.path.join(output_dir, 'lines'), exist_ok=True)
    
    # Write metadata file
    print(f"\n📝 Writing metadata file...")
    metadata = {
        'stations': stations,
        'lines': list(LINES.keys()),
        'minDate': dates[0],
        'maxDate': dates[-1]
    }
    
    metadata_path = os.path.join(output_dir, 'metadata.json')
    with open(metadata_path, 'w') as f:
        json.dump(metadata, f, separators=(',', ':'))
    
    print(f"   ✓ Metadata written")
    
    # Generate station files with all aggregation levels
    print(f"\n📦 Generating station files (pre-aggregated)...")
    total_station_size = 0
    aggregation_types = ['hourly', 'daily', 'weekly', 'monthly']
    
    for station in stations:
        station_data = result.filter(pl.col('Station') == station)
        
        # Generate all aggregations
        aggregations = {
            'hourly': aggregate_hourly(station_data),
            'daily': aggregate_daily(station_data),
            'weekly': aggregate_weekly(station_data),
            'monthly': aggregate_monthly(station_data)
        }
        
        # Save to file
        filename = f"station-{sanitize_filename(station)}.json"
        filepath = os.path.join(output_dir, 'stations', filename)
        
        with open(filepath, 'w') as f:
            json.dump(aggregations, f, separators=(',', ':'))
        
        file_size = os.path.getsize(filepath)
        total_station_size += file_size
    
    print(f"   ✓ Generated {len(stations)} station files ({total_station_size / 1024:.0f} KB total)")
    print(f"      Each file contains: {', '.join(aggregation_types)} aggregations")
    
    # Generate line files with all aggregation levels (using entry-only data)
    print(f"\n📦 Generating line files (pre-aggregated, entry-only)...")
    total_line_size = 0
    
    for line_name, line_stations in LINES.items():
        # Filter for stations on this line (using entry-only data)
        line_data = entry_only.filter(pl.col('Station').is_in(line_stations))
        
        # Filter by opening date if specified for this line
        if line_name in DATES and 'opening_date' in DATES[line_name]:
            opening_date = DATES[line_name]['opening_date']
            line_data = line_data.filter(pl.col('Date') >= opening_date)
        
        # For line aggregations, we need to sum across all stations in the line
        line_summed = line_data.group_by(['Date', 'Hour']).agg(
            pl.col('Ridership').sum()
        )
        
        # Generate all aggregations
        aggregations = {
            'hourly': aggregate_hourly(line_summed),
            'daily': aggregate_daily(line_summed),
            'weekly': aggregate_weekly(line_summed),
            'monthly': aggregate_monthly(line_summed)
        }
        
        # Save to file
        filename = f"line-{line_name}.json"
        filepath = os.path.join(output_dir, 'lines', filename)
        
        with open(filepath, 'w') as f:
            json.dump(aggregations, f, separators=(',', ':'))
        
        file_size = os.path.getsize(filepath)
        total_line_size += file_size
        
        # Calculate total records across all aggregations
        total_records = sum(len(agg) for agg in aggregations.values())
        print(f"   ✓ {line_name.capitalize()} Line: {total_records:,} total records ({file_size / 1024:.0f} KB)")
    
    print(f"   ✓ Generated {len(LINES)} line files ({total_line_size / 1024:.0f} KB total)")
    print(f"      Each file contains: {', '.join(aggregation_types)} aggregations")
    
    # Print final statistics
    total_size = os.path.getsize(metadata_path) + total_station_size + total_line_size
    
    print(f"\n✅ Successfully generated all data files")
    print("=" * 50)
    print(f"   Original records: {len(result):,}")
    print(f"   Date range: {dates[0]} to {dates[-1]}")
    print(f"   Stations: {len(stations)}")
    print(f"   Lines: {len(LINES)}")
    print(f"   Aggregation levels: {len(aggregation_types)} ({', '.join(aggregation_types)})")
    print(f"   Total size: {total_size / 1024:.0f} KB ({total_size / (1024 * 1024):.2f} MB)")
    print(f"   Output directory: {output_dir}")
    print()
    
    # Clean up temporary files
    try:
        os.remove(entry_path)
        os.remove(exit_path)
        print("   🧹 Cleaned up temporary files")
    except Exception:
        pass

if __name__ == "__main__":
    main()

