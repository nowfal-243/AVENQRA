"""
AVENQRA canonical civic-issue taxonomy.

Single source of truth for the AI microservice. It intentionally mirrors
``web/src/utils/constants.js`` (the portal's canonical category list) and
``database/seed.sql`` (the municipal departments), so a category produced by
the vision model, the NLP analyzer or the mobile client always resolves to a
department that actually exists in the database.

Routing is keyword-based — exactly like the backend controller in
``backend/src/controllers/complaint.controller.js`` and the portal's
``recommendDeptCode()`` helper — so legacy codes (``POTHOLE``) and canonical
labels (``Pothole``) both resolve correctly.
"""

# Municipal departments, matching database/seed.sql.
DEPARTMENTS = {
    "ROAD": "Roads & Infrastructure",
    "WASTE": "Waste Management",
    "WATER": "Water Supply & Sewage",
    "ELEC": "Electrical & Streetlights",
    "DRAIN": "Drainage & Flood Control",
}

# Ordered most-specific first: the first match wins.
ROUTING_RULES = [
    ("WASTE", ("waste", "garbage", "dumping", "bin", "litter", "rubbish", "trash")),
    ("WATER", ("water", "sewage", "sewer")),
    ("ELEC", ("light", "electrical", "signal")),
    ("DRAIN", ("drain", "flood", "waterlogging")),
]

DEFAULT_DEPARTMENT = "ROAD"

# Legacy internal codes emitted by the heuristics in vision_model.py /
# nlp_service.py, mapped onto the canonical user-facing labels.
LEGACY_CODE_TO_LABEL = {
    "POTHOLE": "Pothole",
    "WATER_LEAK": "Water Leakage",
    "WASTE": "Waste Accumulation",
    "STREETLIGHT": "Streetlight Electrical Failure",
    "ROAD_DAMAGE": "Damaged Road",
    "OTHER": "Other Civic Issue",
}

# The canonical 15 categories. `keywords` feed the NLP classifier, `severity`
# is the baseline score (1.0-10.0) before visual/textual adjustment.
CATEGORIES = [
    {"label": "Pothole", "dept": "ROAD", "severity": 6.0,
     "keywords": ("pothole", "pit", "hole", "crater", "tarmac", "asphalt", "bump", "trench")},
    {"label": "Damaged Road", "dept": "ROAD", "severity": 6.5,
     "keywords": ("road", "divider", "footpath", "sidewalk", "pavement", "crack", "collapsed", "tar")},
    {"label": "Waste Accumulation", "dept": "WASTE", "severity": 5.5,
     "keywords": ("waste", "garbage", "trash", "rubbish", "dump", "bin", "litter", "filth", "smell", "odor")},
    {"label": "Drainage Blockage", "dept": "DRAIN", "severity": 6.0,
     "keywords": ("drain", "drainage", "blockage", "blocked", "sewer", "manhole", "stagnant")},
    {"label": "Water Leakage", "dept": "WATER", "severity": 7.0,
     "keywords": ("water", "leak", "leaking", "pipe", "burst", "supply", "pipeline")},
    {"label": "Streetlight Electrical Failure", "dept": "ELEC", "severity": 5.0,
     "keywords": ("light", "streetlight", "lamp", "dark", "darkness", "pole", "electricity", "bulb", "wire", "spark")},
    {"label": "Overflowing Waste Bin", "dept": "WASTE", "severity": 5.0,
     "keywords": ("overflowing", "overflow", "bin", "garbage")},
    {"label": "Sewage Overflow", "dept": "WATER", "severity": 7.5,
     "keywords": ("sewage", "sewer", "overflow", "overflowing", "contaminat")},
    {"label": "Damaged Footpath", "dept": "ROAD", "severity": 6.0,
     "keywords": ("footpath", "sidewalk", "pavement", "walkway", "pedestrian")},
    {"label": "Traffic Signal Failure (Electrical)", "dept": "ELEC", "severity": 7.5,
     "keywords": ("signal", "traffic", "light", "electric", "junction")},
    {"label": "Illegal Waste Dumping", "dept": "WASTE", "severity": 6.0,
     "keywords": ("illegal", "dumping", "dump", "unauthorised", "unauthorized", "garbage")},
    {"label": "Water Supply Interruption", "dept": "WATER", "severity": 6.0,
     "keywords": ("supply", "interruption", "tanker", "shortage", "no water", "water")},
    {"label": "Public Property Damage", "dept": "ROAD", "severity": 6.5,
     "keywords": ("property", "vandalism", "public", "bench", "boundary", "wall", "damage")},
    {"label": "Fallen Tree", "dept": "ROAD", "severity": 7.0,
     "keywords": ("tree", "fallen", "branch", "uprooted", "trunk")},
    {"label": "Other Civic Issue", "dept": "ROAD", "severity": 4.0,
     "keywords": ()},
]

CATEGORY_LABELS = [c["label"] for c in CATEGORIES]

_SEVERITY_BY_LABEL = {c["label"]: c["severity"] for c in CATEGORIES}

# Urgency terms that raise a severity score when they appear in the report text.
HIGH_URGENCY_KEYWORDS = (
    "danger", "dangerous", "accident", "flooding", "flood", "overflow",
    "overflowing", "spark", "sparking", "fire", "hazard", "hazardous",
    "collapse", "collapsed", "emergency", "urgent", "injury", "blocked",
    "child", "children", "school",
)

MEDIUM_URGENCY_KEYWORDS = (
    "broken", "damaged", "leaking", "dark", "smell", "foul", "traffic", "jam",
)


def canonical_label(category):
    """Normalize any category spelling (legacy code or label) to a canonical label."""
    if not category:
        return "Other Civic Issue"
    text = str(category).strip()
    if text in _SEVERITY_BY_LABEL:
        return text
    if text.upper() in LEGACY_CODE_TO_LABEL:
        return LEGACY_CODE_TO_LABEL[text.upper()]
    for label in CATEGORY_LABELS:
        if label.lower() == text.lower():
            return label
    return "Other Civic Issue"


def recommend_department(category, description=None):
    """Return the {department_code, department_name} responsible for a category."""
    haystack = f"{category or ''} {description or ''}".lower()
    for code, keywords in ROUTING_RULES:
        if any(keyword in haystack for keyword in keywords):
            return {"department_code": code, "department_name": DEPARTMENTS[code]}
    return {
        "department_code": DEFAULT_DEPARTMENT,
        "department_name": DEPARTMENTS[DEFAULT_DEPARTMENT],
    }


def base_severity(category):
    """Baseline severity (1.0-10.0) for a canonical category."""
    return _SEVERITY_BY_LABEL.get(canonical_label(category), 5.0)


def category_from_keywords(text):
    """Best-guess canonical category from free text, or None when no signal."""
    if not text:
        return None
    haystack = str(text).lower()
    best_label, best_score = None, 0
    for entry in CATEGORIES:
        score = sum(1 for keyword in entry["keywords"] if keyword in haystack)
        if score > best_score:
            best_label, best_score = entry["label"], score
    return best_label if best_score > 0 else None

