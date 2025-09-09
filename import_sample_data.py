import json
import sys
import os
import random

sys.path.insert(0, os.path.dirname(__file__))

from main import app
from src.models.user import db
from src.models.missing_person import MissingPerson

# Sample coordinates for US locations
location_coords = {
    "Mountain View, California, USA": [37.3861, -122.0839],
    "Cornelius, North Carolina, USA": [35.4801, -80.8640],
    "Prague, Nebraska, USA": [41.2878, -96.1922],
    "Rayville, Louisiana, USA": [32.4774, -91.7565],
    "Brookfield, Massachusetts, USA": [42.2084, -72.1073],
    "Seminole, Oklahoma, USA": [35.2481, -96.6736],
    "Washburn, Maine, United States": [46.7895, -68.1420]
}

def import_data():
    with app.app_context():
        # Clear existing data
        MissingPerson.query.delete()
        
        # Load JSON data
        with open('missing_persons_data.json', 'r') as f:
            data = json.load(f)
        
        # Import data
        for i, item in enumerate(data, 1):
            # Get coordinates or use random ones
            location = item['location']
            if location in location_coords:
                lat, lng = location_coords[location]
            else:
                # Random US coordinates
                lat = random.uniform(25.0, 49.0)
                lng = random.uniform(-125.0, -66.0)
            
            person = MissingPerson(
                id=i,
                name=f"Missing Person #{i}",
                date=item['date'],
                status=item['status'],
                category=item['category'],
                reported_missing=item['reportedMissing'],
                location=item['location'],
                latitude=lat,
                longitude=lng,
                description=f"Case from {item['location']} - {item['status']}"
            )
            
            db.session.add(person)
        
        db.session.commit()
        print(f"Imported {len(data)} missing persons records")

if __name__ == '__main__':
    import_data()