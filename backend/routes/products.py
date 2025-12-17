from flask import Blueprint, jsonify, request
import math
import threading
from datetime import datetime, timedelta
from services.steam_service import (
    get_steam_featured,
    save_game_to_db,
    update_game_details_systematically,
    fetch_cheapshark_deals,
    verify_deal_on_steam,
)
from models import Game, DealHistory, db
from sqlalchemy import or_

products_bp = Blueprint('products_bp', __name__)

# Module-level mock data for reuse
FULL_MOCK_HARDWARE = [
    {
        "id": 101, "name": "RTX 4070 Ti", "price": 799.99, "originalPrice": 899.99,
        "category": "Hardware", "brand": "NVIDIA", "rating": 4.8, "image": "https://images.unsplash.com/photo-1591488320449-011701bb6704?auto=format&fit=crop&w=400&q=80",
        "description": "Powerful graphics card."
    },
    {
        "id": 102, "name": "Gaming Mouse Pro", "price": 49.99, "originalPrice": 89.99,
        "category": "Hardware", "brand": "Logitech", "rating": 4.6, "image": "https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?auto=format&fit=crop&w=400&q=80",
        "description": "High precision mouse."
    },
    {
        "id": 103, "name": "Mechanical Keyboard", "price": 129.99, "originalPrice": 159.99,
        "category": "Hardware", "brand": "Corsair", "rating": 4.7, "image": "https://images.unsplash.com/photo-1587829741301-dc798b91a603?auto=format&fit=crop&w=400&q=80",
        "description": "Clicky keys."
    },
    {
        "id": 104, "name": "Xbox Series X", "price": 449.99, "originalPrice": 499.99,
        "category": "Hardware", "brand": "Microsoft", "rating": 4.8, "image": "https://images.unsplash.com/photo-1621259182978-fbf93132d53d?auto=format&fit=crop&w=400&q=80",
        "description": "Next-gen console."
    },
    {
        "id": 105, "name": "PlayStation 5", "price": 499.99, "originalPrice": 499.99,
        "category": "Hardware", "brand": "Sony", "rating": 4.9, "image": "https://images.unsplash.com/photo-1606144042614-b2417e99c4e3?auto=format&fit=crop&w=400&q=80",
        "description": "Play Has No Limits."
    },
    {
        "id": 106, "name": "Nintendo Switch OLED", "price": 349.99, "originalPrice": 349.99,
        "category": "Hardware", "brand": "Nintendo", "rating": 4.7, "image": "https://images.unsplash.com/photo-1578303512597-81e6cc155b3e?auto=format&fit=crop&w=400&q=80",
        "description": "Vibrant screen."
    },
    {
        "id": 107, "name": "Gaming Headset", "price": 79.99, "originalPrice": 99.99,
        "category": "Hardware", "brand": "Razer", "rating": 4.4, "image": "https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?auto=format&fit=crop&w=400&q=80",
        "description": "Surround sound."
    },
        {
        "id": 108, "name": "4K Gaming Monitor", "price": 399.99, "originalPrice": 499.99,
        "category": "Hardware", "brand": "LG", "rating": 4.7, "image": "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&w=400&q=80",
        "description": "Stunning visuals."
    }
]

@products_bp.route('/api/products')
def get_products():
    """
    Get products with advanced filtering and sorting.
    Combines Real DB Games and Mock Hardware data.
    """
    # Parse Query Parameters
    page = int(request.args.get('page', 1))
    limit = int(request.args.get('limit', 10))
    
    category_arg = request.args.get('category')
    categories_filter = request.args.get('categories', '')
    categories_list = categories_filter.split(',') if categories_filter else []
    
    min_price = float(request.args.get('min_price', 0))
    max_price = float(request.args.get('max_price', 10000))
    rating_min = float(request.args.get('rating', 0))
    
    sort_option = request.args.get('sort', 'featured')
    
    genres_filter = request.args.get('genres', '')
    genres_list = genres_filter.split(',') if genres_filter else []
    
    brands_filter = request.args.get('brands', '')
    brands_list = brands_filter.split(',') if brands_filter else []
    
    platforms_filter = request.args.get('platforms', '')
    # platforms_list = platforms_filter.split(',') if platforms_filter else []

    # Determine what to fetch
    fetch_games = True
    fetch_hardware = True
    
    # Refine based on explicit category argument
    if category_arg == 'Game':
        fetch_hardware = False
    elif category_arg == 'Hardware':
        fetch_games = False
        
    # Refine based on checkboxes
    if categories_list:
        if 'Game' not in categories_list and 'Consoles' not in categories_list:
            if 'Game' not in categories_list:
                fetch_games = False
        
        has_hardware_cat = any(c in categories_list for c in ['Hardware', 'Components', 'Peripherals', 'Consoles'])
        if not has_hardware_cat and 'Hardware' not in categories_list:
            fetch_hardware = False

    # Implicitly disable hardware if filtering by game-specific attributes
    if genres_list or platforms_filter:
        fetch_hardware = False

    # --- Fetch and Filter Games (DB) ---
    games_data = []
    if fetch_games:
        query = Game.query.filter(Game.is_active == True)
        
        if min_price > 0:
            query = query.filter(Game.price >= min_price)
        if max_price < 10000:
            query = query.filter(Game.price <= max_price)
        if rating_min > 0:
            query = query.filter(Game.rating >= rating_min)
            
        if genres_list:
            # AND logic: Game must match ALL selected genres
            for g in genres_list:
                query = query.filter(Game.genres.ilike(f'%{g}%'))
            
        games_list = query.all()
        games_data = [g.to_dict() for g in games_list]

    # --- Fetch and Filter Hardware (Mock) ---
    hardware_data = []
    if fetch_hardware:
        for item in FULL_MOCK_HARDWARE:
            # Price Filter
            if not (min_price <= item['price'] <= max_price):
                continue
            # Rating Filter
            if item['rating'] < rating_min:
                continue
            # Brand Filter
            if brands_list and item['brand'] not in brands_list:
                continue
            
            hardware_item = {
                'id': item['id'],
                'title': item['name'],
                'price': f"${item['price']:.2f}",
                'originalPrice': f"${item['originalPrice']:.2f}",
                'category': item['category'],
                'discount': f"-{int((1 - item['price']/item['originalPrice'])*100)}%" if item['originalPrice'] > item['price'] else "",
                'image': item['image'],
                'rating': item['rating'],
                'brand': item['brand'],
                'description': item['description'],
                'dealLastVerified': None,
                'dealScore': item['rating'] * 20 # Mock score
            }
            hardware_data.append(hardware_item)

    # --- Combine and Sort ---
    all_products = games_data + hardware_data
    
    def get_price_val(p):
        try:
            val = p['price']
            if val == 'Free': return 0
            return float(str(val).replace('$', '').replace(',', ''))
        except:
            return 0
            
    if sort_option == 'price_asc':
        all_products.sort(key=get_price_val)
    elif sort_option == 'price_desc':
        all_products.sort(key=get_price_val, reverse=True)
    elif sort_option == 'rating_desc':
        all_products.sort(key=lambda x: x['rating'] or 0, reverse=True)
    elif sort_option == 'newest':
         all_products.sort(key=lambda x: x.get('dealLastVerified') or '', reverse=True)
    else: # featured
        all_products.sort(key=lambda x: x.get('dealScore', 0), reverse=True)

    # --- Pagination ---
    total_items = len(all_products)
    start_idx = (page - 1) * limit
    end_idx = start_idx + limit
    paginated_items = all_products[start_idx:end_idx]
    
    total_pages = math.ceil(total_items / limit) if limit > 0 else 1

    return jsonify({
        "products": paginated_items,
        "total_pages": total_pages,
        "total": total_items,
        "page": page
    })

@products_bp.route('/api/products/<int:product_id>')
def get_product(product_id):
    """
    Get a single product by ID.
    Handles both DB Games and Mock Hardware.
    """
    category = request.args.get('category', 'Game')
    
    if category == 'Hardware':
        # Search in mock hardware
        item = next((item for item in FULL_MOCK_HARDWARE if item['id'] == product_id), None)
        if item:
            return jsonify({
                'id': item['id'],
                'title': item['name'],
                'price': f"${item['price']:.2f}",
                'originalPrice': f"${item['originalPrice']:.2f}",
                'category': item['category'],
                'discount': f"-{int((1 - item['price']/item['originalPrice'])*100)}%" if item['originalPrice'] > item['price'] else "",
                'image': item['image'],
                'rating': item['rating'],
                'brand': item['brand'],
                'description': item['description'],
                'dealLastVerified': None,
                'dealScore': item['rating'] * 20
            })
        return jsonify({"error": "Product not found"}), 404
        
    else:
        # Search in DB (Game)
        game = Game.query.get(product_id)
        if game:
            return jsonify(game.to_dict())
            
        # Fallback: Check mock hardware if not found in Games (in case category arg is wrong/missing)
        item = next((item for item in FULL_MOCK_HARDWARE if item['id'] == product_id), None)
        if item:
             return jsonify({
                'id': item['id'],
                'title': item['name'],
                'price': f"${item['price']:.2f}",
                'originalPrice': f"${item['originalPrice']:.2f}",
                'category': item['category'],
                'discount': f"-{int((1 - item['price']/item['originalPrice'])*100)}%" if item['originalPrice'] > item['price'] else "",
                'image': item['image'],
                'rating': item['rating'],
                'brand': item['brand'],
                'description': item['description']
            })
            
        return jsonify({"error": "Product not found"}), 404

@products_bp.route('/api/products/<int:product_id>/verify', methods=['POST'])
def verify_deal_endpoint(product_id):
    """Trigger a verification check for a specific deal"""
    category = request.args.get('category', 'Game')
    
    if category == 'Game':
        # Logic to verify steam deal...
        # For now, just return success mock
        return jsonify({'status': 'verified', 'active': True})
    
    return jsonify({'status': 'ignored'}), 200
