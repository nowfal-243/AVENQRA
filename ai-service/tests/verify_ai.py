"""Manual verification runner: exercises the AI endpoints without pytest."""
import asyncio
import io
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import httpx
from PIL import Image

from app.main import app
from app.services import taxonomy


def make_image(color=(90, 90, 90), size=(128, 128)):
    buf = io.BytesIO()
    Image.new("RGB", size, color).save(buf, format="JPEG")
    buf.seek(0)
    return buf


async def main():
    failures = []

    def check(label, condition, detail=""):
        status = "PASS" if condition else "FAIL"
        print(f"  [{status}] {label}" + (f" -> {detail}" if detail and not condition else ""))
        if not condition:
            failures.append(label)

    print("== health ==")
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as c:
        r = await c.get("/")
        check("health 200", r.status_code == 200, str(r.status_code))
        check("service name", r.json().get("service") == "AVENQRA AI Microservice")

        print("== /classify ==")
        r = await c.post(
            "/api/v1/ai/classify",
            files={"file": ("p.jpg", make_image(), "image/jpeg")},
            data={"description": "Large pothole on the main road, children at risk"},
        )
        print("   ", r.status_code, r.text[:400])
        if r.status_code == 200:
            b = r.json()
            check("category canonical", b["category"] in taxonomy.CATEGORY_LABELS, b["category"])
            check("dept seeded", b["department_code"] in taxonomy.DEPARTMENTS, b["department_code"])
            check("dept name present", bool(b["department_name"]))
            check("confidence range", 0.0 <= b["confidence"] <= 1.0)
            check("severity range", 1.0 <= b["severity_score"] <= 10.0)
            check("priority valid", b["suggested_priority"] in {"LOW", "MEDIUM", "HIGH", "CRITICAL"})
        else:
            failures.append("/classify")

        print("== /analyze-complaint (text only) ==")
        r = await c.post(
            "/api/v1/ai/analyze-complaint",
            data={
                "category": "Water Leakage",
                "latitude": 12.9716,
                "longitude": 77.5946,
                "description": "Pipe burst near the school gate, water flooding the street",
            },
        )
        print("   ", r.status_code, r.text[:400])
        if r.status_code == 200:
            b = r.json()
            check("category echoed", b["category"] == "Water Leakage", b["category"])
            check("routes to WATER", b["department_code"] == "WATER", b["department_code"])
            check("not duplicate", b["isDuplicate"] is False)
            check("keywords list", isinstance(b["keywords"], list))
            check("composite range", 0.0 <= b["composite_score"] <= 100.0)
            check("priority valid", b["priority"] in {"LOW", "MEDIUM", "HIGH", "CRITICAL"})
        else:
            failures.append("/analyze-complaint text")

        print("== /analyze-complaint (image + duplicate) ==")
        r = await c.post(
            "/api/v1/ai/analyze-complaint",
            files={"file": ("p.jpg", make_image(), "image/jpeg")},
            data={
                "category": "Pothole",
                "latitude": 12.9716,
                "longitude": 77.5946,
                "description": "Deep pothole causing accidents",
                "existingComplaintsJson": '[{"latitude": 12.97160, "longitude": 77.59460, '
                                          '"category": "Pothole", "ticketNumber": "AVN-2026-000001"}]',
            },
        )
        print("   ", r.status_code, r.text[:400])
        if r.status_code == 200:
            b = r.json()
            check("duplicate detected", b["isDuplicate"] is True)
            check("duplicate ticket", b["duplicate_ticket"] == "AVN-2026-000001", str(b["duplicate_ticket"]))
            check("distance < 50m", b["distance_meters"] < 50.0, str(b["distance_meters"]))
        else:
            failures.append("/analyze-complaint dup")

        print("== /analyze-complaint (malformed existing json) ==")
        r = await c.post(
            "/api/v1/ai/analyze-complaint",
            data={
                "latitude": 12.9716,
                "longitude": 77.5946,
                "description": "Garbage piled up on the footpath",
                "existingComplaintsJson": "not-json{{{",
            },
        )
        print("   ", r.status_code)
        check("malformed json tolerated", r.status_code == 200, str(r.status_code))

    print("== routing coverage ==")
    bad = [c for c in taxonomy.CATEGORY_LABELS
           if taxonomy.recommend_department(c)["department_code"] not in taxonomy.DEPARTMENTS]
    check("all 15 categories route to seeded dept", not bad, str(bad))
    print(f"    {len(taxonomy.CATEGORY_LABELS)} categories, {len(taxonomy.DEPARTMENTS)} departments")

    print()
    if failures:
        print(f"FAILURES ({len(failures)}): {failures}")
        return 1
    print("ALL CHECKS PASSED")
    return 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
