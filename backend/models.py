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
