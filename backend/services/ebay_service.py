import os
import requests
import time
import json
import logging
from datetime import datetime, timedelta, timezone
from models import db, Hardware
from sqlalchemy.exc import IntegrityError

logger = logging.getLogger(__name__)

# eBay API Configuration
EBAY_CLIENT_ID = os.environ.get("EBAY_CLIENT_ID")
EBAY_CLIENT_SECRET = os.environ.get("EBAY_CLIENT_SECRET")
EBAY_API_ENV = os.environ.get("EBAY_API_ENV", "production")  # or "sandbox"

# API endpoints
if EBAY_API_ENV == "sandbox":
    OAUTH_URL = "https://api.sandbox.ebay.com/identity/v1/oauth2/token"
    BROWSE_API_URL = "https://api.sandbox.ebay.com/buy/browse/v1"
else:
    OAUTH_URL = "https://api.ebay.com/identity/v1/oauth2/token"
    BROWSE_API_URL = "https://api.ebay.com/buy/browse/v1"

# Token cache
_token_cache = {
    'access_token': None,
    'expires_at': None
}

# Gaming hardware categories and search keywords
HARDWARE_CATEGORIES = {
    'GPU': ['RTX 4090', 'RTX 4080', 'RTX 4070', 'RTX 3080', 'RTX 3070', 'RX 7900', 'RX 6800'],
    'Console': ['PlayStation 5', 'Xbox Series X', 'Nintendo Switch OLED', 'Steam Deck'],
    'Peripheral': ['Gaming Mouse', 'Mechanical Keyboard', 'Gaming Headset', 'Gaming Monitor'],
    'Component': ['Gaming Laptop', 'Gaming PC', 'SSD', 'RAM DDR5', 'Gaming Chair']
}

# Generic keywords that shouldn't typically be used for product grouping
GENERIC_KEYWORDS = {
    'Gaming Mouse', 'Mechanical Keyboard', 'Gaming Headset', 'Gaming Monitor',
    'Gaming Laptop', 'Gaming PC', 'SSD', 'RAM DDR5', 'Gaming Chair'
}


def get_oauth_token():
    """
    Get OAuth 2.0 access token using Client Credentials flow.
    Caches the token until it expires.
    """
    global _token_cache
    
    # Check if we have a valid cached token
    if _token_cache['access_token'] and _token_cache['expires_at']:
        if datetime.now(timezone.utc) < _token_cache['expires_at']:
            return _token_cache['access_token']
    
    # Check if credentials are configured
    if not EBAY_CLIENT_ID or not EBAY_CLIENT_SECRET:
        logger.warning("eBay API credentials not configured. Set EBAY_CLIENT_ID and EBAY_CLIENT_SECRET environment variables.")
        return None
    
    # Request new token
    try:
        headers = {
            'Content-Type': 'application/x-www-form-urlencoded'
        }
        data = {
            'grant_type': 'client_credentials',
            'scope': 'https://api.ebay.com/oauth/api_scope'
        }
        
        response = requests.post(
            OAUTH_URL,
            headers=headers,
            data=data,
            auth=(EBAY_CLIENT_ID, EBAY_CLIENT_SECRET)
        )
        
        if response.status_code == 200:
            token_data = response.json()
            access_token = token_data['access_token']
            expires_in = token_data.get('expires_in', 7200)  # Default 2 hours
            
            # Cache the token (subtract 5 minutes for safety)
            _token_cache['access_token'] = access_token
            _token_cache['expires_at'] = datetime.now(timezone.utc) + timedelta(seconds=expires_in - 300)
            
            logger.info("Successfully obtained eBay OAuth token")
            return access_token
        else:
            logger.error(f"Failed to obtain eBay OAuth token: {response.status_code} - {response.text}")
            return None
            
    except Exception as e:
        logger.error(f"Error obtaining eBay OAuth token: {e}")
        return None


def search_ebay_hardware(query, limit=50, category_filter=None):
    """
    Search for hardware products on eBay using the Browse API.
    
    Args:
        query: Search query string
        limit: Maximum number of results to return
        category_filter: Optional category ID to filter results
    
    Returns:
        List of item dictionaries or None if error
    """
    token = get_oauth_token()
    if not token:
        return None
    
    try:
        headers = {
            'Authorization': f'Bearer {token}',
            'Content-Type': 'application/json',
            'X-EBAY-C-MARKETPLACE-ID': 'EBAY_US'  # US marketplace
        }
        
        params = {
            'q': query,
            'limit': min(limit, 200)  # eBay API max is 200
        }
        
        # Add category filter if provided
        if category_filter:
            params['category_ids'] = category_filter
        
        # Filter for Buy It Now items with price
        params['filter'] = 'buyingOptions:{FIXED_PRICE},price:[1..],priceCurrency:USD'
        
        url = f"{BROWSE_API_URL}/item_summary/search"
        response = requests.get(url, headers=headers, params=params)
        
        if response.status_code == 200:
            data = response.json()
            items = data.get('itemSummaries', [])
            logger.info(f"Found {len(items)} items for query: {query}")
            return items
        elif response.status_code == 429:
            logger.warning("eBay API rate limit exceeded")
            return None
        else:
            logger.error(f"eBay API search error: {response.status_code} - {response.text}")
            return None
            
    except Exception as e:
        logger.error(f"Error searching eBay: {e}")
        return None


def get_item_group_variations(item_group_id):
    """
    Fetch all variations for an item group using the getItemsByItemGroup API.
    
    Args:
        item_group_id: The eBay item group ID
    
    Returns:
        List of item dictionaries with variation details, or None if error
    """
    token = get_oauth_token()
    if not token:
        return None
    
    try:
        headers = {
            'Authorization': f'Bearer {token}',
            'Content-Type': 'application/json',
            'X-EBAY-C-MARKETPLACE-ID': 'EBAY_US'
        }
        
        params = {
            'item_group_id': item_group_id
        }
        
        url = f"{BROWSE_API_URL}/item/get_items_by_item_group"
        response = requests.get(url, headers=headers, params=params)
        
        if response.status_code == 200:
            data = response.json()
            items = data.get('items', [])
            logger.info(f"Found {len(items)} variations for item group: {item_group_id}")
            return items
        elif response.status_code == 404:
            logger.warning(f"Item group not found: {item_group_id}")
            return None
        elif response.status_code == 429:
            logger.warning("eBay API rate limit exceeded")
            return None
        else:
            logger.error(f"eBay API getItemsByItemGroup error: {response.status_code} - {response.text}")
            return None
            
    except Exception as e:
        logger.error(f"Error fetching item group variations: {e}")
        return None


def parse_ebay_item(item_data, category_name=None, search_term=None):
    """
    Parse eBay item data into our Hardware model format.
    
    Args:
        item_data: Raw item data from eBay API
        category_name: Category to assign (GPU, Console, etc.)
        search_term: The search query used to find this item
    
    Returns:
        Dictionary with parsed hardware data
    """
    try:
        # Extract basic info
        item_id = item_data.get('itemId')
        title = item_data.get('title', 'Unknown Item')
        
        # Extract price info
        price_info = item_data.get('price', {})
        price = float(price_info.get('value', 0))
        currency = price_info.get('currency', 'USD')
        
        # Extract discount if available
        discount = 0
        original_price = None
        
        # Check for marketing price (original/MSRP)
        marketing_price = item_data.get('marketingPrice')
        if marketing_price:
            original_price_info = marketing_price.get('originalPrice')
            if original_price_info:
                original_price = float(original_price_info.get('value', 0))
                if original_price > price:
                    discount = int(((original_price - price) / original_price) * 100)
        
        # If no marketing price, check for unit pricing
        if not original_price:
            unit_price_info = item_data.get('unitPrice')
            if unit_price_info:
                original_price = float(unit_price_info.get('value', 0))
                if original_price > price:
                    discount = int(((original_price - price) / original_price) * 100)
        
        # Extract image
        image_url = None
        image_info = item_data.get('image')
        if image_info:
            image_url = image_info.get('imageUrl')
        
        # Extract condition
        condition = item_data.get('condition', 'Unknown')
        
        # Extract brand from title or item specifics (basic heuristic)
        brand = extract_brand_from_title(title)
        
        # Extract shipping cost
        shipping_cost = None
        shipping_options = item_data.get('shippingOptions', [])
        if shipping_options and len(shipping_options) > 0:
            shipping_price = shipping_options[0].get('shippingCost')
            if shipping_price:
                shipping_cost = float(shipping_price.get('value', 0))
        
        # Extract seller info
        seller = item_data.get('seller', {})
        seller_info = {
            'username': seller.get('username'),
            'feedbackPercentage': seller.get('feedbackPercentage'),
            'feedbackScore': seller.get('feedbackScore')
        }
        
        # Item URL
        item_web_url = item_data.get('itemWebUrl')
        
        # Short description from snippet
        description = item_data.get('shortDescription', title)
        
        # Extract item group ID for variations
        item_group_id = None
        item_group_href = item_data.get('itemGroupHref')
        if item_group_href:
            # Extract ID from href like: "https://api.ebay.com/buy/browse/v1/item/get_items_by_item_group?item_group_id=123456"
            try:
                item_group_id = item_group_href.split('item_group_id=')[-1]
            except:
                pass
        
        # Extract variation specifics (e.g., {"Storage": "4TB", "RAM": "64GB"})
        variation_specifics = None
        localized_aspects = item_data.get('localizedAspects', [])
        if localized_aspects:
            specifics = {}
            for aspect in localized_aspects:
                name = aspect.get('name')
                value = aspect.get('value')
                if name and value:
                    # Only include relevant variation attributes
                    if name.lower() in ['storage', 'ram', 'memory', 'color', 'size', 'capacity', 'model']:
                        specifics[name] = value
            if specifics:
                variation_specifics = json.dumps(specifics)
        
        return {
            'ebay_item_id': item_id,
            'title': title,
            'price': price,
            'original_price': original_price,
            'currency': currency,
            'discount': discount,
            'image_url': image_url,
            'description': description,
            'condition': condition,
            'category_name': category_name or 'Hardware',
            'brand': brand,
            'seller_info': json.dumps(seller_info),
            'shipping_cost': shipping_cost,
            'is_active': True,
            'deal_ends_at': None,  # eBay doesn't always provide end dates in browse API
            'search_term': search_term,
            'item_group_id': item_group_id,
            'variation_specifics': variation_specifics,
            'is_parent_listing': False  # Will be set later by grouping logic
        }
        
    except Exception as e:
        logger.error(f"Error parsing eBay item: {e}")
        return None


def extract_brand_from_title(title):
    """
    Extract brand name from product title using common gaming brands.
    """
    title_lower = title.lower()
    
    # GPU brands
    if 'nvidia' in title_lower or 'geforce' in title_lower or 'rtx' in title_lower or 'gtx' in title_lower:
        return 'NVIDIA'
    if 'amd' in title_lower or 'radeon' in title_lower or 'rx ' in title_lower:
        return 'AMD'
    
    # Console brands
    if 'playstation' in title_lower or 'ps5' in title_lower or 'ps4' in title_lower:
        return 'Sony'
    if 'xbox' in title_lower:
        return 'Microsoft'
    if 'nintendo' in title_lower or 'switch' in title_lower:
        return 'Nintendo'
    if 'steam deck' in title_lower:
        return 'Valve'
    
    # Peripheral brands
    peripheral_brands = ['logitech', 'razer', 'corsair', 'steelseries', 'hyperx', 'asus', 'msi', 'lg', 'samsung', 'alienware']
    for brand in peripheral_brands:
        if brand in title_lower:
            return brand.capitalize()
    
    return 'Unknown'


def save_hardware_to_db(hardware_data):
    """
    Save or update a hardware item in the database.
    Also handles grouping logic for variations.
    
    Args:
        hardware_data: Dictionary with hardware fields
    
    Returns:
        True if saved/updated, False otherwise
    """
    try:
        ebay_item_id = hardware_data.get('ebay_item_id')
        if not ebay_item_id:
            return False
        
        # Check if item already exists
        existing = Hardware.query.filter_by(ebay_item_id=ebay_item_id).first()
        
        if existing:
            # Update existing item
            for key, value in hardware_data.items():
                if key != 'ebay_item_id':  # Don't update the ID
                    setattr(existing, key, value)
            existing.last_updated = datetime.now(timezone.utc)
            logger.debug(f"Updated hardware item: {existing.title}")
        else:
            # Create new item
            new_hardware = Hardware(**hardware_data)
            db.session.add(new_hardware)
            logger.info(f"Added new hardware item: {new_hardware.title}")
        
        db.session.commit()
        
        # After saving, handle parent listing selection for item groups
        item_group_id = hardware_data.get('item_group_id')
        if item_group_id:
            _update_parent_listing_for_group(item_group_id)
        
        return True
        
    except IntegrityError as e:
        db.session.rollback()
        logger.error(f"Database integrity error saving hardware: {e}")
        return False
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error saving hardware to database: {e}")
        return False


def _update_parent_listing_for_group(item_group_id):
    """
    Update which variation is marked as the parent listing for an item group.
    Selects the best deal based on price, condition, and seller rating.
    
    Args:
        item_group_id: The eBay item group ID
    """
    try:
        # Get all variations in this group
        variations = Hardware.query.filter_by(
            item_group_id=item_group_id,
            is_active=True
        ).all()
        
        if not variations or len(variations) <= 1:
            # Single item or no items, mark as parent if exists
            if variations:
                variations[0].is_parent_listing = True
                db.session.commit()
            return
        
        # Score each variation
        best_variation = None
        best_score = -1
        
        for var in variations:
            score = 0
            
            # Lower price is better (normalize to 0-100 scale)
            if var.price:
                # Inverse score: cheaper = higher score
                max_price = max(v.price for v in variations if v.price)
                min_price = min(v.price for v in variations if v.price)
                if max_price > min_price:
                    score += ((max_price - var.price) / (max_price - min_price)) * 40
                else:
                    score += 40
            
            # Condition bonus
            if var.condition:
                condition_lower = var.condition.lower()
                if 'new' in condition_lower:
                    score += 30
                elif 'refurbished' in condition_lower or 'certified' in condition_lower:
                    score += 20
                elif 'excellent' in condition_lower or 'like new' in condition_lower:
                    score += 15
            
            # Seller rating bonus
            if var.seller_info:
                try:
                    seller_data = json.loads(var.seller_info)
                    feedback_pct = float(seller_data.get('feedbackPercentage', 0))
                    feedback_score = int(seller_data.get('feedbackScore', 0))
                    
                    if feedback_pct >= 98 and feedback_score > 100:
                        score += 20
                    elif feedback_pct >= 95 and feedback_score > 50:
                        score += 10
                except:
                    pass
            
            # Free shipping bonus
            if var.shipping_cost is None or var.shipping_cost == 0:
                score += 10
            
            if score > best_score:
                best_score = score
                best_variation = var
        
        # Update parent listing flags
        for var in variations:
            var.is_parent_listing = (var.id == best_variation.id)
        
        db.session.commit()
        logger.info(f"Set parent listing for group {item_group_id}: {best_variation.title}")
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error updating parent listing for group {item_group_id}: {e}")



def enrich_item_group_with_variations(item_group_id):
    """
    Fetch variation details from eBay's getItemsByItemGroup API and update database.
    This populates the variation_specifics field which isn't available in search results.
    
    Args:
        item_group_id: The eBay item group ID
    
    Returns:
        Number of variations updated
    """
    try:
        # Fetch all variations for this item group from eBay
        variations_data = get_item_group_variations(item_group_id)
        
        if not variations_data:
            logger.warning(f"No variations found for item group {item_group_id}")
            return 0
        
        updated_count = 0
        
        for var_data in variations_data:
            item_id = var_data.get('itemId')
            if not item_id:
                continue
            
            # Find this item in our database
            hardware = Hardware.query.filter_by(ebay_item_id=item_id).first()
            if not hardware:
                continue
            
            # Extract variation specifics from localizedAspects
            localized_aspects = var_data.get('localizedAspects', [])
            if localized_aspects:
                specifics = {}
                for aspect in localized_aspects:
                    name = aspect.get('name')
                    value = aspect.get('value')
                    if name and value:
                        # Only include relevant variation attributes
                        if name.lower() in ['storage', 'ram', 'memory', 'color', 'size', 'capacity', 'model', 'processor', 'graphics']:
                            specifics[name] = value
                
                if specifics:
                    hardware.variation_specifics = json.dumps(specifics)
                    updated_count += 1
                    logger.info(f"Updated variation specifics for {item_id}: {specifics}")
        
        if updated_count > 0:
            db.session.commit()
            logger.info(f"Enriched {updated_count} variations for item group {item_group_id}")
        
        return updated_count
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error enriching item group {item_group_id}: {e}")
        return 0


def fetch_all_hardware_deals(items_per_category=10):
    """
    Fetch hardware deals across all categories and save to database.
    
    Args:
        items_per_category: Number of items to fetch per category
    
    Returns:
        Total number of items fetched
    """
    total_fetched = 0
    item_groups_to_enrich = set()  # Track unique item group IDs
    
    for category, keywords in HARDWARE_CATEGORIES.items():
        logger.info(f"Fetching {category} deals...")
        
        for keyword in keywords:
            # Rate limiting - be respectful
            time.sleep(0.5)
            
            items = search_ebay_hardware(keyword, limit=items_per_category)
            if items:
                # For generic keywords, don't use the keyword as a grouping search_term
                # This ensures we don't group "Generic Mouse A" and "Generic Mouse B" together
                term_to_save = keyword if keyword not in GENERIC_KEYWORDS else None
                
                for item in items:
                    parsed = parse_ebay_item(item, category_name=category, search_term=term_to_save)
                    if parsed and save_hardware_to_db(parsed):
                        total_fetched += 1
                        
                        # Track item groups for enrichment
                        if parsed.get('item_group_id'):
                            item_groups_to_enrich.add(parsed['item_group_id'])
    
    # Enrich all item groups with variation specifics
    if item_groups_to_enrich:
        logger.info(f"Enriching {len(item_groups_to_enrich)} item groups with variation details...")
        for item_group_id in item_groups_to_enrich:
            try:
                time.sleep(0.5)  # Rate limiting
                enrich_item_group_with_variations(item_group_id)
            except Exception as e:
                logger.error(f"Error enriching item group {item_group_id}: {e}")
    
    logger.info(f"Finished fetching eBay hardware. Total items: {total_fetched}")
    return total_fetched


def deactivate_old_hardware_listings(hours_threshold=48):
    """
    Mark hardware listings as inactive if they haven't been updated recently.
    This helps remove sold/expired items from the frontend.
    
    Args:
        hours_threshold: Hours since last update to consider a listing stale
    """
    try:
        threshold_time = datetime.now(timezone.utc) - timedelta(hours=hours_threshold)
        
        stale_items = Hardware.query.filter(
            Hardware.is_active == True,
            Hardware.last_updated < threshold_time
        ).all()
        
        count = 0
        for item in stale_items:
            item.is_active = False
            count += 1
        
        db.session.commit()
        logger.info(f"Deactivated {count} stale hardware listings")
        return count
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error deactivating old hardware: {e}")
        return 0
