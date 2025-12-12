import os
import secrets
from flask import Flask
from flask_cors import CORS
from models import db

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

def create_app():
    app = Flask(__name__)
    
    # Configure Database
    app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL', 'sqlite:///local.db')
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    
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
