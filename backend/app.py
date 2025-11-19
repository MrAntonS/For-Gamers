from flask import Flask
from flask_cors import CORS

def create_app():
    app = Flask(__name__)
    # Enable CORS for all domains on all routes
    CORS(app, resources={r"/*": {"origins": "*"}})

    with app.app_context():
        try:
            from .routes import products
        except ImportError:
            from routes import products
        app.register_blueprint(products.products_bp)

    return app

if __name__ == "__main__":
    app = create_app()
    print("Starting Flask server on http://localhost:5000")
    app.run(debug=True, host='0.0.0.0', port=5000)
