from app import db
from datetime import datetime


class Character(db.Model):
    __tablename__ = 'characters'

    id = db.Column(db.Integer, primary_key=True)
    campaign_id = db.Column(db.Integer, db.ForeignKey('campaigns.id'), nullable=False)
    creator_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    player_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)

    name = db.Column(db.String(256), nullable=False)
    is_npc = db.Column(db.Boolean, default=False)
    is_public = db.Column(db.Boolean, default=True)
    portrait_url = db.Column(db.String(512))
    race = db.Column(db.String(128))
    character_class = db.Column(db.String(128))
    level = db.Column(db.Integer, default=1)
    status = db.Column(db.String(64), default='alive')
    backstory = db.Column(db.Text)
    description = db.Column(db.Text)
    personality = db.Column(db.Text)
    notes = db.Column(db.Text)
    stats = db.Column(db.JSON)
    custom_fields = db.Column(db.JSON)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    campaign = db.relationship('Campaign', back_populates='characters')
    creator = db.relationship(
        'User', back_populates='characters',
        foreign_keys=[creator_id]
    )
    player = db.relationship(
        'User', foreign_keys=[player_id]
    )
    tags = db.relationship('CharacterTag', back_populates='character', cascade='all, delete-orphan')

    def to_dict(self, include_gm_notes=False):
        data = {
            'id': self.id,
            'campaign_id': self.campaign_id,
            'name': self.name,
            'is_npc': self.is_npc,
            'is_public': self.is_public,
            'portrait_url': self.portrait_url,
            'race': self.race,
            'character_class': self.character_class,
            'level': self.level,
            'status': self.status,
            'backstory': self.backstory,
            'description': self.description,
            'personality': self.personality,
            'stats': self.stats or {},
            'custom_fields': self.custom_fields or {},
            'creator': self.creator.to_dict() if self.creator else None,
            'player': self.player.to_dict() if self.player else None,
            'tags': [t.name for t in self.tags],
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat(),
        }
        if include_gm_notes:
            data['notes'] = self.notes
        return data


class CharacterTag(db.Model):
    __tablename__ = 'character_tags'

    id = db.Column(db.Integer, primary_key=True)
    character_id = db.Column(db.Integer, db.ForeignKey('characters.id'), nullable=False)
    name = db.Column(db.String(64), nullable=False)

    character = db.relationship('Character', back_populates='tags')
