"""
Test script to verify eBay hardware search functionality.
This will search for sample hardware items and display the results.
"""

import os
import sys

# Add parent directory to path to import services
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

from services.ebay_service import search_ebay_hardware, parse_ebay_item

def test_search():
    print("Testing eBay Hardware Search...\n")
    
    # Test searches
    test_queries = [
        ("RTX 4070", "Graphics Card"),
        ("PlayStation 5", "Console"),
        ("Gaming Mouse", "Peripheral")
    ]
    
    for query, category in test_queries:
        print(f"\n{'='*60}")
        print(f"Searching for: {query} ({category})")
        print('='*60)
        
        items = search_ebay_hardware(query, limit=3)
        
        if items is None:
            print("❌ Search failed (check OAuth credentials or API limits)")
            continue
        
        if not items:
            print(f"⚠️  No items found for '{query}'")
            continue
        
        print(f"✅ Found {len(items)} items:\n")
        
        for i, item in enumerate(items, 1):
            parsed = parse_ebay_item(item, category_name=category)
            if parsed:
                print(f"{i}. {parsed['title']}")
                print(f"   Price: ${parsed['price']:.2f}")
                if parsed['original_price']:
                    print(f"   Original: ${parsed['original_price']:.2f} ({parsed['discount']}% off)")
                print(f"   Condition: {parsed['condition']}")
                print(f"   Brand: {parsed['brand']}")
                if parsed['shipping_cost'] is not None:
                    print(f"   Shipping: ${parsed['shipping_cost']:.2f}")
                else:
                    print(f"   Shipping: Free")
                print()
    
    print("\n✨ Search test complete!")

if __name__ == "__main__":
    test_search()
