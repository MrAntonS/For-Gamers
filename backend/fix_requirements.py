import sqlite3
import json
import os
from bs4 import BeautifulSoup

def parse_requirements_html(req_html):
    """
    Parse Steam requirements HTML into a structured dictionary.
    """
    if not req_html:
        return None
        
    try:
        soup = BeautifulSoup(req_html, 'html.parser')
        parsed = {}
        
        # Common keys to look for
        keys_map = {
            'os': ['os', 'operating system'],
            'processor': ['processor', 'cpu'],
            'memory': ['memory', 'ram'],
            'graphics': ['graphics', 'video card', 'gpu'],
            'storage': ['storage', 'hard drive', 'space'],
            'sound': ['sound card', 'sound']
        }
        
        # Iterate through list items
        for li in soup.find_all('li'):
            text = li.get_text(" ", strip=True)
            
            # Clean up trademark symbols and weird spaces
            text = text.replace('\u00ae', '').replace('\u2122', '').replace('\u00a9', '').replace('\u3000', ' ')
            
            if ':' in text:
                parts = text.split(':', 1)
                key = parts[0].lower().strip()
                value = parts[1].strip()
                
                # Map to standard keys
                for std_key, variants in keys_map.items():
                    if any(v in key for v in variants):
                        parsed[std_key] = value
                        break
                        
        return parsed if parsed else None
    except Exception as e:
        return None

def fix_requirements():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    db_path = os.path.join(base_dir, 'instance', 'local.db')
    
    if not os.path.exists(db_path):
        print(f"Database not found at {db_path}")
        return

    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    print("Scanning database for games with unparsed requirements...")
    
    # Fetch all games with requirements
    cursor.execute("SELECT id, title, pc_requirements, mac_requirements, linux_requirements FROM games WHERE pc_requirements IS NOT NULL OR mac_requirements IS NOT NULL OR linux_requirements IS NOT NULL")
    rows = cursor.fetchall()
    
    updated_count = 0
    
    for row in rows:
        game_id = row['id']
        updates = {}
        
        for col in ['pc_requirements', 'mac_requirements', 'linux_requirements']:
            raw_val = row[col]
            if not raw_val:
                continue
                
            try:
                # It should be a JSON string
                data = json.loads(raw_val)
                
                if isinstance(data, dict):
                    new_data = {}
                    changed = False
                    
                    # Check if it's already parsed (values are dicts) or needs parsing (values are strings)
                    for key in ['minimum', 'recommended']:
                        if key in data:
                            val = data[key]
                            if isinstance(val, str) and ('<' in val or '&lt;' in val):
                                # It's HTML, parse it
                                parsed = parse_requirements_html(val)
                                if parsed:
                                    new_data[key] = parsed
                                    changed = True
                                else:
                                    # Keep original if parsing failed
                                    new_data[key] = val
                            else:
                                # Already parsed or not HTML
                                if isinstance(val, dict):
                                    # Check if we need to clean up existing parsed data
                                    cleaned_val = {}
                                    val_changed = False
                                    for k, v in val.items():
                                        if isinstance(v, str):
                                            new_v = v.replace('\u00ae', '').replace('\u2122', '').replace('\u00a9', '').replace('\u3000', ' ')
                                            if new_v != v:
                                                val_changed = True
                                            cleaned_val[k] = new_v
                                        else:
                                            cleaned_val[k] = v
                                    
                                    if val_changed:
                                        new_data[key] = cleaned_val
                                        changed = True
                                    else:
                                        new_data[key] = val
                                else:
                                    new_data[key] = val
                    
                    if changed:
                        updates[col] = json.dumps(new_data, ensure_ascii=False)
                        
            except json.JSONDecodeError:
                continue
        
        if updates:
            set_clause = ", ".join([f"{k} = ?" for k in updates.keys()])
            values = list(updates.values()) + [game_id]
            cursor.execute(f"UPDATE games SET {set_clause} WHERE id = ?", values)
            updated_count += 1
            if updated_count % 50 == 0:
                print(f"Updated {updated_count} games...")
                conn.commit()
                
    conn.commit()
    conn.close()
    print(f"Finished! Updated requirements for {updated_count} games.")

if __name__ == "__main__":
    fix_requirements()
