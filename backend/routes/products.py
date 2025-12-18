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
from models import Game, DealHistory, Hardware, db
from sqlalchemy import or_

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
    if genres_list or platforms_list or years_list:
        fetch_hardware = False
        
    # Filter Games by Brand (All games are currently assumed to be 'Steam')
    if brands_list and 'Steam' not in brands_list:
        fetch_games = False

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
        
        if min_price > 0:
            query = query.filter(Hardware.price >= min_price)
        if max_price < 10000:
            query = query.filter(Hardware.price <= max_price)
        
        # Brand filter
        if brands_list:
            query = query.filter(Hardware.brand.in_(brands_list))
        
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
    
    hardware_items = Hardware.query.filter(Hardware.is_active == True).all()
    has_hardware = len(hardware_items) > 0
    
    for item in hardware_items:
        # Brands
        if item.brand:
            hardware_brands_set.add(item.brand)
        
        # Categories
        if item.category_name:
            hardware_categories_set.add(item.category_name)
        hardware_categories_set.add('Hardware')  # General category
            
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
    if has_games and 'Game' not in categories:
        categories.append('Game')
        
    # Handle case with no data
    if min_p == float('inf'): min_p = 0
    if max_p == float('-inf'): max_p = 0

    return jsonify({
        "genres": sorted(list(genres_set)),
        "platforms": sorted(list(platforms_set)),
        "years": sorted(list(years_set), reverse=True),
        "brands": sorted(brands),
        "categories": sorted(categories),
        "price_min": min_p,
        "price_max": max_p
    })

@products_bp.route('/api/products/<int:product_id>')
def get_product(product_id):
    """
    Get a single product by ID.
    Handles both DB Games and Mock Hardware.
    """
    category = request.args.get('category', 'Game')
    
    if category == 'Hardware':
        # Search in Hardware database
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
                
                # Calculate scores and sort
                deals_list = []
                
                # Add current item to the list too?
                # User said: "list them sorted from best to worst". 
                # Usually "Other Deals" excludes current, but "Available Deals" includes it.
                # Let's include ALL relevant deals including the current one, so user can comparison shop easily.
                
                all_relevant = siblings + [hardware]
                
                for sib in all_relevant:
                    sib_dict = sib.to_dict()
                    sib_dict['dealScore'] = sib.calculate_deal_score() # Ensure fresh calc
                    deals_list.append(sib_dict)
                
                # Sort best scoe first
                deals_list.sort(key=lambda x: x['dealScore'], reverse=True)
                
                response_dict['listings'] = deals_list
                response_dict['listings'] = deals_list
            else:
                # Avoid circular reference by creating a fresh copy or just not including self in a list that self owns?
                # Actually, `response_dict['listings'] = [response_dict]` IS circular: Dict A -> List -> Dict A
                # We need to make a COPY of the dict to put in the list, or structure the response differently.
                # Since `response_dict` represents the "Main Product View", and `listings` are the "Deals", 
                # it's better if `listings` contains *simplified* deal objects, or at least distinct copies.
                
                # Create a fresh dict for the listing entry
                listing_entry = hardware.to_dict()
                listing_entry['dealScore'] = hardware.calculate_deal_score()
                response_dict['listings'] = [listing_entry]
                
            return jsonify(response_dict)
        return jsonify({"error": "Product not found"}), 404
        
    else:
        # Search in DB (Game)
        game = Game.query.get(product_id)
        if game:
            # Check if we need to verify the deal (older than 24h)
            should_verify = False
            
            # Verify regardless of active status (to catch expired deals coming back or confirm they are still expired)
            if not game.deal_last_verified:
                should_verify = True
            else:
                # Check if > 24 hours ago
                # Ensure we compare timezone-aware datetimes
                now_utc = datetime.now(timezone.utc)
                
                # deal_last_verified might be naive or aware depending on DB driver
                # If naive, assume UTC. If aware, convert to UTC.
                last_ver = game.deal_last_verified
                if last_ver:
                    if last_ver.tzinfo is None:
                        last_ver = last_ver.replace(tzinfo=timezone.utc)
                    else:
                        last_ver = last_ver.astimezone(timezone.utc)
                
                diff = now_utc - last_ver
                if diff.total_seconds() > 86400: # 24 hours
                    should_verify = True
            
            if should_verify and game.steam_id:
                print(f"Verification needed for {game.title} (active: {game.is_active}, last verified: {game.deal_last_verified})")
                
                # Run verification
                result = verify_deal_on_steam(game.steam_id)
                
                if result:
                    game.deal_last_verified = datetime.now(timezone.utc)
                    
                    if result['is_on_sale']:
                        # Deal is Active or Reactivated
                        if not game.is_active:
                             print(f"Reactivating deal for {game.title}!")
                             
                        game.price = result['price']
                        game.original_price = result['original_price']
                        game.discount = result['discount']
                        if result.get('deal_ends_at'):
                            game.deal_ends_at = result['deal_ends_at']
                        game.is_active = True
                    else:
                        # Deal Expired or Still Expired
                        if game.is_active:
                            print(f"Deal expired during verification: {game.title}")
                            
                        game.is_active = False
                        game.price = game.original_price
                        game.discount = 0
                        game.deal_ends_at = None
                    
                    try:
                        db.session.commit()
                    except Exception as e:
                        db.session.rollback()
                        print(f"Error saving verification result: {e}")

            return jsonify(game.to_dict())
            
        # Fallback: Check hardware if not found in Games (in case category arg is wrong/missing)
        hardware = Hardware.query.get(product_id)
        if hardware:
            # Reuse logic? For now, just recursive call or simple return
            # Let's just return basic info here if category was wrong
             return jsonify(hardware.to_dict())
            
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
