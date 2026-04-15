from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from app import db
from app.models.campaign import Campaign, CampaignMember
from app.models.content import WikiArticle, LogEntry, Document
from app.models.character import Character
from app.models.user import User
from app.utils.auth import get_current_user, is_gm_or_co_gm

search_bp = Blueprint('search', __name__)


@search_bp.route('/<campaign_slug>/search', methods=['GET'])
@jwt_required()
def search_campaign(campaign_slug):
    user = get_current_user()
    campaign = Campaign.query.filter_by(slug=campaign_slug).first_or_404()

    member = CampaignMember.query.filter_by(campaign_id=campaign.id, user_id=user.id).first()
    if not member and not user.is_site_admin:
        return jsonify({'error': 'Not a member'}), 403

    q = request.args.get('q', '').strip()
    if len(q) < 2:
        return jsonify({'results': []})

    is_gm = is_gm_or_co_gm(user.id, campaign.id)
    results = []

    # Wiki articles
    wiki_q = WikiArticle.query.filter_by(campaign_id=campaign.id).filter(
        WikiArticle.title.ilike(f'%{q}%') | WikiArticle.content.ilike(f'%{q}%')
    )
    if not is_gm:
        wiki_q = wiki_q.filter_by(is_gm_only=False)
    for a in wiki_q.limit(10).all():
        results.append({'type': 'wiki', 'id': a.id, 'title': a.title,
                        'category': a.category, 'tags': [t.name for t in a.tags]})

    # Characters
    char_q = Character.query.filter_by(campaign_id=campaign.id).filter(
        Character.name.ilike(f'%{q}%')
    )
    for c in char_q.limit(10).all():
        if c.is_public or is_gm or c.player_id == user.id:
            results.append({'type': 'character', 'id': c.id, 'title': c.name,
                            'is_npc': c.is_npc, 'tags': [t.name for t in c.tags]})

    # Logs
    log_q = LogEntry.query.filter_by(campaign_id=campaign.id).filter(
        LogEntry.title.ilike(f'%{q}%') | LogEntry.content.ilike(f'%{q}%')
    )
    if not is_gm:
        log_q = log_q.filter_by(is_gm_only=False)
    for e in log_q.limit(5).all():
        results.append({'type': 'log', 'id': e.id, 'title': e.title,
                        'session_number': e.session_number, 'tags': [t.name for t in e.tags]})

    # Documents
    doc_q = Document.query.filter_by(campaign_id=campaign.id).filter(
        Document.title.ilike(f'%{q}%')
    )
    if not is_gm:
        doc_q = doc_q.filter_by(is_gm_only=False)
    for d in doc_q.limit(5).all():
        results.append({'type': 'document', 'id': d.id, 'title': d.title,
                        'mime_type': d.mime_type, 'tags': [t.name for t in d.tags]})

    return jsonify({'results': results, 'query': q})
