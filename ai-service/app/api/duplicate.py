from fastapi import APIRouter
from app.schemas.complaint import DuplicateCheckRequest, DuplicateCheckResponse

router = APIRouter(prefix="/api/v1/ai", tags=["Duplicate Detection"])

@router.post("/duplicate-check", response_model=DuplicateCheckResponse)
async def check_duplicate(payload: DuplicateCheckRequest):
    # Radius-based duplicate simulation
    return DuplicateCheckResponse(
        category=payload.category,
        confidence=0.88,
        severity=6.5,
        isDuplicate=False,
        distance_meters=0.0
    )
