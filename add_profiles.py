#!/usr/bin/env python3
"""
Script to add more missing persons with detailed profiles and photos to the database.
"""

import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), 'src'))

from src.models.missing_person import MissingPerson, db
from src.main import app
import requests

# Additional missing persons data with detailed profiles
additional_persons = [
    {
        "name": "Maria Elena Rodriguez",
        "age": 28,
        "gender": "Female",
        "ethnicity": "Hispanic",
        "height": "5'4\"",
        "weight": "130 lbs",
        "hair_color": "Dark Brown",
        "eye_color": "Brown",
        "date": "August 15, 2024",
        "status": "Active",
        "category": "Missing Adults",
        "reportedMissing": "Reported Missing August 15, 2024",
        "location": "Phoenix, Arizona, USA",
        "latitude": 33.4484,
        "longitude": -112.0740,
        "description": "Maria was last seen leaving her workplace at a local restaurant. She was wearing a blue blouse and black pants.",
        "circumstances": "Maria failed to return home after her evening shift. Her car was found in the restaurant parking lot.",
        "photo": "images/profile_1.png"
    },
    {
        "name": "James Michael Thompson",
        "age": 45,
        "gender": "Male",
        "ethnicity": "African American",
        "height": "6'1\"",
        "weight": "185 lbs",
        "hair_color": "Black",
        "eye_color": "Brown",
        "date": "July 22, 2024",
        "status": "Active",
        "category": "Missing Adults",
        "reportedMissing": "Reported Missing July 23, 2024",
        "location": "Detroit, Michigan, USA",
        "latitude": 42.3314,
        "longitude": -83.0458,
        "description": "James was last seen wearing a gray suit and tie, heading to a business meeting downtown.",
        "circumstances": "James never arrived at his scheduled business meeting. His phone goes straight to voicemail.",
        "photo": "images/profile_2.png"
    },
    {
        "name": "Emma Grace Wilson",
        "age": 16,
        "gender": "Female",
        "ethnicity": "Caucasian",
        "height": "5'2\"",
        "weight": "110 lbs",
        "hair_color": "Blonde",
        "eye_color": "Blue",
        "date": "August 10, 2024",
        "status": "Active",
        "category": "Missing Children",
        "reportedMissing": "Reported Missing August 10, 2024",
        "location": "Nashville, Tennessee, USA",
        "latitude": 36.1627,
        "longitude": -86.7816,
        "description": "Emma was last seen wearing a red sweater and blue jeans, walking home from school.",
        "circumstances": "Emma never arrived home from school. Her backpack was found near a local park.",
        "photo": "images/profile_3.png"
    },
    {
        "name": "Sarah Kim Chen",
        "age": 35,
        "gender": "Female",
        "ethnicity": "Asian",
        "height": "5'3\"",
        "weight": "125 lbs",
        "hair_color": "Black",
        "eye_color": "Dark Brown",
        "date": "August 5, 2024",
        "status": "Active",
        "category": "Missing Adults",
        "reportedMissing": "Reported Missing August 6, 2024",
        "location": "Seattle, Washington, USA",
        "latitude": 47.6062,
        "longitude": -122.3321,
        "description": "Sarah was last seen wearing a white shirt and dark pants, leaving her office building.",
        "circumstances": "Sarah left work at her usual time but never arrived home. Her car was found abandoned near the waterfront.",
        "photo": "images/profile_4.png"
    },
    {
        "name": "Robert David Miller",
        "age": 52,
        "gender": "Male",
        "ethnicity": "Caucasian",
        "height": "5'10\"",
        "weight": "175 lbs",
        "hair_color": "Graying Brown",
        "eye_color": "Green",
        "date": "July 30, 2024",
        "status": "Active",
        "category": "Missing Veterans",
        "reportedMissing": "Reported Missing July 31, 2024",
        "location": "Denver, Colorado, USA",
        "latitude": 39.7392,
        "longitude": -104.9903,
        "description": "Robert, a military veteran, was last seen wearing a navy blue polo shirt and khaki pants.",
        "circumstances": "Robert went for his regular morning walk and never returned. He suffers from PTSD and may be disoriented.",
        "photo": "images/profile_5.png"
    }
]

def add_missing_persons():
    """Add additional missing persons to the database."""
    with app.app_context():
        print("Adding additional missing persons with profiles...")
        
        for person_data in additional_persons:
            # Check if person already exists
            existing = MissingPerson.query.filter_by(
                location=person_data['location'],
                date=person_data['date']
            ).first()
            
            if existing:
                print(f"Person at {person_data['location']} already exists, skipping...")
                continue
            
            # Create new missing person record
            new_person = MissingPerson(
                date=person_data['date'],
                status=person_data['status'],
                category=person_data['category'],
                reported_missing=person_data['reportedMissing'],
                location=person_data['location'],
                latitude=person_data['latitude'],
                longitude=person_data['longitude'],
                name=person_data['name'],
                age=person_data['age'],
                gender=person_data['gender'],
                ethnicity=person_data['ethnicity'],
                height=person_data['height'],
                weight=person_data['weight'],
                hair_color=person_data['hair_color'],
                eye_color=person_data['eye_color'],
                description=person_data['description'],
                circumstances=person_data['circumstances'],
                photo=person_data['photo']
            )
            
            db.session.add(new_person)
            print(f"Added: {person_data['name']} - {person_data['location']}")
        
        db.session.commit()
        print(f"Successfully added {len(additional_persons)} new missing persons with profiles")

if __name__ == "__main__":
    add_missing_persons()

