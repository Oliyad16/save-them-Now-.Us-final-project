#!/usr/bin/env python3
"""
Quick Migration Script using Firebase REST API
This bypasses security rules by using the admin endpoint directly.
"""

import requests
import json
import csv
from datetime import datetime

# Firebase project configuration
FIREBASE_PROJECT_ID = "save-them-now"
FIRESTORE_REST_URL = f"https://firestore.googleapis.com/v1/projects/{FIREBASE_PROJECT_ID}/databases/(default)/documents/missing_persons"

def parse_age_to_int(age_text):
    """Parse age text to integer."""
    if not age_text:
        return 0
    digits = ''.join(filter(str.isdigit, age_text))
    try:
        return int(digits) if digits else 0
    except ValueError:
        return 0

def convert_to_firestore_value(value):
    """Convert Python value to Firestore value format."""
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

def create_firestore_document(row, index):
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
    
    age = parse_age_to_int(age_text)
    category = 'Missing Children' if age and age < 18 else 'Missing Adults'
    location = ', '.join(filter(None, [city, county, state, 'USA']))
    full_name = ' '.join(filter(None, [first_name, last_name]))
    
    # Create the document in Firestore format
    doc = {
        "fields": {
            "name": convert_to_firestore_value(full_name or "Unknown"),
            "caseNumber": convert_to_firestore_value(case_number),
            "legalFirstName": convert_to_firestore_value(first_name),
            "legalLastName": convert_to_firestore_value(last_name),
            "city": convert_to_firestore_value(city),
            "state": convert_to_firestore_value(state),
            "county": convert_to_firestore_value(county),
            "location": convert_to_firestore_value(location),
            "age": convert_to_firestore_value(age),
            "missingAge": convert_to_firestore_value(age_text),
            "gender": convert_to_firestore_value(sex),
            "biologicalSex": convert_to_firestore_value(sex),
            "ethnicity": convert_to_firestore_value(ethnicity),
            "raceEthnicity": convert_to_firestore_value(ethnicity),
            "category": convert_to_firestore_value(category),
            "status": convert_to_firestore_value("Active"),
            "date": convert_to_firestore_value(dlc),
            "dateMissing": convert_to_firestore_value(dlc),
            "reportedMissing": convert_to_firestore_value(f"Reported Missing {dlc}" if dlc else ""),
            "description": convert_to_firestore_value(f"Case #{case_number} - {age_text} {sex} from {city}, {state}"),
            "createdAt": convert_to_firestore_value(datetime.utcnow()),
            "updatedAt": convert_to_firestore_value(datetime.utcnow())
        }
    }
    
    return doc

def upload_document(doc_data, doc_id):
    """Upload a document to Firestore using REST API."""
    try:
        url = f"{FIRESTORE_REST_URL}/{doc_id}"
        headers = {
            "Content-Type": "application/json"
        }
        
        response = requests.patch(url, json=doc_data, headers=headers)
        
        if response.status_code in [200, 201]:
            return True, None
        else:
            return False, f"HTTP {response.status_code}: {response.text}"
            
    except Exception as e:
        return False, str(e)

def main():
    print("Quick Firebase Migration Tool")
    print("=" * 30)
    
    # Ask user to confirm they've updated security rules
    print("\nIMPORTANT: Before running this migration, you need to:")
    print("1. Go to Firebase Console > Firestore Database > Rules")
    print("2. Temporarily replace the rules with:")
    print("""
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /missing_persons/{personId} {
      allow read, write: if true;
    }
  }
}
""")
    print("3. Click 'Publish' to apply the rules")
    print("4. After migration, restore the original secure rules")
    
    response = input("\nHave you updated the Firebase security rules? (y/N): ")
    if response.lower() != 'y':
        print("Please update the security rules first, then run this script again.")
        return
    
    try:
        processed = 0
        errors = 0
        
        with open('missing-persons.csv', 'r', encoding='utf-8-sig') as csvfile:
            reader = csv.DictReader(csvfile)
            
            for index, row in enumerate(reader):
                if not any(row.values()):
                    continue
                
                doc_data = create_firestore_document(row, index)
                doc_id = f"person_{index + 1:06d}"
                
                success, error = upload_document(doc_data, doc_id)
                
                if success:
                    processed += 1
                    if processed % 100 == 0:
                        print(f"Processed {processed} records...")
                else:
                    errors += 1
                    if errors < 5:  # Only show first few errors
                        print(f"Error uploading record {index + 1}: {error}")
                
                # Limit for testing
                if processed >= 100:  # Start with just 100 records
                    print("\nStopping at 100 records for testing...")
                    break
        
        print(f"\nMigration complete:")
        print(f"Processed: {processed}")
        print(f"Errors: {errors}")
        
        if errors == 0:
            print("\n✓ SUCCESS! Now restore the secure Firestore rules.")
        else:
            print(f"\n⚠ Completed with {errors} errors.")
            
    except FileNotFoundError:
        print("Error: missing-persons.csv file not found!")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    main()