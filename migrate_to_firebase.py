#!/usr/bin/env python3
"""
Data Migration Script: CSV to Firebase Firestore
Migrates missing persons data from CSV to Firebase Firestore database.
"""

import csv
import json
import requests
import time
from datetime import datetime
from typing import Dict, List, Optional

# Configuration
FIREBASE_PROJECT_ID = "save-them-now"
COLLECTION_NAME = "missing_persons"
CSV_FILE_PATH = "missing-persons.csv"
BATCH_SIZE = 500  # Process records in batches
DELAY_BETWEEN_BATCHES = 1  # Seconds between batches to avoid rate limiting

# Firebase REST API endpoint
FIRESTORE_URL = f"https://firestore.googleapis.com/v1/projects/{FIREBASE_PROJECT_ID}/databases/(default)/documents/{COLLECTION_NAME}"

class MissingPersonMigrator:
    def __init__(self):
        self.processed_count = 0
        self.error_count = 0
        self.skipped_count = 0
        self.geocache = self.load_geocache()

    def load_geocache(self) -> Dict[str, Dict[str, float]]:
        """Load geocoding cache if available."""
        try:
            # Try to load existing geocache
            # This would be from your existing geocoding system
            return {}
        except Exception as e:
            print(f"Could not load geocache: {e}")
            return {}

    def parse_age_to_int(self, age_text: str) -> Optional[int]:
        """Parse age text to integer."""
        if not age_text:
            return None
        
        digits = ''.join(filter(str.isdigit, age_text))
        try:
            return int(digits) if digits else None
        except ValueError:
            return None

    def map_csv_row_to_firestore_doc(self, row: Dict[str, str], index: int) -> Dict:
        """Convert CSV row to Firestore document format."""
        case_number = row.get('Case Number', '').strip().replace('"', '')
        dlc = row.get('DLC', '').strip()
        first_name = row.get('Legal First Name', '').strip()
        last_name = row.get('Legal Last Name', '').strip()
        city = row.get('City', '').strip()
        state = row.get('State', '').strip()
        county = row.get('County', '').strip()
        age_text = row.get('Missing Age', '').strip()
        sex = row.get('Biological Sex', '').strip()
        ethnicity = row.get('Race / Ethnicity', '').strip()
        date_modified = row.get('Date Modified', '').strip()

        age = self.parse_age_to_int(age_text)
        category = 'Missing Children' if age and age < 18 else 'Missing Adults'
        
        # Check geocache for coordinates
        cache_key = f"{city},{state}".lower()
        latitude = None
        longitude = None
        
        if cache_key in self.geocache:
            latitude = self.geocache[cache_key].get('lat')
            longitude = self.geocache[cache_key].get('lon')

        location = ', '.join(filter(None, [city, county, state, 'USA']))
        full_name = ' '.join(filter(None, [first_name, last_name]))

        # Create Firestore document
        doc = {
            "fields": {
                "name": {"stringValue": full_name or "Unknown"},
                "caseNumber": {"stringValue": case_number or ""},
                "legalFirstName": {"stringValue": first_name or ""},
                "legalLastName": {"stringValue": last_name or ""},
                "city": {"stringValue": city or ""},
                "state": {"stringValue": state or ""},
                "county": {"stringValue": county or ""},
                "location": {"stringValue": location},
                "age": {"integerValue": str(age) if age else "0"},
                "missingAge": {"stringValue": age_text or ""},
                "gender": {"stringValue": sex or ""},
                "biologicalSex": {"stringValue": sex or ""},
                "ethnicity": {"stringValue": ethnicity or ""},
                "raceEthnicity": {"stringValue": ethnicity or ""},
                "category": {"stringValue": category},
                "status": {"stringValue": "Active"},
                "date": {"stringValue": dlc or ""},
                "dateMissing": {"stringValue": dlc or ""},
                "dateModified": {"stringValue": date_modified or ""},
                "reportedMissing": {"stringValue": f"Reported Missing {dlc}" if dlc else ""},
                "description": {"stringValue": f"Case #{case_number} - {age_text} {sex} from {city}, {state}"},
                "createdAt": {"timestampValue": datetime.utcnow().isoformat() + "Z"},
                "updatedAt": {"timestampValue": datetime.utcnow().isoformat() + "Z"}
            }
        }

        # Add coordinates if available
        if latitude is not None:
            doc["fields"]["latitude"] = {"doubleValue": latitude}
        if longitude is not None:
            doc["fields"]["longitude"] = {"doubleValue": longitude}

        return doc

    def upload_batch_to_firestore(self, batch: List[Dict]) -> bool:
        """Upload a batch of documents to Firestore using REST API."""
        try:
            for doc in batch:
                response = requests.post(
                    FIRESTORE_URL,
                    json=doc,
                    headers={'Content-Type': 'application/json'}
                )
                
                if response.status_code in [200, 201]:
                    self.processed_count += 1
                    if self.processed_count % 100 == 0:
                        print(f"Processed {self.processed_count} records...")
                else:
                    print(f"Error uploading document: {response.status_code} - {response.text}")
                    self.error_count += 1
                    
                # Small delay to avoid rate limiting
                time.sleep(0.1)
                
            return True
            
        except Exception as e:
            print(f"Error uploading batch: {e}")
            self.error_count += len(batch)
            return False

    def migrate_csv_to_firestore(self):
        """Main migration function."""
        print(f"Starting migration from {CSV_FILE_PATH} to Firestore...")
        print(f"Project ID: {FIREBASE_PROJECT_ID}")
        print(f"Collection: {COLLECTION_NAME}")
        print("-" * 50)

        try:
            with open(CSV_FILE_PATH, 'r', encoding='utf-8-sig') as csvfile:
                # Detect delimiter and read CSV
                reader = csv.DictReader(csvfile)
                batch = []
                
                for index, row in enumerate(reader):
                    # Skip empty rows
                    if not any(row.values()):
                        self.skipped_count += 1
                        continue
                    
                    # Convert row to Firestore document
                    doc = self.map_csv_row_to_firestore_doc(row, index)
                    batch.append(doc)
                    
                    # Process batch when it reaches the batch size
                    if len(batch) >= BATCH_SIZE:
                        print(f"Processing batch {len(batch)} records...")
                        self.upload_batch_to_firestore(batch)
                        batch = []
                        
                        # Delay between batches
                        if DELAY_BETWEEN_BATCHES > 0:
                            time.sleep(DELAY_BETWEEN_BATCHES)
                
                # Process remaining records
                if batch:
                    print(f"Processing final batch of {len(batch)} records...")
                    self.upload_batch_to_firestore(batch)

        except FileNotFoundError:
            print(f"ERROR: CSV file '{CSV_FILE_PATH}' not found!")
            return False
        except Exception as e:
            print(f"ERROR during migration: {e}")
            return False

        # Print summary
        print("\n" + "=" * 50)
        print("MIGRATION SUMMARY")
        print("=" * 50)
        print(f"Total processed: {self.processed_count}")
        print(f"Total errors: {self.error_count}")
        print(f"Total skipped: {self.skipped_count}")
        print(f"Success rate: {(self.processed_count / (self.processed_count + self.error_count) * 100):.1f}%" if (self.processed_count + self.error_count) > 0 else "N/A")
        
        return self.error_count == 0

def main():
    """Main entry point."""
    print("Firebase Firestore Migration Tool")
    print("=" * 40)
    
    migrator = MissingPersonMigrator()
    
    # Confirm before starting
    response = input(f"This will migrate data from '{CSV_FILE_PATH}' to Firebase project '{FIREBASE_PROJECT_ID}'. Continue? (y/N): ")
    if response.lower() != 'y':
        print("Migration cancelled.")
        return
    
    start_time = time.time()
    success = migrator.migrate_csv_to_firestore()
    end_time = time.time()
    
    print(f"\nMigration completed in {end_time - start_time:.2f} seconds")
    
    if success:
        print("✅ Migration completed successfully!")
    else:
        print("❌ Migration completed with errors. Check the logs above.")

if __name__ == "__main__":
    main()