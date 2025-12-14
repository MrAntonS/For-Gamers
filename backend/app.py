import os
import secrets
import sys
import logging
from logging.handlers import RotatingFileHandler
from flask import Flask
from flask_cors import CORS
from models import db

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass


class _StreamToLogger:
    def __init__(self, logger: logging.Logger, level: int):
        self._logger = logger
        self._level = level

    def write(self, message):
        if not message:
            return
        message = str(message).rstrip()
        if message:
            self._logger.log(self._level, message)

    def flush(self):
        return


def _setup_logging(app: Flask) -> None:
    log_dir = os.environ.get("LOG_DIR", "logs")
    log_file = os.environ.get("LOG_FILE", os.path.join(log_dir, "app.log"))
    max_bytes = int(os.environ.get("LOG_MAX_BYTES", str(5 * 1024 * 1024)))
    backup_count = int(os.environ.get("LOG_BACKUP_COUNT", "5"))

    os.makedirs(os.path.dirname(log_file) or log_dir, exist_ok=True)

    level_name = os.environ.get("LOG_LEVEL", "INFO").upper()
    level = getattr(logging, level_name, logging.INFO)

    formatter = logging.Formatter(
        fmt="%(asctime)s %(levelname)s [%(name)s] %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )

    file_handler = RotatingFileHandler(
        log_file,
        maxBytes=max_bytes,
        backupCount=backup_count,
        encoding="utf-8",
    )
    file_handler.setLevel(level)
    file_handler.setFormatter(formatter)

    stream_handler = logging.StreamHandler(sys.stdout)
    stream_handler.setLevel(level)
    stream_handler.setFormatter(formatter)

    root = logging.getLogger()
    root.setLevel(level)
    root.handlers = []
    root.addHandler(file_handler)
    root.addHandler(stream_handler)

    # Ensure Flask's logger also goes to file
    app.logger.handlers = []
    app.logger.propagate = True

    # If running under Gunicorn, attach handlers to its loggers too
    for logger_name in ("gunicorn.error", "gunicorn.access"):
        g_logger = logging.getLogger(logger_name)
        g_logger.setLevel(level)
        g_logger.handlers = []
        g_logger.propagate = True

    # Redirect all print()/stdout/stderr into logging
    redirect = os.environ.get("REDIRECT_STDOUT_TO_LOG", "1").lower() in ("1", "true", "yes", "on")
    if redirect:
        sys.stdout = _StreamToLogger(logging.getLogger("stdout"), logging.INFO)
        sys.stderr = _StreamToLogger(logging.getLogger("stderr"), logging.ERROR)

def create_app():
    app = Flask(__name__)

    _setup_logging(app)
    
    # Configure Database
    database_url = os.environ.get('DATABASE_URL')
    if not database_url:
        # Fallback to constructing from components (safer for passwords with special chars)
        db_user = os.environ.get('POSTGRES_USER', 'postgres')
        db_pass = os.environ.get('POSTGRES_PASSWORD', 'postgres')
        db_host = os.environ.get('POSTGRES_HOST', 'db')
        db_port = os.environ.get('POSTGRES_PORT', '5432')
        db_name = os.environ.get('POSTGRES_DB', 'gamernexus')
        
        if db_pass:
            import urllib.parse
            db_pass = urllib.parse.quote_plus(db_pass)
            
        database_url = f"postgresql://{db_user}:{db_pass}@{db_host}:{db_port}/{db_name}"

    app.config['SQLALCHEMY_DATABASE_URI'] = database_url
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    app.config['SQLALCHEMY_ENGINE_OPTIONS'] = {"pool_pre_ping": True}
    
    db.init_app(app)
    
    # Configure secret key for sessions
    # In production, SECRET_KEY must be set in environment
    # In development, generate a random key (sessions won't persist across restarts)
    secret_key = os.environ.get('SECRET_KEY')
    if not secret_key:
        if os.environ.get('FLASK_ENV') == 'production':
            raise ValueError("SECRET_KEY environment variable must be set in production")
        # Generate a random key for development
        secret_key = secrets.token_hex(32)
    app.secret_key = secret_key
    
    # Configure session
    app.config['SESSION_COOKIE_HTTPONLY'] = True
    app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'
    app.config['SESSION_COOKIE_SECURE'] = os.environ.get('FLASK_ENV') == 'production'
    
    # Enable CORS with credentials support for session cookies
    CORS(app, supports_credentials=True, origins=[
        'http://localhost:5173',  # Vite dev server
        'http://localhost:3000',
        'http://127.0.0.1:5173',
        'http://127.0.0.1:3000',
        'http://129.158.206.217'  # Production IP
    ])

    with app.app_context():
        # Create database tables
        db.create_all()

        try:
            from routes import products, minmax, auth, external
        except ImportError:
            # Fallback if running from a different context
            from .routes import products, minmax, auth, external
        
        app.register_blueprint(products.products_bp)
        app.register_blueprint(minmax.minmax_bp)
        app.register_blueprint(auth.auth_bp)
        app.register_blueprint(external.external_bp)

    return app

def background_task(app):
    """
    Background task to continuously fetch games from Steam.
    """
    import time
    from services.steam_service import fetch_cheapshark_deals, update_game_details_systematically
    
    with app.app_context():
        while True:
            print("Running background Steam fetch...")
            
            # 1. Fetch deals from CheapShark
            try:
                # Fetching 20 pages (approx 1200 deals) to get more variety
                fetch_cheapshark_deals(pages=20)
            except Exception as e:
                print(f"Error in CheapShark fetch: {e}")

            # 2. Update details for games that miss them
            try:
                # Update details for games that miss them (e.g. description)
                # Increased limit to catch up faster with missing descriptions
                update_game_details_systematically(limit=50)
            except Exception as e:
                print(f"Error in Steam details update: {e}")
            
            # Sleep for 10 minutes
            time.sleep(600)

if __name__ == "__main__":
    app = create_app()
    
    # Start background thread
    import threading
    thread = threading.Thread(target=background_task, args=(app,))
    thread.daemon = True
    thread.start()
    
    app.run(debug=True, host='0.0.0.0', port=5000)
