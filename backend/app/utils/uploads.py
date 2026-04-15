import os
import uuid
from werkzeug.utils import secure_filename
from flask import current_app
from PIL import Image

ALLOWED_EXTENSIONS = {
    'image': {'png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'},
    'document': {'pdf', 'doc', 'docx', 'txt', 'md', 'odt', 'xls', 'xlsx', 'csv',
                 'ppt', 'pptx', 'zip', 'mp3', 'mp4', 'ogg'},
}

MAX_IMAGE_SIZE = (1920, 1920)


def allowed_file(filename, file_type='document'):
    ext = filename.rsplit('.', 1)[-1].lower() if '.' in filename else ''
    return ext in ALLOWED_EXTENSIONS.get(file_type, set())


def save_upload(file, subfolder, file_type='document'):
    """Save an uploaded file, returning the relative path."""
    if not file or not file.filename:
        return None

    original_filename = secure_filename(file.filename)
    ext = original_filename.rsplit('.', 1)[-1].lower() if '.' in original_filename else 'bin'

    unique_name = f"{uuid.uuid4().hex}.{ext}"
    
    upload_root = current_app.config['UPLOAD_FOLDER']
    dest_dir = os.path.join(upload_root, subfolder)
    os.makedirs(dest_dir, exist_ok=True)

    dest_path = os.path.join(dest_dir, unique_name)
    file.save(dest_path)

    # Resize images
    if file_type == 'image' and ext in {'png', 'jpg', 'jpeg', 'webp'}:
        try:
            img = Image.open(dest_path)
            img.thumbnail(MAX_IMAGE_SIZE, Image.LANCZOS)
            img.save(dest_path, optimize=True, quality=85)
        except Exception:
            pass

    relative_path = os.path.join(subfolder, unique_name)
    return relative_path, original_filename, os.path.getsize(dest_path), file.content_type


def delete_upload(relative_path):
    if not relative_path:
        return
    full_path = os.path.join(current_app.config['UPLOAD_FOLDER'], relative_path)
    if os.path.exists(full_path):
        os.remove(full_path)
