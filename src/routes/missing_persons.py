from flask import Blueprint, jsonify, request
from src.models.user import db
from src.models.missing_person import MissingPerson
from src.models.tip import Tip

missing_persons_bp = Blueprint('missing_persons', __name__)

@missing_persons_bp.route('/missing-persons', methods=['GET'])
def get_missing_persons():
    persons = MissingPerson.query.all()
    return jsonify([{
        'id': p.id,
        'name': p.name or f"{p.legal_first_name or ''} {p.legal_last_name or ''}".strip(),
        'date': p.date,
        'status': p.status,
        'category': p.category,
        'reportedMissing': p.reported_missing,
        'location': p.location or f"{p.city or ''}, {p.county or ''}, {p.state or ''}".strip().strip(','),
        'latitude': p.latitude,
        'longitude': p.longitude,
        'description': p.description,
        # Additional CSV fields for analysis
        'case_number': p.case_number,
        'dlc': p.dlc,
        'legal_first_name': p.legal_first_name,
        'legal_last_name': p.legal_last_name,
        'missing_age': p.missing_age,
        'city': p.city,
        'county': p.county,
        'state': p.state,
        'biological_sex': p.biological_sex,
        'race_ethnicity': p.race_ethnicity,
        'date_modified': p.date_modified
    } for p in persons])

@missing_persons_bp.route('/missing-persons', methods=['POST'])
def create_missing_person():
    data = request.json
    person = MissingPerson(
        name=data.get('name'),
        date=data.get('date'),
        status=data.get('status'),
        category=data.get('category'),
        reported_missing=data.get('reportedMissing'),
        location=data.get('location'),
        latitude=data.get('latitude'),
        longitude=data.get('longitude'),
        description=data.get('description')
    )
    db.session.add(person)
    db.session.commit()
    return jsonify({'message': 'Missing person record created successfully'})

@missing_persons_bp.route('/tips', methods=['POST'])
def submit_tip():
    data = request.json
    tip = Tip(
        person_id=data.get('personId'),
        name=data.get('name'),
        email=data.get('email'),
        message=data.get('message')
    )
    db.session.add(tip)
    db.session.commit()
    return jsonify({'message': 'Tip submitted successfully', 'status': 'success'})