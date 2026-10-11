from app.services import taxonomy

HIGH_URGENCY_KEYWORDS = taxonomy.HIGH_URGENCY_KEYWORDS

MEDIUM_URGENCY_KEYWORDS = taxonomy.MEDIUM_URGENCY_KEYWORDS


class SeverityModel:
    @staticmethod
    def calculate_severity(category: str, visual_defect_score: float = 5.0, description: str = None):
        """
        Multi-modal severity scoring engine.
        Returns: severity_score (float 0.0-10.0), priority (str: LOW|MEDIUM|HIGH|CRITICAL)
        """
        # Baseline comes from the canonical taxonomy, so both legacy codes
        # ("POTHOLE") and canonical labels ("Pothole") resolve correctly.
        base_score = taxonomy.base_severity(category)

        # 1. Text Keyword Urgency Scoring
        # Substring matching (not \b word boundaries) so plurals and inflections
        # still score: "accidents" must match "accident", else a real hazard
        # silently scores as LOW. This matches nlp_service/taxonomy behaviour.
        text_boost = 0.0
        if description:
            desc_lower = description.lower()
            for kw in HIGH_URGENCY_KEYWORDS:
                if kw in desc_lower:
                    text_boost += 1.5
            for kw in MEDIUM_URGENCY_KEYWORDS:
                if kw in desc_lower:
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
