#!/usr/bin/env python3
"""
Direct Firebase REST API Migration Script
Migrates CSV data directly to Firebase Firestore using REST API without service account.
"""

import csv
import json
import requests
import time
from datetime import datetime
from typing import Dict, List, Optional

# Configuration
FIREBASE_PROJECT_ID = "save-them-now"
CSV_FILE_PATH = "missing-persons.csv"
BATCH_SIZE = 50  # Smaller batches for better reliability
DELAY_BETWEEN_BATCHES = 1  # Seconds between batches

# Firebase REST API endpoint
FIRESTORE_URL = f"https://firestore.googleapis.com/v1/projects/{FIREBASE_PROJECT_ID}/databases/(default)/documents/missing_persons"

class DirectFirebaseMigrator:
    def __init__(self):
        self.processed_count = 0
        self.error_count = 0
        self.skipped_count = 0

    def parse_age_to_int(self, age_text: str) -> Optional[int]:
        """Parse age text to integer."""
        if not age_text:
            return None
        
        digits = ''.join(filter(str.isdigit, age_text))
        try:
            return int(digits) if digits else None
        except ValueError:
            return None

    def convert_to_firestore_value(self, value):
        """Convert Python value to Firestore value format."""
        if value is None:
            return {"nullValue": None}
        elif isinstance(value, str):
            return {"stringValue": value}
        elif isinstance(value, int):
            return {"integerValue": str(value)}
        elif isinstance(value, float):
            return {"doubleValue": value}
        elif isinstance(value, bool):
            return {"booleanValue": value}
        elif isinstance(value, datetime):
            return {"timestampValue": value.isoformat() + "Z"}
        else:
            return {"stringValue": str(value)}

    def map_csv_row_to_document(self, row: Dict[str, str], index: int) -> Dict:
        """Convert CSV row to Firestore document."""
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
        
        location = ', '.join(filter(None, [city, county, state, 'USA']))
        full_name = ' '.join(filter(None, [first_name, last_name]))

        # Create document data in Firestore format
        doc_data = {
            "fields": {
                "name": self.convert_to_firestore_value(full_name or "Unknown"),
                "caseNumber": self.convert_to_firestore_value(case_number),
                "legalFirstName": self.convert_to_firestore_value(first_name),
                "legalLastName": self.convert_to_firestore_value(last_name),
                "city": self.convert_to_firestore_value(city),
                "state": self.convert_to_firestore_value(state),
                "county": self.convert_to_firestore_value(county),
                "location": self.convert_to_firestore_value(location),
                "age": self.convert_to_firestore_value(age or 0),
                "missingAge": self.convert_to_firestore_value(age_text),
                "gender": self.convert_to_firestore_value(sex),
                "biologicalSex": self.convert_to_firestore_value(sex),
                "ethnicity": self.convert_to_firestore_value(ethnicity),
                "raceEthnicity": self.convert_to_firestore_value(ethnicity),
                "category": self.convert_to_firestore_value(category),
                "status": self.convert_to_firestore_value("Active"),
                "date": self.convert_to_firestore_value(dlc),
                "dateMissing": self.convert_to_firestore_value(dlc),
                "dateModified": self.convert_to_firestore_value(date_modified),
                "reportedMissing": self.convert_to_firestore_value(f"Reported Missing {dlc}" if dlc else ""),
                "description": self.convert_to_firestore_value(f"Case #{case_number} - {age_text} {sex} from {city}, {state}"),
                "createdAt": self.convert_to_firestore_value(datetime.utcnow()),
                "updatedAt": self.convert_to_firestore_value(datetime.utcnow())
            }
        }

        return doc_data

    def upload_document_to_firestore(self, doc_data: Dict, doc_id: str) -> bool:
        """Upload a document to Firestore using REST API."""
        try:
            url = f"{FIRESTORE_URL}/{doc_id}"
            headers = {
                "Content-Type": "application/json"
            }
            
            response = requests.patch(url, json=doc_data, headers=headers, timeout=30)
            
            if response.status_code in [200, 201]:
                return True
            else:
                print(f"Error uploading document {doc_id}: HTTP {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            print(f"Exception uploading document {doc_id}: {e}")
            return False

    def migrate_csv_to_firestore(self):
        """Main migration function."""
        print(f"Starting direct Firebase migration from {CSV_FILE_PATH}...")
        print(f"Target: {FIRESTORE_URL}")
        print("-" * 60)

        try:
            with open(CSV_FILE_PATH, 'r', encoding='utf-8-sig') as csvfile:
                reader = csv.DictReader(csvfile)
                batch_data = []
                
                for index, row in enumerate(reader):
                    # Skip empty rows
                    if not any(row.values()):
                        self.skipped_count += 1
                        continue
                    
                    # Convert row to Firestore document
                    doc_data = self.map_csv_row_to_document(row, index)
                    doc_id = f"person_{index + 1:06d}"
                    
                    batch_data.append((doc_data, doc_id))
                    
                    # Process batch when it reaches the batch size
                    if len(batch_data) >= BATCH_SIZE:
                        self.process_batch(batch_data)
                        batch_data = []
                        
                        # Add delay between batches
                        time.sleep(DELAY_BETWEEN_BATCHES)
                
                # Process remaining records
                if batch_data:
                    print(f"Processing final batch of {len(batch_data)} records...")
                    self.process_batch(batch_data)

        except FileNotFoundError:
            print(f"ERROR: CSV file '{CSV_FILE_PATH}' not found!")
            return False
        except Exception as e:
            print(f"ERROR during migration: {e}")
            return False

        # Print summary
        print("\n" + "=" * 60)
        print("MIGRATION SUMMARY")
        print("=" * 60)
        print(f"Total processed: {self.processed_count}")
        print(f"Total errors: {self.error_count}")
        print(f"Total skipped: {self.skipped_count}")
        
        total_attempts = self.processed_count + self.error_count
        if total_attempts > 0:
            success_rate = (self.processed_count / total_attempts) * 100
            print(f"Success rate: {success_rate:.1f}%")
        
        return self.error_count == 0

    def process_batch(self, batch_data: List):
        """Process a batch of documents."""
        print(f"Processing batch of {len(batch_data)} records... (Total processed: {self.processed_count})")
        
        for doc_data, doc_id in batch_data:
            success = self.upload_document_to_firestore(doc_data, doc_id)
            
            if success:
                self.processed_count += 1
            else:
                self.error_count += 1
                
            # Progress indicator
            if (self.processed_count + self.error_count) % 100 == 0:
                print(f"Progress: {self.processed_count + self.error_count} records processed...")

def main():
    """Main entry point."""
    print("Direct Firebase Firestore Migration Tool")
    print("=" * 40)
    
    migrator = DirectFirebaseMigrator()
    
    print("\nIMPORTANT: Ensure the following before starting:")
    print("1. Firestore security rules allow public writes (temporary)")
    print("2. Required Firestore indexes are created")
    print("3. Firebase project 'save-them-now' is accessible")
    
    response = input(f"\nProceed with migration? (y/N): ")
    if response.lower() != 'y':
        print("Migration cancelled.")
        return
    
    start_time = time.time()
    success = migrator.migrate_csv_to_firestore()
    end_time = time.time()
    
    print(f"\nMigration completed in {end_time - start_time:.2f} seconds")
    
    if success:
        print("✅ Migration completed successfully!")
        print("\nNext steps:")
        print("1. Verify data in Firebase Console")
        print("2. Restore production security rules")
        print("3. Test application with Firestore data")
    else:
        print("❌ Migration completed with errors. Check the logs above.")

if __name__ == "__main__":
    main()