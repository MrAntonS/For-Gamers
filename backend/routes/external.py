from flask import Blueprint, jsonify, request
from services.steam_service import search_steam_games, get_steam_featured, get_steam_game_details, save_game_to_db
from services.ebay_service import search_ebay_products

external_bp = Blueprint('external_bp', __name__)

@external_bp.route('/api/steam/search')
def steam_search():
    query = request.args.get('query')
    if not query:
        return jsonify({"error": "Query parameter is required"}), 400
    
    results = search_steam_games(query)
    
    # Save search results to DB to expand our catalog
    for item in results:
        save_game_to_db(item)
        
    return jsonify(results)

@external_bp.route('/api/steam/featured')
def steam_featured():
    results = get_steam_featured()
    return jsonify(results)

@external_bp.route('/api/steam/game/<int:app_id>')
def steam_game_details(app_id):
    details = get_steam_game_details(app_id)
    if not details:
        return jsonify({"error": "Game not found"}), 404
    return jsonify(details)

@external_bp.route('/api/ebay/search')
def ebay_search():
    query = request.args.get('query')
    if not query:
        return jsonify({"error": "Query parameter is required"}), 400
    
    results = search_ebay_products(query)
    return jsonify(results)
