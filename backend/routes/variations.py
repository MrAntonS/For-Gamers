from flask import Blueprint, jsonify
from models import Hardware

variations_bp = Blueprint('variations_bp', __name__)

@variations_bp.route('/api/hardware/<int:hardware_id>/variations', methods=['GET'])
def get_hardware_variations(hardware_id):
    """
    Get all available variations for a hardware product.
    Returns list of variations with their specs and prices, sorted by deal score.
    """
    # Get the main hardware item
    hardware = Hardware.query.get(hardware_id)
    
    if not hardware:
        return jsonify({"error": "Product not found"}), 404
    
    # If no item_group_id, this product has no variations
    if not hardware.item_group_id:
        # Return just this item as a single variation
        return jsonify({
            "variations": [hardware.to_dict()],
            "hasVariations": False
        })
    
    # Fetch all variations in the same item group
    variations = Hardware.query.filter_by(
        item_group_id=hardware.item_group_id,
        is_active=True
    ).all()
    
    # Convert to dict and calculate scores
    variations_data = []
    for var in variations:
        var_dict = var.to_dict()
        var_dict['dealScore'] = var.calculate_deal_score()
        variations_data.append(var_dict)
    
    # Sort by deal score (best first)
    variations_data.sort(key=lambda x: x['dealScore'], reverse=True)
    
    return jsonify({
        "variations": variations_data,
        "hasVariations": len(variations_data) > 1,
        "itemGroupId": hardware.item_group_id
    })
