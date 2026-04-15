import os
import time
import logging
from flask import Flask, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_jwt_extended import JWTManager
from flask_cors import CORS

logging.basicConfig(level=logging.INFO)
log = logging.getLogger(__name__)

db = SQLAlchemy()
migrate = Migrate()
jwt = JWTManager()


def create_app():
    app = Flask(__name__)

    app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL')
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    app.config['JWT_SECRET_KEY'] = os.environ.get('SECRET_KEY', 'dev-secret-change-me')
    app.config['JWT_ACCESS_TOKEN_EXPIRES'] = 86400
    app.config['UPLOAD_FOLDER'] = os.environ.get('UPLOAD_FOLDER', '/app/uploads')
    app.config['MAX_CONTENT_LENGTH'] = int(os.environ.get('MAX_CONTENT_LENGTH', 52428800))

    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)
    CORS(app, resources={r"/*": {"origins": "*"}})

    from app.routes.auth import auth_bp
    from app.routes.campaigns import campaigns_bp
    from app.routes.characters import characters_bp
    from app.routes.wiki import wiki_bp
    from app.routes.logs_docs import logs_bp, documents_bp
    from app.routes.users import users_bp
    from app.routes.search import search_bp

    app.register_blueprint(auth_bp, url_prefix='/auth')
    app.register_blueprint(campaigns_bp, url_prefix='/campaigns')
    app.register_blueprint(characters_bp, url_prefix='/campaigns')
    app.register_blueprint(wiki_bp, url_prefix='/campaigns')
    app.register_blueprint(logs_bp, url_prefix='/campaigns')
    app.register_blueprint(documents_bp, url_prefix='/campaigns')
    app.register_blueprint(users_bp, url_prefix='/users')
    app.register_blueprint(search_bp, url_prefix='/campaigns')

    _register_error_handlers(app)

    with app.app_context():
        _wait_for_db()
        db.create_all()
        _create_default_admin()

    return app


def _wait_for_db(retries=15, delay=2):
    from sqlalchemy import text
    for i in range(retries):
        try:
            db.session.execute(text('SELECT 1'))
            db.session.remove()
            log.info("Database is ready.")
            return
        except Exception as e:
            log.warning(f"Database not ready (attempt {i+1}/{retries}): {e}")
            time.sleep(delay)
    raise RuntimeError("Could not connect to the database after multiple retries.")


def _create_default_admin():
    from app.models.user import User
    from sqlalchemy.exc import IntegrityError
    # Only worker 1 creates the admin; others skip gracefully
    try:
        if not User.query.filter_by(username='admin').first():
            admin = User(
                username='admin',
                email='admin@ttrpg.local',
                is_site_admin=True,
                display_name='Admin',
            )
            admin.set_password('admin123')
            db.session.add(admin)
            db.session.commit()
            log.info("Default admin created: admin / admin123")
    except IntegrityError:
        db.session.rollback()
        log.info("Admin already exists (created by another worker), skipping.")
    except Exception as e:
        db.session.rollback()
        log.error(f"Error creating admin: {e}")


def _register_error_handlers(app):
    @app.errorhandler(Exception)
    def handle_exception(e):
        import traceback
        log.error(f"Unhandled exception:\n{traceback.format_exc()}")
        db.session.rollback()
        return jsonify({'error': 'Internal server error', 'detail': str(e)}), 500

    @app.errorhandler(404)
    def not_found(e):
        return jsonify({'error': 'Not found'}), 404

    @app.errorhandler(405)
    def method_not_allowed(e):
        return jsonify({'error': 'Method not allowed'}), 405
