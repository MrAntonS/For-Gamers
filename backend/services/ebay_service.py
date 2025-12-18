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


def parse_ebay_item(item_data, category_name=None):
    """
    Parse eBay item data into our Hardware model format.
    
    Args:
        item_data: Raw item data from eBay API
        category_name: Category to assign (GPU, Console, etc.)
    
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
            'deal_ends_at': None  # eBay doesn't always provide end dates in browse API
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
        return True
        
    except IntegrityError as e:
        db.session.rollback()
        logger.error(f"Database integrity error saving hardware: {e}")
        return False
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error saving hardware to database: {e}")
        return False


def fetch_all_hardware_deals(items_per_category=10):
    """
    Fetch hardware deals across all categories and save to database.
    
    Args:
        items_per_category: Number of items to fetch per category
    
    Returns:
        Total number of items fetched
    """
    total_fetched = 0
    
    for category, keywords in HARDWARE_CATEGORIES.items():
        logger.info(f"Fetching {category} deals...")
        
        for keyword in keywords:
            # Rate limiting - be respectful
            time.sleep(0.5)
            
            items = search_ebay_hardware(keyword, limit=items_per_category)
            if items:
                for item in items:
                    parsed = parse_ebay_item(item, category_name=category)
                    if parsed and save_hardware_to_db(parsed):
                        total_fetched += 1
    
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
