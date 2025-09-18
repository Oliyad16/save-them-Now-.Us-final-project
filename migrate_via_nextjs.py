#!/usr/bin/env python3
"""
Migration Script via Next.js API
Uses the Next.js API endpoints to migrate data to Firestore
"""

import csv
import json
import time
import requests
from datetime import datetime
from typing import Dict, List, Optional

# Configuration
CSV_FILE_PATH = "missing-persons.csv"
NEXTJS_API_URL = "http://localhost:3003/api/missing-persons"  # Your Next.js dev server
BATCH_SIZE = 50  # Smaller batches for API calls

class NextJSAPIMigrator:
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

    def map_csv_row_to_document(self, row: Dict[str, str], index: int) -> Dict:
        """Convert CSV row to API format."""
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

        # Create document data for API
        doc_data = {
            "name": full_name or "Unknown",
            "caseNumber": case_number or "",
            "legalFirstName": first_name or "",
            "legalLastName": last_name or "",
            "city": city or "",
            "state": state or "",
            "county": county or "",
            "location": location,
            "age": age or 0,
            "missingAge": age_text or "",
            "gender": sex or "",
            "biologicalSex": sex or "",
            "ethnicity": ethnicity or "",
            "raceEthnicity": ethnicity or "",
            "category": category,
            "status": "Active",
            "date": dlc or "",
            "dateMissing": dlc or "",
            "dateModified": date_modified or "",
            "reportedMissing": f"Reported Missing {dlc}" if dlc else "",
            "description": f"Case #{case_number} - {age_text} {sex} from {city}, {state}"
        }

        return doc_data

    def upload_document_to_api(self, doc_data: Dict) -> bool:
        """Upload a single document to API."""
        try:
            headers = {
                'Content-Type': 'application/json'
            }
            
            response = requests.post(NEXTJS_API_URL, json=doc_data, headers=headers, timeout=30)
            
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

    def upload_batch_to_api(self, batch_data: List[Dict]) -> bool:
        """Upload a batch of documents (one by one via API)."""
        success_count = 0
        
        for doc_data in batch_data:
            if self.upload_document_to_api(doc_data):
                success_count += 1
            
            # Small delay to avoid overwhelming the API
            time.sleep(0.1)
        
        return success_count == len(batch_data)

    def check_api_availability(self) -> bool:
        """Check if the Next.js API is available."""
        try:
            response = requests.get(NEXTJS_API_URL, timeout=10)
            return response.status_code in [200, 405]  # 405 is fine for GET on POST endpoint
        except Exception as e:
            print(f"API not available: {e}")
            return False

    def migrate_csv_to_api(self):
        """Main migration function."""
        print(f"Starting API migration from {CSV_FILE_PATH} to Next.js Firestore API...")
        print(f"API URL: {NEXTJS_API_URL}")
        print("-" * 50)

        # Check API availability
        if not self.check_api_availability():
            print("ERROR: Next.js API is not available.")
            print("Please start your Next.js development server with: npm run dev")
            return False

        try:
            with open(CSV_FILE_PATH, 'r', encoding='utf-8-sig') as csvfile:
                reader = csv.DictReader(csvfile)
                batch_data = []
                
                for index, row in enumerate(reader):
                    # Skip empty rows
                    if not any(row.values()):
                        self.skipped_count += 1
                        continue
                    
                    # Convert row to API format
                    doc_data = self.map_csv_row_to_document(row, index)
                    batch_data.append(doc_data)
                    
                    # Process batch when it reaches the batch size
                    if len(batch_data) >= BATCH_SIZE:
                        print(f"Processing batch of {len(batch_data)} records... (Total processed: {self.processed_count})")
                        self.upload_batch_to_api(batch_data)
                        batch_data = []
                        
                        # Progress update every 1000 records
                        if self.processed_count % 1000 == 0:
                            print(f"Processed {self.processed_count} records so far...")
                
                # Process remaining records
                if batch_data:
                    print(f"Processing final batch of {len(batch_data)} records...")
                    self.upload_batch_to_api(batch_data)

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
    print("Next.js API Migration Tool")
    print("=" * 30)
    
    migrator = NextJSAPIMigrator()
    
    print(f"Starting migration from '{CSV_FILE_PATH}' via Next.js API...")
    print("Auto-confirming migration...")
    
    start_time = time.time()
    success = migrator.migrate_csv_to_api()
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