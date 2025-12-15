from flask import Blueprint, jsonify, request
import math
import threading
from datetime import datetime, timedelta
from services.steam_service import (
    get_steam_featured,
    save_game_to_db,
    update_game_details_systematically,
    fetch_cheapshark_deals,
    verify_deal_on_steam,
)
from models import Game, DealHistory, db

products_bp = Blueprint('products_bp', __name__)

@products_bp.route('/api/products')
def get_products():
    """
    Get products from the database.
    Fetches fresh data from Steam if the database is empty or on specific trigger.
    """
    category = request.args.get('category')
    page = int(request.args.get('page', 1))
    limit = int(request.args.get('limit', 10))
    
    # If category is Game, handle Steam logic
    if category == 'Game':
        # NOTE:
        # Background thread in app.py handles data fetching.
        # We just query the DB here.

        # Query DB for results
        query = Game.query
        
        # Filter for active deals only (discount > 0 and is_active = True)
        query = query.filter(Game.discount > 0, Game.is_active == True)

        # If we still have no deals, try one more lightweight fetch.
        # This covers cases where the DB has games but none have discounts yet.
        if query.count() == 0:
            try:
                fetch_cheapshark_deals(pages=1)
            except Exception as e:
                print(f"Error during fallback CheapShark fetch: {e}")
        
        # Pagination
        total_games = query.count()
        
        # Calculate deal score for sorting
        # Score = weighted_rating × savings_factor × verification_boost
        # - weighted_rating: rating weighted by review confidence (log scale)
        # - savings_factor: combines absolute savings and discount percentage
        # - verification_boost: 1.25x for verified deals
        from sqlalchemy import case, func as sql_func
        
        # Review confidence: log10(reviews + 1) / 5, capped at 1.0
        # SQLite doesn't have log10, so we use ln(x) / ln(10)
        review_confidence = sql_func.least(
            sql_func.coalesce(
                sql_func.log(sql_func.coalesce(Game.review_count, 0) + 1) / math.log(10) / 5.0,
                0
            ),
            1.0
        )
        
        # Weighted rating: rating × (0.3 + 0.7 × review_confidence)
        # This ensures even games with few reviews get some weight (30%)
        rating_normalized = sql_func.coalesce(Game.rating, 0) / 5.0
        weighted_rating = rating_normalized * (0.3 + 0.7 * review_confidence)
        
        # Savings in dollars
        savings = sql_func.coalesce(Game.original_price, 0) - sql_func.coalesce(Game.price, 0)
        
        # Savings factor: 1 + (savings / 20) + (discount_pct / 100)
        # Each $20 saved doubles the base, plus discount percentage bonus
        savings_factor = 1 + (savings / 20.0) + (sql_func.coalesce(Game.discount, 0) / 100.0)
        
        # Verification boost: 1.25x if verified
        verification_boost = case(
            (Game.deal_last_verified != None, 1.25),
            else_=1.0
        )
        
        # Final deal score
        deal_score = weighted_rating * savings_factor * verification_boost * 100
        
        games = query.order_by(
            deal_score.desc()
        ).paginate(page=page, per_page=limit, error_out=False)
        
        products = [game.to_dict() for game in games.items]
        
        return jsonify({
            "products": products,
            "total": total_games,
            "page": page,
            "totalPages": games.pages
        })

    # Placeholder data
    mock_products = [
        {
            "id": 1,
            "name": "Cyberpunk 2077",
            "price": "$29.99",
            "originalPrice": "$59.99",
            "image": "https://images.unsplash.com/photo-1552820728-8b83bb6b773f?auto=format&fit=crop&w=400&q=80",
            "category": "Game",
            "discount": "-50%",
            "rating": 4.5,
            "brand": "CD Projekt Red",
            "description": "Cyberpunk 2077 is an open-world, action-adventure story set in Night City, a megalopolis obsessed with power, glamour and body modification. You play as V, a mercenary outlaw going after a one-of-a-kind implant that is the key to immortality. You can customize your character’s cyberware, skillset and playstyle, and explore a vast city where the choices you make shape the story and the world around you."
        },
        {
            "id": 2,
            "name": "RTX 4070 Ti",
            "price": "$799.99",
            "originalPrice": "$899.99",
            "image": "https://images.unsplash.com/photo-1591488320449-011701bb6704?auto=format&fit=crop&w=400&q=80",
            "category": "Hardware",
            "discount": "-11%",
            "rating": 4.8,
            "brand": "NVIDIA",
            "description": "The GeForce RTX 4070 Ti delivers the ultra performance and features that enthusiast gamers and creators demand. Bring your games and creative projects to life with ray tracing and AI-powered graphics. It’s built with the ultra-efficient NVIDIA Ada Lovelace architecture and up to 12GB of superfast G6X memory."
        },
        {
            "id": 3,
            "name": "Elden Ring",
            "price": "$39.99",
            "originalPrice": "$59.99",
            "image": "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=400&q=80",
            "category": "Game",
            "discount": "-33%",
            "rating": 5.0,
            "brand": "FromSoftware",
            "description": "THE NEW FANTASY ACTION RPG. Rise, Tarnished, and be guided by grace to brandish the power of the Elden Ring and become an Elden Lord in the Lands Between. A vast world where open fields with a variety of situations and huge dungeons with complex and three-dimensional designs are seamlessly connected. As you explore, the joy of discovering unknown and overwhelming threats await you, leading to a high sense of accomplishment."
        },
        {
            "id": 4,
            "name": "Gaming Mouse Pro",
            "price": "$49.99",
            "originalPrice": "$89.99",
            "image": "https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?auto=format&fit=crop&w=400&q=80",
            "category": "Hardware",
            "discount": "-45%",
            "rating": 4.6,
            "brand": "Logitech",
            "description": "Engineered for pro-grade performance, responsiveness, and durability. The ultimate weapon for your gaming arsenal."
        },
        {
            "id": 5,
            "name": "God of War",
            "price": "$49.99",
            "originalPrice": "$59.99",
            "image": "https://images.unsplash.com/photo-1538481199705-c710c4e965fc?auto=format&fit=crop&w=400&q=80",
            "category": "Game",
            "discount": "-15%",
            "rating": 4.9,
            "brand": "Sony",
            "description": "His vengeance against the Gods of Olympus years behind him, Kratos now lives as a man in the realm of Norse Gods and monsters."
        },
        {
            "id": 6,
            "name": "Mechanical Keyboard",
            "price": "$129.99",
            "originalPrice": "$159.99",
            "image": "https://images.unsplash.com/photo-1587829741301-dc798b91a603?auto=format&fit=crop&w=400&q=80",
            "category": "Hardware",
            "discount": "-20%",
            "rating": 4.7,
            "brand": "Corsair",
            "description": "The iconic mechanical gaming keyboard with an aircraft-grade aluminum frame and dynamic RGB backlighting."
        },
        {
            "id": 7,
            "name": "Xbox Series X",
            "price": "$449.99",
            "originalPrice": "$499.99",
            "image": "https://images.unsplash.com/photo-1621259182978-fbf93132d53d?auto=format&fit=crop&w=400&q=80",
            "category": "Hardware",
            "discount": "-10%",
            "rating": 4.8,
            "brand": "Microsoft",
            "description": "The fastest, most powerful Xbox ever. Explore rich new worlds with 12 teraflops of raw graphic processing power."
        },
        {
            "id": 8,
            "name": "PlayStation 5",
            "price": "$499.99",
            "originalPrice": "$499.99",
            "image": "https://images.unsplash.com/photo-1606144042614-b2417e99c4e3?auto=format&fit=crop&w=400&q=80",
            "category": "Hardware",
            "discount": "0%",
            "rating": 4.9,
            "brand": "Sony",
            "description": "Experience lightning fast loading with an ultra-high speed SSD, deeper immersion with haptic feedback, and 3D Audio."
        },
        {
            "id": 9,
            "name": "Nintendo Switch OLED",
            "price": "$349.99",
            "originalPrice": "$349.99",
            "image": "https://images.unsplash.com/photo-1578303512597-81e6cc155b3e?auto=format&fit=crop&w=400&q=80",
            "category": "Hardware",
            "discount": "0%",
            "rating": 4.7,
            "brand": "Nintendo",
            "description": "Play at home on the TV or on-the-go with a vibrant 7-inch OLED screen with the Nintendo Switch – OLED Model system."
        },
        {
            "id": 10,
            "name": "The Witcher 3",
            "price": "$19.99",
            "originalPrice": "$39.99",
            "image": "https://images.unsplash.com/photo-1519669556878-63bdad8a1a49?auto=format&fit=crop&w=400&q=80",
            "category": "Game",
            "discount": "-50%",
            "rating": 4.9,
            "brand": "CD Projekt Red",
            "description": "You are Geralt of Rivia, mercenary monster slayer. Before you stands a war-torn, monster-infested continent you can explore at will."
        },
        {
            "id": 11,
            "name": "Red Dead Redemption 2",
            "price": "$29.99",
            "originalPrice": "$59.99",
            "image": "https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=400&q=80",
            "category": "Game",
            "discount": "-50%",
            "rating": 4.9,
            "brand": "Rockstar Games",
            "description": "Winner of over 175 Game of the Year Awards and recipient of over 250 perfect scores, RDR2 is an epic tale of honor and loyalty."
        },
        {
            "id": 12,
            "name": "Hogwarts Legacy",
            "price": "$59.99",
            "originalPrice": "$69.99",
            "image": "https://images.unsplash.com/photo-1633114128174-2f8aa49759b0?auto=format&fit=crop&w=400&q=80",
            "category": "Game",
            "discount": "-14%",
            "rating": 4.6,
            "brand": "Warner Bros",
            "description": "Hogwarts Legacy is an immersive, open-world action RPG set in the world first introduced in the Harry Potter books."
        },
        {
            "id": 13,
            "name": "Gaming Headset",
            "price": "$79.99",
            "originalPrice": "$99.99",
            "image": "https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?auto=format&fit=crop&w=400&q=80",
            "category": "Hardware",
            "discount": "-20%",
            "rating": 4.4,
            "brand": "Razer",
            "description": "Immersive 7.1 surround sound for positional audio. Ultra-lightweight design for prolonged gaming marathons."
        },
        {
            "id": 14,
            "name": "4K Gaming Monitor",
            "price": "$399.99",
            "originalPrice": "$499.99",
            "image": "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&w=400&q=80",
            "category": "Hardware",
            "discount": "-20%",
            "rating": 4.7,
            "brand": "LG",
            "description": "Experience your games in stunning 4K resolution with a 144Hz refresh rate and 1ms response time for competitive gaming."
        },
        {
            "id": 15,
            "name": "SSD 2TB",
            "price": "$129.99",
            "originalPrice": "$159.99",
            "image": "https://images.unsplash.com/photo-1628557044797-f21a177c37ec?auto=format&fit=crop&w=400&q=80",
            "category": "Hardware",
            "discount": "-19%",
            "rating": 4.8,
            "brand": "Samsung",
            "description": "Reach max performance of PCIe 4.0. Experience longer-lasting, opponent-blasting speed. The smart heat control delivers power efficiency."
        },
        {
            "id": 16,
            "name": "DDR5 RAM 32GB",
            "price": "$109.99",
            "originalPrice": "$139.99",
            "image": "https://images.unsplash.com/photo-1562976540-1502c2145186?auto=format&fit=crop&w=400&q=80",
            "category": "Hardware",
            "discount": "-21%",
            "rating": 4.7,
            "brand": "G.Skill",
            "description": "Push the limits of performance with DDR5 memory. Faster frequencies, greater capacities, and better performance."
        },
        {
            "id": 17,
            "name": "Gaming Chair",
            "price": "$199.99",
            "originalPrice": "$249.99",
            "image": "https://images.unsplash.com/photo-1598550476439-6847785fcea6?auto=format&fit=crop&w=400&q=80",
            "category": "Hardware",
            "discount": "-20%",
            "rating": 4.3,
            "brand": "Secretlab",
            "description": "Ergonomic design for all-day comfort. Features adjustable lumbar support, 4D armrests, and premium PU leather."
        },
        {
            "id": 18,
            "name": "Webcam 4K",
            "price": "$149.99",
            "originalPrice": "$199.99",
            "image": "https://images.unsplash.com/photo-1587826337417-96fff778df71?auto=format&fit=crop&w=400&q=80",
            "category": "Hardware",
            "discount": "-25%",
            "rating": 4.5,
            "brand": "Logitech",
            "description": "Look your best in every video meeting and stream. Ultra 4K HD resolution with HDR technology for clear video in any light."
        },
        {
            "id": 19,
            "name": "Microphone",
            "price": "$129.99",
            "originalPrice": "$149.99",
            "image": "https://images.unsplash.com/photo-1590602847861-f357a9332bbc?auto=format&fit=crop&w=400&q=80",
            "category": "Hardware",
            "discount": "-13%",
            "rating": 4.6,
            "brand": "Blue",
            "description": "The ultimate professional USB microphone. Tri-capsule array records almost any situation. Multiple pattern selection."
        },
        {
            "id": 20,
            "name": "Capture Card",
            "price": "$179.99",
            "originalPrice": "$199.99",
            "image": "https://images.unsplash.com/photo-1593640408182-31c70c8268f5?auto=format&fit=crop&w=400&q=80",
            "category": "Hardware",
            "discount": "-10%",
            "rating": 4.5,
            "brand": "Elgato",
            "description": "Stream and record in 1080p60 HDR10 or 4K30. Ultra-low latency technology. Plug and play functionality."
        },
        {
            "id": 21,
            "name": "Hardware Item 21",
            "price": "$100.99",
            "originalPrice": "$150.99",
            "image": "https://images.unsplash.com/photo-1591488320449-011701bb6704?auto=format&fit=crop&w=400&q=80",
            "category": "Hardware",
            "discount": "-10%",
            "rating": 4.5,
            "brand": "Generic Brand",
            "description": "Description for Hardware Item 21"
        },
        {
            "id": 22,
            "name": "Hardware Item 22",
            "price": "$110.99",
            "originalPrice": "$160.99",
            "image": "https://images.unsplash.com/photo-1591488320449-011701bb6704?auto=format&fit=crop&w=400&q=80",
            "category": "Hardware",
            "discount": "-10%",
            "rating": 4.5,
            "brand": "Generic Brand",
            "description": "Description for Hardware Item 22"
        },
        {
            "id": 23,
            "name": "Hardware Item 23",
            "price": "$120.99",
            "originalPrice": "$170.99",
            "image": "https://images.unsplash.com/photo-1591488320449-011701bb6704?auto=format&fit=crop&w=400&q=80",
            "category": "Hardware",
            "discount": "-10%",
            "rating": 4.5,
            "brand": "Generic Brand",
            "description": "Description for Hardware Item 23"
        },
        {
            "id": 24,
            "name": "Hardware Item 24",
            "price": "$130.99",
            "originalPrice": "$180.99",
            "image": "https://images.unsplash.com/photo-1591488320449-011701bb6704?auto=format&fit=crop&w=400&q=80",
            "category": "Hardware",
            "discount": "-10%",
            "rating": 4.5,
            "brand": "Generic Brand",
            "description": "Description for Hardware Item 24"
        },
        {
            "id": 25,
            "name": "Hardware Item 25",
            "price": "$140.99",
            "originalPrice": "$190.99",
            "image": "https://images.unsplash.com/photo-1591488320449-011701bb6704?auto=format&fit=crop&w=400&q=80",
            "category": "Hardware",
            "discount": "-10%",
            "rating": 4.5,
            "brand": "Generic Brand",
            "description": "Description for Hardware Item 25"
        },
        {
            "id": 26,
            "name": "Hardware Item 26",
            "price": "$150.99",
            "originalPrice": "$200.99",
            "image": "https://images.unsplash.com/photo-1591488320449-011701bb6704?auto=format&fit=crop&w=400&q=80",
            "category": "Hardware",
            "discount": "-10%",
            "rating": 4.5,
            "brand": "Generic Brand",
            "description": "Description for Hardware Item 26"
        },
        {
            "id": 27,
            "name": "Hardware Item 27",
            "price": "$160.99",
            "originalPrice": "$210.99",
            "image": "https://images.unsplash.com/photo-1591488320449-011701bb6704?auto=format&fit=crop&w=400&q=80",
            "category": "Hardware",
            "discount": "-10%",
            "rating": 4.5,
            "brand": "Generic Brand",
            "description": "Description for Hardware Item 27"
        },
        {
            "id": 28,
            "name": "Hardware Item 28",
            "price": "$170.99",
            "originalPrice": "$220.99",
            "image": "https://images.unsplash.com/photo-1591488320449-011701bb6704?auto=format&fit=crop&w=400&q=80",
            "category": "Hardware",
            "discount": "-10%",
            "rating": 4.5,
            "brand": "Generic Brand",
            "description": "Description for Hardware Item 28"
        },
        {
            "id": 29,
            "name": "Hardware Item 29",
            "price": "$180.99",
            "originalPrice": "$230.99",
            "image": "https://images.unsplash.com/photo-1591488320449-011701bb6704?auto=format&fit=crop&w=400&q=80",
            "category": "Hardware",
            "discount": "-10%",
            "rating": 4.5,
            "brand": "Generic Brand",
            "description": "Description for Hardware Item 29"
        },
        {
            "id": 30,
            "name": "Hardware Item 30",
            "price": "$190.99",
            "originalPrice": "$240.99",
            "image": "https://images.unsplash.com/photo-1591488320449-011701bb6704?auto=format&fit=crop&w=400&q=80",
            "category": "Hardware",
            "discount": "-10%",
            "rating": 4.5,
            "brand": "Generic Brand",
            "description": "Description for Hardware Item 30"
        },
        {
            "id": 31,
            "name": "Hardware Item 31",
            "price": "$200.99",
            "originalPrice": "$250.99",
            "image": "https://images.unsplash.com/photo-1591488320449-011701bb6704?auto=format&fit=crop&w=400&q=80",
            "category": "Hardware",
            "discount": "-10%",
            "rating": 4.5,
            "brand": "Generic Brand",
            "description": "Description for Hardware Item 31"
        },
        {
            "id": 32,
            "name": "Hardware Item 32",
            "price": "$210.99",
            "originalPrice": "$260.99",
            "image": "https://images.unsplash.com/photo-1591488320449-011701bb6704?auto=format&fit=crop&w=400&q=80",
            "category": "Hardware",
            "discount": "-10%",
            "rating": 4.5,
            "brand": "Generic Brand",
            "description": "Description for Hardware Item 32"
        },
        {
            "id": 33,
            "name": "Hardware Item 33",
            "price": "$220.99",
            "originalPrice": "$270.99",
            "image": "https://images.unsplash.com/photo-1591488320449-011701bb6704?auto=format&fit=crop&w=400&q=80",
            "category": "Hardware",
            "discount": "-10%",
            "rating": 4.5,
            "brand": "Generic Brand",
            "description": "Description for Hardware Item 33"
        },
        {
            "id": 34,
            "name": "Hardware Item 34",
            "price": "$230.99",
            "originalPrice": "$280.99",
            "image": "https://images.unsplash.com/photo-1591488320449-011701bb6704?auto=format&fit=crop&w=400&q=80",
            "category": "Hardware",
            "discount": "-10%",
            "rating": 4.5,
            "brand": "Generic Brand",
            "description": "Description for Hardware Item 34"
        },
        {
            "id": 35,
            "name": "Hardware Item 35",
            "price": "$240.99",
            "originalPrice": "$290.99",
            "image": "https://images.unsplash.com/photo-1591488320449-011701bb6704?auto=format&fit=crop&w=400&q=80",
            "category": "Hardware",
            "discount": "-10%",
            "rating": 4.5,
            "brand": "Generic Brand",
            "description": "Description for Hardware Item 35"
        },
        {
            "id": 36,
            "name": "Hardware Item 36",
            "price": "$250.99",
            "originalPrice": "$300.99",
            "image": "https://images.unsplash.com/photo-1591488320449-011701bb6704?auto=format&fit=crop&w=400&q=80",
            "category": "Hardware",
            "discount": "-10%",
            "rating": 4.5,
            "brand": "Generic Brand",
            "description": "Description for Hardware Item 36"
        },
        {
            "id": 37,
            "name": "Hardware Item 37",
            "price": "$260.99",
            "originalPrice": "$310.99",
            "image": "https://images.unsplash.com/photo-1591488320449-011701bb6704?auto=format&fit=crop&w=400&q=80",
            "category": "Hardware",
            "discount": "-10%",
            "rating": 4.5,
            "brand": "Generic Brand",
            "description": "Description for Hardware Item 37"
        },
        {
            "id": 38,
            "name": "Hardware Item 38",
            "price": "$270.99",
            "originalPrice": "$320.99",
            "image": "https://images.unsplash.com/photo-1591488320449-011701bb6704?auto=format&fit=crop&w=400&q=80",
            "category": "Hardware",
            "discount": "-10%",
            "rating": 4.5,
            "brand": "Generic Brand",
            "description": "Description for Hardware Item 38"
        },
        {
            "id": 39,
            "name": "Hardware Item 39",
            "price": "$280.99",
            "originalPrice": "$330.99",
            "image": "https://images.unsplash.com/photo-1591488320449-011701bb6704?auto=format&fit=crop&w=400&q=80",
            "category": "Hardware",
            "discount": "-10%",
            "rating": 4.5,
            "brand": "Generic Brand",
            "description": "Description for Hardware Item 39"
        },
        {
            "id": 40,
            "name": "Hardware Item 40",
            "price": "$290.99",
            "originalPrice": "$340.99",
            "image": "https://images.unsplash.com/photo-1591488320449-011701bb6704?auto=format&fit=crop&w=400&q=80",
            "category": "Hardware",
            "discount": "-10%",
            "rating": 4.5,
            "brand": "Generic Brand",
            "description": "Description for Hardware Item 40"
        },
        {
            "id": 41,
            "name": "Game Title 41",
            "price": "$30.99",
            "originalPrice": "$60.99",
            "image": "https://images.unsplash.com/photo-1552820728-8b83bb6b773f?auto=format&fit=crop&w=400&q=80",
            "category": "Game",
            "discount": "-20%",
            "rating": 4.2,
            "brand": "Generic Studio",
            "description": "Description for Game Title 41"
        },
        {
            "id": 42,
            "name": "Game Title 42",
            "price": "$32.99",
            "originalPrice": "$62.99",
            "image": "https://images.unsplash.com/photo-1552820728-8b83bb6b773f?auto=format&fit=crop&w=400&q=80",
            "category": "Game",
            "discount": "-20%",
            "rating": 4.2,
            "brand": "Generic Studio",
            "description": "Description for Game Title 42"
        },
        {
            "id": 43,
            "name": "Game Title 43",
            "price": "$34.99",
            "originalPrice": "$64.99",
            "image": "https://images.unsplash.com/photo-1552820728-8b83bb6b773f?auto=format&fit=crop&w=400&q=80",
            "category": "Game",
            "discount": "-20%",
            "rating": 4.2,
            "brand": "Generic Studio",
            "description": "Description for Game Title 43"
        },
        {
            "id": 44,
            "name": "Game Title 44",
            "price": "$36.99",
            "originalPrice": "$66.99",
            "image": "https://images.unsplash.com/photo-1552820728-8b83bb6b773f?auto=format&fit=crop&w=400&q=80",
            "category": "Game",
            "discount": "-20%",
            "rating": 4.2,
            "brand": "Generic Studio",
            "description": "Description for Game Title 44"
        },
        {
            "id": 45,
            "name": "Game Title 45",
            "price": "$38.99",
            "originalPrice": "$68.99",
            "image": "https://images.unsplash.com/photo-1552820728-8b83bb6b773f?auto=format&fit=crop&w=400&q=80",
            "category": "Game",
            "discount": "-20%",
            "rating": 4.2,
            "brand": "Generic Studio",
            "description": "Description for Game Title 45"
        },
        {
            "id": 46,
            "name": "Game Title 46",
            "price": "$40.99",
            "originalPrice": "$70.99",
            "image": "https://images.unsplash.com/photo-1552820728-8b83bb6b773f?auto=format&fit=crop&w=400&q=80",
            "category": "Game",
            "discount": "-20%",
            "rating": 4.2,
            "brand": "Generic Studio",
            "description": "Description for Game Title 46"
        },
        {
            "id": 47,
            "name": "Game Title 47",
            "price": "$42.99",
            "originalPrice": "$72.99",
            "image": "https://images.unsplash.com/photo-1552820728-8b83bb6b773f?auto=format&fit=crop&w=400&q=80",
            "category": "Game",
            "discount": "-20%",
            "rating": 4.2,
            "brand": "Generic Studio",
            "description": "Description for Game Title 47"
        },
        {
            "id": 48,
            "name": "Game Title 48",
            "price": "$44.99",
            "originalPrice": "$74.99",
            "image": "https://images.unsplash.com/photo-1552820728-8b83bb6b773f?auto=format&fit=crop&w=400&q=80",
            "category": "Game",
            "discount": "-20%",
            "rating": 4.2,
            "brand": "Generic Studio",
            "description": "Description for Game Title 48"
        },
        {
            "id": 49,
            "name": "Game Title 49",
            "price": "$46.99",
            "originalPrice": "$76.99",
            "image": "https://images.unsplash.com/photo-1552820728-8b83bb6b773f?auto=format&fit=crop&w=400&q=80",
            "category": "Game",
            "discount": "-20%",
            "rating": 4.2,
            "brand": "Generic Studio",
            "description": "Description for Game Title 49"
        },
        {
            "id": 50,
            "name": "Game Title 50",
            "price": "$48.99",
            "originalPrice": "$78.99",
            "image": "https://images.unsplash.com/photo-1552820728-8b83bb6b773f?auto=format&fit=crop&w=400&q=80",
            "category": "Game",
            "discount": "-20%",
            "rating": 4.2,
            "brand": "Generic Studio",
            "description": "Description for Game Title 50"
        },
        {
            "id": 51,
            "name": "Game Title 51",
            "price": "$50.99",
            "originalPrice": "$80.99",
            "image": "https://images.unsplash.com/photo-1552820728-8b83bb6b773f?auto=format&fit=crop&w=400&q=80",
            "category": "Game",
            "discount": "-20%",
            "rating": 4.2,
            "brand": "Generic Studio",
            "description": "Description for Game Title 51"
        },
        {
            "id": 52,
            "name": "Game Title 52",
            "price": "$52.99",
            "originalPrice": "$82.99",
            "image": "https://images.unsplash.com/photo-1552820728-8b83bb6b773f?auto=format&fit=crop&w=400&q=80",
            "category": "Game",
            "discount": "-20%",
            "rating": 4.2,
            "brand": "Generic Studio",
            "description": "Description for Game Title 52"
        },
        {
            "id": 53,
            "name": "Game Title 53",
            "price": "$54.99",
            "originalPrice": "$84.99",
            "image": "https://images.unsplash.com/photo-1552820728-8b83bb6b773f?auto=format&fit=crop&w=400&q=80",
            "category": "Game",
            "discount": "-20%",
            "rating": 4.2,
            "brand": "Generic Studio",
            "description": "Description for Game Title 53"
        },
        {
            "id": 54,
            "name": "Game Title 54",
            "price": "$56.99",
            "originalPrice": "$86.99",
            "image": "https://images.unsplash.com/photo-1552820728-8b83bb6b773f?auto=format&fit=crop&w=400&q=80",
            "category": "Game",
            "discount": "-20%",
            "rating": 4.2,
            "brand": "Generic Studio",
            "description": "Description for Game Title 54"
        },
        {
            "id": 55,
            "name": "Game Title 55",
            "price": "$58.99",
            "originalPrice": "$88.99",
            "image": "https://images.unsplash.com/photo-1552820728-8b83bb6b773f?auto=format&fit=crop&w=400&q=80",
            "category": "Game",
            "discount": "-20%",
            "rating": 4.2,
            "brand": "Generic Studio",
            "description": "Description for Game Title 55"
        },
        {
            "id": 56,
            "name": "Game Title 56",
            "price": "$60.99",
            "originalPrice": "$90.99",
            "image": "https://images.unsplash.com/photo-1552820728-8b83bb6b773f?auto=format&fit=crop&w=400&q=80",
            "category": "Game",
            "discount": "-20%",
            "rating": 4.2,
            "brand": "Generic Studio",
            "description": "Description for Game Title 56"
        },
        {
            "id": 57,
            "name": "Game Title 57",
            "price": "$62.99",
            "originalPrice": "$92.99",
            "image": "https://images.unsplash.com/photo-1552820728-8b83bb6b773f?auto=format&fit=crop&w=400&q=80",
            "category": "Game",
            "discount": "-20%",
            "rating": 4.2,
            "brand": "Generic Studio",
            "description": "Description for Game Title 57"
        },
        {
            "id": 58,
            "name": "Game Title 58",
            "price": "$64.99",
            "originalPrice": "$94.99",
            "image": "https://images.unsplash.com/photo-1552820728-8b83bb6b773f?auto=format&fit=crop&w=400&q=80",
            "category": "Game",
            "discount": "-20%",
            "rating": 4.2,
            "brand": "Generic Studio",
            "description": "Description for Game Title 58"
        },
        {
            "id": 59,
            "name": "Game Title 59",
            "price": "$66.99",
            "originalPrice": "$96.99",
            "image": "https://images.unsplash.com/photo-1552820728-8b83bb6b773f?auto=format&fit=crop&w=400&q=80",
            "category": "Game",
            "discount": "-20%",
            "rating": 4.2,
            "brand": "Generic Studio",
            "description": "Description for Game Title 59"
        },
        {
            "id": 60,
            "name": "Game Title 60",
            "price": "$68.99",
            "originalPrice": "$98.99",
            "image": "https://images.unsplash.com/photo-1552820728-8b83bb6b773f?auto=format&fit=crop&w=400&q=80",
            "category": "Game",
            "discount": "-20%",
            "rating": 4.2,
            "brand": "Generic Studio",
            "description": "Description for Game Title 60"
        }
    ]
    
    # Filter by category
    category = request.args.get('category')
    if category:
        mock_products = [p for p in mock_products if p['category'].lower() == category.lower()]

    # Search filter - search in name, description, and brand
    search_query = request.args.get('search', '').strip().lower()
    if search_query:
        mock_products = [
            p for p in mock_products 
            if search_query in p['name'].lower() 
            or search_query in p.get('description', '').lower()
            or search_query in p.get('brand', '').lower()
        ]

    # Pagination logic
    page = request.args.get('page', 1, type=int)
    limit = request.args.get('limit', 48, type=int)
    
    total_products = len(mock_products)
    total_pages = math.ceil(total_products / limit)
    
    start_index = (page - 1) * limit
    end_index = start_index + limit
    
    paginated_products = mock_products[start_index:end_index]
    
    return jsonify({
        "products": paginated_products,
        "total_products": total_products,
        "total_pages": total_pages,
        "current_page": page
    })


@products_bp.route('/api/products/<int:product_id>')
def get_product_by_id(product_id):
    """
    Get a single product by its ID.
    For games, fetches from the database.
    For hardware, uses mock data.
    """
    category = request.args.get('category', 'Game')
    
    if category == 'Game':
        # Try to find the game in the database
        game = Game.query.get(product_id)
        if game:
            return jsonify(game.to_dict())
        return jsonify({"error": "Product not found"}), 404
    
    # For hardware (mock data), search in the mock_products list
    mock_products = [
        {
            "id": 2,
            "name": "RTX 4070 Ti",
            "price": "$799.99",
            "originalPrice": "$899.99",
            "image": "https://images.unsplash.com/photo-1591488320449-011701bb6704?auto=format&fit=crop&w=400&q=80",
            "category": "Hardware",
            "discount": "-11%",
            "rating": 4.8,
            "brand": "NVIDIA",
            "description": "The GeForce RTX 4070 Ti delivers the ultra performance and features that enthusiast gamers and creators demand. Bring your games and creative projects to life with ray tracing and AI-powered graphics. It's built with the ultra-efficient NVIDIA Ada Lovelace architecture and up to 12GB of superfast G6X memory."
        },
        {
            "id": 4,
            "name": "Gaming Mouse Pro",
            "price": "$49.99",
            "originalPrice": "$89.99",
            "image": "https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?auto=format&fit=crop&w=400&q=80",
            "category": "Hardware",
            "discount": "-45%",
            "rating": 4.6,
            "brand": "Logitech",
            "description": "Engineered for pro-grade performance, responsiveness, and durability. The ultimate weapon for your gaming arsenal."
        },
        {
            "id": 6,
            "name": "Mechanical Keyboard",
            "price": "$129.99",
            "originalPrice": "$159.99",
            "image": "https://images.unsplash.com/photo-1587829741301-dc798b91a603?auto=format&fit=crop&w=400&q=80",
            "category": "Hardware",
            "discount": "-20%",
            "rating": 4.7,
            "brand": "Corsair",
            "description": "The iconic mechanical gaming keyboard with an aircraft-grade aluminum frame and dynamic RGB backlighting."
        },
        {
            "id": 7,
            "name": "Xbox Series X",
            "price": "$449.99",
            "originalPrice": "$499.99",
            "image": "https://images.unsplash.com/photo-1621259182978-fbf93132d53d?auto=format&fit=crop&w=400&q=80",
            "category": "Hardware",
            "discount": "-10%",
            "rating": 4.8,
            "brand": "Microsoft",
            "description": "The fastest, most powerful Xbox ever. Explore rich new worlds with 12 teraflops of raw graphic processing power."
        },
        {
            "id": 8,
            "name": "PlayStation 5",
            "price": "$499.99",
            "originalPrice": "$499.99",
            "image": "https://images.unsplash.com/photo-1606144042614-b2417e99c4e3?auto=format&fit=crop&w=400&q=80",
            "category": "Hardware",
            "discount": "0%",
            "rating": 4.9,
            "brand": "Sony",
            "description": "Experience lightning fast loading with an ultra-high speed SSD, deeper immersion with haptic feedback, and 3D Audio."
        },
        {
            "id": 9,
            "name": "Nintendo Switch OLED",
            "price": "$349.99",
            "originalPrice": "$349.99",
            "image": "https://images.unsplash.com/photo-1578303512597-81e6cc155b3e?auto=format&fit=crop&w=400&q=80",
            "category": "Hardware",
            "discount": "0%",
            "rating": 4.7,
            "brand": "Nintendo",
            "description": "Play at home on the TV or on-the-go with a vibrant 7-inch OLED screen with the Nintendo Switch – OLED Model system."
        },
        {
            "id": 13,
            "name": "Gaming Headset",
            "price": "$79.99",
            "originalPrice": "$99.99",
            "image": "https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?auto=format&fit=crop&w=400&q=80",
            "category": "Hardware",
            "discount": "-20%",
            "rating": 4.4,
            "brand": "Razer",
            "description": "Immersive 7.1 surround sound for positional audio. Ultra-lightweight design for prolonged gaming marathons."
        },
        {
            "id": 14,
            "name": "4K Gaming Monitor",
            "price": "$399.99",
            "originalPrice": "$499.99",
            "image": "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&w=400&q=80",
            "category": "Hardware",
            "discount": "-20%",
            "rating": 4.7,
            "brand": "LG",
            "description": "Experience your games in stunning 4K resolution with a 144Hz refresh rate and 1ms response time for competitive gaming."
        },
        {
            "id": 15,
            "name": "SSD 2TB",
            "price": "$129.99",
            "originalPrice": "$159.99",
            "image": "https://images.unsplash.com/photo-1628557044797-f21a177c37ec?auto=format&fit=crop&w=400&q=80",
            "category": "Hardware",
            "discount": "-19%",
            "rating": 4.8,
            "brand": "Samsung",
            "description": "Reach max performance of PCIe 4.0. Experience longer-lasting, opponent-blasting speed. The smart heat control delivers power efficiency."
        },
        {
            "id": 16,
            "name": "DDR5 RAM 32GB",
            "price": "$109.99",
            "originalPrice": "$139.99",
            "image": "https://images.unsplash.com/photo-1562976540-1502c2145186?auto=format&fit=crop&w=400&q=80",
            "category": "Hardware",
            "discount": "-21%",
            "rating": 4.7,
            "brand": "G.Skill",
            "description": "Push the limits of performance with DDR5 memory. Faster frequencies, greater capacities, and better performance."
        },
        {
            "id": 17,
            "name": "Gaming Chair",
            "price": "$199.99",
            "originalPrice": "$249.99",
            "image": "https://images.unsplash.com/photo-1598550476439-6847785fcea6?auto=format&fit=crop&w=400&q=80",
            "category": "Hardware",
            "discount": "-20%",
            "rating": 4.3,
            "brand": "Secretlab",
            "description": "Ergonomic design for all-day comfort. Features adjustable lumbar support, 4D armrests, and premium PU leather."
        },
        {
            "id": 18,
            "name": "Webcam 4K",
            "price": "$149.99",
            "originalPrice": "$199.99",
            "image": "https://images.unsplash.com/photo-1587826337417-96fff778df71?auto=format&fit=crop&w=400&q=80",
            "category": "Hardware",
            "discount": "-25%",
            "rating": 4.5,
            "brand": "Logitech",
            "description": "Look your best in every video meeting and stream. Ultra 4K HD resolution with HDR technology for clear video in any light."
        },
        {
            "id": 19,
            "name": "Microphone",
            "price": "$129.99",
            "originalPrice": "$149.99",
            "image": "https://images.unsplash.com/photo-1590602847861-f357a9332bbc?auto=format&fit=crop&w=400&q=80",
            "category": "Hardware",
            "discount": "-13%",
            "rating": 4.6,
            "brand": "Blue",
            "description": "The ultimate professional USB microphone. Tri-capsule array records almost any situation. Multiple pattern selection."
        },
        {
            "id": 20,
            "name": "Capture Card",
            "price": "$179.99",
            "originalPrice": "$199.99",
            "image": "https://images.unsplash.com/photo-1593640408182-31c70c8268f5?auto=format&fit=crop&w=400&q=80",
            "category": "Hardware",
            "discount": "-10%",
            "rating": 4.5,
            "brand": "Elgato",
            "description": "Stream and record in 1080p60 HDR10 or 4K30. Ultra-low latency technology. Plug and play functionality."
        }
    ]
    
    # Search for the product by ID
    for product in mock_products:
        if product['id'] == product_id:
            # Add title field for consistency
            product['title'] = product['name']
            return jsonify(product)
    
    return jsonify({"error": "Product not found"}), 404


def verify_game_in_background(game_id, app):
    """
    Background task to verify a game's deal on Steam.
    Runs in a separate thread to not block the response.
    """
    with app.app_context():
        try:
            game = Game.query.get(game_id)
            if not game or not game.steam_id:
                return
                
            result = verify_deal_on_steam(game.steam_id)
            
            if result is None:
                # Couldn't verify (rate limited or error), just update verification time
                game.deal_last_verified = datetime.utcnow()
                db.session.commit()
                return
            
            is_on_sale = result['is_on_sale']
            current_price = result['price']
            original_price = result['original_price']
            discount = result['discount']
            deal_ends_at = result.get('deal_ends_at')
            
            if is_on_sale:
                # Update price info if changed
                if abs((game.price or 0) - current_price) > 0.01:
                    game.price = current_price
                if abs((game.original_price or 0) - original_price) > 0.01:
                    game.original_price = original_price
                if game.discount != discount:
                    game.discount = discount
                # Update deal end date if available
                if deal_ends_at:
                    game.deal_ends_at = deal_ends_at
                game.is_active = True
            else:
                # Deal has expired
                game.is_active = False
                game.discount = 0
                game.price = game.original_price
                game.deal_ends_at = None
                
            game.deal_last_verified = datetime.utcnow()
            db.session.commit()
            
            # Ensure DealHistory reflects discount start and end times
            sale_start = getattr(game, 'deal_started_at', None)
            if sale_start:
                # If stored as epoch, convert to datetime (assume UTC)
                if isinstance(sale_start, (int, float)):
                    from datetime import timezone
                    sale_start = datetime.fromtimestamp(int(sale_start), tz=timezone.utc)

                # Check for existing start entry
                start_entry = DealHistory.query.filter(
                    DealHistory.game_id == game.id,
                    DealHistory.recorded_at == sale_start
                ).first()
                if not start_entry:
                    try:
                        start_history = DealHistory(
                            game_id=game.id,
                            price=game.price,
                            original_price=game.original_price,
                            discount=game.discount,
                            is_active=True,
                            recorded_at=sale_start
                        )
                        db.session.add(start_history)
                        db.session.commit()
                    except Exception as e:
                        db.session.rollback()
                        print(f"Error adding discount start history for game {game.id}: {e}")

            # Check for existing end entry (if discount ends)
            if game.discount == 0:
                end_entry = DealHistory.query.filter(
                    DealHistory.game_id == game.id,
                    DealHistory.is_active == False
                ).first()
                if not end_entry:
                    try:
                        end_history = DealHistory(
                            game_id=game.id,
                            price=game.price,
                            original_price=game.original_price,
                            discount=0,
                            is_active=False,
                            recorded_at=datetime.utcnow()
                        )
                        db.session.add(end_history)
                        db.session.commit()
                    except Exception as e:
                        db.session.rollback()
                        print(f"Error adding discount end history for game {game.id}: {e}")
            
            end_info = f", ends={deal_ends_at}" if deal_ends_at else ""
            print(f"Verified deal for {game.title}: on_sale={is_on_sale}, discount={discount}%{end_info}")
        except Exception as e:
            print(f"Error verifying game {game_id}: {e}")


@products_bp.route('/api/products/<int:product_id>/verify', methods=['POST'])
def verify_product(product_id):
    """
    Trigger a background verification of a game deal.
    Returns immediately while verification happens in background.
    """
    category = request.args.get('category', 'Game')
    
    if category != 'Game':
        return jsonify({"message": "Verification only available for games"}), 200
    
    game = Game.query.get(product_id)
    if not game:
        return jsonify({"error": "Product not found"}), 404
    
    if not game.steam_id:
        return jsonify({"message": "No Steam ID for verification"}), 200
    
    # Get the Flask app from current context
    from flask import current_app
    app = current_app._get_current_object()
    
    # Start background verification
    thread = threading.Thread(target=verify_game_in_background, args=(product_id, app))
    thread.daemon = True
    thread.start()
    
    return jsonify({"message": "Verification started"}), 202


@products_bp.route('/api/products/<int:product_id>/history')
def get_product_history(product_id):
    """
    Get the price history for a game.
    
    Query params:
        - start_date: ISO format date (optional, default: 30 days ago)
        - end_date: ISO format date (optional, default: now)
    """
    # Only games have history
    game = Game.query.get(product_id)
    if not game:
        return jsonify({"error": "Product not found"}), 404
    
    # Parse date range
    try:
        end_date_str = request.args.get('end_date')
        start_date_str = request.args.get('start_date')
        
        if end_date_str:
            end_date = datetime.fromisoformat(end_date_str.replace('Z', '+00:00'))
        else:
            end_date = datetime.utcnow()
            
        if start_date_str:
            start_date = datetime.fromisoformat(start_date_str.replace('Z', '+00:00'))
        else:
            start_date = end_date - timedelta(days=30)
    except ValueError as e:
        return jsonify({"error": f"Invalid date format: {e}"}), 400
    
    # Query history
    history = DealHistory.query.filter(
        DealHistory.game_id == product_id,
        DealHistory.recorded_at >= start_date,
        DealHistory.recorded_at <= end_date
    ).order_by(DealHistory.recorded_at.asc()).all()
    
    # Calculate stats
    if history:
        prices = [h.price for h in history if h.price is not None]
        discounts = [h.discount for h in history if h.discount is not None]
        savings = [(h.original_price or 0) - (h.price or 0) for h in history]
        
        stats = {
            'minPrice': min(prices) if prices else None,
            'maxPrice': max(prices) if prices else None,
            'avgPrice': round(sum(prices) / len(prices), 2) if prices else None,
            'maxDiscount': max(discounts) if discounts else 0,
            'avgDiscount': round(sum(discounts) / len(discounts), 1) if discounts else 0,
            'maxSavings': max(savings) if savings else 0,
            'totalRecords': len(history)
        }
    else:
        stats = {
            'minPrice': None,
            'maxPrice': None,
            'avgPrice': None,
            'maxDiscount': 0,
            'avgDiscount': 0,
            'maxSavings': 0,
            'totalRecords': 0
        }
    
    # Ensure no duplicate DealHistory entries exist
    duplicates = DealHistory.query.filter(
        DealHistory.game_id == game.id,
        DealHistory.price == game.price,
        DealHistory.discount == game.discount,
        DealHistory.recorded_at >= datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    ).all()
    if len(duplicates) > 1:
        try:
            # Keep only the first entry and delete the rest
            for duplicate in duplicates[1:]:
                db.session.delete(duplicate)
            db.session.commit()
        except Exception as e:
            db.session.rollback()
            print(f"Error removing duplicate deal history for game {game.id}: {e}")

    # Ensure current deal is in history
    existing = DealHistory.query.filter(
        DealHistory.game_id == game.id,
        DealHistory.price == game.price,
        DealHistory.discount == game.discount,
        DealHistory.recorded_at >= datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    ).first()
    if not existing:
        try:
            history_entry = DealHistory(
                game_id=game.id,
                price=game.price,
                original_price=game.original_price,
                discount=game.discount,
                is_active=True,
                recorded_at=datetime.utcnow()
            )
            db.session.add(history_entry)
            db.session.commit()
        except Exception as e:
            db.session.rollback()
            print(f"Error ensuring deal history for game {game.id}: {e}")
    
    return jsonify({
        'gameId': product_id,
        'gameTitle': game.title,
        'currentPrice': game.price,
        'originalPrice': game.original_price,
        'currentDiscount': game.discount,
        'history': [h.to_dict() for h in history],
        'stats': stats,
        'dateRange': {
            'start': start_date.isoformat(),
            'end': end_date.isoformat()
        }
    })



