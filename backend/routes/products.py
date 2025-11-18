from flask import Blueprint, jsonify

products_bp = Blueprint('products_bp', __name__)

@products_bp.route('/api/products')
def get_products():
    """
    A placeholder route to get products.
    In the future, this will fetch data from the eBay API.
    """
    # Placeholder data
    mock_products = [
        {"id": 1, "name": "Gaming Keyboard", "price": 99.99},
        {"id": 2, "name": "Gaming Mouse", "price": 79.99},
    ]
    return jsonify(mock_products)
