from flask import Flask
from flask_cors import CORS

def create_app():
    app = Flask(__name__)
    CORS(app)

    with app.app_context():
        from .routes import products
        app.register_blueprint(products.products_bp)

    return app

if __name__ == "__main__":
    app = create_app()
    app.run(debug=True)
