import pytest

from app.schemas import ProposedIngredientItem
from app.services import ollama
from app.services.purchase_item_filters import (
    filter_proposed_purchase_items,
    invoice_text_quality_hint,
    validate_purchase_extraction,
)


def test_filter_removes_store_name_only() -> None:
    items = [
        ProposedIngredientItem(name="Walmart"),
        ProposedIngredientItem(name="Organic milk", quantity=1, unit="each"),
    ]
    filtered = filter_proposed_purchase_items(items)
    assert len(filtered) == 1
    assert filtered[0].name == "Organic milk"


def test_validate_rejects_walmart_only() -> None:
    items = [ProposedIngredientItem(name="Walmart")]
    with pytest.raises(ollama.OllamaError, match="Only the store name"):
        validate_purchase_extraction(items, source_hint="hint")


def test_invoice_text_quality_hint_for_login_page() -> None:
    text = "Walmart.com sign in to your account order summary"
    hint = invoice_text_quality_hint(text)
    assert hint is not None
    assert "sign-in" in hint.lower() or "login" in hint.lower() or "Walmart" in hint
