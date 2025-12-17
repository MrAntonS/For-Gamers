from app import create_app, db
from models import Game
from datetime import datetime

def add_shooter_game():
    app = create_app()
    with app.app_context():
        # Check if already exists
        if Game.query.filter_by(title="Test Shooter Game").first():
            print("Test Shooter Game already exists.")
            return

        game = Game(
            steam_id=999999,
            title="Test Shooter Game",
            price=29.99,
            original_price=59.99,
            discount=50,
            image_url="https://placehold.co/600x400",
            description="A test game for verifying shooter filter.",
            rating=4.5,
            is_active=True,
            genres="Action,Shooter,Multiplayer",
            platforms="windows",
            deal_last_verified=datetime.now()
        )
        db.session.add(game)
        db.session.commit()
        print("Added 'Test Shooter Game' to database.")

if __name__ == "__main__":
    add_shooter_game()
