#!/usr/bin/env python3
"""
Enhanced Data Migration Script: CSV to Firebase Firestore
Uses environment variables for authentication (no service account key needed)
"""

import csv
import json
import time
import os
from datetime import datetime
from typing import Dict, List, Optional

try:
    import firebase_admin
    from firebase_admin import credentials, firestore
except ImportError:
    print("Error: firebase-admin package not installed.")
    print("Install with: pip install firebase-admin")
    exit(1)

# Configuration
CSV_FILE_PATH = "missing-persons.csv"
COLLECTION_NAME = "missing_persons"
BATCH_SIZE = 500

class FirebaseEnvMigrator:
    def __init__(self):
        self.db = None
        self.processed_count = 0
        self.error_count = 0
        self.skipped_count = 0

    def initialize_firebase(self) -> bool:
        """Initialize Firebase using project ID from environment."""
        try:
            # Check if Firebase is already initialized
            try:
                firebase_admin.get_app()
                print("Firebase already initialized.")
            except ValueError:
                # Initialize Firebase with project ID (uses Application Default Credentials)
                project_id = "save-them-now"  # From your .env.local
                firebase_admin.initialize_app(
                    options={'projectId': project_id}
                )
                print(f"Firebase initialized for project: {project_id}")
            
            self.db = firestore.client()
            return True
            
        except Exception as e:
            print(f"Error initializing Firebase: {e}")
            print("This script uses Firebase Application Default Credentials.")
            print("Since we can't use service account in this environment,")
            print("we'll proceed with the REST API approach instead.")
            return False

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

        # Create document data
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
            "description": f"Case #{case_number} - {age_text} {sex} from {city}, {state}",
            "createdAt": datetime.utcnow(),
            "updatedAt": datetime.utcnow()
        }

        return doc_data

    def upload_batch_to_firestore(self, batch_data: List[Dict]) -> bool:
        """Upload a batch of documents to Firestore."""
        try:
            batch = self.db.batch()
            collection_ref = self.db.collection(COLLECTION_NAME)
            
            for doc_data in batch_data:
                doc_ref = collection_ref.document()  # Auto-generate ID
                batch.set(doc_ref, doc_data)
            
            # Commit the batch
            batch.commit()
            self.processed_count += len(batch_data)
            
            return True
            
        except Exception as e:
            print(f"Error uploading batch: {e}")
            self.error_count += len(batch_data)
            return False

    def check_existing_data(self) -> int:
        """Check how many documents already exist in the collection."""
        try:
            collection_ref = self.db.collection(COLLECTION_NAME)
            docs = collection_ref.limit(1).get()
            return len(docs)
        except Exception as e:
            print(f"Error checking existing data: {e}")
            return 0

    def migrate_csv_to_firestore(self):
        """Main migration function."""
        print(f"Starting migration from {CSV_FILE_PATH} to Firestore...")
        print(f"Collection: {COLLECTION_NAME}")
        print("-" * 50)

        # Check for existing data
        existing_count = self.check_existing_data()
        if existing_count > 0:
            response = input(f"Found existing data in collection '{COLLECTION_NAME}'. Continue? (y/N): ")
            if response.lower() != 'y':
                print("Migration cancelled.")
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
                    
                    # Convert row to Firestore document
                    doc_data = self.map_csv_row_to_document(row, index)
                    batch_data.append(doc_data)
                    
                    # Process batch when it reaches the batch size
                    if len(batch_data) >= BATCH_SIZE:
                        print(f"Processing batch of {len(batch_data)} records... (Total processed: {self.processed_count})")
                        self.upload_batch_to_firestore(batch_data)
                        batch_data = []
                        
                        # Add small delay to avoid rate limiting
                        time.sleep(0.1)
                
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
    print("Firebase Firestore Migration Tool (Environment-based)")
    print("=" * 50)
    
    migrator = FirebaseEnvMigrator()
    
    # Initialize Firebase
    if not migrator.initialize_firebase():
        print("\nFalling back to REST API migration...")
        print("Please run: python migrate_to_firebase.py")
        return
    
    # Confirm before starting
    response = input(f"This will migrate data from '{CSV_FILE_PATH}' to Firestore. Continue? (y/N): ")
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
        print("2. Test your application with the new Firestore data")
        print("3. Update security rules if needed")
    else:
        print("❌ Migration completed with errors. Check the logs above.")

if __name__ == "__main__":
    main()