import pytest
from pydantic import ValidationError

from app.schemas import RecipeImportRequest


def test_import_accepts_text_only() -> None:
    body = RecipeImportRequest(text="A" * 20)
    assert body.text is not None
    assert body.url is None


def test_import_accepts_url_only() -> None:
    body = RecipeImportRequest(url="https://example.com/recipe")
    assert body.url == "https://example.com/recipe"


def test_import_rejects_neither_source() -> None:
    with pytest.raises(ValidationError, match="exactly one"):
        RecipeImportRequest()


def test_import_rejects_both_sources() -> None:
    with pytest.raises(ValidationError, match="exactly one"):
        RecipeImportRequest(text="A" * 20, url="https://example.com/recipe")


def test_import_rejects_short_text() -> None:
    with pytest.raises(ValidationError, match="at least 20"):
        RecipeImportRequest(text="too short")
