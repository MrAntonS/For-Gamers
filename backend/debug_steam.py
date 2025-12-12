import requests
import json

def check_mature():
    app_ids = [10, 3122920] # CS (Safe) and Fox Sex Farm (Adult)
    ids_str = ",".join([str(x) for x in app_ids])
    
    url = "https://store.steampowered.com/api/appdetails"
    params = {
        "appids": ids_str,
        "filters": "content_descriptors,basic", 
        "cc": "US"
    }
    
    # Try without headers (like current code)
    print("--- Request without headers ---")
    try:
        response = requests.get(url, params=params)
        print(f"Status Code: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            if data is None:
                print("Response JSON is None")
            else:
                print(f"Response keys: {list(data.keys())}")
                for app_id, details in data.items():
                    print(f"App {app_id} success: {details.get('success')}")
    except Exception as e:
        print(f"Error: {e}")

    # Try with headers and NO filters and MULTIPLE IDs (comma separated)
    print("\n--- Request with headers and MULTIPLE IDs ---")
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
    }
    # We construct the URL manually to avoid encoding the comma if that's the issue
    url_multi = f"https://store.steampowered.com/api/appdetails?appids={ids_str}&cc=US&filters=content_descriptors,basic"
    
    try:
        response = requests.get(url_multi, headers=headers)
        print(f"Status Code: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            if data is None:
                print("Response JSON is None")
            else:
                print(f"Response keys: {list(data.keys())}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check_mature()
