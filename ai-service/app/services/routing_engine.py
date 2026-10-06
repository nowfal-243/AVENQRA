DEPARTMENT_ROUTING_MAP = {
    "POTHOLE": {"code": "ROAD", "name": "Roads & Transport Infrastructure"},
    "ROAD_DAMAGE": {"code": "ROAD", "name": "Roads & Transport Infrastructure"},
    "WATER_LEAK": {"code": "WATER", "name": "Water Supply & Sewerage Board"},
    "DRAINAGE": {"code": "WATER", "name": "Water Supply & Sewerage Board"},
    "WASTE": {"code": "WASTE", "name": "Solid Waste Management"},
    "GARBAGE": {"code": "WASTE", "name": "Solid Waste Management"},
    "STREETLIGHT": {"code": "ELEC", "name": "Electricity & Streetlighting Board"},
    "ELECTRICAL": {"code": "ELEC", "name": "Electricity & Streetlighting Board"},
    "OTHER": {"code": "GEN", "name": "General Public Works"}
}

class RoutingEngine:
    @staticmethod
    def recommend_department(category: str, description: str = None):
        """
        Determines the optimal municipal department code and name.
        """
        cat_upper = category.upper() if category else "OTHER"
        dept_info = DEPARTMENT_ROUTING_MAP.get(cat_upper, DEPARTMENT_ROUTING_MAP["OTHER"])

        return {
            "department_code": dept_info["code"],
            "department_name": dept_info["name"]
        }

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

        return {
            "composite_score": composite_score,
            "priority": priority
        }

routing_engine = RoutingEngine()
