from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(prefix="/api/v1/ai", tags=["Severity Evaluation"])

class SeverityRequest(BaseModel):
    category: str
    image_url: str

class SeverityResponse(BaseModel):
    severity_score: float
    urgency_level: str

@router.post("/severity", response_model=SeverityResponse)
async def evaluate_severity(payload: SeverityRequest):
    return SeverityResponse(
        severity_score=8.5,
        urgency_level="CRITICAL"
    )
