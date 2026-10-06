from fastapi import APIRouter, UploadFile, File
from app.schemas.complaint import SpeechResponse
from app.services.speech_service import speech_service

router = APIRouter(prefix="/api/v1/ai", tags=["Speech-to-Text"])

@router.post("/transcribe", response_model=SpeechResponse)
async def transcribe_speech(file: UploadFile = File(...)):
    contents = await file.read()
    transcript = speech_service.transcribe_audio(contents, file.filename)
    return SpeechResponse(transcript=transcript)
