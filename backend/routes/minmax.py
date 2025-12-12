from flask import Blueprint, jsonify, request
from models import Game, db
from services.hardware_matcher import HardwareMatcher
import json
import re

minmax_bp = Blueprint('minmax_bp', __name__)


def _parse_ram_gb(text):
    """Parse a RAM requirement string into GB (int). Returns 0 if unknown."""
    if not text or not isinstance(text, str):
        return 0

    t = text.lower()
    # Normalize common separators
    t = t.replace(',', '.').replace('\u00a0', ' ')

    # Prefer explicit GB values
    gb_matches = re.findall(r'(\d+(?:\.\d+)?)\s*(?:gb|g)\b', t)
    if gb_matches:
        # Take the max number mentioned (e.g. "8-16 GB")
        try:
            return int(max(float(x) for x in gb_matches))
        except Exception:
            return 0

    # Fallback: MB values
    mb_matches = re.findall(r'(\d+(?:\.\d+)?)\s*mb\b', t)
    if mb_matches:
        try:
            mb = max(float(x) for x in mb_matches)
            return int(round(mb / 1024.0))
        except Exception:
            return 0

    return 0

@minmax_bp.route('/api/minmax/games', methods=['GET'])
def get_games():
    # Fetch games that have requirements.
    # Support optional pagination: ?limit=500&offset=0
    # Default limit is high enough to include all requirement-bearing games in typical DBs.
    try:
        limit = int(request.args.get('limit', 1000))
    except Exception:
        limit = 1000
    try:
        offset = int(request.args.get('offset', 0))
    except Exception:
        offset = 0

    if limit < 1:
        limit = 1
    if limit > 5000:
        limit = 5000
    if offset < 0:
        offset = 0

    games = (
        Game.query
        .filter(Game.pc_requirements.isnot(None))
        .order_by(Game.title.asc())
        .offset(offset)
        .limit(limit)
        .all()
    )
    
    result = []
    for game in games:
        try:
            reqs = json.loads(game.pc_requirements) if game.pc_requirements else {}
            if not isinstance(reqs, dict):
                reqs = {}
        except:
            reqs = {}
            
        # Use recommended if available, otherwise minimum
        rec = reqs.get('recommended')
        if not isinstance(rec, dict):
            rec = reqs.get('minimum')
        
        if not isinstance(rec, dict):
            rec = {}
        
        gpu_text = rec.get('graphics', '')
        cpu_text = rec.get('processor', '')
        mem_text = rec.get('memory', '')
        
        gpu_score, gpu_name = HardwareMatcher.extract_score(gpu_text, 'gpu')
        cpu_score, cpu_name = HardwareMatcher.extract_score(cpu_text, 'cpu')
        
        # Simple memory parsing
        mem_score = 0
        if '16' in mem_text: mem_score = 16
        elif '8' in mem_text: mem_score = 8
        elif '4' in mem_text: mem_score = 4
        
        result.append({
            'id': game.id,
            'name': game.title,
            'category': 'Game', 
            'image': game.image_url,
            'recommended_gpu': gpu_name or 'Unknown GPU',
            'gpu_score': gpu_score,
            'recommended_cpu': cpu_name or 'Unknown CPU',
            'cpu_score': cpu_score,
            'recommended_memory': mem_text,
            'memory_score': mem_score
        })
        
    return jsonify(result)

@minmax_bp.route('/api/minmax/calculate', methods=['POST'])
def calculate_build():
    data = request.json
    game_ids = data.get('gameIds', [])
    
    if not game_ids:
        return jsonify({'error': 'No games selected'}), 400
        
    games = Game.query.filter(Game.id.in_(game_ids)).all()
    
    # Initialize requirements
    min_build = {'gpu_score': 0, 'gpu_name': None, 'cpu_score': 0, 'cpu_name': None, 'ram_gb': 0}
    max_build = {'gpu_score': 0, 'gpu_name': None, 'cpu_score': 0, 'cpu_name': None, 'ram_gb': 0}
    
    details = []
    
    for game in games:
        try:
            reqs = json.loads(game.pc_requirements) if game.pc_requirements else {}
            if not isinstance(reqs, dict):
                reqs = {}
        except:
            reqs = {}
            
        min_req = reqs.get('minimum')
        if not isinstance(min_req, dict):
            min_req = {}
            
        rec_req = reqs.get('recommended')
        if not isinstance(rec_req, dict):
            rec_req = {}
        
        # Calculate scores for Minimum Build (must meet MINIMUM of all games)
        min_gpu_score, min_gpu_name = HardwareMatcher.extract_score(min_req.get('graphics', ''), 'gpu')
        min_cpu_score, min_cpu_name = HardwareMatcher.extract_score(min_req.get('processor', ''), 'cpu')

        min_ram_gb = _parse_ram_gb(min_req.get('memory', ''))
        
        # Calculate scores for Maximum Build (should meet RECOMMENDED of all games)
        rec_gpu_score, rec_gpu_name = HardwareMatcher.extract_score(rec_req.get('graphics', ''), 'gpu')
        rec_cpu_score, rec_cpu_name = HardwareMatcher.extract_score(rec_req.get('processor', ''), 'cpu')

        rec_ram_gb = _parse_ram_gb(rec_req.get('memory', ''))

        # If recommended is missing/unparseable, fall back to minimum
        if rec_gpu_score == 0:
            rec_gpu_score = min_gpu_score
            rec_gpu_name = min_gpu_name
        if rec_cpu_score == 0:
            rec_cpu_score = min_cpu_score
            rec_cpu_name = min_cpu_name
        if rec_ram_gb == 0:
            rec_ram_gb = min_ram_gb
        
        # Update global requirements (we need the MAX of the requirements to cover all games)
        if min_gpu_score > min_build['gpu_score']:
            min_build['gpu_score'] = min_gpu_score
            min_build['gpu_name'] = min_gpu_name
        if min_cpu_score > min_build['cpu_score']:
            min_build['cpu_score'] = min_cpu_score
            min_build['cpu_name'] = min_cpu_name
        min_build['ram_gb'] = max(min_build['ram_gb'], min_ram_gb)

        if rec_gpu_score > max_build['gpu_score']:
            max_build['gpu_score'] = rec_gpu_score
            max_build['gpu_name'] = rec_gpu_name
        if rec_cpu_score > max_build['cpu_score']:
            max_build['cpu_score'] = rec_cpu_score
            max_build['cpu_name'] = rec_cpu_name
        max_build['ram_gb'] = max(max_build['ram_gb'], rec_ram_gb)
        
        details.append({
            'id': game.id,
            'name': game.title,
            'image': game.image_url,
            'minimum': {
                'gpu_score': min_gpu_score,
                'gpu_name': (min_gpu_name.upper() if isinstance(min_gpu_name, str) and min_gpu_name else 'Unknown'),
                'cpu_score': min_cpu_score,
                'cpu_name': (min_cpu_name.upper() if isinstance(min_cpu_name, str) and min_cpu_name else 'Unknown'),
                'ram_gb': min_ram_gb,
            },
            'recommended': {
                'gpu_score': rec_gpu_score,
                'gpu_name': (rec_gpu_name.upper() if isinstance(rec_gpu_name, str) and rec_gpu_name else 'Unknown'),
                'cpu_score': rec_cpu_score,
                'cpu_name': (rec_cpu_name.upper() if isinstance(rec_cpu_name, str) and rec_cpu_name else 'Unknown'),
                'ram_gb': rec_ram_gb,
            }
        })
        
    return jsonify({
        'min_build': {
            'gpu_score': min_build['gpu_score'],
            'gpu_name': (min_build['gpu_name'].upper() if isinstance(min_build['gpu_name'], str) and min_build['gpu_name'] else HardwareMatcher.get_component_for_score(min_build['gpu_score'], 'gpu')),
            'cpu_score': min_build['cpu_score'],
            'cpu_name': (min_build['cpu_name'].upper() if isinstance(min_build['cpu_name'], str) and min_build['cpu_name'] else HardwareMatcher.get_component_for_score(min_build['cpu_score'], 'cpu')),
            'ram_gb': min_build['ram_gb'],
            'tier': HardwareMatcher.get_build_tier(min_build['gpu_score']),
            'description': f'Capable of running all selected games at minimum settings.'
        },
        'max_build': {
            'gpu_score': max_build['gpu_score'],
            'gpu_name': (max_build['gpu_name'].upper() if isinstance(max_build['gpu_name'], str) and max_build['gpu_name'] else HardwareMatcher.get_component_for_score(max_build['gpu_score'], 'gpu')),
            'cpu_score': max_build['cpu_score'],
            'cpu_name': (max_build['cpu_name'].upper() if isinstance(max_build['cpu_name'], str) and max_build['cpu_name'] else HardwareMatcher.get_component_for_score(max_build['cpu_score'], 'cpu')),
            'ram_gb': max_build['ram_gb'],
            'tier': HardwareMatcher.get_build_tier(max_build['gpu_score']),
            'description': f'Capable of running all selected games at recommended settings.'
        },
        'details': details
    })
