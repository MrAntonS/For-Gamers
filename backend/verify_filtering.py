
import requests
import sys

def test_filtering():
    base_url = "http://127.0.0.1:5000/api/products"
    
    # Test 1: Simulation AND Racing
    # Find a game that is likely Simulation + Racing (e.g. Forza, Assetto Corsa) or just generic check
    print("Testing Simulation + Racing...")
    try:
        r = requests.get(f"{base_url}?limit=100&genres=Simulation,Racing")
        data = r.json()
        products = data.get('products', [])
        print(f"Found {len(products)} products.")
        
        for p in products:
            genres = p.get('genres', [])
            # Check if mapped to text properly, assuming API returns list of strings
            # Case insensitive check
            genres_lower = [g.lower() for g in genres]
            if 'simulation' not in genres_lower or 'racing' not in genres_lower:
                print(f"FAILED: Game {p.get('title')} has genres {genres}, expected both Simulation and Racing.")
                sys.exit(1)
        
        if products:
             print("SUCCESS: All returned products match criteria.")
        else:
             print("WARNING: No products found for Simulation+Racing (could be correct if none exist in DB).")
             
    except Exception as e:
        print(f"Error testing API: {e}")
        sys.exit(1)

if __name__ == "__main__":
    test_filtering()
