import pytest
from pydantic import ValidationError

from app.schemas import RecipeSearchRequest


def test_recipe_search_request_valid() -> None:
    body = RecipeSearchRequest(query="sheet pan salmon", count=2)
    assert body.count == 2


def test_recipe_search_query_too_short() -> None:
    with pytest.raises(ValidationError):
        RecipeSearchRequest(query="ab")
