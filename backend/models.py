from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.sql import func

db = SQLAlchemy()

class User(db.Model):
    __tablename__ = 'users'

    id = db.Column(db.String(32), primary_key=True)
    username = db.Column(db.String(30), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)
    created_at = db.Column(db.DateTime(timezone=True), server_default=func.now())
    updated_at = db.Column(db.DateTime(timezone=True), onupdate=func.now())

    def to_dict(self):
        return {
            'id': self.id,
            'username': self.username,
            'email': self.email,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

class Game(db.Model):
    __tablename__ = 'games'

    id = db.Column(db.Integer, primary_key=True)
    steam_id = db.Column(db.Integer, unique=True, nullable=True)
    title = db.Column(db.String(255), nullable=False)
    price = db.Column(db.Float, nullable=True)
    original_price = db.Column(db.Float, nullable=True)
    currency = db.Column(db.String(10), default='USD')
    discount = db.Column(db.Integer, default=0)
    image_url = db.Column(db.String(512), nullable=True)
    description = db.Column(db.Text, nullable=True)
    rating = db.Column(db.Float, nullable=True) # Steam rating as 0-5 stars
    review_count = db.Column(db.Integer, default=0) # Number of Steam reviews
    is_mature = db.Column(db.Boolean, default=False)
    is_active = db.Column(db.Boolean, default=True) # Whether the deal is currently active
    deal_last_verified = db.Column(db.DateTime(timezone=True), nullable=True) # When we last verified deal is still active
    deal_ends_at = db.Column(db.DateTime(timezone=True), nullable=True) # When the deal expires (if known)
    genres = db.Column(db.String(512), nullable=True) # Comma separated genres
    platforms = db.Column(db.String(255), nullable=True) # Comma separated platforms: windows,mac,linux
    release_date = db.Column(db.String(50), nullable=True) # Raw release date as string
    release_year = db.Column(db.Integer, nullable=True) # Parsed year
    pc_requirements = db.Column(db.Text, nullable=True) # JSON string or text
    mac_requirements = db.Column(db.Text, nullable=True) # JSON string or text
    linux_requirements = db.Column(db.Text, nullable=True) # JSON string or text
    last_updated = db.Column(db.DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    def calculate_deal_score(self):
        """
        Calculate a deal score based on rating confidence, savings, and verification.
        Higher scores = better deals.
        """
        import math
        
        # Rating normalized to 0-1
        rating_score = (self.rating or 0) / 5.0
        
        # Review confidence: log10(reviews + 1) / 5, capped at 1.0
        reviews = self.review_count or 0
        review_confidence = min(math.log10(reviews + 1) / 5.0, 1.0)
        
        # Weighted rating: rating × (0.3 + 0.7 × review_confidence)
        weighted_rating = rating_score * (0.3 + 0.7 * review_confidence)
        
        # Savings in dollars
        original = self.original_price or 0
        current = self.price or 0
        savings = max(original - current, 0)
        discount_pct = self.discount or 0
        
        # Savings factor
        savings_factor = 1 + (savings / 20.0) + (discount_pct / 100.0)
        
        # Verification boost
        verification_boost = 1.25 if self.deal_last_verified else 1.0
        
        return round(weighted_rating * savings_factor * verification_boost * 100, 1)

    def to_dict(self):
        return {
            'id': self.id,
            'steam_id': self.steam_id,
            'title': self.title,
            'price': f"${self.price:.2f}" if self.price is not None else "Free",
            'originalPrice': f"${self.original_price:.2f}" if self.original_price is not None else None,
            'currency': self.currency,
            'discount': f"-{self.discount}%" if self.discount > 0 else "",
            'image': self.image_url,
            'description': self.description,
            'rating': self.rating,
            'reviewCount': self.review_count,
            'dealScore': self.calculate_deal_score(),
            'isActive': self.is_active,
            'lastUpdated': self.last_updated.isoformat() if self.last_updated else None,
            'dealLastVerified': self.deal_last_verified.isoformat() if self.deal_last_verified else None,
            'dealEndsAt': self.deal_ends_at.isoformat() if self.deal_ends_at else None,
            'category': 'Game',
            'brand': 'Steam',
            'genres': self.genres.split(',') if self.genres else [],
            'platforms': self.platforms.split(',') if self.platforms else [],
            'releaseDate': self.release_date,
            'releaseYear': self.release_year,
            'pc_requirements': self.pc_requirements,
            'mac_requirements': self.mac_requirements,
            'linux_requirements': self.linux_requirements
        }


class DealHistory(db.Model):
    """
    Tracks historical price/deal data for games over time.
    A new record is created whenever a deal's price changes.
    """
    __tablename__ = 'deal_history'

    id = db.Column(db.Integer, primary_key=True)
    game_id = db.Column(db.Integer, db.ForeignKey('games.id'), nullable=False)
    price = db.Column(db.Float, nullable=False)
    original_price = db.Column(db.Float, nullable=True)
    discount = db.Column(db.Integer, default=0)  # Percentage
    is_active = db.Column(db.Boolean, default=True)  # Was the deal active at this point
    recorded_at = db.Column(db.DateTime(timezone=True), server_default=func.now())
    
    # Relationship to Game
    game = db.relationship('Game', backref=db.backref('price_history', lazy='dynamic'))

    def to_dict(self):
        savings = (self.original_price or 0) - (self.price or 0)
        return {
            'id': self.id,
            'gameId': self.game_id,
            'price': self.price,
            'originalPrice': self.original_price,
            'discount': self.discount,
            'savings': round(savings, 2) if savings > 0 else 0,
            'isActive': self.is_active,
            'recordedAt': self.recorded_at.isoformat() if self.recorded_at else None
        }


class Hardware(db.Model):
    """
    Stores hardware products fetched from eBay API.
    Includes gaming hardware like GPUs, consoles, peripherals, etc.
    """
    __tablename__ = 'hardware'

    id = db.Column(db.Integer, primary_key=True)
    ebay_item_id = db.Column(db.String(50), unique=True, nullable=False)  # eBay's unique item ID
    title = db.Column(db.String(255), nullable=False)
    price = db.Column(db.Float, nullable=True)
    original_price = db.Column(db.Float, nullable=True)  # MSRP or list price if available
    currency = db.Column(db.String(10), default='USD')
    discount = db.Column(db.Integer, default=0)  # Percentage discount
    image_url = db.Column(db.String(512), nullable=True)
    description = db.Column(db.Text, nullable=True)
    condition = db.Column(db.String(50), nullable=True)  # New, Used, Refurbished, etc.
    category_name = db.Column(db.String(100), nullable=True)  # GPU, Console, Peripheral, etc.
    brand = db.Column(db.String(100), nullable=True)  # NVIDIA, AMD, Sony, Microsoft, etc.
    seller_info = db.Column(db.Text, nullable=True)  # JSON string with seller details
    shipping_cost = db.Column(db.Float, nullable=True)
    is_active = db.Column(db.Boolean, default=True)  # Whether the listing is still active
    deal_ends_at = db.Column(db.DateTime(timezone=True), nullable=True)  # Listing end time
    search_term = db.Column(db.String(255), nullable=True)  # The query used to find this item (for grouping)
    item_group_id = db.Column(db.String(100), nullable=True, index=True)  # eBay item group ID for variations
    variation_specifics = db.Column(db.Text, nullable=True)  # JSON: {"Storage": "4TB", "RAM": "64GB"}
    is_parent_listing = db.Column(db.Boolean, default=False)  # True if this is the main/representative item
    deal_last_verified = db.Column(db.DateTime(timezone=True), nullable=True) # When we last verified deal is still active
    last_updated = db.Column(db.DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    def calculate_deal_score(self):
        """
        Calculate a deal score for hardware based on discount, condition, and price.
        Higher scores = better deals.
        """
        import math
        
        # Base score from discount
        discount_pct = self.discount or 0
        discount_score = min(discount_pct / 100.0, 0.5)  # Max 0.5 from discount
        
        # Condition bonus (prefer new items)
        condition_bonus = 0.3
        if self.condition:
            condition_lower = self.condition.lower()
            if 'new' in condition_lower:
                condition_bonus = 0.5
            elif 'refurbished' in condition_lower or 'certified' in condition_lower:
                condition_bonus = 0.4
            elif 'used' in condition_lower:
                # Better condition used items score higher
                if 'excellent' in condition_lower or 'like new' in condition_lower:
                    condition_bonus = 0.35
                elif 'good' in condition_lower or 'very good' in condition_lower:
                    condition_bonus = 0.25
                else:
                    condition_bonus = 0.15
        
        # Savings in dollars (capped to prevent huge items dominating)
        original = self.original_price or self.price or 0
        current = self.price or 0
        savings = max(original - current, 0)
        savings_factor = min(savings / 50.0, 0.3)  # Max 0.3 from savings
        
        # Free shipping bonus
        shipping_bonus = 0.1 if (self.shipping_cost is None or self.shipping_cost == 0) else 0
        
        # Seller Score Bonus (from 0 to 0.3)
        seller_bonus = 0
        if self.seller_info:
            try:
                import json
                s_info = json.loads(self.seller_info)
                feedback = float(s_info.get('feedbackPercentage', 0))
                score = int(s_info.get('feedbackScore', 0))
                
                # Trust sellers with high feedback % and decent volume
                if feedback >= 98.0 and score > 50:
                    seller_bonus = 0.2
                elif feedback >= 95.0 and score > 10:
                    seller_bonus = 0.1
                
                # Extra boost for huge sellers
                if score > 1000 and feedback >= 98.0:
                    seller_bonus += 0.1
            except:
                pass

        # Combine scores
        total_score = (discount_score + condition_bonus + savings_factor + shipping_bonus + seller_bonus) * 100
        
        return round(total_score, 1)

    def to_dict(self):
        import json
        
        # Parse seller info if it's JSON string
        seller_data = None
        if self.seller_info:
            try:
                seller_data = json.loads(self.seller_info)
            except:
                seller_data = None
        
        # Calculate rating based on seller feedback percentage
        rating = 0
        if seller_data and seller_data.get('feedbackPercentage'):
            try:
                feedback = float(seller_data.get('feedbackPercentage', 0))
                if feedback >= 99: rating = 5
                elif feedback >= 97: rating = 4.5
                elif feedback >= 95: rating = 4
                elif feedback >= 90: rating = 3.5
                elif feedback > 0: rating = 3
            except:
                rating = 0

        return {
            'id': self.id,
            'ebayItemId': self.ebay_item_id,
            'title': self.title,
            'price': f"${self.price:.2f}" if self.price is not None else None,
            'originalPrice': f"${self.original_price:.2f}" if self.original_price is not None else None,
            'currency': self.currency,
            'discount': f"-{self.discount}%" if self.discount > 0 else "",
            'image': self.image_url,
            'description': self.description,
            'condition': self.condition,
            'dealScore': self.calculate_deal_score(),
            'isActive': self.is_active,
            'lastUpdated': self.last_updated.isoformat() if self.last_updated else None,
            'dealLastVerified': self.deal_last_verified.isoformat() if self.deal_last_verified else None,
            'dealEndsAt': self.deal_ends_at.isoformat() if self.deal_ends_at else None,
            'category': 'Hardware',
            'categoryName': self.category_name,
            'brand': self.brand,
            'searchTerm': self.search_term,
            'sellerInfo': seller_data,
            'shippingCost': f"${self.shipping_cost:.2f}" if self.shipping_cost is not None else "Free",
            'rating': rating,
            'itemGroupId': self.item_group_id,
            'variationSpecifics': json.loads(self.variation_specifics) if self.variation_specifics else None,
            'isParentListing': self.is_parent_listing
        }
