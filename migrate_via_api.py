#!/usr/bin/env python3
"""
Simple Migration Script: Upload CSV data to Firestore via API
Uses the existing fallback API to get CSV data and uploads to Firestore via POST API.
"""

import requests
import json
import time
from datetime import datetime

# Configuration
API_BASE_URL = "http://localhost:3001"
BATCH_SIZE = 50  # Smaller batches for API
DELAY_BETWEEN_BATCHES = 0.5  # Seconds between batches

def get_csv_data(limit=10000, offset=0):
    """Get data from CSV fallback API."""
    try:
        url = f"{API_BASE_URL}/api/missing-persons-fallback"
        params = {
            "limit": limit,
            "offset": offset
        }
        
        response = requests.get(url, params=params)
        response.raise_for_status()
        
        data = response.json()
        return data.get("data", []), data.get("meta", {})
        
    except Exception as e:
        print(f"Error fetching CSV data: {e}")
        return [], {}

def upload_to_firestore(person_data):
    """Upload a single person record to Firestore via API."""
    try:
        url = f"{API_BASE_URL}/api/missing-persons"
        
        # Clean up the data for Firestore
        clean_data = {
            "name": person_data.get("name", ""),
            "caseNumber": person_data.get("caseNumber", ""),
            "legalFirstName": person_data.get("legalFirstName", ""),
            "legalLastName": person_data.get("legalLastName", ""),
            "city": person_data.get("city", ""),
            "state": person_data.get("state", ""),
            "county": person_data.get("county", ""),
            "location": person_data.get("location", ""),
            "age": person_data.get("age", 0),
            "missingAge": person_data.get("missingAge", ""),
            "gender": person_data.get("gender", ""),
            "biologicalSex": person_data.get("biologicalSex", ""),
            "ethnicity": person_data.get("ethnicity", ""),
            "raceEthnicity": person_data.get("raceEthnicity", ""),
            "category": person_data.get("category", "Missing Adults"),
            "status": person_data.get("status", "Active"),
            "date": person_data.get("date", ""),
            "dateMissing": person_data.get("dateMissing", ""),
            "dateModified": person_data.get("dateModified", ""),
            "reportedMissing": person_data.get("reportedMissing", ""),
            "description": person_data.get("description", ""),
            "latitude": person_data.get("latitude"),
            "longitude": person_data.get("longitude")
        }
        
        # Remove None values
        clean_data = {k: v for k, v in clean_data.items() if v is not None}
        
        response = requests.post(url, json=clean_data)
        response.raise_for_status()
        
        return True, response.json()
        
    except Exception as e:
        return False, str(e)

def migrate_data():
    """Main migration function."""
    print("Starting migration from CSV to Firestore via API...")
    print(f"API Base URL: {API_BASE_URL}")
    print("-" * 50)
    
    processed = 0
    errors = 0
    total_records = 10000  # We know from the CSV fallback
    
    # Process in batches
    for offset in range(0, total_records, BATCH_SIZE):
        print(f"Processing batch starting at offset {offset}...")
        
        # Get batch of data from CSV
        data, meta = get_csv_data(limit=BATCH_SIZE, offset=offset)
        
        if not data:
            print(f"No more data at offset {offset}")
            break
        
        # Upload each record to Firestore
        batch_processed = 0
        batch_errors = 0
        
        for person in data:
            success, result = upload_to_firestore(person)
            
            if success:
                batch_processed += 1
                processed += 1
            else:
                batch_errors += 1
                errors += 1
                print(f"Error uploading {person.get('name', 'Unknown')}: {result}")
        
        print(f"Batch complete: {batch_processed} uploaded, {batch_errors} errors")
        print(f"Total progress: {processed}/{total_records} ({(processed/total_records)*100:.1f}%)")
        
        # Rate limiting
        if offset + BATCH_SIZE < total_records:
            time.sleep(DELAY_BETWEEN_BATCHES)
    
    print("\n" + "=" * 50)
    print("MIGRATION SUMMARY")
    print("=" * 50)
    print(f"Total processed: {processed}")
    print(f"Total errors: {errors}")
    print(f"Success rate: {(processed/(processed+errors))*100:.1f}%")
    
    return errors == 0

def main():
    """Main entry point."""
    print("CSV to Firestore Migration via API")
    print("=" * 35)
    
    # Test API connectivity
    try:
        response = requests.get(f"{API_BASE_URL}/api/missing-persons?limit=1")
        response.raise_for_status()
        print("OK - API connectivity verified")
    except Exception as e:
        print(f"ERROR - Cannot connect to API: {e}")
        print("Make sure the Next.js dev server is running on port 3001")
        return
    
    # Check if Firestore already has data
    try:
        response = requests.get(f"{API_BASE_URL}/api/missing-persons?limit=1")
        data = response.json()
        existing_count = len(data.get("data", []))
        
        if existing_count > 0:
            answer = input(f"Firestore already has data. Continue migration? (y/N): ")
            if answer.lower() != 'y':
                print("Migration cancelled.")
                return
    except Exception as e:
        print(f"Warning: Could not check existing data: {e}")
    
    start_time = time.time()
    success = migrate_data()
    end_time = time.time()
    
    print(f"\nMigration completed in {end_time - start_time:.2f} seconds")
    
    if success:
        print("SUCCESS - Migration completed successfully!")
        print("\nNext steps:")
        print("1. Verify data in Firebase Console")
        print("2. Test the application with Firestore data")
        print("3. Apply security rules if needed")
    else:
        print("ERROR - Migration completed with errors. Check the logs above.")

if __name__ == "__main__":
    main()