from flask import Blueprint, jsonify, request
from src.models.missing_person import MissingPerson
from src.models.user import db

missing_persons_bp = Blueprint('missing_persons', __name__)

@missing_persons_bp.route('/missing-persons', methods=['GET'])
def get_missing_persons():
    """Get all missing persons data"""
    try:
        missing_persons = MissingPerson.query.all()
        return jsonify([person.to_dict() for person in missing_persons])
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@missing_persons_bp.route('/missing-persons/<int:person_id>', methods=['GET'])
def get_missing_person(person_id):
    """Get a specific missing person by ID"""
    try:
        person = MissingPerson.query.get_or_404(person_id)
        return jsonify(person.to_dict())
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@missing_persons_bp.route('/tips', methods=['POST'])
def submit_tip():
    """Submit a tip about a missing person"""
    try:
        data = request.get_json()
        # For now, just return success - in a real app, this would save to a tips table
        return jsonify({'message': 'Tip submitted successfully', 'data': data}), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500

