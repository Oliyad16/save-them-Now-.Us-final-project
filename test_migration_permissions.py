#!/usr/bin/env python3
"""
Quick test to verify Firebase rules allow writes
"""

import requests
import json
from datetime import datetime

# Configuration
PROJECT_ID = "save-them-now"
COLLECTION_NAME = "missing_persons"
BASE_URL = f"https://firestore.googleapis.com/v1/projects/{PROJECT_ID}/databases/(default)/documents"

def convert_to_firestore_value(value):
    """Convert Python value to Firestore REST API format."""
    if isinstance(value, str):
        return {"stringValue": value}
    elif isinstance(value, int):
        return {"integerValue": str(value)}
    elif isinstance(value, datetime):
        return {"timestampValue": value.isoformat() + "Z"}
    else:
        return {"stringValue": str(value)}

def test_write_permission():
    """Test if we can write to Firestore."""
    print("Testing Firebase write permissions...")
    
    # Create a test document
    test_doc = {
        "fields": {
            "name": convert_to_firestore_value("TEST_MIGRATION_PERMISSION"),
            "status": convert_to_firestore_value("TEST"),
            "createdAt": convert_to_firestore_value(datetime.utcnow())
        }
    }
    
    try:
        url = f"{BASE_URL}/{COLLECTION_NAME}"
        headers = {'Content-Type': 'application/json'}
        
        response = requests.post(url, json=test_doc, headers=headers, timeout=10)
        
        if response.status_code in [200, 201]:
            print("SUCCESS: Firebase rules allow writes - migration can proceed!")
            print(f"Response: {response.status_code}")
            
            # Try to delete the test document
            doc_data = response.json()
            doc_id = doc_data.get('name', '').split('/')[-1]
            if doc_id:
                delete_url = f"{BASE_URL}/{COLLECTION_NAME}/{doc_id}"
                delete_response = requests.delete(delete_url)
                if delete_response.status_code == 200:
                    print("Test document cleaned up successfully")
            
            return True
        else:
            print(f"FAILED: {response.status_code} - {response.text}")
            return False
            
    except Exception as e:
        print(f"ERROR: {e}")
        return False

if __name__ == "__main__":
    print("Firebase Permission Test")
    print("=" * 30)
    
    if test_write_permission():
        print("\nReady to start migration!")
    else:
        print("\nPlease deploy Firebase rules first")
        print("Rules need: allow write: if true; for missing_persons collection")