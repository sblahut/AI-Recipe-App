"""Offline OCR for receipt / invoice photos (runs on the home server)."""

from __future__ import annotations

from functools import lru_cache

from app.services import ollama


class ReceiptOcrError(Exception):
    pass


@lru_cache(maxsize=1)
def _ocr_engine():
    try:
        from rapidocr_onnxruntime import RapidOCR
    except ImportError as e:
        raise ReceiptOcrError(
            "OCR is not installed on the server. Run: pip install -r requirements.txt"
        ) from e
    return RapidOCR()


def ocr_image_bytes_to_text(image_bytes: bytes) -> str:
    if not image_bytes:
        return ""
    try:
        engine = _ocr_engine()
    except ReceiptOcrError as e:
        raise ollama.OllamaError(str(e)) from e

    try:
        result, _elapsed = engine(image_bytes)
    except Exception as e:
        raise ollama.OllamaError(f"OCR failed to read the image: {e}") from e

    if not result:
        return ""

    lines: list[tuple[float, float, str]] = []
    for row in result:
        if not row or len(row) < 2:
            continue
        box = row[0]
        text = row[1]
        if not isinstance(text, str):
            continue
        cleaned = text.strip()
        if not cleaned:
            continue
        y_center = 0.0
        x_center = 0.0
        if isinstance(box, (list, tuple)) and len(box) >= 4:
            try:
                y_center = sum(float(point[1]) for point in box) / len(box)
                x_center = sum(float(point[0]) for point in box) / len(box)
            except (TypeError, ValueError, IndexError):
                y_center = 0.0
                x_center = 0.0
        lines.append((y_center, x_center, cleaned))

    lines.sort(key=lambda item: (item[0], item[1]))
    return "\n".join(line for _, _, line in lines)
