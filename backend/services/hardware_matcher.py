import re

class HardwareMatcher:
    # Simplified relative performance scores (0-100 scale for modern context)
    # This is a heuristic database. In a real app, this would be a database table.
    GPU_SCORES = {
        # Older NVIDIA (commonly found in older Steam reqs)
        "gtx 480": 14, "gtx 470": 12, "gtx 460": 10,
        "gts 250": 7, "8800 gt": 6,
        # NVIDIA 40 series
        "rtx 4090": 100, "rtx 4080": 90, "rtx 4070 ti": 82, "rtx 4070": 78, "rtx 4060 ti": 65, "rtx 4060": 55,
        # NVIDIA 30 series
        "rtx 3090": 85, "rtx 3080 ti": 82, "rtx 3080": 75, "rtx 3070 ti": 68, "rtx 3070": 62, "rtx 3060 ti": 52, "rtx 3060": 45, "rtx 3050": 30,
        # NVIDIA 20 series
        "rtx 2080 ti": 65, "rtx 2080": 55, "rtx 2070": 45, "rtx 2060": 35,
        # NVIDIA 16 series
        "gtx 1660 ti": 32, "gtx 1660": 30, "gtx 1650": 20,
        # NVIDIA 10 series
        "gtx 1080 ti": 50, "gtx 1080": 40, "gtx 1070": 32, "gtx 1060": 22, "gtx 1050 ti": 15, "gtx 1050": 12,
        # NVIDIA Older
        "gtx 980": 25, "gtx 970": 20, "gtx 960": 12, "gtx 760": 10, "gtx 660": 8,
        
        # AMD 7000
        "rx 7900 xtx": 95, "rx 7900 xt": 88, "rx 7800 xt": 72, "rx 7700 xt": 62, "rx 7600": 48,
        # AMD 6000
        "rx 6950 xt": 80, "rx 6900 xt": 75, "rx 6800 xt": 68, "rx 6800": 60, "rx 6700 xt": 50, "rx 6600 xt": 40, "rx 6600": 35,
        # AMD 5000
        "rx 5700 xt": 42, "rx 5700": 38, "rx 5600 xt": 32, "rx 5500 xt": 22,
        # AMD Older
        "rx 590": 22, "rx 580": 20, "rx 570": 18, "rx 480": 18, "r9 290": 15, "hd 7950": 10, "hd 7850": 8
    }

    CPU_SCORES = {
        # Generic / older CPU descriptors
        "quad core": 20,
        "dual core": 10,

        # Intel 13/14th Gen
        "i9-14900": 100, "i7-14700": 92, "i5-14600": 82,
        "i9-13900": 95, "i7-13700": 88, "i5-13600": 78, "i5-13400": 65,
        # Intel 12th Gen
        "i9-12900": 85, "i7-12700": 75, "i5-12600": 65, "i5-12400": 55,
        # Intel 10/11th Gen
        "i9-11900": 70, "i7-11700": 62, "i5-11600": 52, "i5-11400": 45,
        "i9-10900": 65, "i7-10700": 58, "i5-10600": 48, "i5-10400": 40,
        # Intel Older
        "i7-9700": 50, "i5-9600": 42, "i5-9400": 35,
        "i7-8700": 45, "i5-8400": 32,
        "i7-7700": 35, "i5-7400": 25,
        "i7-4790": 25, "i5-4460": 18, "i3": 15,

        # Intel Sandy/Ivy Bridge era (often referenced by older games)
        "i7-3770": 22,
        "i7-2600": 20,
        "i5-2500": 18,
        
        # AMD Ryzen 7000
        "ryzen 9 7950": 98, "ryzen 9 7900": 90, "ryzen 7 7800x3d": 92, "ryzen 7 7700": 80, "ryzen 5 7600": 70,
        # AMD Ryzen 5000
        "ryzen 9 5950": 85, "ryzen 9 5900": 78, "ryzen 7 5800x3d": 75, "ryzen 7 5800": 68, "ryzen 5 5600": 55,
        # AMD Ryzen 3000
        "ryzen 9 3900": 65, "ryzen 7 3700": 55, "ryzen 5 3600": 45,
        # AMD Older
        "ryzen 7 2700": 45, "ryzen 5 2600": 35,
        "ryzen 7 1700": 35, "ryzen 5 1600": 28,
        "fx-8350": 15, "fx-6300": 12
    }

    @staticmethod
    def normalize(text):
        if not text:
            return ""
        # Remove trademark symbols, extra spaces, convert to lower
        text = text.lower()
        text = text.replace('\u00ae', '').replace('\u2122', '') # Remove ® and ™
        text = text.replace('-', ' ').replace('_', ' ')
        # Insert space between letters and numbers (e.g. GTX760 -> GTX 760)
        text = re.sub(r'([a-zA-Z])(\d)', r'\1 \2', text)
        text = re.sub(r'(\d)([a-zA-Z])', r'\1 \2', text)
        return text

    @classmethod
    def extract_score(cls, text, component_type='gpu'):
        if not text:
            return 0, None
        
        text = cls.normalize(text)
        scores = cls.GPU_SCORES if component_type == 'gpu' else cls.CPU_SCORES
        
        best_score = 0
        matched_item = None

        # Sort keys by length (descending) to match "rtx 3060 ti" before "rtx 3060"
        sorted_keys = sorted(scores.keys(), key=len, reverse=True)

        for model in sorted_keys:
            # Normalize the model key as well to match the normalized text
            normalized_model = cls.normalize(model)
            
            if normalized_model in text:
                # Basic boundary check to ensure we don't match "1050" inside "10500"
                # This is a simplified check.
                if scores[model] > best_score:
                    best_score = scores[model]
                    matched_item = model
        
        # Heuristic fallback for CPU when games don't list a specific model
        if best_score == 0 and component_type == 'cpu':
            if 'quad core' in text:
                return cls.CPU_SCORES.get('quad core', 20), 'quad core'
            if 'dual core' in text:
                return cls.CPU_SCORES.get('dual core', 10), 'dual core'

        return best_score, matched_item

    @classmethod
    def get_build_tier(cls, score):
        if score >= 80: return "Enthusiast"
        if score >= 60: return "High-End"
        if score >= 40: return "Mid-Range"
        if score >= 20: return "Entry-Level"
        return "Low-End"

    @classmethod
    def get_component_for_score(cls, score, component_type='gpu'):
        """
        Find a representative component for a given score.
        """
        if score is None or score <= 0:
            return "Unknown"

        scores = cls.GPU_SCORES if component_type == 'gpu' else cls.CPU_SCORES
        
        # Find the component with the closest score
        closest_component = None
        min_diff = float('inf')
        
        for component, comp_score in scores.items():
            diff = abs(comp_score - score)
            if diff < min_diff:
                min_diff = diff
                closest_component = component
            elif diff == min_diff:
                # Prefer newer components (heuristic: higher number usually)
                # This is a simple string comparison, not perfect but better than random
                if component > closest_component:
                    closest_component = component
                    
        return closest_component.upper() if closest_component else "Unknown"
