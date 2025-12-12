from bs4 import BeautifulSoup

def parse_requirements(req_html):
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
        print(f"Error parsing requirements: {e}")
        return None

# Sample HTML from the database inspection
sample_html = "<strong>Minimum:</strong><br><ul class=\"bb_ul\"><li><strong>OS *:</strong> Windows 7 Service Pack 1 or newer (64 bit)<br></li><li><strong>Processor:</strong> Intel core i5-4210 1.7ghz<br></li><li><strong>Memory:</strong> 2 GB RAM<br></li><li><strong>Graphics:</strong> Intel HD Graphics 4400<br></li><li><strong>Storage:</strong> 1200 MB available space<br></li><li><strong>Sound Card:</strong> Onboard soundcard or better</li></ul>"

print("--- Testing Parser ---")
result = parse_requirements(sample_html)
import json
print(json.dumps(result, indent=2))

if result:
    print("\nSUCCESS: Parser works!")
else:
    print("\nFAILURE: Parser returned None.")
