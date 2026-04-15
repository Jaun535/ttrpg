from app import db
from datetime import datetime


class WikiArticle(db.Model):
    __tablename__ = 'wiki_articles'

    id = db.Column(db.Integer, primary_key=True)
    campaign_id = db.Column(db.Integer, db.ForeignKey('campaigns.id'), nullable=False)
    author_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    last_editor_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)

    title = db.Column(db.String(512), nullable=False)
    slug = db.Column(db.String(512), nullable=False)
    content = db.Column(db.Text)
    category = db.Column(db.String(128))
    is_gm_only = db.Column(db.Boolean, default=False)
    cover_image_url = db.Column(db.String(512))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (db.UniqueConstraint('campaign_id', 'slug'),)

    campaign = db.relationship('Campaign', back_populates='wiki_articles')
    author = db.relationship(
        'User', back_populates='wiki_articles',
        foreign_keys=[author_id]
    )
    last_editor = db.relationship(
        'User', foreign_keys=[last_editor_id]
    )
    tags = db.relationship('WikiTag', back_populates='article', cascade='all, delete-orphan')
    revisions = db.relationship('WikiRevision', back_populates='article', cascade='all, delete-orphan')

    def to_dict(self):
        return {
            'id': self.id,
            'campaign_id': self.campaign_id,
            'title': self.title,
            'slug': self.slug,
            'content': self.content,
            'category': self.category,
            'is_gm_only': self.is_gm_only,
            'cover_image_url': self.cover_image_url,
            'author': self.author.to_dict() if self.author else None,
            'last_editor': self.last_editor.to_dict() if self.last_editor else None,
            'tags': [t.name for t in self.tags],
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat(),
        }


class WikiTag(db.Model):
    __tablename__ = 'wiki_tags'

    id = db.Column(db.Integer, primary_key=True)
    article_id = db.Column(db.Integer, db.ForeignKey('wiki_articles.id'), nullable=False)
    name = db.Column(db.String(64), nullable=False)

    article = db.relationship('WikiArticle', back_populates='tags')


class WikiRevision(db.Model):
    __tablename__ = 'wiki_revisions'

    id = db.Column(db.Integer, primary_key=True)
    article_id = db.Column(db.Integer, db.ForeignKey('wiki_articles.id'), nullable=False)
    editor_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    content = db.Column(db.Text)
    summary = db.Column(db.String(512))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    article = db.relationship('WikiArticle', back_populates='revisions')
    editor = db.relationship('User', foreign_keys=[editor_id])


# ─── Session Logs ────────────────────────────────────────────────

class LogEntry(db.Model):
    __tablename__ = 'log_entries'

    id = db.Column(db.Integer, primary_key=True)
    campaign_id = db.Column(db.Integer, db.ForeignKey('campaigns.id'), nullable=False)
    author_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)

    title = db.Column(db.String(512), nullable=False)
    content = db.Column(db.Text)
    session_number = db.Column(db.Integer)
    session_date = db.Column(db.Date)
    is_gm_only = db.Column(db.Boolean, default=False)
    cover_image_url = db.Column(db.String(512))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    campaign = db.relationship('Campaign', back_populates='log_entries')
    author = db.relationship(
        'User', back_populates='log_entries',
        foreign_keys=[author_id]
    )
    tags = db.relationship('LogTag', back_populates='entry', cascade='all, delete-orphan')

    def to_dict(self):
        return {
            'id': self.id,
            'campaign_id': self.campaign_id,
            'title': self.title,
            'content': self.content,
            'session_number': self.session_number,
            'session_date': self.session_date.isoformat() if self.session_date else None,
            'is_gm_only': self.is_gm_only,
            'cover_image_url': self.cover_image_url,
            'author': self.author.to_dict() if self.author else None,
            'tags': [t.name for t in self.tags],
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat(),
        }


class LogTag(db.Model):
    __tablename__ = 'log_tags'

    id = db.Column(db.Integer, primary_key=True)
    entry_id = db.Column(db.Integer, db.ForeignKey('log_entries.id'), nullable=False)
    name = db.Column(db.String(64), nullable=False)

    entry = db.relationship('LogEntry', back_populates='tags')


# ─── Documents ───────────────────────────────────────────────────

class Document(db.Model):
    __tablename__ = 'documents'

    id = db.Column(db.Integer, primary_key=True)
    campaign_id = db.Column(db.Integer, db.ForeignKey('campaigns.id'), nullable=False)
    uploader_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)

    title = db.Column(db.String(512), nullable=False)
    description = db.Column(db.Text)
    filename = db.Column(db.String(512), nullable=False)
    original_filename = db.Column(db.String(512))
    file_path = db.Column(db.String(1024), nullable=False)
    file_size = db.Column(db.BigInteger)
    mime_type = db.Column(db.String(128))
    is_gm_only = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    campaign = db.relationship('Campaign', back_populates='documents')
    uploader = db.relationship(
        'User', back_populates='documents',
        foreign_keys=[uploader_id]
    )
    tags = db.relationship('DocumentTag', back_populates='document', cascade='all, delete-orphan')

    def to_dict(self):
        return {
            'id': self.id,
            'campaign_id': self.campaign_id,
            'title': self.title,
            'description': self.description,
            'filename': self.filename,
            'original_filename': self.original_filename,
            'file_url': f'/uploads/{self.file_path}',
            'file_size': self.file_size,
            'mime_type': self.mime_type,
            'is_gm_only': self.is_gm_only,
            'uploader': self.uploader.to_dict() if self.uploader else None,
            'tags': [t.name for t in self.tags],
            'created_at': self.created_at.isoformat(),
        }


class DocumentTag(db.Model):
    __tablename__ = 'document_tags'

    id = db.Column(db.Integer, primary_key=True)
    document_id = db.Column(db.Integer, db.ForeignKey('documents.id'), nullable=False)
    name = db.Column(db.String(64), nullable=False)

    document = db.relationship('Document', back_populates='tags')
