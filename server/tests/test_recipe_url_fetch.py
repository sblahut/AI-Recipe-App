import pytest

from app.services.recipe_url_fetch import (
    RecipeFetchError,
    html_to_text,
    validate_recipe_import_url,
)


def test_html_to_text_strips_tags() -> None:
    html = "<html><body><h1>Soup</h1><p>2 cups broth</p></body></html>"
    text = html_to_text(html)
    assert "Soup" in text
    assert "2 cups broth" in text
    assert "<" not in text


def test_validate_blocks_localhost() -> None:
    with pytest.raises(RecipeFetchError):
        validate_recipe_import_url("http://127.0.0.1/recipe")


def test_validate_accepts_https() -> None:
    assert validate_recipe_import_url("https://example.com/recipe") == "https://example.com/recipe"
