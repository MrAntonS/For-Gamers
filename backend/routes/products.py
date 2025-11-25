from flask import Blueprint, jsonify, request
import math

products_bp = Blueprint('products_bp', __name__)

@products_bp.route('/api/products')
def get_products():
    """
    A placeholder route to get products.
    In the future, this will fetch data from the eBay API.
    """
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
            "description": "An open-world, action-adventure story set in Night City, a megalopolis obsessed with power, glamour and body modification."
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
            "description": "The GeForce RTX 4070 Ti delivers the ultra performance and features that enthusiast gamers and creators demand."
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
            "description": "A fantasy action-RPG adventure set within a world created by Hidetaka Miyazaki and George R.R. Martin."
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
        }
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

@products_bp.route('/api/deals')
def get_deals():
    page = request.args.get('page', 1, type=int)
    limit = request.args.get('limit', 18, type=int)

    base_game_deals = [
        {"id": 1, "title": "Cyberpunk 2077", "price": "$29.99", "originalPrice": "$59.99", "category": "RPG", "image": "https://images.unsplash.com/photo-1552820728-8b83bb6b773f?auto=format&fit=crop&w=400&q=80", "rating": 4.5},
        {"id": 2, "title": "Elden Ring", "price": "$39.99", "originalPrice": "$59.99", "category": "RPG", "image": "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=400&q=80", "rating": 5},
        {"id": 3, "title": "God of War", "price": "$49.99", "category": "Action", "image": "https://images.unsplash.com/photo-1538481199705-c710c4e965fc?auto=format&fit=crop&w=400&q=80", "rating": 4.8},
        {"id": 4, "title": "Starfield", "price": "$69.99", "category": "RPG", "image": "https://images.unsplash.com/photo-1614680376593-902f74cf0d41?auto=format&fit=crop&w=400&q=80", "rating": 4.0},
        {"id": 5, "title": "Baldur's Gate 3", "price": "$59.99", "category": "RPG", "image": "https://images.unsplash.com/photo-1612287230217-969e43c445bf?auto=format&fit=crop&w=400&q=80", "rating": 5},
    ]
    
    # Generate more deals for pagination testing
    game_deals = []
    for i in range(100):
        for deal in base_game_deals:
            new_deal = deal.copy()
            new_deal['id'] = len(game_deals) + 1
            game_deals.append(new_deal)

    hardware_deals = [
        {"id": 6, "title": "RTX 4090", "price": "$1599.99", "category": "GPU", "image": "https://images.unsplash.com/photo-1591488320449-011701bb6704?auto=format&fit=crop&w=400&q=80", "rating": 4.9},
        {"id": 7, "title": "Ryzen 9 7950X", "price": "$599.99", "originalPrice": "$699.99", "category": "CPU", "image": "https://images.unsplash.com/photo-1555616635-640960031520?auto=format&fit=crop&w=400&q=80", "rating": 4.7},
        {"id": 8, "title": "Logitech G Pro", "price": "$99.99", "category": "Mouse", "image": "https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?auto=format&fit=crop&w=400&q=80", "rating": 4.6},
        {"id": 9, "title": "Corsair K70", "price": "$129.99", "category": "Keyboard", "image": "https://images.unsplash.com/photo-1587829741301-dc798b91a603?auto=format&fit=crop&w=400&q=80", "rating": 4.5},
        {"id": 10, "title": "Samsung Odyssey", "price": "$999.99", "category": "Monitor", "image": "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&w=400&q=80", "rating": 4.4},
    ]

    total_products = len(game_deals)
    total_pages = math.ceil(total_products / limit)
    
    start_index = (page - 1) * limit
    end_index = start_index + limit
    
    paginated_game_deals = game_deals[start_index:end_index]

    return jsonify({
        "game_deals": paginated_game_deals, 
        "hardware_deals": hardware_deals,
        "total_pages": total_pages,
        "current_page": page,
        "total_products": total_products
    })
