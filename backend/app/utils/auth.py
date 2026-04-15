from app import db
from functools import wraps
from flask import jsonify
from flask_jwt_extended import get_jwt_identity, verify_jwt_in_request
from app.models.campaign import Campaign, CampaignMember, CampaignRole
from app.models.user import User


def get_current_user():
    user_id = int(get_jwt_identity())
    return db.session.get(User, user_id)


def campaign_member_required(min_role=None):
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            verify_jwt_in_request()
            user_id = int(get_jwt_identity())
            user = db.session.get(User, user_id)

            if not user or not user.is_active:
                return jsonify({'error': 'User not found'}), 404

            if user.is_site_admin:
                return fn(*args, **kwargs)

            campaign_slug = kwargs.get('campaign_slug')
            campaign = Campaign.query.filter_by(slug=campaign_slug).first()
            if not campaign:
                return jsonify({'error': 'Campaign not found'}), 404

            member = CampaignMember.query.filter_by(
                campaign_id=campaign.id, user_id=user_id
            ).first()

            if not member:
                return jsonify({'error': 'Not a member of this campaign'}), 403

            if min_role:
                role_order = [CampaignRole.SPECTATOR, CampaignRole.PLAYER,
                              CampaignRole.CO_GM, CampaignRole.GM]
                member_idx = role_order.index(member.role)
                required_idx = role_order.index(min_role)
                if member_idx < required_idx:
                    return jsonify({'error': 'Insufficient permissions'}), 403

            return fn(*args, **kwargs)
        return wrapper
    return decorator


def gm_required(fn):
    return campaign_member_required(min_role=CampaignRole.GM)(fn)


def co_gm_required(fn):
    return campaign_member_required(min_role=CampaignRole.CO_GM)(fn)


def site_admin_required(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        verify_jwt_in_request()
        user = get_current_user()
        if not user or not user.is_site_admin:
            return jsonify({'error': 'Admin required'}), 403
        return fn(*args, **kwargs)
    return wrapper


def is_gm_or_co_gm(user_id, campaign_id):
    user = db.session.get(User, int(user_id))
    if user and user.is_site_admin:
        return True
    member = CampaignMember.query.filter_by(
        campaign_id=campaign_id, user_id=user_id
    ).first()
    return member and member.role in [CampaignRole.GM, CampaignRole.CO_GM]
