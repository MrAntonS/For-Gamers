import requests
import json

def test_pagination():
    url = "http://127.0.0.1:5000/api/products"
    
    # Test 1: Mixed (default)
    print("--- TEST 1: Mixed (limit=5) ---")
    _run_test(url, {'limit': 5, 'page': 1})
    
    # Test 2: Hardware Only
    print("\n--- TEST 2: Hardware Only (limit=5) ---")
    _run_test(url, {'limit': 5, 'page': 1, 'category': 'Hardware'})

def _run_test(url, params):
    try:
        print(f"Requesting {url} with params {params}...")
        response = requests.get(url, params=params)
        
        if response.status_code == 200:
            data = response.json()
            products = data.get('products', [])
            total = data.get('total')
            
            print(f"Status Code: {response.status_code}")
            print(f"Total Items: {total}")
            print(f"Returned Count: {len(products)}")
            
            # print("\nreturned items:")
            # for i, p in enumerate(products, 1):
            #     print(f"{i}. {p.get('title')} (Category: {p.get('category_name', 'Game')})")
                
            if len(products) <= params['limit']:
                 if len(products) == 0:
                     print("WARNING: Returned 0 items.")
                 else:
                     print("SUCCESS: Pagination limit respected.")
            else:
                print(f"FAILURE: Expected <= {params['limit']} items, got {len(products)}.")
        else:
            print(f"Error: Status code {response.status_code}")
            print(response.text)
            
    except Exception as e:
        print(f"Exception: {e}")

if __name__ == "__main__":
    test_pagination()
