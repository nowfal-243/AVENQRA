"""
Integration smoke test for the AVENQRA AI microservice.

Runs the FastAPI app in-process and exercises the two endpoints the Express
backend actually consumes (/classify and /analyze-complaint), asserting that
every response field required by the pydantic schemas is present and that
categories always resolve to a department that exists in database/seed.sql.

Run from the ai-service directory:  python -m pytest tests/test_api.py -q
"""

import io
import os
import sys

import pytest
from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.main import app  # noqa: E402
from app.services import taxonomy  # noqa: E402

# Starlette's TestClient is built on httpx, so skip the whole module when it is
# absent rather than failing at fixture setup.
pytest.importorskip("httpx")

VALID_DEPARTMENT_CODES = set(taxonomy.DEPARTMENTS)
VALID_DEPARTMENT_NAMES = set(taxonomy.DEPARTMENTS.values())
VALID_CATEGORIES = set(taxonomy.CATEGORY_LABELS)


def make_image(color=(90, 90, 90), size=(128, 128)):
    """Generate a small in-memory JPEG so the test needs no fixtures on disk."""
    buffer = io.BytesIO()
    Image.new("RGB", size, color).save(buffer, format="JPEG")
    buffer.seek(0)
    return buffer


@pytest.fixture()
def client():
    # httpx >= 0.28 removed synchronous support from ASGITransport, so a raw
    # httpx.Client can no longer drive an ASGI app in-process. Starlette's
    # TestClient provides its own sync transport (it runs the ASGI app through
    # a portal), so the tests stay synchronous and work on every httpx release.
    from starlette.testclient import TestClient

    with TestClient(app) as c:
        yield c


def test_health(client):
    res = client.get("/")
    assert res.status_code == 200
    assert res.json()["service"] == "AVENQRA AI Microservice"


def test_classify_returns_all_required_fields(client):
    res = client.post(
        "/api/v1/ai/classify",
        files={"file": ("photo.jpg", make_image(), "image/jpeg")},
        data={"description": "Large pothole on the main road, children at risk"},
    )
    assert res.status_code == 200, res.text
    body = res.json()

    # department_code/department_name are required (non-Optional) fields.
    assert body["department_code"] in VALID_DEPARTMENT_CODES
    # department_name is the human-readable label, so it is checked against the
    # department names rather than the codes.
    assert body["department_name"] in VALID_DEPARTMENT_NAMES and body["department_name"]
    assert body["category"] in VALID_CATEGORIES
    assert 0.0 <= body["confidence"] <= 1.0
    assert 1.0 <= body["severity_score"] <= 10.0
    assert body["suggested_priority"] in {"LOW", "MEDIUM", "HIGH", "CRITICAL"}


def test_analyze_complaint_without_image(client):
    """The backend calls this for text-only reports too, so the file is optional."""
    res = client.post(
        "/api/v1/ai/analyze-complaint",
        data={
            "category": "Water Leakage",
            "latitude": 12.9716,
            "longitude": 77.5946,
            "description": "Pipe burst near the school gate, water flooding the street",
        },
    )
    assert res.status_code == 200, res.text
    body = res.json()

    assert body["category"] == "Water Leakage"
    assert body["department_code"] == "WATER"
    assert body["isDuplicate"] is False
    assert body["duplicate_ticket"] is None
    assert isinstance(body["keywords"], list)
    assert 0.0 <= body["composite_score"] <= 100.0
    assert body["priority"] in {"LOW", "MEDIUM", "HIGH", "CRITICAL"}


def test_analyze_complaint_with_image_and_existing_reports(client):
    res = client.post(
        "/api/v1/ai/analyze-complaint",
        files={"file": ("photo.jpg", make_image(), "image/jpeg")},
        data={
            "category": "Pothole",
            "latitude": 12.9716,
            "longitude": 77.5946,
            "description": "Deep pothole causing accidents",
            "existingComplaintsJson": '[{"latitude": 12.97160, "longitude": 77.59460, '
                                      '"category": "Pothole", "ticketNumber": "AVN-2026-000001"}]',
        },
    )
    assert res.status_code == 200, res.text
    body = res.json()

    # Within the 50m spatial threshold and same category => duplicate.
    assert body["isDuplicate"] is True
    assert body["duplicate_ticket"] == "AVN-2026-000001"
    assert body["distance_meters"] < 50.0


def test_analyze_complaint_survives_malformed_existing_json(client):
    """A bad existingComplaintsJson payload must not 500 the endpoint."""
    res = client.post(
        "/api/v1/ai/analyze-complaint",
        data={
            "latitude": 12.9716,
            "longitude": 77.5946,
            "description": "Garbage piled up on the footpath",
            "existingComplaintsJson": "not-json{{{",
        },
    )
    assert res.status_code == 200, res.text
    assert res.json()["isDuplicate"] is False


def test_department_code_hint_does_not_mask_text_category(client):
    """Regression test: the client sends *department* codes as `category`.

    The web/mobile clients post values such as ``ROAD`` or ``ELEC`` — these are
    routing hints, not civic-issue categories, and every one of them
    canonicalises to "Other Civic Issue". Accepting them as authoritative threw
    away a far more specific NLP/vision verdict, so a clear pothole report was
    being analysed as a generic "Other Civic Issue". The description must win.
    """
    res = client.post(
        "/api/v1/ai/analyze-complaint",
        data={
            "category": "ROAD",
            "latitude": 12.9716,
            "longitude": 77.5946,
            "description": "Large pothole on the main road causing accidents",
            "existingComplaintsJson": "[]",
        },
    )
    assert res.status_code == 200, res.text
    body = res.json()

    assert body["category"] == "Pothole"
    assert body["department_code"] == "ROAD"


def test_department_code_hint_still_routes_when_text_is_vague(client):
    """A department code must still be honoured when the text says nothing."""
    res = client.post(
        "/api/v1/ai/analyze-complaint",
        data={
            "category": "ELEC",
            "latitude": 12.9716,
            "longitude": 77.5946,
            "description": "I would like to raise a general civic request please",
            "existingComplaintsJson": "[]",
        },
    )
    assert res.status_code == 200, res.text
    body = res.json()

    assert body["category"] == "Other Civic Issue"
    assert body["department_code"] == "ELEC"


@pytest.mark.parametrize("category", taxonomy.CATEGORY_LABELS)
def test_every_category_routes_to_a_seeded_department(category):
    """No category may route to a department absent from database/seed.sql."""
    result = taxonomy.recommend_department(category)
    assert result["department_code"] in VALID_DEPARTMENT_CODES


def test_legacy_codes_normalise_to_canonical_labels():
    assert taxonomy.canonical_label("POTHOLE") == "Pothole"
    assert taxonomy.canonical_label("WATER_LEAK") == "Water Leakage"
    assert taxonomy.canonical_label("unknown-thing") == "Other Civic Issue"
    assert taxonomy.canonical_label(None) == "Other Civic Issue"
