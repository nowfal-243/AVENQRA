import re

CATEGORY_KEYWORD_MAP = {
    "POTHOLE": ["pothole", "pit", "hole", "crater", "tarmac", "asphalt", "bump", "trench"],
    "WATER_LEAK": ["water", "leak", "pipe", "burst", "drain", "drainage", "sewer", "sewerage", "overflow", "stagnant", "flooding"],
    "WASTE": ["garbage", "trash", "waste", "rubbish", "dump", "bin", "litter", "filth", "smell", "odor"],
    "STREETLIGHT": ["light", "streetlight", "lamp", "dark", "darkness", "pole", "electricity", "bulb", "wire", "spark"],
    "ROAD_DAMAGE": ["road", "divider", "footpath", "sidewalk", "pavement", "crack", "collapsed", "tar"]
}

class NLPAnalyzer:
    @staticmethod
    def extract_keywords_and_category(text: str):
        if not text:
            return {"keywords": [], "suggested_category": None, "urgency_flag": False}

        text_lower = text.lower()
        words = re.findall(r'\b[a-z]{3,}\b', text_lower)
        keywords = list(set([w for w in words if w not in ["the", "and", "for", "with", "this", "that", "near", "from", "have", "been"]]))

        scores = {cat: 0 for cat in CATEGORY_KEYWORD_MAP}
        for cat, kw_list in CATEGORY_KEYWORD_MAP.items():
            for kw in kw_list:
                if re.search(r'\b' + re.escape(kw) + r'\b', text_lower):
                    scores[cat] += 1

        best_cat = max(scores, key=scores.get)
        suggested_category = best_cat if scores[best_cat] > 0 else None

        urgency_terms = ["danger", "accident", "emergency", "severe", "spark", "flood", "hazard"]
        urgency_flag = any(re.search(r'\b' + re.escape(term) + r'\b', text_lower) for term in urgency_terms)

        return {
            "keywords": keywords[:10],
            "suggested_category": suggested_category,
            "urgency_flag": urgency_flag
        }

nlp_analyzer = NLPAnalyzer()
