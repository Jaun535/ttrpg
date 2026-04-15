from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity, verify_jwt_in_request
from slugify import slugify
import secrets
from app import db
from app.models.campaign import Campaign, CampaignMember, CampaignRole, CampaignTag, CampaignStatus
from app.models.user import User
from app.utils.auth import get_current_user, campaign_member_required, gm_required, is_gm_or_co_gm
from app.utils.uploads import save_upload, allowed_file

campaigns_bp = Blueprint('campaigns', __name__)


def _make_slug(name):
    base = slugify(name)
    slug = base
    counter = 1
    while Campaign.query.filter_by(slug=slug).first():
        slug = f"{base}-{counter}"
        counter += 1
    return slug


@campaigns_bp.route('', methods=['GET'])
def list_campaigns():
    """List public campaigns or all for logged-in user."""
    try:
        verify_jwt_in_request(optional=True)
        user_id = int(get_jwt_identity())
    except Exception:
        user_id = None

    if user_id:
        user = db.session.get(User, user_id)
        if user and user.is_site_admin:
            campaigns = Campaign.query.order_by(Campaign.updated_at.desc()).all()
        else:
            member_ids = [m.campaign_id for m in CampaignMember.query.filter_by(user_id=user_id).all()]
            campaigns = Campaign.query.filter(
                (Campaign.id.in_(member_ids)) | (Campaign.is_public == True)
            ).order_by(Campaign.updated_at.desc()).all()
    else:
        campaigns = Campaign.query.filter_by(is_public=True).order_by(Campaign.updated_at.desc()).all()

    return jsonify([c.to_dict(user_id=user_id) for c in campaigns])


@campaigns_bp.route('', methods=['POST'])
@jwt_required()
def create_campaign():
    user = get_current_user()
    data = request.get_json()

    if not data.get('name'):
        return jsonify({'error': 'Name is required'}), 400

    campaign = Campaign(
        name=data['name'],
        slug=_make_slug(data['name']),
        description=data.get('description'),
        system=data.get('system'),
        is_public=data.get('is_public', False),
        join_code=secrets.token_urlsafe(8),
    )
    db.session.add(campaign)
    db.session.flush()

    # Creator becomes GM
    member = CampaignMember(campaign_id=campaign.id, user_id=user.id, role=CampaignRole.GM)
    db.session.add(member)

    # Tags
    for tag in data.get('tags', []):
        db.session.add(CampaignTag(campaign_id=campaign.id, name=tag.strip()))

    db.session.commit()
    return jsonify(campaign.to_dict(user_id=user.id)), 201


@campaigns_bp.route('/<campaign_slug>', methods=['GET'])
def get_campaign(campaign_slug):
    try:
        verify_jwt_in_request(optional=True)
        user_id = int(get_jwt_identity())
    except Exception:
        user_id = None

    campaign = Campaign.query.filter_by(slug=campaign_slug).first_or_404()

    if not campaign.is_public and not user_id:
        return jsonify({'error': 'Login required'}), 401

    if not campaign.is_public and user_id:
        user = db.session.get(User, user_id)
        if not user.is_site_admin:
            member = CampaignMember.query.filter_by(campaign_id=campaign.id, user_id=user_id).first()
            if not member:
                return jsonify({'error': 'Not a member'}), 403

    data = campaign.to_dict(user_id=user_id)
    data['members'] = [m.to_dict() for m in campaign.members]
    return jsonify(data)


@campaigns_bp.route('/<campaign_slug>', methods=['PUT'])
@jwt_required()
def update_campaign(campaign_slug):
    user = get_current_user()
    campaign = Campaign.query.filter_by(slug=campaign_slug).first_or_404()

    if not is_gm_or_co_gm(user.id, campaign.id) and not user.is_site_admin:
        return jsonify({'error': 'GM required'}), 403

    data = request.get_json()
    if 'name' in data:
        campaign.name = data['name']
    if 'description' in data:
        campaign.description = data['description']
    if 'system' in data:
        campaign.system = data['system']
    if 'is_public' in data:
        campaign.is_public = data['is_public']
    if 'status' in data:
        campaign.status = CampaignStatus(data['status'])
    if 'tags' in data:
        CampaignTag.query.filter_by(campaign_id=campaign.id).delete()
        for tag in data['tags']:
            db.session.add(CampaignTag(campaign_id=campaign.id, name=tag.strip()))

    db.session.commit()
    return jsonify(campaign.to_dict(user_id=user.id))


@campaigns_bp.route('/<campaign_slug>/cover', methods=['POST'])
@jwt_required()
def upload_cover(campaign_slug):
    user = get_current_user()
    campaign = Campaign.query.filter_by(slug=campaign_slug).first_or_404()

    if not is_gm_or_co_gm(user.id, campaign.id) and not user.is_site_admin:
        return jsonify({'error': 'GM required'}), 403

    file = request.files.get('file')
    if not file or not allowed_file(file.filename, 'image'):
        return jsonify({'error': 'Invalid image file'}), 400

    result = save_upload(file, f'campaigns/{campaign.slug}', 'image')
    if result:
        path, _, _, _ = result
        campaign.cover_image_url = f'/uploads/{path}'
        db.session.commit()

    return jsonify({'cover_image_url': campaign.cover_image_url})


@campaigns_bp.route('/<campaign_slug>/join', methods=['POST'])
@jwt_required()
def join_campaign(campaign_slug):
    user = get_current_user()
    campaign = Campaign.query.filter_by(slug=campaign_slug).first_or_404()

    data = request.get_json() or {}
    join_code = data.get('join_code')

    # Check if already a member
    if CampaignMember.query.filter_by(campaign_id=campaign.id, user_id=user.id).first():
        return jsonify({'error': 'Already a member'}), 409

    # Validate access
    if not campaign.is_public:
        if join_code != campaign.join_code:
            return jsonify({'error': 'Invalid join code'}), 403

    member = CampaignMember(campaign_id=campaign.id, user_id=user.id, role=CampaignRole.PLAYER)
    db.session.add(member)
    db.session.commit()
    return jsonify({'message': 'Joined successfully', 'role': 'player'})


@campaigns_bp.route('/<campaign_slug>/leave', methods=['POST'])
@jwt_required()
def leave_campaign(campaign_slug):
    user = get_current_user()
    campaign = Campaign.query.filter_by(slug=campaign_slug).first_or_404()
    member = CampaignMember.query.filter_by(campaign_id=campaign.id, user_id=user.id).first()

    if not member:
        return jsonify({'error': 'Not a member'}), 404

    if member.role == CampaignRole.GM:
        gm_count = CampaignMember.query.filter_by(campaign_id=campaign.id, role=CampaignRole.GM).count()
        if gm_count <= 1:
            return jsonify({'error': 'Cannot leave: you are the only GM'}), 400

    db.session.delete(member)
    db.session.commit()
    return jsonify({'message': 'Left campaign'})


@campaigns_bp.route('/<campaign_slug>/members/<int:user_id>/role', methods=['PUT'])
@jwt_required()
def update_member_role(campaign_slug, user_id):
    current_user = get_current_user()
    campaign = Campaign.query.filter_by(slug=campaign_slug).first_or_404()

    if not is_gm_or_co_gm(current_user.id, campaign.id) and not current_user.is_site_admin:
        return jsonify({'error': 'GM required'}), 403

    member = CampaignMember.query.filter_by(campaign_id=campaign.id, user_id=user_id).first_or_404()
    data = request.get_json()

    try:
        member.role = CampaignRole(data['role'])
    except (ValueError, KeyError):
        return jsonify({'error': 'Invalid role'}), 400

    db.session.commit()
    return jsonify(member.to_dict())


@campaigns_bp.route('/<campaign_slug>/members/<int:user_id>', methods=['DELETE'])
@jwt_required()
def remove_member(campaign_slug, user_id):
    current_user = get_current_user()
    campaign = Campaign.query.filter_by(slug=campaign_slug).first_or_404()

    if not is_gm_or_co_gm(current_user.id, campaign.id) and not current_user.is_site_admin:
        return jsonify({'error': 'GM required'}), 403

    member = CampaignMember.query.filter_by(campaign_id=campaign.id, user_id=user_id).first_or_404()
    db.session.delete(member)
    db.session.commit()
    return jsonify({'message': 'Member removed'})


@campaigns_bp.route('/<campaign_slug>/join-code', methods=['GET'])
@jwt_required()
def get_join_code(campaign_slug):
    user = get_current_user()
    campaign = Campaign.query.filter_by(slug=campaign_slug).first_or_404()

    if not is_gm_or_co_gm(user.id, campaign.id) and not user.is_site_admin:
        return jsonify({'error': 'GM required'}), 403

    return jsonify({'join_code': campaign.join_code})


@campaigns_bp.route('/<campaign_slug>/join-code/regenerate', methods=['POST'])
@jwt_required()
def regenerate_join_code(campaign_slug):
    user = get_current_user()
    campaign = Campaign.query.filter_by(slug=campaign_slug).first_or_404()

    if not is_gm_or_co_gm(user.id, campaign.id) and not user.is_site_admin:
        return jsonify({'error': 'GM required'}), 403

    campaign.join_code = secrets.token_urlsafe(8)
    db.session.commit()
    return jsonify({'join_code': campaign.join_code})
