import json
import requests
import sys
import os

# Add the src directory to the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

from src.main import app
from src.models.missing_person import MissingPerson, db

def geocode_location(location):
    """Geocode a location using OpenStreetMap Nominatim API"""
    try:
        # Use Nominatim API for geocoding (free and open source)
        url = f"https://nominatim.openstreetmap.org/search?q={location}&format=json&limit=1"
        headers = {'User-Agent': 'MissingPersonsApp/1.0'}
        response = requests.get(url, headers=headers)
        
        if response.status_code == 200:
            data = response.json()
            if data:
                return float(data[0]['lat']), float(data[0]['lon'])
    except Exception as e:
        print(f"Error geocoding {location}: {e}")
    
    return None, None

def populate_database():
    """Populate the database with missing persons data"""
    with app.app_context():
        # Clear existing data
        MissingPerson.query.delete()
        
        # Load data from JSON file
        with open('../missing_persons_data.json', 'r') as f:
            data = json.load(f)
        
        for item in data:
            # Geocode the location
            lat, lon = geocode_location(item['location'])
            
            # Create new missing person record
            person = MissingPerson(
                date=item['date'],
                status=item['status'],
                category=item['category'],
                reported_missing=item['reportedMissing'],
                location=item['location'],
                latitude=lat,
                longitude=lon
            )
            
            db.session.add(person)
            print(f"Added: {item['location']} - Lat: {lat}, Lon: {lon}")
        
        # Commit all changes
        db.session.commit()
        print(f"Successfully populated database with {len(data)} records")

if __name__ == "__main__":
    populate_database()

