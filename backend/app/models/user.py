from app import db
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime


class User(db.Model):
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(64), unique=True, nullable=False, index=True)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)
    display_name = db.Column(db.String(128))
    avatar_url = db.Column(db.String(512))
    bio = db.Column(db.Text)
    is_site_admin = db.Column(db.Boolean, default=False)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    last_seen = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationships — foreign_keys required wherever the target model
    # has more than one FK pointing back to users.
    campaign_memberships = db.relationship(
        'CampaignMember', back_populates='user', cascade='all, delete-orphan'
    )
    characters = db.relationship(
        'Character', back_populates='creator',
        foreign_keys='Character.creator_id'
    )
    wiki_articles = db.relationship(
        'WikiArticle', back_populates='author',
        foreign_keys='WikiArticle.author_id'
    )
    log_entries = db.relationship(
        'LogEntry', back_populates='author',
        foreign_keys='LogEntry.author_id'
    )
    documents = db.relationship(
        'Document', back_populates='uploader',
        foreign_keys='Document.uploader_id'
    )

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def to_dict(self, include_email=False):
        data = {
            'id': self.id,
            'username': self.username,
            'display_name': self.display_name or self.username,
            'avatar_url': self.avatar_url,
            'bio': self.bio,
            'is_site_admin': self.is_site_admin,
            'created_at': self.created_at.isoformat(),
            'last_seen': self.last_seen.isoformat() if self.last_seen else None,
        }
        if include_email:
            data['email'] = self.email
        return data
