from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from datetime import datetime
from app import db
from app.models.user import User
from app.utils.auth import get_current_user

auth_bp = Blueprint('auth', __name__)


@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400

    required = ['username', 'email', 'password']
    for field in required:
        if not data.get(field):
            return jsonify({'error': f'{field} is required'}), 400

    if User.query.filter_by(username=data['username']).first():
        return jsonify({'error': 'Username already taken'}), 409
    if User.query.filter_by(email=data['email']).first():
        return jsonify({'error': 'Email already registered'}), 409

    if len(data['password']) < 8:
        return jsonify({'error': 'Password must be at least 8 characters'}), 400

    user = User(
        username=data['username'],
        email=data['email'],
        display_name=data.get('display_name', data['username']),
    )
    user.set_password(data['password'])
    db.session.add(user)
    db.session.commit()

    token = create_access_token(identity=str(user.id))
    return jsonify({'token': token, 'user': user.to_dict(include_email=True)}), 201


@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400

    user = User.query.filter(
        (User.username == data.get('username')) | (User.email == data.get('username'))
    ).first()

    if not user or not user.check_password(data.get('password', '')):
        return jsonify({'error': 'Invalid credentials'}), 401

    if not user.is_active:
        return jsonify({'error': 'Account disabled'}), 403

    user.last_seen = datetime.utcnow()
    db.session.commit()

    token = create_access_token(identity=str(user.id))
    return jsonify({'token': token, 'user': user.to_dict(include_email=True)})


@auth_bp.route('/me', methods=['GET'])
@jwt_required()
def me():
    user = get_current_user()
    return jsonify(user.to_dict(include_email=True))


@auth_bp.route('/me', methods=['PUT'])
@jwt_required()
def update_me():
    user = get_current_user()
    data = request.get_json()

    if 'display_name' in data:
        user.display_name = data['display_name']
    if 'bio' in data:
        user.bio = data['bio']
    if 'password' in data and data['password']:
        if len(data['password']) < 8:
            return jsonify({'error': 'Password too short'}), 400
        user.set_password(data['password'])

    db.session.commit()
    return jsonify(user.to_dict(include_email=True))
