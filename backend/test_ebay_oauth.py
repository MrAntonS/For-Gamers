"""
Test script to verify eBay OAuth token generation.
Run this to ensure your eBay API credentials are configured correctly.
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

from services.ebay_service import get_oauth_token

def test_oauth():
    print("Testing eBay OAuth Authentication...\n")
    
    # Check if credentials are set
    client_id = os.environ.get("EBAY_CLIENT_ID")
    client_secret = os.environ.get("EBAY_CLIENT_SECRET")
    
    if not client_id or not client_secret:
        print("❌ ERROR: eBay API credentials not found!")
        print("\nPlease set the following environment variables in your .env file:")
        print("  EBAY_CLIENT_ID=your_client_id_here")
        print("  EBAY_CLIENT_SECRET=your_client_secret_here")
        print("\nTo get these credentials:")
        print("1. Go to https://developer.ebay.com/")
        print("2. Sign in or create an account")
        print("3. Go to 'My Account' > 'Application Keys'")
        print("4. Create a new application or use an existing one")
        print("5. Copy the 'Client ID' (App ID) and 'Client Secret' (Cert ID)")
        return False
    
    print(f"✓ Found EBAY_CLIENT_ID: {client_id[:10]}...")
    print(f"✓ Found EBAY_CLIENT_SECRET: {client_secret[:10]}...")
    print()
    
    # Try to get token
    print("Requesting OAuth token...")
    token = get_oauth_token()
    
    if token:
        print(f"✅ SUCCESS! OAuth token obtained:")
        print(f"   Token (first 50 chars): {token[:50]}...")
        print(f"   Token length: {len(token)} characters")
        print("\nYour eBay API credentials are working correctly! ✨")
        return True
    else:
        print("❌ FAILED to obtain OAuth token")
        print("\nPossible issues:")
        print("  - Invalid Client ID or Client Secret")
        print("  - Network connectivity issue")
        print("  - eBay API service is down")
        print("\nCheck the error messages above for more details.")
        return False

if __name__ == "__main__":
    success = test_oauth()
    sys.exit(0 if success else 1)
