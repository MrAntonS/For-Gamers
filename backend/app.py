import os
import secrets
import sys
import logging
import threading
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
        # Prefer Postgres only when the host is explicitly configured (e.g. docker-compose sets POSTGRES_HOST=db).
        # Otherwise default to a lightweight local SQLite DB for easy local development.
        postgres_host = os.environ.get('POSTGRES_HOST')
        if not postgres_host:
            os.makedirs(app.instance_path, exist_ok=True)
            sqlite_path = os.path.join(app.instance_path, 'local.db')
            database_url = f"sqlite:///{sqlite_path}"
        else:
            # Construct Postgres URL from components (safer for passwords with special chars)
            db_user = os.environ.get('POSTGRES_USER', 'postgres')
            db_pass = os.environ.get('POSTGRES_PASSWORD', 'postgres')
            db_host = postgres_host
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
        # Run small, add-only migrations (handles both sqlite and Postgres)
        try:
            from migrate_db import run_migrations
            run_migrations(app)
        except Exception:
            # Log the full traceback so we have details in the central log
            app.logger.exception("Error running migrations")

        try:
            from routes import products, minmax, auth, external
        except ImportError:
            # Fallback if running from a different context
            from .routes import products, minmax, auth, external
        
        app.register_blueprint(products.products_bp)
        app.register_blueprint(minmax.minmax_bp)
        app.register_blueprint(auth.auth_bp)
        app.register_blueprint(external.external_bp)

    # Start background thread
    # When Flask debug reloader is on, only start the background thread in the
    # reloader's main process to avoid running it twice.
    debug_mode = (
        os.environ.get("FLASK_DEBUG", "").lower() in ("1", "true", "yes", "on")
        or os.environ.get("FLASK_ENV") == "development"
    )

    if (not debug_mode) or os.environ.get("WERKZEUG_RUN_MAIN") == "true":
        # Check if thread is already running to avoid duplicates in same process
        is_running = False
        for t in threading.enumerate():
            if t.name == "BackgroundSteamFetch":
                is_running = True
                break
        
        if not is_running:
            # Use file-based lock to prevent multiple processes from starting the task
            # This handles Gunicorn workers or multiple Flask processes
            lock_file = os.path.join(app.instance_path, '.background_task.lock')
            
            try:
                # Try to acquire lock (non-blocking)
                import fcntl
                lock_fd = open(lock_file, 'w')
                fcntl.flock(lock_fd, fcntl.LOCK_EX | fcntl.LOCK_NB)
                
                # We got the lock, start the thread
                bg_thread = threading.Thread(
                    target=background_task, 
                    args=(app, lock_fd), 
                    name="BackgroundSteamFetch"
                )
                bg_thread.daemon = True
                bg_thread.start()
                print("Background Steam fetch thread started (acquired lock)")
            except (IOError, OSError, ImportError):
                # fcntl not available (Windows) or lock already held
                # On Windows, use a simpler approach with a PID file
                try:
                    import msvcrt
                    lock_fd = open(lock_file, 'w')
                    msvcrt.locking(lock_fd.fileno(), msvcrt.LK_NBLCK, 1)
                    
                    bg_thread = threading.Thread(
                        target=background_task, 
                        args=(app, lock_fd), 
                        name="BackgroundSteamFetch"
                    )
                    bg_thread.daemon = True
                    bg_thread.start()
                    print("Background Steam fetch thread started (acquired lock - Windows)")
                except (IOError, OSError, ImportError):
                    print("Background task already running in another process, skipping")

    return app

def background_task(app, lock_fd=None):
    """
    Background task to continuously fetch games from Steam and hardware from eBay.
    Holds a file lock to ensure only one instance runs across processes.
    """
    import time
    from services.steam_service import (
        fetch_cheapshark_deals, 
        update_game_details_systematically,
        verify_and_update_stale_deals,
        reactivate_deals_from_cheapshark
    )
    from services.ebay_service import (
        fetch_all_hardware_deals,
        deactivate_old_hardware_listings
    )
    
    # Keep lock_fd open to maintain the lock
    try:
        with app.app_context():
            first_run = True
            run_count = 0
            while True:
                print("Running background fetch (Steam + eBay)...")
                
                # Fetch more pages on first run to populate DB
                pages = 50 if first_run else 5
                
                # === STEAM GAME DEALS ===
                
                # 1. Fetch deals from CheapShark (this will also reactivate any deals that come back)
                try:
                    fetch_cheapshark_deals(pages=pages)
                except Exception as e:
                    print(f"Error in CheapShark fetch: {e}")

                # 2. Update details for games that miss them
                try:
                    update_game_details_systematically(limit=50)
                except Exception as e:
                    print(f"Error in Steam details update: {e}")
                
                # 3. Verify stale deals directly on Steam (check 10 deals per run)
                # This catches deals that expired between CheapShark updates
                try:
                    verify_and_update_stale_deals(hours_threshold=12, batch_size=10)
                except Exception as e:
                    print(f"Error verifying stale deals: {e}")
                
                # 4. Every 6th run (~1 hour), check if any inactive games have new deals
                run_count += 1
                if run_count % 6 == 0:
                    try:
                        reactivate_deals_from_cheapshark()
                    except Exception as e:
                        print(f"Error reactivating deals: {e}")
                
                # === EBAY HARDWARE DEALS ===
                
                # 5. Fetch hardware deals from eBay
                # On first run, fetch more items to populate the database
                # On subsequent runs, fetch fewer items to keep deals fresh
                try:
                    items_per_cat = 20 if first_run else 5
                    fetch_all_hardware_deals(items_per_category=items_per_cat)
                except Exception as e:
                    print(f"Error fetching eBay hardware: {e}")
                
                # 6. Every 3rd run (~30 minutes), deactivate old eBay listings
                if run_count % 3 == 0:
                    try:
                        deactivate_old_hardware_listings(hours_threshold=48)
                    except Exception as e:
                        print(f"Error deactivating old hardware: {e}")
                
                first_run = False
                # Sleep for 10 minutes
                time.sleep(600)
    finally:
        # Release lock on exit
        if lock_fd:
            try:
                lock_fd.close()
            except:
                pass

if __name__ == "__main__":
    app = create_app()
    app.run(debug=True, host='0.0.0.0', port=5000)
