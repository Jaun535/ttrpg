from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from app import db
from app.models.campaign import Campaign, CampaignMember
from app.models.content import LogEntry, LogTag, Document, DocumentTag
from app.models.user import User
from app.utils.auth import get_current_user, is_gm_or_co_gm
from app.utils.uploads import save_upload, allowed_file, delete_upload

logs_bp = Blueprint('logs', __name__)
documents_bp = Blueprint('documents', __name__)


def _is_member(user_id, campaign_id):
    if db.session.get(User, user_id).is_site_admin:
        return True
    return CampaignMember.query.filter_by(campaign_id=campaign_id, user_id=user_id).first() is not None


# ─── SESSION LOGS ────────────────────────────────────────────────

@logs_bp.route('/<campaign_slug>/logs', methods=['GET'])
@jwt_required()
def list_logs(campaign_slug):
    user = get_current_user()
    campaign = Campaign.query.filter_by(slug=campaign_slug).first_or_404()

    if not _is_member(user.id, campaign.id):
        return jsonify({'error': 'Not a member'}), 403

    is_gm = is_gm_or_co_gm(user.id, campaign.id)
    tag_filter = request.args.get('tag')
    search = request.args.get('q', '').strip()

    query = LogEntry.query.filter_by(campaign_id=campaign.id)
    if not is_gm:
        query = query.filter_by(is_gm_only=False)
    if tag_filter:
        query = query.join(LogTag).filter(LogTag.name == tag_filter)
    if search:
        query = query.filter(
            LogEntry.title.ilike(f'%{search}%') |
            LogEntry.content.ilike(f'%{search}%')
        )

    entries = query.order_by(LogEntry.session_number.desc().nullslast(), LogEntry.created_at.desc()).all()
    return jsonify([e.to_dict() for e in entries])


@logs_bp.route('/<campaign_slug>/logs', methods=['POST'])
@jwt_required()
def create_log(campaign_slug):
    user = get_current_user()
    campaign = Campaign.query.filter_by(slug=campaign_slug).first_or_404()

    if not _is_member(user.id, campaign.id):
        return jsonify({'error': 'Not a member'}), 403

    data = request.get_json()
    if not data.get('title'):
        return jsonify({'error': 'Title is required'}), 400

    is_gm = is_gm_or_co_gm(user.id, campaign.id)
    is_gm_only = data.get('is_gm_only', False)
    if is_gm_only and not is_gm:
        return jsonify({'error': 'Only GMs can create GM-only logs'}), 403

    from datetime import date
    session_date = None
    if data.get('session_date'):
        try:
            session_date = date.fromisoformat(data['session_date'])
        except ValueError:
            pass

    entry = LogEntry(
        campaign_id=campaign.id,
        author_id=user.id,
        title=data['title'],
        content=data.get('content', ''),
        session_number=data.get('session_number'),
        session_date=session_date,
        is_gm_only=is_gm_only,
    )
    db.session.add(entry)
    db.session.flush()

    for tag in data.get('tags', []):
        db.session.add(LogTag(entry_id=entry.id, name=tag.strip()))

    db.session.commit()
    return jsonify(entry.to_dict()), 201


@logs_bp.route('/<campaign_slug>/logs/<int:log_id>', methods=['GET'])
@jwt_required()
def get_log(campaign_slug, log_id):
    user = get_current_user()
    campaign = Campaign.query.filter_by(slug=campaign_slug).first_or_404()

    if not _is_member(user.id, campaign.id):
        return jsonify({'error': 'Not a member'}), 403

    entry = LogEntry.query.filter_by(id=log_id, campaign_id=campaign.id).first_or_404()
    is_gm = is_gm_or_co_gm(user.id, campaign.id)

    if entry.is_gm_only and not is_gm:
        return jsonify({'error': 'Forbidden'}), 403

    return jsonify(entry.to_dict())


@logs_bp.route('/<campaign_slug>/logs/<int:log_id>', methods=['PUT'])
@jwt_required()
def update_log(campaign_slug, log_id):
    user = get_current_user()
    campaign = Campaign.query.filter_by(slug=campaign_slug).first_or_404()
    entry = LogEntry.query.filter_by(id=log_id, campaign_id=campaign.id).first_or_404()
    is_gm = is_gm_or_co_gm(user.id, campaign.id)

    if entry.author_id != user.id and not is_gm and not user.is_site_admin:
        return jsonify({'error': 'Forbidden'}), 403

    data = request.get_json()

    for field in ['title', 'content', 'session_number', 'is_gm_only']:
        if field in data:
            setattr(entry, field, data[field])

    if data.get('session_date'):
        from datetime import date
        try:
            entry.session_date = date.fromisoformat(data['session_date'])
        except ValueError:
            pass

    if 'tags' in data:
        LogTag.query.filter_by(entry_id=entry.id).delete()
        for tag in data['tags']:
            db.session.add(LogTag(entry_id=entry.id, name=tag.strip()))

    db.session.commit()
    return jsonify(entry.to_dict())


@logs_bp.route('/<campaign_slug>/logs/<int:log_id>', methods=['DELETE'])
@jwt_required()
def delete_log(campaign_slug, log_id):
    user = get_current_user()
    campaign = Campaign.query.filter_by(slug=campaign_slug).first_or_404()
    entry = LogEntry.query.filter_by(id=log_id, campaign_id=campaign.id).first_or_404()
    is_gm = is_gm_or_co_gm(user.id, campaign.id)

    if entry.author_id != user.id and not is_gm and not user.is_site_admin:
        return jsonify({'error': 'Forbidden'}), 403

    db.session.delete(entry)
    db.session.commit()
    return jsonify({'message': 'Deleted'})


# ─── DOCUMENTS ───────────────────────────────────────────────────

@documents_bp.route('/<campaign_slug>/documents', methods=['GET'])
@jwt_required()
def list_documents(campaign_slug):
    user = get_current_user()
    campaign = Campaign.query.filter_by(slug=campaign_slug).first_or_404()

    if not _is_member(user.id, campaign.id):
        return jsonify({'error': 'Not a member'}), 403

    is_gm = is_gm_or_co_gm(user.id, campaign.id)
    tag_filter = request.args.get('tag')
    search = request.args.get('q', '').strip()

    query = Document.query.filter_by(campaign_id=campaign.id)
    if not is_gm:
        query = query.filter_by(is_gm_only=False)
    if tag_filter:
        query = query.join(DocumentTag).filter(DocumentTag.name == tag_filter)
    if search:
        query = query.filter(
            Document.title.ilike(f'%{search}%') |
            Document.description.ilike(f'%{search}%')
        )

    docs = query.order_by(Document.created_at.desc()).all()
    return jsonify([d.to_dict() for d in docs])


@documents_bp.route('/<campaign_slug>/documents', methods=['POST'])
@jwt_required()
def upload_document(campaign_slug):
    user = get_current_user()
    campaign = Campaign.query.filter_by(slug=campaign_slug).first_or_404()

    if not _is_member(user.id, campaign.id):
        return jsonify({'error': 'Not a member'}), 403

    file = request.files.get('file')
    if not file:
        return jsonify({'error': 'No file provided'}), 400

    if not allowed_file(file.filename, 'document') and not allowed_file(file.filename, 'image'):
        return jsonify({'error': 'File type not allowed'}), 400

    is_gm = is_gm_or_co_gm(user.id, campaign.id)
    is_gm_only = request.form.get('is_gm_only', 'false').lower() == 'true'
    if is_gm_only and not is_gm:
        is_gm_only = False

    result = save_upload(file, f'campaigns/{campaign.slug}/docs', 'document')
    if not result:
        return jsonify({'error': 'Upload failed'}), 500

    path, original_filename, file_size, mime_type = result

    doc = Document(
        campaign_id=campaign.id,
        uploader_id=user.id,
        title=request.form.get('title') or original_filename,
        description=request.form.get('description'),
        filename=path.split('/')[-1],
        original_filename=original_filename,
        file_path=path,
        file_size=file_size,
        mime_type=mime_type,
        is_gm_only=is_gm_only,
    )
    db.session.add(doc)
    db.session.flush()

    tags_raw = request.form.get('tags', '')
    for tag in [t.strip() for t in tags_raw.split(',') if t.strip()]:
        db.session.add(DocumentTag(document_id=doc.id, name=tag))

    db.session.commit()
    return jsonify(doc.to_dict()), 201


@documents_bp.route('/<campaign_slug>/documents/<int:doc_id>', methods=['DELETE'])
@jwt_required()
def delete_document(campaign_slug, doc_id):
    user = get_current_user()
    campaign = Campaign.query.filter_by(slug=campaign_slug).first_or_404()
    doc = Document.query.filter_by(id=doc_id, campaign_id=campaign.id).first_or_404()
    is_gm = is_gm_or_co_gm(user.id, campaign.id)

    if doc.uploader_id != user.id and not is_gm and not user.is_site_admin:
        return jsonify({'error': 'Forbidden'}), 403

    delete_upload(doc.file_path)
    db.session.delete(doc)
    db.session.commit()
    return jsonify({'message': 'Deleted'})
