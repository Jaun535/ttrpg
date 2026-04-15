from app import db
from datetime import datetime
from sqlalchemy import Enum
import enum


class CampaignRole(enum.Enum):
    GM = 'gm'
    CO_GM = 'co_gm'
    PLAYER = 'player'
    SPECTATOR = 'spectator'


class CampaignStatus(enum.Enum):
    ACTIVE = 'active'
    PAUSED = 'paused'
    COMPLETED = 'completed'
    ARCHIVED = 'archived'


class Campaign(db.Model):
    __tablename__ = 'campaigns'

    id = db.Column(db.Integer, primary_key=True)
    slug = db.Column(db.String(128), unique=True, nullable=False, index=True)
    name = db.Column(db.String(256), nullable=False)
    description = db.Column(db.Text)
    cover_image_url = db.Column(db.String(512))
    system = db.Column(db.String(128))  # D&D 5e, Pathfinder, etc.
    status = db.Column(db.Enum(CampaignStatus), default=CampaignStatus.ACTIVE)
    is_public = db.Column(db.Boolean, default=False)  # Visible sin login
    join_code = db.Column(db.String(16), unique=True)  # Para invitaciones
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    members = db.relationship('CampaignMember', back_populates='campaign', cascade='all, delete-orphan')
    characters = db.relationship('Character', back_populates='campaign', cascade='all, delete-orphan')
    wiki_articles = db.relationship('WikiArticle', back_populates='campaign', cascade='all, delete-orphan')
    log_entries = db.relationship('LogEntry', back_populates='campaign', cascade='all, delete-orphan')
    documents = db.relationship('Document', back_populates='campaign', cascade='all, delete-orphan')
    tags = db.relationship('CampaignTag', back_populates='campaign', cascade='all, delete-orphan')

    def get_member(self, user_id):
        return CampaignMember.query.filter_by(campaign_id=self.id, user_id=user_id).first()

    def user_role(self, user_id):
        member = self.get_member(user_id)
        return member.role if member else None

    def to_dict(self, user_id=None):
        data = {
            'id': self.id,
            'slug': self.slug,
            'name': self.name,
            'description': self.description,
            'cover_image_url': self.cover_image_url,
            'system': self.system,
            'status': self.status.value,
            'is_public': self.is_public,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat(),
            'member_count': len(self.members),
            'tags': [t.name for t in self.tags],
        }
        if user_id:
            data['my_role'] = self.user_role(user_id).value if self.user_role(user_id) else None
        return data


class CampaignMember(db.Model):
    __tablename__ = 'campaign_members'
    __table_args__ = (db.UniqueConstraint('campaign_id', 'user_id'),)

    id = db.Column(db.Integer, primary_key=True)
    campaign_id = db.Column(db.Integer, db.ForeignKey('campaigns.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    role = db.Column(db.Enum(CampaignRole), nullable=False, default=CampaignRole.PLAYER)
    joined_at = db.Column(db.DateTime, default=datetime.utcnow)
    notes = db.Column(db.Text)  # Notas privadas del GM sobre el jugador

    campaign = db.relationship('Campaign', back_populates='members')
    user = db.relationship('User', back_populates='campaign_memberships')

    def to_dict(self):
        return {
            'id': self.id,
            'user': self.user.to_dict(),
            'role': self.role.value,
            'joined_at': self.joined_at.isoformat(),
        }


class CampaignTag(db.Model):
    __tablename__ = 'campaign_tags'

    id = db.Column(db.Integer, primary_key=True)
    campaign_id = db.Column(db.Integer, db.ForeignKey('campaigns.id'), nullable=False)
    name = db.Column(db.String(64), nullable=False)

    campaign = db.relationship('Campaign', back_populates='tags')
