"""
Department routing + composite priority scoring.

Department resolution is delegated to the canonical taxonomy so the AI
service, the Express backend and the web portal always agree on which
municipal department owns a given civic issue.
"""

from app.services import taxonomy

DEPARTMENT_ROUTING_MAP = taxonomy.DEPARTMENTS


class RoutingEngine:
    @staticmethod
    def recommend_department(category: str, description: str = None):
        """
        Determines the optimal municipal department code and name.
        Accepts legacy codes ("POTHOLE") or canonical labels ("Pothole").
        """
        return taxonomy.recommend_department(category, description)

    @staticmethod
    def compute_composite_priority(severity_score: float, duplicate_count: int = 0, urgency_flag: bool = False):
        """
        Calculates Composite Priority Score (0.0 to 100.0) and Priority Level.
        """
        # Base severity component (0-10 scaled to 0-60)
        sev_component = severity_score * 6.0

        # Duplicate reports component (up to 5 duplicates * 5.0 points = 25.0 points)
        dup_component = min(5, duplicate_count) * 5.0

        # Urgency flag boost (15.0 points)
        urgency_component = 15.0 if urgency_flag else 0.0

        composite_score = min(100.0, max(0.0, round(sev_component + dup_component + urgency_component, 1)))

        if composite_score >= 80.0:
            priority = "CRITICAL"
        elif composite_score >= 60.0:
            priority = "HIGH"
        elif composite_score >= 35.0:
            priority = "MEDIUM"
        else:
            priority = "LOW"

        return {"composite_score": composite_score, "priority": priority}


routing_engine = RoutingEngine()
