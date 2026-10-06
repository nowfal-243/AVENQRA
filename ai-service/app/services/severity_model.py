import re

HIGH_URGENCY_KEYWORDS = [
    "danger", "dangerous", "accident", "flooding", "flood", "overflow",
    "overflowing", "spark", "sparking", "fire", "hazard", "hazardous",
    "collapse", "collapsed", "emergency", "urgent", "injury", "blocked"
]

MEDIUM_URGENCY_KEYWORDS = [
    "broken", "damaged", "leaking", "dark", "smell", "foul", "traffic", "jam"
]

CATEGORY_BASE_SEVERITY = {
    "POTHOLE": 6.0,
    "WATER_LEAK": 7.0,
    "WASTE": 5.5,
    "STREETLIGHT": 5.0,
    "ROAD_DAMAGE": 6.5,
    "OTHER": 4.0
}

class SeverityModel:
    @staticmethod
    def calculate_severity(category: str, visual_defect_score: float = 5.0, description: str = None):
        """
        Multi-modal severity scoring engine.
        Returns: severity_score (float 0.0-10.0), priority (str: LOW|MEDIUM|HIGH|CRITICAL)
        """
        base_score = CATEGORY_BASE_SEVERITY.get(category.upper(), 5.0)

        # 1. Text Keyword Urgency Scoring
        text_boost = 0.0
        if description:
            desc_lower = description.lower()
            for kw in HIGH_URGENCY_KEYWORDS:
                if re.search(r'\b' + re.escape(kw) + r'\b', desc_lower):
                    text_boost += 1.5
            for kw in MEDIUM_URGENCY_KEYWORDS:
                if re.search(r'\b' + re.escape(kw) + r'\b', desc_lower):
                    text_boost += 0.5

        # Cap text boost at 3.0
        text_boost = min(3.0, text_boost)

        # 2. Combine Base Score + Visual Defect Score + Text Boost
        combined_score = (base_score * 0.4) + (visual_defect_score * 0.4) + text_boost
        severity_score = min(10.0, max(1.0, round(combined_score, 1)))

        # 3. Map to Priority Level
        if severity_score >= 8.0:
            priority = "CRITICAL"
        elif severity_score >= 6.0:
            priority = "HIGH"
        elif severity_score >= 4.0:
            priority = "MEDIUM"
        else:
            priority = "LOW"

        return severity_score, priority

severity_model = SeverityModel()
