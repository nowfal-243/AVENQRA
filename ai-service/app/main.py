from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import classification, severity, duplicate, speech

app = FastAPI(
    title="AVENQRA AI Microservice",
    description="Machine Learning service for image classification, severity scoring, duplicate detection, and speech-to-text",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(classification.router)
app.include_router(severity.router)
app.include_router(duplicate.router)
app.include_router(speech.router)

@app.get("/")
def health_check():
    return {"status": "healthy", "service": "AVENQRA AI Microservice", "version": "1.0.0"}
