import re


def normalize_ingredient_name(name: str) -> str:
    cleaned = re.sub(r"[^\w\s]", " ", name.strip().lower())
    return " ".join(cleaned.split())


def ingredient_names_match(a: str, b: str) -> bool:
    na = normalize_ingredient_name(a)
    nb = normalize_ingredient_name(b)
    if not na or not nb:
        return False
    if na == nb:
        return True
    return bool(na in nb or nb in na)
