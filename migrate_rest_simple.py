#!/usr/bin/env python3
"""
Simple REST API Migration Script: CSV to Firestore
Uses Firestore REST API with public write access (no authentication needed)
"""

import csv
import json
import time
import requests
from datetime import datetime
from typing import Dict, List, Optional

# Configuration
CSV_FILE_PATH = "missing-persons.csv"
PROJECT_ID = "save-them-now"
COLLECTION_NAME = "missing_persons"
BATCH_SIZE = 100  # Smaller batches for REST API
BASE_URL = f"https://firestore.googleapis.com/v1/projects/{PROJECT_ID}/databases/(default)/documents"

class FirestoreRESTMigrator:
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

    def convert_to_firestore_value(self, value) -> Dict:
        """Convert Python value to Firestore REST API format."""
        if isinstance(value, str):
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
        """Convert CSV row to Firestore REST API document format."""
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

        # Create document data in Firestore REST format
        doc_data = {
            "fields": {
                "name": self.convert_to_firestore_value(full_name or "Unknown"),
                "caseNumber": self.convert_to_firestore_value(case_number or ""),
                "legalFirstName": self.convert_to_firestore_value(first_name or ""),
                "legalLastName": self.convert_to_firestore_value(last_name or ""),
                "city": self.convert_to_firestore_value(city or ""),
                "state": self.convert_to_firestore_value(state or ""),
                "county": self.convert_to_firestore_value(county or ""),
                "location": self.convert_to_firestore_value(location),
                "age": self.convert_to_firestore_value(age or 0),
                "missingAge": self.convert_to_firestore_value(age_text or ""),
                "gender": self.convert_to_firestore_value(sex or ""),
                "biologicalSex": self.convert_to_firestore_value(sex or ""),
                "ethnicity": self.convert_to_firestore_value(ethnicity or ""),
                "raceEthnicity": self.convert_to_firestore_value(ethnicity or ""),
                "category": self.convert_to_firestore_value(category),
                "status": self.convert_to_firestore_value("Active"),
                "date": self.convert_to_firestore_value(dlc or ""),
                "dateMissing": self.convert_to_firestore_value(dlc or ""),
                "dateModified": self.convert_to_firestore_value(date_modified or ""),
                "reportedMissing": self.convert_to_firestore_value(f"Reported Missing {dlc}" if dlc else ""),
                "description": self.convert_to_firestore_value(f"Case #{case_number} - {age_text} {sex} from {city}, {state}"),
                "createdAt": self.convert_to_firestore_value(datetime.utcnow()),
                "updatedAt": self.convert_to_firestore_value(datetime.utcnow())
            }
        }

        return doc_data

    def upload_document_to_firestore(self, doc_data: Dict) -> bool:
        """Upload a single document to Firestore via REST API."""
        try:
            url = f"{BASE_URL}/{COLLECTION_NAME}"
            headers = {
                'Content-Type': 'application/json'
            }
            
            response = requests.post(url, json=doc_data, headers=headers)
            
            if response.status_code in [200, 201]:
                self.processed_count += 1
                return True
            else:
                print(f"Error uploading document: {response.status_code} - {response.text}")
                self.error_count += 1
                return False
                
        except Exception as e:
            print(f"Error uploading document: {e}")
            self.error_count += 1
            return False

    def upload_batch_to_firestore(self, batch_data: List[Dict]) -> bool:
        """Upload a batch of documents (one by one via REST API)."""
        success_count = 0
        
        for doc_data in batch_data:
            if self.upload_document_to_firestore(doc_data):
                success_count += 1
            
            # Small delay to avoid rate limiting
            time.sleep(0.05)
        
        return success_count == len(batch_data)

    def check_existing_data(self) -> int:
        """Check if any documents exist in the collection."""
        try:
            url = f"{BASE_URL}/{COLLECTION_NAME}?pageSize=1"
            response = requests.get(url)
            
            if response.status_code == 200:
                data = response.json()
                return len(data.get('documents', []))
            else:
                return 0
        except Exception as e:
            print(f"Error checking existing data: {e}")
            return 0

    def migrate_csv_to_firestore(self):
        """Main migration function."""
        print(f"Starting REST API migration from {CSV_FILE_PATH} to Firestore...")
        print(f"Project ID: {PROJECT_ID}")
        print(f"Collection: {COLLECTION_NAME}")
        print("-" * 50)

        # Check for existing data
        existing_count = self.check_existing_data()
        if existing_count > 0:
            print(f"Found existing data in collection '{COLLECTION_NAME}'. Auto-continuing...")
            # response = input(f"Found existing data in collection '{COLLECTION_NAME}'. Continue? (y/N): ")
            # if response.lower() != 'y':
            #     print("Migration cancelled.")
            #     return False

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
                    batch_data.append(doc_data)
                    
                    # Process batch when it reaches the batch size
                    if len(batch_data) >= BATCH_SIZE:
                        print(f"Processing batch of {len(batch_data)} records... (Total processed: {self.processed_count})")
                        self.upload_batch_to_firestore(batch_data)
                        batch_data = []
                        
                        # Progress update every 1000 records
                        if self.processed_count % 1000 == 0:
                            print(f"Processed {self.processed_count} records so far...")
                
                # Process remaining records
                if batch_data:
                    print(f"Processing final batch of {len(batch_data)} records...")
                    self.upload_batch_to_firestore(batch_data)

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
        
        total_attempts = self.processed_count + self.error_count
        if total_attempts > 0:
            success_rate = (self.processed_count / total_attempts) * 100
            print(f"Success rate: {success_rate:.1f}%")
        
        return self.error_count == 0

def main():
    """Main entry point."""
    print("Firebase Firestore REST API Migration Tool")
    print("=" * 45)
    
    migrator = FirestoreRESTMigrator()
    
    # Auto-confirm for automated execution
    print(f"Starting migration from '{CSV_FILE_PATH}' to Firestore via REST API...")
    print("Auto-confirming migration...")
    # response = input(f"This will migrate data from '{CSV_FILE_PATH}' to Firestore via REST API. Continue? (y/N): ")
    # if response.lower() != 'y':
    #     print("Migration cancelled.")
    #     return
    
    start_time = time.time()
    success = migrator.migrate_csv_to_firestore()
    end_time = time.time()
    
    print(f"\nMigration completed in {end_time - start_time:.2f} seconds")
    
    if success:
        print("✅ Migration completed successfully!")
        print("\nNext steps:")
        print("1. Verify data in Firebase Console")
        print("2. Test your application with the new Firestore data")
        print("3. Update security rules to restrict write access")
    else:
        print("❌ Migration completed with errors. Check the logs above.")

if __name__ == "__main__":
    main()