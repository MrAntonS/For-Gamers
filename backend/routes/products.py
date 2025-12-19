from flask import Blueprint, jsonify, request
import math
import threading
from datetime import datetime, timedelta, timezone
from services.steam_service import (
    get_steam_featured,
    save_game_to_db,
    update_game_details_systematically,
    fetch_cheapshark_deals,
    verify_deal_on_steam,
)
from services.ebay_service import verify_hardware_deal
from models import Game, DealHistory, Hardware, db
from sqlalchemy import or_
import logging

products_bp = Blueprint('products_bp', __name__)

@products_bp.route('/api/products')
def get_products():
    """
    Get products with advanced filtering and sorting.
    Combines Real DB Games and Mock Hardware data.
    """
    # Parse Query Parameters
    page = int(request.args.get('page', 1))
    limit = int(request.args.get('limit', 10))
    
    # Search query parameter
    search_query = request.args.get('search', '').strip()
    
    category_arg = request.args.get('category')
    categories_filter = request.args.get('categories', '')
    categories_list = categories_filter.split(',') if categories_filter else []
    
    min_price = float(request.args.get('min_price', 0))
    max_price = float(request.args.get('max_price', 10000))
    rating_min = float(request.args.get('rating', 0))
    
    sort_option = request.args.get('sort', 'featured')
    
    genres_filter = request.args.get('genres', '')
    genres_list = genres_filter.split(',') if genres_filter else []
    
    years_filter = request.args.get('years', '')
    years_list = [int(y) for y in years_filter.split(',') if y.isdigit()]
    
    brands_filter = request.args.get('brands', '')
    brands_list = brands_filter.split(',') if brands_filter else []
    
    platforms_filter = request.args.get('platforms', '')
    platforms_list = platforms_filter.split(',') if platforms_filter else []

    conditions_filter = request.args.get('conditions', '')
    conditions_list = conditions_filter.split(',') if conditions_filter else []

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
        fetch_games = 'Game' in categories_list
        # If 'Hardware' is selected or any specific hardware category is selected
        fetch_hardware = any(c != 'Game' for c in categories_list)

    # Implicitly disable hardware if filtering by game-specific attributes
    if genres_list or platforms_list or years_list:
        fetch_hardware = False
        
    # Implicitly disable games if filtering by hardware-specific attributes
    if conditions_list:
        fetch_games = False
        
    # Filter Games by Brand (All games are currently assumed to be 'Steam')
    if brands_list and 'Steam' not in brands_list:
        fetch_games = False

    # --- Fetch and Filter Games (DB) ---
    games_data = []
    if fetch_games:
        query = Game.query.filter(Game.is_active == True)
        
        # Search filter
        if search_query:
            query = query.filter(
                or_(
                    Game.title.ilike(f'%{search_query}%'),
                    Game.description.ilike(f'%{search_query}%')
                )
            )
        
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
        
        if platforms_list:
            # AND logic: Game must match ALL selected platforms
            for p in platforms_list:
                query = query.filter(Game.platforms.ilike(f'%{p}%'))

        if years_list:
            # OR logic: Game must match ANY of the selected years
            query = query.filter(Game.release_year.in_(years_list))
            
        games_list = query.all()
        games_data = [g.to_dict() for g in games_list]

    # --- Fetch and Filter Hardware (Database) ---
    hardware_data = []
    if fetch_hardware:
        query = Hardware.query.filter(Hardware.is_active == True)
        
        # Only show parent listings (one representative per item group)
        # Items without item_group_id are also included (standalone items)
        query = query.filter(
            (Hardware.is_parent_listing == True) | (Hardware.item_group_id == None)
        )
        
        # Search filter
        if search_query:
            query = query.filter(
                or_(
                    Hardware.title.ilike(f'%{search_query}%'),
                    Hardware.description.ilike(f'%{search_query}%')
                )
            )
        
        if min_price > 0:
            query = query.filter(Hardware.price >= min_price)
        if max_price < 10000:
            query = query.filter(Hardware.price <= max_price)
        
        # Brand filter
        if brands_list:
            query = query.filter(Hardware.brand.in_(brands_list))
            
        # Category filter (Hardware specific)
        if categories_list:
            # Filter by category_name if it matches something in categories_list
            # Note: 'Hardware' is a meta-category, might be in categories_list
            hardware_cats = [c for c in categories_list if c != 'Hardware' and c != 'Game']
            if hardware_cats:
                query = query.filter(Hardware.category_name.in_(hardware_cats))
        
        # Condition filter
        if conditions_list:
            query = query.filter(Hardware.condition.in_(conditions_list))
        
        hardware_list = query.all()
        
        # Group by search_term
        grouped_hardware = {}
        for h in hardware_list:
            # key = search_term (preferred) or title (fallback)
            key = h.search_term or h.title
            if key not in grouped_hardware:
                grouped_hardware[key] = []
            grouped_hardware[key].append(h)
        
        # Select best deal for each group
        for key, items in grouped_hardware.items():
            # Calculate scores for all
            scored_items = []
            for item in items:
                score = item.calculate_deal_score()
                scored_items.append((score, item))
            
            # Sort by score desc
            scored_items.sort(key=lambda x: x[0], reverse=True)
            
            # Pick the best one as representative
            best_score, best_item = scored_items[0]
            item_dict = best_item.to_dict()
            
            # Add metadata about the group
            item_dict['groupCount'] = len(items)
            item_dict['isGrouped'] = True
            
            hardware_data.append(item_dict)

    # --- Combine and Sort ---
    all_products = games_data + hardware_data
    
    def get_price_val(p):
        try:
            val = p['price']
            if val == 'Free': return 0
            return float(str(val).replace('$', '').replace(',', ''))
        except:
            return 0
    
    # Calculate price range from filtered results (before pagination)
    filtered_price_min = 0
    filtered_price_max = 0
    if all_products:
        prices = [get_price_val(p) for p in all_products]
        filtered_price_min = min(prices)
        filtered_price_max = max(prices)
            
    if sort_option == 'price_asc':
        all_products.sort(key=get_price_val)
    elif sort_option == 'price_desc':
        all_products.sort(key=get_price_val, reverse=True)
    elif sort_option == 'rating_desc':
        all_products.sort(key=lambda x: x['rating'] or 0, reverse=True)
    elif sort_option == 'newest':
         all_products.sort(key=lambda x: x.get('dealLastVerified') or '', reverse=True)
    elif sort_option == 'category':
         all_products.sort(key=lambda x: x.get('categoryName') or x.get('category') or '')
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
        "page": page,
        "price_min": filtered_price_min,
        "price_max": filtered_price_max
    })

@products_bp.route('/api/filters')
def get_filters():
    """
    Get all available filter options (genres, brands, platforms, global price range).
    Ensures that every returned option applies to at least one product.
    """
    # 1. Fetch all active games to aggregate dynamic fields
    games = Game.query.filter(Game.is_active == True).all()

    genres_set = set()
    platforms_set = set()
    years_set = set()
    
    # Track min/max price
    # Start with extreme values
    min_p = float('inf')
    max_p = float('-inf')
    
    has_games = len(games) > 0
    
    for g in games:
        # Genres
        if g.genres:
            for genre in g.genres.split(','):
                genres_set.add(genre.strip())
        
        # Platforms
        if g.platforms:
            for platform in g.platforms.split(','):
                platforms_set.add(platform.strip())

        # Years
        if g.release_year:
            years_set.add(g.release_year)
                
        # Price
        p = g.price if g.price is not None else 0
        if p < min_p: min_p = p
        if p > max_p: max_p = p

    # 2. Process Hardware from Database
    hardware_brands_set = set()
    hardware_categories_set = set()
    hardware_conditions_set = set()
    
    hardware_items = Hardware.query.filter(Hardware.is_active == True).all()
    has_hardware = len(hardware_items) > 0
    
    for item in hardware_items:
        # Brands
        if item.brand:
            hardware_brands_set.add(item.brand)
        
        # Categories
        if item.category_name:
            hardware_categories_set.add(item.category_name)
        
        # Conditions
        if item.condition:
            hardware_conditions_set.add(item.condition)
            
        # Price
        p = item.price if item.price is not None else 0
        if p < min_p: min_p = p
        if p > max_p: max_p = p

    # Combine Brands (Games are implicitly "Steam" brand if they exist)
    brands = list(hardware_brands_set)
    if has_games:
        brands.append('Steam')
    
    # Combine Categories
    categories = list(hardware_categories_set)
    if has_games:
        categories.append('Game')
    if has_hardware:
        categories.append('Hardware')
        
    # Handle case with no data
    if min_p == float('inf'): min_p = 0
    if max_p == float('-inf'): max_p = 0

    return jsonify({
        "genres": sorted(list(genres_set)),
        "platforms": sorted(list(platforms_set)),
        "years": sorted(list(years_set), reverse=True),
        "brands": sorted(brands),
        "categories": sorted(categories),
        "conditions": sorted(list(hardware_conditions_set)),
        "price_min": min_p,
        "price_max": max_p
    })

@products_bp.route('/api/products/<int:product_id>')
def get_product(product_id):
    """
    Get a single product by ID.
    Handles both DB Games and Hardware.
    Fast return from DB.
    """
    category = request.args.get('category', 'Game')
    
    if category == 'Hardware':
        hardware = Hardware.query.get(product_id)
        if hardware:
            response_dict = hardware.to_dict()
            
            # Fetch other deals for this search term (siblings)
            if hardware.search_term:
                siblings = Hardware.query.filter(
                    Hardware.search_term == hardware.search_term,
                    Hardware.id != hardware.id,
                    Hardware.is_active == True
                ).all()
                
                all_relevant = siblings + [hardware]
                deals_list = []
                for sib in all_relevant:
                    sib_dict = sib.to_dict()
                    sib_dict['dealScore'] = sib.calculate_deal_score() # Ensure fresh calc
                    deals_list.append(sib_dict)
                
                deals_list.sort(key=lambda x: x.get('dealScore', 0), reverse=True)
                response_dict['listings'] = deals_list
            else:
                listing_entry = hardware.to_dict()
                listing_entry['dealScore'] = hardware.calculate_deal_score()
                response_dict['listings'] = [listing_entry]
                
            return jsonify(response_dict)
        return jsonify({"error": "Product not found"}), 404
        
    else:
        game = Game.query.get(product_id)
        if game:
            return jsonify(game.to_dict())
        return jsonify({"error": "Product not found"}), 404

@products_bp.route('/api/products/<int:product_id>/verify', methods=['POST'])
def verify_product(product_id):
    """
    Verify a deal in the background (called by frontend on click/page load).
    Updates DB and returns the fresh product data.
    """
    category = request.args.get('category', 'Game')
    
    if category == 'Hardware':
        hardware = verify_hardware_deal(product_id)
        if hardware:
            return jsonify(hardware.to_dict())
        return jsonify({"error": "Failed to verify hardware"}), 400
        
    else:
        game = Game.query.get(product_id)
        if not game or not game.steam_id:
            return jsonify({"error": "Game not found"}), 404
            
        print(f"Background verification for {game.title} (Steam ID: {game.steam_id})")
        
        # Run verification logic
        result = verify_deal_on_steam(game.steam_id)
        
        if result:
            game.deal_last_verified = datetime.now(timezone.utc)
            
            if result['is_on_sale']:
                game.price = result['price']
                game.original_price = result['original_price']
                game.discount = result['discount']
                game.deal_ends_at = result.get('deal_ends_at')
                game.is_active = True
            else:
                game.is_active = False
                game.price = game.original_price
                game.discount = 0
                game.deal_ends_at = None
            
            try:
                db.session.commit()
                return jsonify(game.to_dict())
            except Exception as e:
                db.session.rollback()
                logging.exception("Error committing game verification changes for product_id=%s", product_id)
                return jsonify({"error": "Internal server error"}), 500
        
        return jsonify({"error": "Verification failed"}), 500
