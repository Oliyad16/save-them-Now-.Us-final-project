import os
import sys

from flask import Flask, send_from_directory
from flask_cors import CORS

# Ensure src package is importable
PROJECT_ROOT = os.path.dirname(__file__)
STATIC_DIR = os.path.join(PROJECT_ROOT, 'static')
DATABASE_DIR = os.path.join(PROJECT_ROOT, 'database')
DB_PATH = os.path.join(DATABASE_DIR, 'app.db')

sys.path.insert(0, PROJECT_ROOT)

from src.models.user import db
from src.routes.user import user_bp
from src.routes.missing_persons import missing_persons_bp
from src.models.missing_person import MissingPerson  # ensure model is imported before db.create_all
from src.models.tip import Tip  # ensure model is imported before db.create_all

app = Flask(__name__, static_folder=STATIC_DIR)
app.config['SECRET_KEY'] = 'savethemnow_secret_key'

# Database configuration
os.makedirs(DATABASE_DIR, exist_ok=True)
app.config['SQLALCHEMY_DATABASE_URI'] = f"sqlite:///{DB_PATH}"
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Enable CORS for all routes
CORS(app)

# Register API blueprints (DB-backed)
app.register_blueprint(user_bp, url_prefix='/api')
app.register_blueprint(missing_persons_bp, url_prefix='/api')

# Initialize DB and create tables
with app.app_context():
    db.init_app(app)
    db.create_all()

# Frontend routes
@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve(path):
    static_folder_path = app.static_folder
    if static_folder_path is None:
        return "Static folder not configured", 404

    full_path = os.path.join(static_folder_path, path)
    if path != "" and os.path.exists(full_path):
        return send_from_directory(static_folder_path, path)
    else:
        index_path = os.path.join(static_folder_path, 'index.html')
        if os.path.exists(index_path):
            return send_from_directory(static_folder_path, 'index.html')
        else:
            return "index.html not found", 404


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
