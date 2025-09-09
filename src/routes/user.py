from flask import Blueprint, jsonify, request
from src.models.user import db, User

user_bp = Blueprint('user', __name__)

@user_bp.route('/users', methods=['GET'])
def get_users():
    users = User.query.all()
    return jsonify([{'id': u.id, 'name': u.name, 'email': u.email} for u in users])

@user_bp.route('/users', methods=['POST'])
def create_user():
    data = request.json
    user = User(name=data.get('name'), email=data.get('email'))
    db.session.add(user)
    db.session.commit()
    return jsonify({'message': 'User created successfully'})