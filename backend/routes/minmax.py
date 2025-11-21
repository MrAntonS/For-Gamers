from flask import Blueprint, jsonify, request

minmax_bp = Blueprint('minmax_bp', __name__)

# Mock game data with their recommended requirements for 1440p 60fps
GAMES_DATABASE = [
    {
        "id": 1,
        "name": "Cyberpunk 2077",
        "category": "RPG",
        "image": "https://images.unsplash.com/photo-1552820728-8b83bb6b773f?auto=format&fit=crop&w=400&q=80",
        "recommended_gpu": "RTX 3070",
        "gpu_score": 70
    },
    {
        "id": 2,
        "name": "Elden Ring",
        "category": "RPG",
        "image": "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=400&q=80",
        "recommended_gpu": "RTX 3060",
        "gpu_score": 60
    },
    {
        "id": 3,
        "name": "God of War",
        "category": "Action",
        "image": "https://images.unsplash.com/photo-1538481199705-c710c4e965fc?auto=format&fit=crop&w=400&q=80",
        "recommended_gpu": "RTX 3060 Ti",
        "gpu_score": 65
    },
    {
        "id": 4,
        "name": "Starfield",
        "category": "RPG",
        "image": "https://images.unsplash.com/photo-1614680376593-902f74cf0d41?auto=format&fit=crop&w=400&q=80",
        "recommended_gpu": "RTX 3070 Ti",
        "gpu_score": 75
    },
    {
        "id": 5,
        "name": "Baldur's Gate 3",
        "category": "RPG",
        "image": "https://images.unsplash.com/photo-1612287230217-969e43c445bf?auto=format&fit=crop&w=400&q=80",
        "recommended_gpu": "RTX 3060",
        "gpu_score": 60
    },
    {
        "id": 6,
        "name": "The Witcher 3",
        "category": "RPG",
        "image": "https://images.unsplash.com/photo-1519669556878-63bdad8a1a49?auto=format&fit=crop&w=400&q=80",
        "recommended_gpu": "GTX 1660",
        "gpu_score": 40
    },
    {
        "id": 7,
        "name": "Red Dead Redemption 2",
        "category": "Action",
        "image": "https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=400&q=80",
        "recommended_gpu": "RTX 3060 Ti",
        "gpu_score": 65
    },
    {
        "id": 8,
        "name": "Hogwarts Legacy",
        "category": "RPG",
        "image": "https://images.unsplash.com/photo-1633114128174-2f8aa49759b0?auto=format&fit=crop&w=400&q=80",
        "recommended_gpu": "RTX 3070",
        "gpu_score": 70
    },
    {
        "id": 9,
        "name": "Call of Duty: Modern Warfare III",
        "category": "FPS",
        "image": "https://images.unsplash.com/photo-1560419015-7c427e8ae5ba?auto=format&fit=crop&w=400&q=80",
        "recommended_gpu": "RTX 3060 Ti",
        "gpu_score": 65
    },
    {
        "id": 10,
        "name": "Spider-Man Remastered",
        "category": "Action",
        "image": "https://images.unsplash.com/photo-1635805737707-575885ab0820?auto=format&fit=crop&w=400&q=80",
        "recommended_gpu": "RTX 3060",
        "gpu_score": 60
    },
    {
        "id": 11,
        "name": "Forza Horizon 5",
        "category": "Racing",
        "image": "https://images.unsplash.com/photo-1511919884226-fd3cad34687c?auto=format&fit=crop&w=400&q=80",
        "recommended_gpu": "RTX 2060",
        "gpu_score": 50
    },
    {
        "id": 12,
        "name": "Resident Evil 4 Remake",
        "category": "Horror",
        "image": "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=400&q=80",
        "recommended_gpu": "RTX 3070",
        "gpu_score": 70
    }
]

# GPU performance database (score represents relative performance)
GPU_DATABASE = [
    {"name": "GTX 1650", "score": 30, "price": "$150"},
    {"name": "GTX 1660", "score": 40, "price": "$200"},
    {"name": "RTX 2060", "score": 50, "price": "$300"},
    {"name": "RTX 3050", "score": 55, "price": "$250"},
    {"name": "RTX 3060", "score": 60, "price": "$350"},
    {"name": "RTX 3060 Ti", "score": 65, "price": "$400"},
    {"name": "RTX 3070", "score": 70, "price": "$500"},
    {"name": "RTX 3070 Ti", "score": 75, "price": "$600"},
    {"name": "RTX 3080", "score": 80, "price": "$700"},
    {"name": "RTX 3090", "score": 85, "price": "$1000"},
    {"name": "RTX 4060", "score": 65, "price": "$400"},
    {"name": "RTX 4060 Ti", "score": 70, "price": "$500"},
    {"name": "RTX 4070", "score": 75, "price": "$600"},
    {"name": "RTX 4070 Ti", "score": 80, "price": "$800"},
    {"name": "RTX 4080", "score": 90, "price": "$1200"},
    {"name": "RTX 4090", "score": 100, "price": "$1600"}
]

@minmax_bp.route('/api/games/list')
def get_games_list():
    """
    Get list of all available games for selection.
    Returns game information without the technical GPU requirements.
    """
    # Return simplified game list for frontend
    games = [
        {
            "id": game["id"],
            "name": game["name"],
            "category": game["category"],
            "image": game["image"]
        }
        for game in GAMES_DATABASE
    ]
    return jsonify(games)

@minmax_bp.route('/api/minmax/recommend', methods=['POST'])
def recommend_gpu():
    """
    Recommend the minimum GPU that can handle all selected games at 1440p 60fps.
    Expects a JSON body with: {"game_ids": [1, 2, 3]}
    """
    data = request.get_json()
    
    if not data or 'game_ids' not in data:
        return jsonify({"error": "Missing game_ids in request body"}), 400
    
    game_ids = data['game_ids']
    
    if not game_ids:
        return jsonify({"error": "Please select at least one game"}), 400
    
    # Find the selected games
    selected_games = [game for game in GAMES_DATABASE if game["id"] in game_ids]
    
    if not selected_games:
        return jsonify({"error": "No valid games found"}), 404
    
    # Find the maximum GPU score required across all selected games
    max_required_score = max(game["gpu_score"] for game in selected_games)
    
    # Find the minimum GPU that meets or exceeds this requirement
    suitable_gpus = [gpu for gpu in GPU_DATABASE if gpu["score"] >= max_required_score]
    
    if not suitable_gpus:
        return jsonify({"error": "No GPU found for the requirements"}), 404
    
    # Sort by score to get the minimum capable GPU
    suitable_gpus.sort(key=lambda x: x["score"])
    recommended_gpu = suitable_gpus[0]
    
    # Get the most demanding game
    most_demanding_game = max(selected_games, key=lambda x: x["gpu_score"])
    
    # Prepare response
    response = {
        "recommended_gpu": {
            "name": recommended_gpu["name"],
            "score": recommended_gpu["score"],
            "price": recommended_gpu["price"]
        },
        "selected_games_count": len(selected_games),
        "most_demanding_game": {
            "name": most_demanding_game["name"],
            "required_gpu": most_demanding_game["recommended_gpu"]
        },
        "selected_games": [
            {
                "id": game["id"],
                "name": game["name"],
                "required_gpu": game["recommended_gpu"],
                "gpu_score": game["gpu_score"]
            }
            for game in selected_games
        ]
    }
    
    return jsonify(response)
