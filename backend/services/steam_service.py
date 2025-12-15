import requests
import os
import time
import json
import threading
from datetime import datetime, timedelta
from bs4 import BeautifulSoup
from models import db, Game, DealHistory
from sqlalchemy.exc import IntegrityError

STEAM_API_KEY = os.environ.get("STEAM_API_KEY")


class SteamRateLimiter:
    """
    Global rate limiter for Steam API requests.
    Implements exponential backoff on 429 errors.
    """
    _instance = None
    _lock = threading.Lock()
    
    def __new__(cls):
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
                    cls._instance._init()
        return cls._instance
    
    def _init(self):
        self.is_rate_limited = False
        self.rate_limit_until = None
        self.backoff_seconds = 60  # Start with 1 minute
        self.max_backoff = 3600  # Max 1 hour
        self.last_request_time = 0
        self.min_request_interval = 1.0  # Minimum 1 second between requests
    
    def can_make_request(self) -> bool:
        """Check if we can make a request to Steam API."""
        if self.is_rate_limited:
            if datetime.utcnow() < self.rate_limit_until:
                return False
            # Rate limit period expired, reset
            self.is_rate_limited = False
            self.backoff_seconds = 60  # Reset backoff
        return True
    
    def wait_if_needed(self):
        """Wait if we need to respect rate limits."""
        # Check global rate limit
        if self.is_rate_limited and self.rate_limit_until:
            wait_time = (self.rate_limit_until - datetime.utcnow()).total_seconds()
            if wait_time > 0:
                print(f"Steam API rate limited. Waiting {wait_time:.0f} seconds...")
                return False
        
        # Ensure minimum interval between requests
        now = time.time()
        elapsed = now - self.last_request_time
        if elapsed < self.min_request_interval:
            time.sleep(self.min_request_interval - elapsed)
        
        self.last_request_time = time.time()
        return True
    
    def handle_response(self, response) -> bool:
        """
        Handle response from Steam API.
        Returns True if request was successful, False if rate limited.
        """
        if response.status_code == 429:
            self.is_rate_limited = True
            self.rate_limit_until = datetime.utcnow() + timedelta(seconds=self.backoff_seconds)
            print(f"Steam API 429 rate limit hit. Backing off for {self.backoff_seconds} seconds.")
            # Exponential backoff for next time
            self.backoff_seconds = min(self.backoff_seconds * 2, self.max_backoff)
            return False
        elif response.status_code == 200:
            # Successful request, we can reduce backoff
            self.backoff_seconds = max(60, self.backoff_seconds // 2)
            return True
        return True  # Other status codes don't trigger rate limiting
    
    def get_status(self) -> dict:
        """Get current rate limiter status."""
        return {
            'is_rate_limited': self.is_rate_limited,
            'rate_limit_until': self.rate_limit_until.isoformat() if self.rate_limit_until else None,
            'current_backoff_seconds': self.backoff_seconds
        }


# Global rate limiter instance
steam_rate_limiter = SteamRateLimiter()


def log_deal_history(game, force=False):
    """
    Log a deal history entry if the price has changed from the last recorded entry.
    
    Args:
        game: The Game object to log history for
        force: If True, always log even if price hasn't changed
    """
    try:
        # Get the most recent history entry for this game
        last_entry = DealHistory.query.filter_by(game_id=game.id)\
            .order_by(DealHistory.recorded_at.desc()).first()
        
        # Check if price has changed
        price_changed = (
            force or
            last_entry is None or
            abs((last_entry.price or 0) - (game.price or 0)) > 0.01 or
            (last_entry.discount or 0) != (game.discount or 0) or
            last_entry.is_active != game.is_active
        )
        
        if price_changed:
            history = DealHistory(
                game_id=game.id,
                price=game.price,
                original_price=game.original_price,
                discount=game.discount or 0,
                is_active=game.is_active if game.is_active is not None else True
            )
            db.session.add(history)
            db.session.commit()
            return True
        return False
    except Exception as e:
        db.session.rollback()
        print(f"Error logging deal history for game {game.id}: {e}")
        return False

def parse_requirements(req_html):
    """
    Parse Steam requirements HTML into a structured dictionary.
    """
    if not req_html:
        return None
        
    try:
        soup = BeautifulSoup(req_html, 'html.parser')
        parsed = {}
        
        # Common keys to look for
        keys_map = {
            'os': ['os', 'operating system'],
            'processor': ['processor', 'cpu'],
            'memory': ['memory', 'ram'],
            'graphics': ['graphics', 'video card', 'gpu'],
            'storage': ['storage', 'hard drive', 'space'],
            'sound': ['sound card', 'sound']
        }
        
        # Iterate through list items
        for li in soup.find_all('li'):
            text = li.get_text(" ", strip=True)
            
            # Clean up trademark symbols and weird spaces
            text = text.replace('\u00ae', '').replace('\u2122', '').replace('\u00a9', '').replace('\u3000', ' ')
            
            if ':' in text:
                parts = text.split(':', 1)
                key = parts[0].lower().strip()
                value = parts[1].strip()
                
                # Map to standard keys
                for std_key, variants in keys_map.items():
                    if any(v in key for v in variants):
                        parsed[std_key] = value
                        break
                        
        return parsed if parsed else None
    except Exception as e:
        print(f"Error parsing requirements: {e}")
        return None

def save_game_to_db(item_data):
    """
    Save or update a single game in the database.
    """
    try:
        steam_id = item_data.get('id')
        if not steam_id:
            return None

        game = Game.query.filter_by(steam_id=steam_id).first()
        if not game:
            game = Game(steam_id=steam_id)
        
        game.title = item_data.get('name', 'Unknown')
        
        # Handle different price formats
        # Featured API: final_price (int cents)
        # Search API: price (dict)
        
        if 'final_price' in item_data:
            game.price = item_data.get('final_price', 0) / 100
            game.original_price = item_data.get('original_price', 0) / 100
            game.discount = item_data.get('discount_percent', 0)
        elif 'price' in item_data and isinstance(item_data['price'], dict):
            price_data = item_data['price']
            game.price = price_data.get('final', 0) / 100
            game.original_price = price_data.get('initial', 0) / 100
            # Calculate discount if not provided
            if game.original_price > 0:
                game.discount = int(((game.original_price - game.price) / game.original_price) * 100)
        
        game.image_url = item_data.get('header_image') or item_data.get('large_capsule_image') or item_data.get('tiny_image')
        
        db.session.add(game)
        db.session.commit()
        return game
    except Exception as e:
        db.session.rollback()
        print(f"Error saving game {item_data.get('id')}: {e}")
        return None

def update_game_details_systematically(limit=5):
    """
    Find games with missing details (e.g. description or requirements) and fetch them.
    """
    # Update games that are missing description OR missing pc_requirements OR have raw HTML in requirements
    games_needing_update = Game.query.filter(
        (Game.description == None) | (Game.description == '') | 
        (Game.pc_requirements == None) | (Game.pc_requirements == '') |
        (Game.pc_requirements.like('%<strong>%')) | # Catch raw HTML
        (Game.pc_requirements.like('%<li>%'))       # Catch raw HTML
    ).limit(limit).all()
    
    updated_count = 0
    for game in games_needing_update:
        try:
            details = get_steam_game_details(game.steam_id)
            if details:
                game.description = details.get('short_description')
                # Update image with better quality if available
                # But prefer the vertical library image we set earlier if it exists
                if not game.image_url or 'header.jpg' in game.image_url:
                     game.image_url = details.get('header_image')
                
                # Genres
                genres = details.get('genres', [])
                if genres:
                    game.genres = ",".join([g.get('description', '') for g in genres])
                    
                # Requirements
                pc_req = details.get('pc_requirements', {})
                if isinstance(pc_req, dict):
                    # Parse minimum and recommended
                    parsed_pc = {}
                    if 'minimum' in pc_req:
                        parsed_pc['minimum'] = parse_requirements(pc_req['minimum'])
                    if 'recommended' in pc_req:
                        parsed_pc['recommended'] = parse_requirements(pc_req['recommended'])
                    
                    # Only save if we successfully parsed something, otherwise save raw for debugging/fallback
                    if parsed_pc and (parsed_pc.get('minimum') or parsed_pc.get('recommended')):
                        game.pc_requirements = json.dumps(parsed_pc, ensure_ascii=False)
                    else:
                        # Fallback to raw if parsing fails or empty
                        game.pc_requirements = json.dumps(pc_req, ensure_ascii=False)
                    
                mac_req = details.get('mac_requirements', {})
                if isinstance(mac_req, dict):
                    parsed_mac = {}
                    if 'minimum' in mac_req:
                        parsed_mac['minimum'] = parse_requirements(mac_req['minimum'])
                    if 'recommended' in mac_req:
                        parsed_mac['recommended'] = parse_requirements(mac_req['recommended'])
                        
                    if parsed_mac and (parsed_mac.get('minimum') or parsed_mac.get('recommended')):
                        game.mac_requirements = json.dumps(parsed_mac, ensure_ascii=False)
                    else:
                        game.mac_requirements = json.dumps(mac_req, ensure_ascii=False)
                    
                linux_req = details.get('linux_requirements', {})
                if isinstance(linux_req, dict):
                    parsed_linux = {}
                    if 'minimum' in linux_req:
                        parsed_linux['minimum'] = parse_requirements(linux_req['minimum'])
                    if 'recommended' in linux_req:
                        parsed_linux['recommended'] = parse_requirements(linux_req['recommended'])
                        
                    if parsed_linux and (parsed_linux.get('minimum') or parsed_linux.get('recommended')):
                        game.linux_requirements = json.dumps(parsed_linux, ensure_ascii=False)
                    else:
                        game.linux_requirements = json.dumps(linux_req, ensure_ascii=False)
                
                updated_count += 1
                print(f"Updated details for game {game.steam_id} ({updated_count}/{len(games_needing_update)})")
                
                # Commit immediately to avoid holding DB locks for long periods
                try:
                    db.session.commit()
                except Exception as e:
                    db.session.rollback()
                    print(f"Error committing update for game {game.steam_id}: {e}")

                # Be nice to API - 1.5s delay to be safer
                time.sleep(1.5) 
        except Exception as e:
            print(f"Error updating game {game.steam_id}: {e}")
            # If we hit a rate limit, stop trying to update more games in this batch
            if "429" in str(e):
                print("Steam rate limit reached. Stopping updates.")
                break
            
    if updated_count > 0:
        print(f"Systematically updated {updated_count} games.")

def get_mature_ids(app_ids):
    """
    Check a list of app IDs and return a set of IDs that are considered mature (18+).
    """
    if not app_ids:
        return set()
        
    mature_ids = set()
    # Convert to strings for API
    app_ids_str = [str(x) for x in app_ids]
    
    # Process in batches of 25
    batch_size = 25
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
    }
    for i in range(0, len(app_ids_str), batch_size):
        # Add delay to avoid rate limiting
        if i > 0:
            time.sleep(1)
            
        batch = app_ids_str[i:i+batch_size]
        ids_str = ",".join(batch)
        
        url = "https://store.steampowered.com/api/appdetails"
        params = {
            "appids": ids_str,
            "filters": "content_descriptors,basic", 
            "cc": "US"
        }
        
        try:
            response = requests.get(url, params=params, headers=headers)
            if response.status_code != 200:
                print(f"Batch request failed with status {response.status_code}. Falling back to single requests.")
                # Fallback: Try one by one if batch fails (sometimes Steam dislikes specific combos or length)
                for single_id in batch:
                    time.sleep(0.2) # Small delay for single requests
                    try:
                        single_params = {
                            "appids": single_id,
                            "filters": "content_descriptors,basic",
                            "cc": "US"
                        }
                        single_res = requests.get(url, params=single_params, headers=headers)
                        if single_res.status_code == 200:
                            single_data = single_res.json()
                            if single_data and str(single_id) in single_data:
                                details = single_data[str(single_id)]
                                if details.get('success'):
                                    game_data = details.get('data', {})
                                    
                                    # Safely check required_age
                                    try:
                                        age = int(game_data.get('required_age', 0))
                                    except (ValueError, TypeError):
                                        age = 0
                                        
                                    if age >= 18:
                                        mature_ids.add(int(single_id))
                                    else:
                                        descriptors = game_data.get('content_descriptors', {})
                                        ids = descriptors.get('ids', [])
                                        if 1 in ids or 3 in ids:
                                            mature_ids.add(int(single_id))
                        else:
                             print(f"Single request for {single_id} failed with status {single_res.status_code}")
                    except Exception as e:
                        print(f"Error checking single ID {single_id}: {e}")
                continue
                
            data = response.json()
            if not data:
                print("Batch response JSON is empty/None")
                continue
                
            for app_id, details in data.items():
                if not details.get('success'):
                    continue
                    
                game_data = details.get('data', {})
                
                # Check required_age
                try:
                    age = int(game_data.get('required_age', 0))
                except (ValueError, TypeError):
                    age = 0
                    
                if age >= 18:
                    mature_ids.add(int(app_id))
                    continue
                    
                # Check content descriptors
                # 1: Nudity or Sexual Content
                # 3: Adult Only Sexual Content
                descriptors = game_data.get('content_descriptors', {})
                ids = descriptors.get('ids', [])
                if 1 in ids or 3 in ids:
                    mature_ids.add(int(app_id))
                    
        except Exception as e:
            print(f"Error checking maturity: {e}")
            
    return mature_ids

def search_steam_games(query):
    """
    Search for games on Steam using the Storefront API.
    """
    url = "https://store.steampowered.com/api/storesearch/"
    params = {
        "term": query,
        "l": "english",
        "cc": "US"
    }
    
    try:
        response = requests.get(url, params=params)
        response.raise_for_status()
        data = response.json()
        
        items = data.get('items', [])
        if not items:
            return []
            
        # Filter mature content
        ids = [item['id'] for item in items if 'id' in item]
        mature_ids = get_mature_ids(ids)
        
        return [item for item in items if item.get('id') not in mature_ids]
    except requests.exceptions.RequestException as e:
        print(f"Error calling Steam API: {e}")
        return []

def get_steam_game_details(app_id):
    """
    Get details for a specific game using the Storefront API.
    """
    url = "https://store.steampowered.com/api/appdetails"
    params = {
        "appids": app_id,
        "cc": "US"
    }
    
    try:
        response = requests.get(url, params=params)
        response.raise_for_status()
        data = response.json()
        
        # The response is keyed by app_id
        if str(app_id) in data:
            return data[str(app_id)].get('data', {})
        return {}
    except requests.exceptions.RequestException as e:
        print(f"Error calling Steam API details: {e}")
        return {}

def get_steam_featured():
    """
    Get featured games from Steam.
    """
    url = "https://store.steampowered.com/api/featured/"
    params = {
        "cc": "US",
        "l": "english"
    }
    
    try:
        response = requests.get(url, params=params)
        response.raise_for_status()
        data = response.json()
        
        # Collect all IDs to check
        unique_ids = set()
        for key, value in data.items():
            if isinstance(value, list):
                for item in value:
                    if isinstance(item, dict) and 'id' in item:
                        unique_ids.add(item['id'])
        
        # Filter mature content
        mature_ids = get_mature_ids(list(unique_ids))
        
        # Reconstruct data with filtered lists
        filtered_data = {}
        for key, value in data.items():
            if isinstance(value, list):
                filtered_data[key] = [
                    item for item in value 
                    if isinstance(item, dict) and item.get('id') not in mature_ids
                ]
            else:
                filtered_data[key] = value
                
        return filtered_data
    except requests.exceptions.RequestException as e:
        print(f"Error calling Steam Featured API: {e}")
        return {}

def fetch_steam_specials():
    """
    Fetch specials from Steam Featured Categories and save to DB.
    """
    url = "https://store.steampowered.com/api/featuredcategories"
    params = {
        "cc": "US",
        "l": "english"
    }
    
    try:
        response = requests.get(url, params=params)
        response.raise_for_status()
        data = response.json()
        
        saved_count = 0
        
        # Process specials
        if 'specials' in data and 'items' in data['specials']:
            items = data['specials']['items']
            
            # Filter mature content
            ids = [item['id'] for item in items if 'id' in item]
            mature_ids = get_mature_ids(ids)
            
            for item in items:
                if item.get('id') not in mature_ids:
                    if save_game_to_db(item):
                        saved_count += 1
                        
        # Process top sellers as well to populate DB
        if 'top_sellers' in data and 'items' in data['top_sellers']:
            items = data['top_sellers']['items']
            ids = [item['id'] for item in items if 'id' in item]
            mature_ids = get_mature_ids(ids)
            
            for item in items:
                if item.get('id') not in mature_ids:
                    if save_game_to_db(item):
                        saved_count += 1

        print(f"Fetched and saved {saved_count} games from Steam Specials/Top Sellers.")
        return saved_count
    except Exception as e:
        print(f"Error fetching Steam specials: {e}")
        return 0

def fetch_cheapshark_deals(pages=5):
    """
    Fetch deals from CheapShark API (Store ID 1 = Steam).
    """
    base_url = "https://www.cheapshark.com/api/1.0/deals"
    saved_count = 0
    
    for page in range(pages):
        params = {
            "storeID": "1", # Steam
            "pageSize": "60",
            "pageNumber": str(page)
        }
        
        try:
            print(f"Fetching CheapShark page {page}...")
            response = requests.get(base_url, params=params)

            # Surface unexpected responses (helps debug silent stops)
            if response.status_code not in (200, 429):
                body_preview = (response.text or "")[:500]
                print(f"CheapShark unexpected status {response.status_code} on page {page}. Body (first 500 chars): {body_preview}")
            
            # Handle rate limiting
            if response.status_code == 429:
                print("CheapShark rate limit reached (429). Stopping fetch for now.")
                break
                
            response.raise_for_status()
            deals = response.json()
            
            if not deals:
                print(f"CheapShark returned 0 deals on page {page}. Stopping fetch.")
                break
            
            page_updates = 0
            for deal in deals:
                if save_cheapshark_deal(deal):
                    saved_count += 1
                    page_updates += 1
            
            # If no deals on this page resulted in an update/insert, stop fetching
            if page_updates == 0:
                print(f"No new updates found on page {page}. Stopping fetch.")
                break
                    
        except Exception as e:
            print(f"Error fetching CheapShark deals page {page}: {e}")
            # If we get blocked, stop trying to fetch more pages
            if "blocked" in str(e).lower() or "429" in str(e):
                print("Stopping CheapShark fetch due to block/rate limit.")
                break
            
    print(f"Total CheapShark deals saved: {saved_count}")
    return saved_count

def save_cheapshark_deal(deal):
    """
    Save a CheapShark deal to the database.
    Returns True if a change was made (insert or update), False otherwise.
    """
    try:
        steam_id = deal.get('steamAppID')
        if not steam_id:
            return False
            
        # Convert steam_id to int
        try:
            steam_id = int(steam_id)
        except ValueError:
            return False

        game = Game.query.filter_by(steam_id=steam_id).first()
        is_new = False
        if not game:
            game = Game(steam_id=steam_id)
            is_new = True
        
        has_changes = False
        
        # Title
        new_title = deal.get('title', 'Unknown')
        if game.title != new_title:
            game.title = new_title
            has_changes = True
        
        # Prices are strings in CheapShark
        try:
            new_price = float(deal.get('salePrice', 0))
            new_original = float(deal.get('normalPrice', 0))
            
            if abs((game.price or 0) - new_price) > 0.01:
                game.price = new_price
                has_changes = True
                
            if abs((game.original_price or 0) - new_original) > 0.01:
                game.original_price = new_original
                has_changes = True
        except ValueError:
            pass
            
        # Discount
        try:
            new_discount = int(float(deal.get('savings', 0)))
            if game.discount != new_discount:
                game.discount = new_discount
                has_changes = True
        except ValueError:
            game.discount = 0
            
        # Use high-quality Steam vertical library image (600x900)
        new_image = f"https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/{steam_id}/library_600x900.jpg"
        if game.image_url != new_image:
            game.image_url = new_image
            has_changes = True
        
        # Rating
        try:
            steam_rating_percent = int(deal.get('steamRatingPercent', 0))
            # Convert 0-100 to 0-5
            new_rating = (steam_rating_percent / 100) * 5
            if abs((game.rating or 0) - new_rating) > 0.1:
                game.rating = new_rating
                has_changes = True
        except (ValueError, TypeError):
            pass
        
        # Review count
        try:
            new_review_count = int(deal.get('steamRatingCount', 0))
            if (game.review_count or 0) != new_review_count:
                game.review_count = new_review_count
                has_changes = True
        except (ValueError, TypeError):
            pass
            
        if is_new or has_changes:
            # Mark as active and update verification time
            game.is_active = True
            game.deal_last_verified = datetime.utcnow()
            db.session.add(game)
            db.session.commit()
            
            # Log deal history if price changed
            log_deal_history(game)
            return True
            
        return False
    except Exception as e:
        db.session.rollback()
        print(f"Error saving CheapShark deal {deal.get('title')}: {e}")
        return False


def verify_deal_on_steam(steam_id):
    """
    Check Steam's API to verify if a game is still on sale.
    Returns dict with deal info or None if error/rate limited.
    
    Returns:
        {
            'is_on_sale': bool,
            'price': float,
            'original_price': float,
            'discount': int,
            'deal_ends_at': datetime or None
        }
    """
    # Check rate limiter first
    if not steam_rate_limiter.can_make_request():
        print(f"Steam API rate limited, skipping verification for {steam_id}")
        return None
    
    if not steam_rate_limiter.wait_if_needed():
        return None
    
    try:
        url = f"https://store.steampowered.com/api/appdetails?appids={steam_id}&cc=us"
        response = requests.get(url, timeout=10)
        
        # Handle rate limiting
        if not steam_rate_limiter.handle_response(response):
            return None
        
        if response.status_code != 200:
            return None
            
        data = response.json()
        app_data = data.get(str(steam_id), {})
        
        if not app_data.get('success'):
            return None
            
        game_data = app_data.get('data', {})
        price_overview = game_data.get('price_overview')
        
        if not price_overview:
            # Game might be free or unavailable
            return None
            
        discount = price_overview.get('discount_percent', 0)
        final_price = price_overview.get('final', 0) / 100
        initial_price = price_overview.get('initial', 0) / 100
        
        is_on_sale = discount > 0
        
        # Try to get deal end date from package groups
        deal_ends_at = None
        package_groups = game_data.get('package_groups', [])
        for pkg_group in package_groups:
            subs = pkg_group.get('subs', [])
            for sub in subs:
                # Steam provides discount_end_rtime as Unix timestamp
                discount_end = sub.get('discount_end_rtime')
                if discount_end and discount_end > 0:
                    deal_ends_at = datetime.utcfromtimestamp(discount_end)
                    break
            if deal_ends_at:
                break
        
        return {
            'is_on_sale': is_on_sale,
            'price': final_price,
            'original_price': initial_price,
            'discount': discount,
            'deal_ends_at': deal_ends_at
        }
    except Exception as e:
        print(f"Error verifying deal on Steam for {steam_id}: {e}")
        return None


def get_steam_rate_limiter_status():
    """Get current status of the Steam rate limiter."""
    return steam_rate_limiter.get_status()


def verify_and_update_stale_deals(hours_threshold=24, batch_size=10):
    """
    Find deals that haven't been verified recently and check Steam directly.
    This ensures we catch expired deals even if CheapShark hasn't updated.
    
    Args:
        hours_threshold: Hours since last verification to consider a deal stale
        batch_size: Number of deals to verify per run (to avoid rate limiting)
    """
    try:
        # Check if we're rate limited before even starting
        if not steam_rate_limiter.can_make_request():
            print("Steam API rate limited, skipping stale deal verification")
            return 0
        
        cutoff_time = datetime.utcnow() - timedelta(hours=hours_threshold)
        
        # Find active deals that haven't been verified recently
        stale_deals = Game.query.filter(
            Game.is_active == True,
            Game.discount > 0,
            (Game.deal_last_verified == None) | (Game.deal_last_verified < cutoff_time)
        ).limit(batch_size).all()
        
        if not stale_deals:
            return 0
            
        print(f"Verifying {len(stale_deals)} stale deals on Steam...")
        
        updated_count = 0
        deactivated_count = 0
        
        for game in stale_deals:
            # Check rate limit before each request
            if not steam_rate_limiter.can_make_request():
                print("Hit rate limit during verification, stopping batch")
                break
            
            if not game.steam_id:
                continue
                
            result = verify_deal_on_steam(game.steam_id)
            
            if result is None:
                # Couldn't verify (rate limited or error), just update verification time to try again later
                game.deal_last_verified = datetime.utcnow()
                continue
            
            price_changed = False
            is_on_sale = result['is_on_sale']
            current_price = result['price']
            original_price = result['original_price']
            discount = result['discount']
            deal_ends_at = result.get('deal_ends_at')
            
            if is_on_sale:
                # Deal is still active - update price info if changed
                if abs((game.price or 0) - current_price) > 0.01:
                    game.price = current_price
                    updated_count += 1
                    price_changed = True
                if abs((game.original_price or 0) - original_price) > 0.01:
                    game.original_price = original_price
                    price_changed = True
                if game.discount != discount:
                    game.discount = discount
                    price_changed = True
                # Update deal end date if we got one
                if deal_ends_at:
                    game.deal_ends_at = deal_ends_at
                game.deal_last_verified = datetime.utcnow()
            else:
                # Deal has expired - mark as inactive but keep the game info
                game.is_active = False
                game.discount = 0
                game.price = game.original_price  # Reset to original price
                game.deal_ends_at = None  # Clear the end date
                game.deal_last_verified = datetime.utcnow()
                deactivated_count += 1
                price_changed = True
                print(f"Deal expired: {game.title} (Steam ID: {game.steam_id})")
            
            # Log deal history if anything changed
            if price_changed:
                db.session.flush()  # Make sure game has latest values
                log_deal_history(game)
        
        db.session.commit()
        
        if updated_count > 0 or deactivated_count > 0:
            print(f"Deal verification complete: {updated_count} updated, {deactivated_count} deactivated")
        
        return deactivated_count
    except Exception as e:
        db.session.rollback()
        print(f"Error verifying stale deals: {e}")
        return 0


def reactivate_deals_from_cheapshark():
    """
    Check if any inactive games have new deals on CheapShark.
    If a game was previously on sale, became inactive, and is now on sale again,
    reactivate it with the new deal info.
    """
    try:
        # Get inactive games that might have new deals
        inactive_games = Game.query.filter(
            Game.is_active == False,
            Game.steam_id != None
        ).all()
        
        if not inactive_games:
            return 0
            
        # Build a set of steam_ids to check
        inactive_steam_ids = {game.steam_id for game in inactive_games}
        
        # Fetch current deals from CheapShark
        base_url = "https://www.cheapshark.com/api/1.0/deals"
        current_deals = {}
        
        for page in range(5):  # Check first 5 pages
            params = {
                "storeID": "1",
                "pageSize": "60",
                "pageNumber": str(page)
            }
            
            try:
                response = requests.get(base_url, params=params, timeout=10)
                if response.status_code != 200:
                    break
                    
                deals = response.json()
                if not deals:
                    break
                    
                for deal in deals:
                    steam_id = deal.get('steamAppID')
                    if steam_id:
                        try:
                            current_deals[int(steam_id)] = deal
                        except ValueError:
                            pass
                            
                time.sleep(0.5)
            except Exception as e:
                print(f"Error fetching deals for reactivation check: {e}")
                break
        
        # Check which inactive games now have deals
        reactivated_count = 0
        
        for game in inactive_games:
            if game.steam_id in current_deals:
                deal = current_deals[game.steam_id]
                
                try:
                    new_price = float(deal.get('salePrice', 0))
                    new_original = float(deal.get('normalPrice', 0))
                    new_discount = int(float(deal.get('savings', 0)))
                    
                    if new_discount > 0:
                        # Reactivate the deal
                        game.price = new_price
                        game.original_price = new_original
                        game.discount = new_discount
                        game.is_active = True
                        game.deal_last_verified = datetime.utcnow()
                        reactivated_count += 1
                        print(f"Reactivated deal: {game.title} ({new_discount}% off)")
                except (ValueError, TypeError):
                    pass
        
        if reactivated_count > 0:
            db.session.commit()
            print(f"Reactivated {reactivated_count} deals")
        
        return reactivated_count
    except Exception as e:
        db.session.rollback()
        print(f"Error reactivating deals: {e}")
        return 0

