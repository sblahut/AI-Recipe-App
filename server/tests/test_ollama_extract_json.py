import pytest

from app.services.ollama import OllamaError, _extract_json


def test_extract_json_plain_object() -> None:
    assert _extract_json('{"title": "Soup"}') == {"title": "Soup"}


def test_extract_json_from_markdown_fence() -> None:
    raw = 'Here is the recipe:\n{"title": "Pasta", "ingredients": []}\nThanks!'
    assert _extract_json(raw)["title"] == "Pasta"


def test_extract_json_invalid_raises() -> None:
    with pytest.raises(OllamaError, match="valid JSON"):
        _extract_json("no json here")
