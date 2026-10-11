import re

from app.services import taxonomy

# Canonical categories + keywords come from the shared taxonomy so text
# classification always agrees with the vision model and the web portal.
CATEGORY_KEYWORD_MAP = {
    entry["label"]: list(entry["keywords"]) for entry in taxonomy.CATEGORIES
}

STOPWORDS = ("the", "and", "for", "with", "this", "that", "near", "from", "have", "been")


class NLPAnalyzer:
    @staticmethod
    def extract_keywords_and_category(text: str):
        if not text:
            return {"keywords": [], "suggested_category": None, "urgency_flag": False}

        text_lower = text.lower()
        words = re.findall(r'\b[a-z]{3,}\b', text_lower)
        # dict.fromkeys de-duplicates while preserving first-seen order.
        keywords = list(dict.fromkeys(w for w in words if w not in STOPWORDS))

        scores = {label: 0 for label in CATEGORY_KEYWORD_MAP}
        for label, kw_list in CATEGORY_KEYWORD_MAP.items():
            for kw in kw_list:
                if kw in text_lower:
                    scores[label] += 1

        best_label = max(scores, key=scores.get)
        suggested_category = best_label if scores[best_label] > 0 else None

        urgency_flag = any(term in text_lower for term in taxonomy.HIGH_URGENCY_KEYWORDS)

        return {
            "keywords": keywords[:10],
            "suggested_category": suggested_category,
            "urgency_flag": urgency_flag,
        }

nlp_analyzer = NLPAnalyzer()
