from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from app import db
from app.models.user import User
from app.utils.auth import get_current_user, site_admin_required
from app.utils.uploads import save_upload, allowed_file

users_bp = Blueprint('users', __name__)


@users_bp.route('', methods=['GET'])
@jwt_required()
@site_admin_required
def list_users():
    users = User.query.order_by(User.username).all()
    return jsonify([u.to_dict(include_email=True) for u in users])


@users_bp.route('/<int:user_id>', methods=['GET'])
@jwt_required()
def get_user(user_id):
    user = db.session.get(User, user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404
    return jsonify(user.to_dict())


@users_bp.route('/<int:user_id>', methods=['PUT'])
@jwt_required()
@site_admin_required
def admin_update_user(user_id):
    target = db.session.get(User, user_id)
    if not target:
        return jsonify({'error': 'User not found'}), 404
    data = request.get_json()

    if 'is_active' in data:
        target.is_active = data['is_active']
    if 'is_site_admin' in data:
        target.is_site_admin = data['is_site_admin']
    if 'display_name' in data:
        target.display_name = data['display_name']

    db.session.commit()
    return jsonify(target.to_dict(include_email=True))


@users_bp.route('/avatar', methods=['POST'])
@jwt_required()
def upload_avatar():
    user = get_current_user()
    file = request.files.get('file')
    if not file or not allowed_file(file.filename, 'image'):
        return jsonify({'error': 'Invalid image'}), 400

    result = save_upload(file, 'avatars', 'image')
    if result:
        path, _, _, _ = result
        user.avatar_url = f'/uploads/{path}'
        db.session.commit()

    return jsonify({'avatar_url': user.avatar_url})
