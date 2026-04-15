from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from slugify import slugify
from app import db
from app.models.campaign import Campaign, CampaignMember
from app.models.content import WikiArticle, WikiTag, WikiRevision
from app.models.user import User
from app.utils.auth import get_current_user, is_gm_or_co_gm
from app.utils.uploads import save_upload, allowed_file

wiki_bp = Blueprint('wiki', __name__)


def _is_member(user_id, campaign_id):
    if db.session.get(User, user_id).is_site_admin:
        return True
    return CampaignMember.query.filter_by(campaign_id=campaign_id, user_id=user_id).first() is not None


def _make_slug(title, campaign_id):
    base = slugify(title)
    slug = base
    counter = 1
    while WikiArticle.query.filter_by(campaign_id=campaign_id, slug=slug).first():
        slug = f"{base}-{counter}"
        counter += 1
    return slug


@wiki_bp.route('/<campaign_slug>/wiki', methods=['GET'])
@jwt_required()
def list_articles(campaign_slug):
    user = get_current_user()
    campaign = Campaign.query.filter_by(slug=campaign_slug).first_or_404()

    if not _is_member(user.id, campaign.id):
        return jsonify({'error': 'Not a member'}), 403

    is_gm = is_gm_or_co_gm(user.id, campaign.id)
    tag_filter = request.args.get('tag')
    category_filter = request.args.get('category')
    search = request.args.get('q', '').strip()

    query = WikiArticle.query.filter_by(campaign_id=campaign.id)

    if not is_gm:
        query = query.filter_by(is_gm_only=False)
    if tag_filter:
        query = query.join(WikiTag).filter(WikiTag.name == tag_filter)
    if category_filter:
        query = query.filter_by(category=category_filter)
    if search:
        query = query.filter(
            WikiArticle.title.ilike(f'%{search}%') |
            WikiArticle.content.ilike(f'%{search}%')
        )

    articles = query.order_by(WikiArticle.title).all()
    return jsonify([a.to_dict() for a in articles])


@wiki_bp.route('/<campaign_slug>/wiki', methods=['POST'])
@jwt_required()
def create_article(campaign_slug):
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
        return jsonify({'error': 'Only GMs can create GM-only articles'}), 403

    article = WikiArticle(
        campaign_id=campaign.id,
        author_id=user.id,
        title=data['title'],
        slug=_make_slug(data['title'], campaign.id),
        content=data.get('content', ''),
        category=data.get('category'),
        is_gm_only=is_gm_only,
    )
    db.session.add(article)
    db.session.flush()

    for tag in data.get('tags', []):
        db.session.add(WikiTag(article_id=article.id, name=tag.strip()))

    db.session.commit()
    return jsonify(article.to_dict()), 201


@wiki_bp.route('/<campaign_slug>/wiki/<int:article_id>', methods=['GET'])
@jwt_required()
def get_article(campaign_slug, article_id):
    user = get_current_user()
    campaign = Campaign.query.filter_by(slug=campaign_slug).first_or_404()

    if not _is_member(user.id, campaign.id):
        return jsonify({'error': 'Not a member'}), 403

    article = WikiArticle.query.filter_by(id=article_id, campaign_id=campaign.id).first_or_404()
    is_gm = is_gm_or_co_gm(user.id, campaign.id)

    if article.is_gm_only and not is_gm:
        return jsonify({'error': 'Forbidden'}), 403

    data = article.to_dict()
    data['revisions'] = [
        {'id': r.id, 'editor': r.editor.to_dict(), 'summary': r.summary, 'created_at': r.created_at.isoformat()}
        for r in article.revisions[-10:]
    ]
    return jsonify(data)


@wiki_bp.route('/<campaign_slug>/wiki/<int:article_id>', methods=['PUT'])
@jwt_required()
def update_article(campaign_slug, article_id):
    user = get_current_user()
    campaign = Campaign.query.filter_by(slug=campaign_slug).first_or_404()

    if not _is_member(user.id, campaign.id):
        return jsonify({'error': 'Not a member'}), 403

    article = WikiArticle.query.filter_by(id=article_id, campaign_id=campaign.id).first_or_404()
    is_gm = is_gm_or_co_gm(user.id, campaign.id)

    if article.is_gm_only and not is_gm:
        return jsonify({'error': 'Forbidden'}), 403

    data = request.get_json()

    # Save revision before updating
    revision = WikiRevision(
        article_id=article.id,
        editor_id=user.id,
        content=article.content,
        summary=data.get('edit_summary', 'Updated'),
    )
    db.session.add(revision)

    if 'title' in data:
        article.title = data['title']
    if 'content' in data:
        article.content = data['content']
    if 'category' in data:
        article.category = data['category']
    if is_gm and 'is_gm_only' in data:
        article.is_gm_only = data['is_gm_only']
    if 'tags' in data:
        WikiTag.query.filter_by(article_id=article.id).delete()
        for tag in data['tags']:
            db.session.add(WikiTag(article_id=article.id, name=tag.strip()))

    article.last_editor_id = user.id
    db.session.commit()
    return jsonify(article.to_dict())


@wiki_bp.route('/<campaign_slug>/wiki/<int:article_id>', methods=['DELETE'])
@jwt_required()
def delete_article(campaign_slug, article_id):
    user = get_current_user()
    campaign = Campaign.query.filter_by(slug=campaign_slug).first_or_404()
    is_gm = is_gm_or_co_gm(user.id, campaign.id)

    if not is_gm and not user.is_site_admin:
        return jsonify({'error': 'GM required'}), 403

    article = WikiArticle.query.filter_by(id=article_id, campaign_id=campaign.id).first_or_404()
    db.session.delete(article)
    db.session.commit()
    return jsonify({'message': 'Deleted'})


@wiki_bp.route('/<campaign_slug>/wiki/tags', methods=['GET'])
@jwt_required()
def list_wiki_tags(campaign_slug):
    user = get_current_user()
    campaign = Campaign.query.filter_by(slug=campaign_slug).first_or_404()

    if not _is_member(user.id, campaign.id):
        return jsonify({'error': 'Not a member'}), 403

    is_gm = is_gm_or_co_gm(user.id, campaign.id)

    article_ids_q = WikiArticle.query.filter_by(campaign_id=campaign.id)
    if not is_gm:
        article_ids_q = article_ids_q.filter_by(is_gm_only=False)
    article_ids = [a.id for a in article_ids_q.all()]

    tags = db.session.query(WikiTag.name, db.func.count(WikiTag.id)).filter(
        WikiTag.article_id.in_(article_ids)
    ).group_by(WikiTag.name).order_by(WikiTag.name).all()

    return jsonify([{'name': t[0], 'count': t[1]} for t in tags])


@wiki_bp.route('/<campaign_slug>/wiki/<int:article_id>/cover', methods=['POST'])
@jwt_required()
def upload_article_cover(campaign_slug, article_id):
    user = get_current_user()
    campaign = Campaign.query.filter_by(slug=campaign_slug).first_or_404()

    if not _is_member(user.id, campaign.id):
        return jsonify({'error': 'Not a member'}), 403

    article = WikiArticle.query.filter_by(id=article_id, campaign_id=campaign.id).first_or_404()
    file = request.files.get('file')
    if not file or not allowed_file(file.filename, 'image'):
        return jsonify({'error': 'Invalid image'}), 400

    result = save_upload(file, f'campaigns/{campaign.slug}/wiki', 'image')
    if result:
        path, _, _, _ = result
        article.cover_image_url = f'/uploads/{path}'
        db.session.commit()

    return jsonify({'cover_image_url': article.cover_image_url})
