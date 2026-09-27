import base64

import pytest

from app.services import ollama
from app.services.receipt_extract import (
    normalize_receipt_image_base64,
    parse_proposed_receipt_items,
)


def test_parse_proposed_receipt_items_from_object() -> None:
    parsed = {
        "items": [
            {"name": "Organic milk", "quantity": 1, "quantity_kind": "count", "unit": "each"},
            {"name": "Bananas", "quantity": 2.5, "quantity_kind": "weight", "unit": "lb"},
        ]
    }
    items = parse_proposed_receipt_items(parsed)
    assert len(items) == 2
    assert items[0].name == "Organic milk"
    assert items[1].unit == "lb"


def test_parse_proposed_receipt_items_skips_invalid_rows() -> None:
    parsed = {"items": [{"name": ""}, {"name": "Eggs", "quantity": 12, "unit": "each"}]}
    items = parse_proposed_receipt_items(parsed)
    assert len(items) == 1
    assert items[0].name == "Eggs"


def test_parse_proposed_receipt_items_unexpected_shape() -> None:
    with pytest.raises(ollama.OllamaError, match="Unexpected JSON"):
        parse_proposed_receipt_items({"groceries": []})


def test_normalize_receipt_image_base64_strips_data_url() -> None:
    payload = base64.b64encode(b"fake-image").decode("ascii")
    wrapped = f"data:image/jpeg;base64,{payload}"
    assert normalize_receipt_image_base64(wrapped) == payload


def test_normalize_receipt_image_base64_rejects_huge_payload() -> None:
    huge = base64.b64encode(b"x" * (4 * 1024 * 1024 + 1)).decode("ascii")
    with pytest.raises(ollama.OllamaError, match="too large"):
        normalize_receipt_image_base64(huge)
