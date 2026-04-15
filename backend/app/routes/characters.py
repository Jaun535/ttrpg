from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models.campaign import Campaign, CampaignMember, CampaignRole
from app.models.character import Character, CharacterTag
from app.models.user import User
from app.utils.auth import get_current_user, is_gm_or_co_gm
from app.utils.uploads import save_upload, allowed_file

characters_bp = Blueprint('characters', __name__)


def _can_edit_character(user, campaign, character):
    if user.is_site_admin:
        return True
    if is_gm_or_co_gm(user.id, campaign.id):
        return True
    if character.creator_id == user.id or character.player_id == user.id:
        return True
    return False


def _is_member(user_id, campaign_id):
    if db.session.get(User, user_id).is_site_admin:
        return True
    return CampaignMember.query.filter_by(campaign_id=campaign_id, user_id=user_id).first() is not None


@characters_bp.route('/<campaign_slug>/characters', methods=['GET'])
@jwt_required()
def list_characters(campaign_slug):
    user = get_current_user()
    campaign = Campaign.query.filter_by(slug=campaign_slug).first_or_404()

    if not _is_member(user.id, campaign.id):
        return jsonify({'error': 'Not a member'}), 403

    is_gm = is_gm_or_co_gm(user.id, campaign.id)
    is_npc = request.args.get('npc', '').lower() == 'true'
    tag_filter = request.args.get('tag')

    query = Character.query.filter_by(campaign_id=campaign.id, is_npc=is_npc)

    if tag_filter:
        query = query.join(CharacterTag).filter(CharacterTag.name == tag_filter)

    characters = query.order_by(Character.name).all()

    result = []
    for c in characters:
        if not c.is_public and not is_gm and c.player_id != user.id and c.creator_id != user.id:
            continue
        result.append(c.to_dict(include_gm_notes=is_gm))

    return jsonify(result)


@characters_bp.route('/<campaign_slug>/characters', methods=['POST'])
@jwt_required()
def create_character(campaign_slug):
    user = get_current_user()
    campaign = Campaign.query.filter_by(slug=campaign_slug).first_or_404()

    if not _is_member(user.id, campaign.id):
        return jsonify({'error': 'Not a member'}), 403

    data = request.get_json()
    if not data.get('name'):
        return jsonify({'error': 'Name is required'}), 400

    is_npc = data.get('is_npc', False)
    if is_npc and not is_gm_or_co_gm(user.id, campaign.id):
        return jsonify({'error': 'Only GMs can create NPCs'}), 403

    player_id = data.get('player_id')
    if player_id and not is_gm_or_co_gm(user.id, campaign.id):
        player_id = user.id  # Players can only assign themselves

    character = Character(
        campaign_id=campaign.id,
        creator_id=user.id,
        player_id=player_id if not is_npc else None,
        name=data['name'],
        is_npc=is_npc,
        is_public=data.get('is_public', True),
        race=data.get('race'),
        character_class=data.get('character_class'),
        level=data.get('level', 1),
        status=data.get('status', 'alive'),
        backstory=data.get('backstory'),
        description=data.get('description'),
        personality=data.get('personality'),
        notes=data.get('notes') if is_gm_or_co_gm(user.id, campaign.id) else None,
        stats=data.get('stats', {}),
        custom_fields=data.get('custom_fields', {}),
    )
    db.session.add(character)
    db.session.flush()

    for tag in data.get('tags', []):
        db.session.add(CharacterTag(character_id=character.id, name=tag.strip()))

    db.session.commit()
    is_gm = is_gm_or_co_gm(user.id, campaign.id)
    return jsonify(character.to_dict(include_gm_notes=is_gm)), 201


@characters_bp.route('/<campaign_slug>/characters/<int:char_id>', methods=['GET'])
@jwt_required()
def get_character(campaign_slug, char_id):
    user = get_current_user()
    campaign = Campaign.query.filter_by(slug=campaign_slug).first_or_404()

    if not _is_member(user.id, campaign.id):
        return jsonify({'error': 'Not a member'}), 403

    character = Character.query.filter_by(id=char_id, campaign_id=campaign.id).first_or_404()
    is_gm = is_gm_or_co_gm(user.id, campaign.id)

    if not character.is_public and not is_gm and character.player_id != user.id:
        return jsonify({'error': 'Forbidden'}), 403

    return jsonify(character.to_dict(include_gm_notes=is_gm))


@characters_bp.route('/<campaign_slug>/characters/<int:char_id>', methods=['PUT'])
@jwt_required()
def update_character(campaign_slug, char_id):
    user = get_current_user()
    campaign = Campaign.query.filter_by(slug=campaign_slug).first_or_404()
    character = Character.query.filter_by(id=char_id, campaign_id=campaign.id).first_or_404()

    if not _can_edit_character(user, campaign, character):
        return jsonify({'error': 'Forbidden'}), 403

    data = request.get_json()
    is_gm = is_gm_or_co_gm(user.id, campaign.id)

    for field in ['name', 'race', 'character_class', 'level', 'status',
                  'backstory', 'description', 'personality', 'stats', 'custom_fields']:
        if field in data:
            setattr(character, field, data[field])

    if is_gm:
        if 'is_public' in data:
            character.is_public = data['is_public']
        if 'notes' in data:
            character.notes = data['notes']
        if 'player_id' in data:
            character.player_id = data['player_id']

    if 'tags' in data:
        CharacterTag.query.filter_by(character_id=character.id).delete()
        for tag in data['tags']:
            db.session.add(CharacterTag(character_id=character.id, name=tag.strip()))

    db.session.commit()
    return jsonify(character.to_dict(include_gm_notes=is_gm))


@characters_bp.route('/<campaign_slug>/characters/<int:char_id>', methods=['DELETE'])
@jwt_required()
def delete_character(campaign_slug, char_id):
    user = get_current_user()
    campaign = Campaign.query.filter_by(slug=campaign_slug).first_or_404()
    character = Character.query.filter_by(id=char_id, campaign_id=campaign.id).first_or_404()

    if not _can_edit_character(user, campaign, character):
        return jsonify({'error': 'Forbidden'}), 403

    db.session.delete(character)
    db.session.commit()
    return jsonify({'message': 'Deleted'})


@characters_bp.route('/<campaign_slug>/characters/<int:char_id>/portrait', methods=['POST'])
@jwt_required()
def upload_portrait(campaign_slug, char_id):
    user = get_current_user()
    campaign = Campaign.query.filter_by(slug=campaign_slug).first_or_404()
    character = Character.query.filter_by(id=char_id, campaign_id=campaign.id).first_or_404()

    if not _can_edit_character(user, campaign, character):
        return jsonify({'error': 'Forbidden'}), 403

    file = request.files.get('file')
    if not file or not allowed_file(file.filename, 'image'):
        return jsonify({'error': 'Invalid image'}), 400

    result = save_upload(file, f'campaigns/{campaign.slug}/characters', 'image')
    if result:
        path, _, _, _ = result
        character.portrait_url = f'/uploads/{path}'
        db.session.commit()

    return jsonify({'portrait_url': character.portrait_url})
