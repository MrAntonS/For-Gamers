"""
Backfill deal history for existing games.
This creates initial history entries for all games that have deals.
Run this once after adding the deal_history table.
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import app
from models import db, Game, DealHistory
from datetime import datetime

def backfill_history():
    with app.app_context():
        # Get all games with active deals
        games = Game.query.filter(Game.discount > 0).all()
        
        print(f"Found {len(games)} games with deals")
        
        created = 0
        skipped = 0
        
        for game in games:
            # Check if this game already has history
            existing = DealHistory.query.filter_by(game_id=game.id).first()
            if existing:
                skipped += 1
                continue
            
            # Create initial history entry
            history = DealHistory(
                game_id=game.id,
                price=game.price,
                original_price=game.original_price,
                discount=game.discount or 0,
                is_active=game.is_active if game.is_active is not None else True,
                recorded_at=game.last_updated or datetime.utcnow()
            )
            db.session.add(history)
            created += 1
        
        db.session.commit()
        print(f"Created {created} history entries, skipped {skipped} (already had history)")

if __name__ == '__main__':
    backfill_history()
