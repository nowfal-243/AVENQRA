import math
import io
from PIL import Image

try:
    import imagehash
    HAS_IMAGEHASH = True
except ImportError:
    HAS_IMAGEHASH = False

class DuplicateDetector:
    @staticmethod
    def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        """
        Calculates Haversine distance between two geographical points in meters.
        """
        R = 6371000.0  # Earth radius in meters
        phi1 = math.radians(lat1)
        phi2 = math.radians(lat2)
        delta_phi = math.radians(lat2 - lat1)
        delta_lambda = math.radians(lon2 - lon1)

        a = (math.sin(delta_phi / 2.0) ** 2 +
             math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2)
        c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
        return R * c

    @staticmethod
    def compute_image_hash(image_bytes: bytes) -> str:
        """
        Calculates 64-bit Difference Hash (dHash) string of an image.
        """
        if not HAS_IMAGEHASH or not image_bytes:
            return ""
        try:
            image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
            return str(imagehash.dhash(image))
        except Exception:
            return ""

    @classmethod
    def check_duplicate(cls, category: str, lat: float, lng: float, existing_complaints: list = None, image_bytes: bytes = None):
        """
        Evaluates spatial, category, and visual perceptual similarity against existing complaints.
        """
        if not existing_complaints or len(existing_complaints) == 0:
            return {
                "is_duplicate": False,
                "confidence": 0.0,
                "distance_meters": 0.0,
                "duplicate_ticket": None
            }

        new_hash = cls.compute_image_hash(image_bytes) if image_bytes else ""

        for existing in existing_complaints:
            e_lat = existing.get("latitude")
            e_lng = existing.get("longitude")
            e_cat = existing.get("category")
            e_ticket = existing.get("ticketNumber")
            e_hash = existing.get("imageHash", "")

            if e_lat is None or e_lng is None:
                continue

            dist_m = cls.haversine_distance(lat, lng, e_lat, e_lng)

            # Spatial threshold: 50 meters
            if dist_m <= 50.0 and (e_cat == category or not e_cat):
                visual_sim = False
                if new_hash and e_hash and HAS_IMAGEHASH:
                    try:
                        h1 = imagehash.hex_to_hash(new_hash)
                        h2 = imagehash.hex_to_hash(e_hash)
                        hamming_dist = h1 - h2
                        if hamming_dist <= 10:  # Perceptually similar photos
                            visual_sim = True
                    except Exception:
                        pass

                confidence = 0.95 if visual_sim else 0.85

                return {
                    "is_duplicate": True,
                    "confidence": confidence,
                    "distance_meters": round(dist_m, 1),
                    "duplicate_ticket": e_ticket
                }

        return {
            "is_duplicate": False,
            "confidence": 0.0,
            "distance_meters": 0.0,
            "duplicate_ticket": None
        }

duplicate_detector = DuplicateDetector()
