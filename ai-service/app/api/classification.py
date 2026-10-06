from fastapi import APIRouter, UploadFile, File, Form
from typing import Optional
import json
from app.schemas.complaint import ClassificationResponse, FullAnalysisResponse
from app.services.vision_model import vision_classifier
from app.services.severity_model import severity_model
from app.services.duplicate_detector import duplicate_detector
from app.services.nlp_service import nlp_analyzer
from app.services.routing_engine import routing_engine

router = APIRouter(prefix="/api/v1/ai", tags=["AI Classification & Analysis"])

@router.post("/classify", response_model=ClassificationResponse)
async def classify_issue_image(
    file: UploadFile = File(...),
    description: Optional[str] = Form(None)
):
    contents = await file.read()

    # 1. Vision Model Classification
    category, confidence, defect_score = vision_classifier.predict(contents)

    # 2. Multi-Modal Severity & Priority Calculation
    severity_score, priority = severity_model.calculate_severity(
        category=category,
        visual_defect_score=defect_score,
        description=description
    )

    # 3. Department Routing Recommendation
    dept_info = routing_engine.recommend_department(category, description)

    # 4. Perceptual Image Hash
    image_hash = duplicate_detector.compute_image_hash(contents)

    return ClassificationResponse(
        category=category,
        confidence=confidence,
        suggested_priority=priority,
        severity_score=severity_score,
        department_code=dept_info["department_code"],
        department_name=dept_info["department_name"],
        image_hash=image_hash
    )

@router.post("/analyze-complaint", response_model=FullAnalysisResponse)
async def analyze_full_complaint(
    file: Optional[UploadFile] = File(None),
    category: Optional[str] = Form(None),
    latitude: Optional[float] = Form(None),
    longitude: Optional[float] = Form(None),
    description: Optional[str] = Form(None),
    existingComplaintsJson: Optional[str] = Form(None)
):
    contents = None
    if file:
        contents = await file.read()

    predicted_category = category or "OTHER"
    confidence = 0.85
    defect_score = 5.0
    image_hash = ""

    if contents:
        predicted_category, confidence, defect_score = vision_classifier.predict(contents)
        image_hash = duplicate_detector.compute_image_hash(contents)

    # If user provided a specific category and vision model confidence is low, use user category
    final_category = predicted_category if confidence >= 0.70 else (category or predicted_category)

    # NLP Keyword & Urgency
    nlp_res = nlp_analyzer.extract_keywords_and_category(description)

    # Severity Score
    severity_score, priority = severity_model.calculate_severity(
        category=final_category,
        visual_defect_score=defect_score,
        description=description
    )

    # Spatial-Visual Duplicate Detection
    existing_list = []
    if existingComplaintsJson:
        try:
            existing_list = json.loads(existingComplaintsJson)
        except Exception:
            pass

    dup_res = {"is_duplicate": False, "confidence": 0.0, "distance_meters": 0.0, "duplicate_ticket": None}
    if latitude is not None and longitude is not None:
        dup_res = duplicate_detector.check_duplicate(
            category=final_category,
            lat=latitude,
            lng=longitude,
            existing_complaints=existing_list,
            image_bytes=contents
        )

    # Composite Priority Score
    dup_count = 1 if dup_res["is_duplicate"] else 0
    priority_res = routing_engine.compute_composite_priority(
        severity_score=severity_score,
        duplicate_count=dup_count,
        urgency_flag=nlp_res["urgency_flag"]
    )

    # Routing Department
    dept_info = routing_engine.recommend_department(final_category, description)

    return FullAnalysisResponse(
        category=final_category,
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
        image_hash=image_hash
    )
