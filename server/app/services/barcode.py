import re


def normalize_barcode(raw: str) -> str:
    """Strip formatting; keep digits only when present (UPC/EAN)."""
    cleaned = raw.strip()
    digits = re.sub(r"\D", "", cleaned)
    return digits if digits else cleaned
