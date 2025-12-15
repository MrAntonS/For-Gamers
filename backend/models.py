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
    genres = db.Column(db.String(512), nullable=True) # Comma separated genres
    pc_requirements = db.Column(db.Text, nullable=True) # JSON string or text
    mac_requirements = db.Column(db.Text, nullable=True) # JSON string or text
    linux_requirements = db.Column(db.Text, nullable=True) # JSON string or text
    last_updated = db.Column(db.DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

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
            'category': 'Game',
            'brand': 'Steam',
            'genres': self.genres.split(',') if self.genres else [],
            'pc_requirements': self.pc_requirements,
            'mac_requirements': self.mac_requirements,
            'linux_requirements': self.linux_requirements
        }
