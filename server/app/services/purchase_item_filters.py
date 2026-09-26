"""Heuristics for grocery line items extracted from receipts and invoices."""

import re

from app.schemas import ProposedIngredientItem
from app.services import ollama

_STORE_NAME_ONLY = re.compile(
    r"^(walmart|wal-?mart|target|publix|kroger|costco|sam'?s club|amazon|whole foods|aldi|"
    r"trader joe'?s?|heb|meijer|winn-?dixie|food lion|safeway|shoprite|"
    r"walmart\.com|target\.com)(\s+(store|supercenter|market|grocery))?\s*$",
    re.IGNORECASE,
)

_NON_PRODUCT_LINE = re.compile(
    r"^(subtotal|total|tax|balance|change|cash|credit|debit|visa|mastercard|"
    r"thank you|savings|coupon|discount|member|receipt|invoice|order\s*#|"
    r"transaction|auth|approval|sku|upc|tc#)\b",
    re.IGNORECASE,
)


def is_store_brand_only(name: str) -> bool:
    trimmed = name.strip()
    if not trimmed:
        return True
    return bool(_STORE_NAME_ONLY.match(trimmed))


def filter_proposed_purchase_items(
    items: list[ProposedIngredientItem],
) -> list[ProposedIngredientItem]:
    kept: list[ProposedIngredientItem] = []
    for item in items:
        name = item.name.strip()
        if len(name) < 2:
            continue
        if is_store_brand_only(name):
            continue
        if _NON_PRODUCT_LINE.match(name):
            continue
        kept.append(item)
    return kept


def validate_purchase_extraction(
    items: list[ProposedIngredientItem],
    *,
    source_hint: str,
) -> list[ProposedIngredientItem]:
    filtered = filter_proposed_purchase_items(items)
    if filtered:
        return filtered

    if items and all(is_store_brand_only(i.name) for i in items):
        raise ollama.OllamaError(
            f"Only the store name was detected ({items[0].name.strip()}), not individual products. "
            f"{source_hint}"
        )

    raise ollama.OllamaError(f"No grocery line items were found. {source_hint}")


def invoice_text_quality_hint(text: str) -> str | None:
    """Return a user-facing hint when URL/HTML text is unlikely to contain line items."""
    lowered = text.lower()
    word_count = len(text.split())
    if word_count < 40 and any(
        token in lowered for token in ("walmart.com", "sign in", "log in", "create account")
    ):
        return (
            "That page looks like a Walmart sign-in or summary screen, not the itemized invoice. "
            "Open the order details in your browser, download the PDF or take a screenshot of the "
            "line items, then import again."
        )
    if word_count < 25 and "walmart" in lowered:
        return (
            "Very little text was extracted from that link—often a login wall or a non-itemized page. "
            "Try a photo of the printed receipt or an itemized invoice PDF."
        )
    return None
