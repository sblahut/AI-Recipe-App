import pytest
from pydantic import ValidationError

from app.schemas import ReceiptProposeRequest


def test_receipt_propose_accepts_image() -> None:
    body = ReceiptProposeRequest(image_base64="A" * 64)
    assert body.image_base64 is not None


def test_receipt_propose_accepts_url() -> None:
    body = ReceiptProposeRequest(url="https://example.com/order/123")
    assert body.url == "https://example.com/order/123"


def test_receipt_propose_accepts_text() -> None:
    body = ReceiptProposeRequest(text="A" * 20)
    assert body.text is not None


def test_receipt_propose_requires_exactly_one_source() -> None:
    with pytest.raises(ValidationError):
        ReceiptProposeRequest()
    with pytest.raises(ValidationError):
        ReceiptProposeRequest(image_base64="A" * 64, url="https://example.com/invoice")


def test_receipt_propose_text_min_length() -> None:
    with pytest.raises(ValidationError):
        ReceiptProposeRequest(text="too short")
