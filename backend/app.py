import os
from flask import Flask
from flask_cors import CORS

def create_app():
    app = Flask(__name__)
    
    # Configure secret key for sessions
    app.secret_key = os.environ.get('SECRET_KEY', 'dev-secret-key-change-in-production')
    
    # Configure session
    app.config['SESSION_COOKIE_HTTPONLY'] = True
    app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'
    app.config['SESSION_COOKIE_SECURE'] = os.environ.get('FLASK_ENV') == 'production'
    
    # Enable CORS with credentials support for session cookies
    CORS(app, supports_credentials=True, origins=[
        'http://localhost:5173',  # Vite dev server
        'http://localhost:3000',
        'http://127.0.0.1:5173',
        'http://127.0.0.1:3000'
    ])

    with app.app_context():
        try:
            from .routes import products, minmax, auth
        except ImportError:
            from routes import products, minmax, auth
        app.register_blueprint(products.products_bp)
        app.register_blueprint(minmax.minmax_bp)
        app.register_blueprint(auth.auth_bp)

    return app

if __name__ == "__main__":
    app = create_app()
    app.run(debug=True, host='0.0.0.0', port=5000)
