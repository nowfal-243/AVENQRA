from fastapi import APIRouter, UploadFile, File, Form
from typing import Optional
import json

from app.schemas.complaint import ClassificationResponse, FullAnalysisResponse
from app.services.vision_model import vision_classifier
from app.services.severity_model import severity_model
from app.services.duplicate_detector import duplicate_detector
from app.services.nlp_service import nlp_analyzer
from app.services.routing_engine import routing_engine
from app.services import taxonomy

router = APIRouter(prefix="/api/v1/ai", tags=["AI Classification & Analysis"])


@router.post("/classify", response_model=ClassificationResponse)
async def classify_issue_image(
    file: UploadFile = File(...),
    description: Optional[str] = Form(None),
):
    """Single-pass image classification used by the mobile client."""
    contents = await file.read()

    # 1. Vision model classification (returns a legacy internal code)
    category, confidence, defect_score = vision_classifier.predict(contents)

    # 2. Multi-modal severity & priority calculation
    severity_score, priority = severity_model.calculate_severity(
        category=category,
        visual_defect_score=defect_score,
        description=description,
    )

    # 3. Resolve the canonical label + owning municipal department
    label = taxonomy.canonical_label(category)
    dept_info = taxonomy.recommend_department(label, description)

    # 4. Perceptual image hash for downstream duplicate detection
    image_hash = duplicate_detector.compute_image_hash(contents)

    return ClassificationResponse(
        category=label,
        confidence=confidence,
        suggested_priority=priority,
        severity_score=severity_score,
        department_code=dept_info["department_code"],
        department_name=dept_info["department_name"],
        image_hash=image_hash,
    )


@router.post("/analyze-complaint", response_model=FullAnalysisResponse)
async def analyze_full_complaint(
    file: Optional[UploadFile] = File(None),
    category: Optional[str] = Form(None),
    latitude: Optional[float] = Form(None),
    longitude: Optional[float] = Form(None),
    description: Optional[str] = Form(None),
    existingComplaintsJson: Optional[str] = Form(None),
):
    """
    Full multi-modal analysis performed at complaint submission time.

    Combines vision inference, NLP keyword extraction, multi-modal severity
    scoring, composite prioritisation and geospatial duplicate detection.
    """
    contents = None
    if file is not None:
        contents = await file.read()

    # 1. NLP text analysis
    nlp_res = nlp_analyzer.extract_keywords_and_category(description)

    # 2. Vision classification (only when an image was supplied)
    vision_label, vision_confidence, defect_score = None, 0.0, 5.0
    if contents:
        vision_label, vision_confidence, defect_score = vision_classifier.predict(contents)

    # 3. Resolve the category: explicit client value → vision → NLP → fallback
    text_label = taxonomy.category_from_keywords(description)

    # The mobile/web client sends *department* codes (ROAD, ELEC, WASTE, ...) as
    # `category`. Those are routing hints, not civic-issue categories, and
    # canonical_label() collapses every one of them to "Other Civic Issue".
    # Treating them as authoritative would therefore discard a far more
    # specific vision/NLP verdict, so only accept a client value that actually
    # resolves to a real canonical category.
    client_label = taxonomy.canonical_label(category) if category else None
    if client_label == "Other Civic Issue":
        client_label = None

    resolved = client_label or vision_label or text_label
    if not resolved or not str(resolved).strip():
        resolved = "Other Civic Issue"
    label = taxonomy.canonical_label(resolved)

    # Confidence is highest when vision and text agree on the category.
    confidence = vision_confidence or 0.85
    if text_label and text_label == label:
        confidence = min(0.98, round(confidence + 0.05, 2))

    # 4. Multi-modal severity & priority
    severity_score, priority = severity_model.calculate_severity(
        category=label,
        visual_defect_score=defect_score,
        description=description,
    )

    # 5. Composite priority (adds duplicate-volume and urgency weighting)
    priority_res = routing_engine.compute_composite_priority(
        severity_score=severity_score,
        duplicate_count=0,
        urgency_flag=nlp_res["urgency_flag"],
    )

    # 6. Geospatial duplicate detection against existing complaints
    dup_res = {"is_duplicate": False, "confidence": 0.0, "distance_meters": 0.0, "duplicate_ticket": None}
    if latitude is not None and longitude is not None:
        existing = []
        if existingComplaintsJson:
            try:
                existing = json.loads(existingComplaintsJson)
            except (ValueError, TypeError):
                existing = []
        dup_res = duplicate_detector.check_duplicate(
            category=label,
            lat=latitude,
            lng=longitude,
            existing_complaints=existing,
            image_bytes=contents,
        )

    # 7. Department routing
    # The resolved label usually implies the correct department, but a client
    # that sent an explicit department code still gets that honoured when the
    # category alone cannot decide it.
    dept_info = taxonomy.recommend_department(label, description)
    if category and dept_info["department_code"] == taxonomy.DEFAULT_DEPARTMENT:
        hinted = str(category).strip().upper()
        if hinted in taxonomy.DEPARTMENTS:
            dept_info = {
                "department_code": hinted,
                "department_name": taxonomy.DEPARTMENTS[hinted],
            }

    image_hash = duplicate_detector.compute_image_hash(contents) if contents else ""

    return FullAnalysisResponse(
        category=label,
        confidence=confidence,
        severity_score=severity_score,
        priority=priority_res["priority"],
        composite_score=priority_res["composite_score"],
        department_code=dept_info["department_code"],
        department_name=dept_info["department_name"],
        isDuplicate=dup_res["is_duplicate"],
        duplicate_ticket=dup_res["duplicate_ticket"],
        distance_meters=dup_res["distance_meters"],
        keywords=nlp_res["keywords"],
        image_hash=image_hash,
    )
