import base64
import binascii
import re

from pydantic import ValidationError

from app.config import settings
from app.schemas import ProposedIngredientItem
from app.services import ollama
from app.services.purchase_document_fetch import (
    PurchaseDocumentFetchError,
    fetch_purchase_document_text_from_url,
)
from app.services.purchase_item_filters import (
    invoice_text_quality_hint,
    validate_purchase_extraction,
)
from app.services.receipt_ocr import ocr_image_bytes_to_text

MAX_RECEIPT_IMAGE_BYTES = 4 * 1024 * 1024
MIN_PURCHASE_TEXT_CHARS = 20
MIN_OCR_TEXT_CHARS = 40

_PURCHASE_ITEMS_JSON_SHAPE = """Return ONLY JSON with this shape:
{"items": [{"name": string, "quantity": number or null, "quantity_kind": "count"|"weight"|"volume", "unit": string or null}]}"""

_PURCHASE_VISION_PROMPT = f"""You are reading a grocery store receipt or order invoice image.
List each purchasable grocery or food item the customer bought.
Skip non-items: tax, subtotal, total, payment method, change, loyalty points, coupons, shipping labels without products, and store branding.
Combine multi-line item names into one name when needed.
{_PURCHASE_ITEMS_JSON_SHAPE}
Use quantity_kind "count" with unit "each" when only a line price is shown without an amount.
Use realistic units (g, kg, oz, lb, ml, l, cup, each) when amounts appear on the document.
Never return only the retailer name (Walmart, Target, etc.) as the sole item.
"""

_PURCHASE_TEXT_PROMPT_PREFIX = f"""You are parsing OCR or web text from a grocery receipt, Walmart/Target order invoice, or delivery confirmation.
Extract EVERY purchasable product line (food, beverages, household groceries).
Rules:
- Return multiple items when the document lists multiple products. One store name alone is NEVER a valid answer.
- Skip: tax, subtotal, total, payment, savings summaries, headers/footers, addresses, order numbers without product names.
- Product names may be abbreviated (e.g. "GV 2% MILK", "BANANAS LB"). Keep recognizable grocery names.
- When a quantity appears (e.g. "2", "1.5 lb"), set quantity, quantity_kind, and unit accordingly.
- Prices on their own line should be matched to the nearest product name above/below in the text.
{_PURCHASE_ITEMS_JSON_SHAPE}
"""


def build_purchase_text_prompt(document_text: str) -> str:
    return f"{_PURCHASE_TEXT_PROMPT_PREFIX}\n\nDocument text:\n{document_text}"


def normalize_receipt_image_base64(image_base64: str) -> str:
    raw = image_base64.strip()
    if raw.startswith("data:"):
        comma = raw.find(",")
        if comma == -1:
            raise ollama.OllamaError("Invalid image data URL")
        raw = raw[comma + 1 :].strip()
    raw = re.sub(r"\s+", "", raw)
    if not raw:
        raise ollama.OllamaError("Receipt image is empty")
    try:
        decoded = base64.b64decode(raw, validate=True)
    except (binascii.Error, ValueError) as e:
        raise ollama.OllamaError("Receipt image is not valid base64") from e
    if len(decoded) > MAX_RECEIPT_IMAGE_BYTES:
        raise ollama.OllamaError("Receipt image is too large (max 4 MB)")
    return raw


def receipt_image_bytes(image_base64: str) -> bytes:
    normalized = normalize_receipt_image_base64(image_base64)
    return base64.b64decode(normalized)


def parse_proposed_receipt_items(parsed: object) -> list[ProposedIngredientItem]:
    items_raw: list[object]
    if isinstance(parsed, dict) and isinstance(parsed.get("items"), list):
        items_raw = parsed["items"]
    elif isinstance(parsed, list):
        items_raw = parsed
    else:
        raise ollama.OllamaError("Unexpected JSON shape from model")

    proposed: list[ProposedIngredientItem] = []
    for entry in items_raw:
        if not isinstance(entry, dict):
            continue
        name = entry.get("name")
        if not isinstance(name, str) or not name.strip():
            continue
        try:
            proposed.append(ProposedIngredientItem.model_validate(entry))
        except ValidationError:
            try:
                proposed.append(ProposedIngredientItem(name=name.strip()))
            except ValidationError:
                continue
    return proposed


def _photo_failure_hint() -> str:
    return (
        "Use a straight, well-lit photo of the itemized section, or download the invoice PDF "
        "from your order history and import via link."
    )


def _no_items_error() -> ollama.OllamaError:
    return ollama.OllamaError(
        f"No grocery items were found. {_photo_failure_hint()}"
    )


async def propose_items_from_purchase_text(
    text: str,
    *,
    source_hint: str = "Try a clearer document or a photo of the line items.",
) -> list[ProposedIngredientItem]:
    snippet = text.strip()
    if len(snippet) < MIN_PURCHASE_TEXT_CHARS:
        raise ollama.OllamaError("Invoice text is too short to parse")

    quality_hint = invoice_text_quality_hint(snippet)
    if quality_hint:
        raise ollama.OllamaError(quality_hint)

    prompt = build_purchase_text_prompt(snippet)
    parsed = await ollama.generate_text_json(prompt)
    items = parse_proposed_receipt_items(parsed)
    return validate_purchase_extraction(items, source_hint=source_hint)


async def propose_items_from_receipt_image(image_base64: str) -> list[ProposedIngredientItem]:
    image_bytes = receipt_image_bytes(image_base64)
    ocr_text = ocr_image_bytes_to_text(image_bytes).strip()

    if len(ocr_text) >= MIN_OCR_TEXT_CHARS:
        try:
            return await propose_items_from_purchase_text(
                ocr_text,
                source_hint=_photo_failure_hint(),
            )
        except ollama.OllamaError:
            if not settings.receipt_vision_fallback:
                raise

    if settings.receipt_vision_fallback:
        normalized = base64.b64encode(image_bytes).decode("ascii")
        parsed = await ollama.generate_vision_json(_PURCHASE_VISION_PROMPT, normalized)
        items = parse_proposed_receipt_items(parsed)
        return validate_purchase_extraction(items, source_hint=_photo_failure_hint())

    if len(ocr_text) < MIN_OCR_TEXT_CHARS:
        raise ollama.OllamaError(
            "Could not read enough text from the photo. "
            f"{_photo_failure_hint()}"
        )
    raise _no_items_error()


async def propose_items_from_purchase_document(
    *,
    image_base64: str | None = None,
    text: str | None = None,
    url: str | None = None,
) -> list[ProposedIngredientItem]:
    if image_base64:
        return await propose_items_from_receipt_image(image_base64)
    if text:
        return await propose_items_from_purchase_text(text)
    if url:
        try:
            fetched = await fetch_purchase_document_text_from_url(url.strip())
        except PurchaseDocumentFetchError as e:
            raise ollama.OllamaError(str(e)) from e
        return await propose_items_from_purchase_text(
            fetched,
            source_hint=(
                "Walmart and similar sites often require a signed-in browser session. "
                "Download the itemized invoice PDF or photograph the receipt instead."
            ),
        )
    raise ollama.OllamaError("No receipt or invoice source provided")
