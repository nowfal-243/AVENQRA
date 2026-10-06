from pydantic import BaseModel
from typing import Optional, List

class DuplicateCheckRequest(BaseModel):
    category: str
    latitude: float
    longitude: float
    description: Optional[str] = None
    existingComplaints: Optional[List[dict]] = None

class DuplicateCheckResponse(BaseModel):
    category: str
    confidence: float
    severity: float
    isDuplicate: bool
    distance_meters: Optional[float] = 0.0
    duplicate_ticket: Optional[str] = None

class ClassificationResponse(BaseModel):
    category: str
    confidence: float
    suggested_priority: str
    severity_score: float
    department_code: str
    department_name: str
    image_hash: Optional[str] = None

class FullAnalysisResponse(BaseModel):
    category: str
    confidence: float
    severity_score: float
    priority: str
    composite_score: float
    department_code: str
    department_name: str
    isDuplicate: bool
    duplicate_ticket: Optional[str] = None
    distance_meters: Optional[float] = 0.0
    keywords: List[str] = []
    image_hash: Optional[str] = None

class SpeechResponse(BaseModel):
    transcript: str
