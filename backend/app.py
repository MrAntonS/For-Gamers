from flask import Flask
from flask_cors import CORS

def create_app():
    app = Flask(__name__)
    # Enable CORS for all domains on all routes, allowing all methods and headers
    CORS(app, resources={r"/*": {"origins": "*", "methods": "*", "allow_headers": "*"}})

    with app.app_context():
        try:
            from .routes import products, minmax
        except ImportError:
            from routes import products, minmax
        app.register_blueprint(products.products_bp)
        app.register_blueprint(minmax.minmax_bp)

    return app

if __name__ == "__main__":
    app = create_app()
    app.run(debug=True, host='0.0.0.0', port=5000)
