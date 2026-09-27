import pytest
from pydantic import ValidationError

from app.schemas import RecipeGenerateSourcesRequest, RecipePublixBogoGenerateRequest


def test_recipe_generate_sources_request_defaults() -> None:
    body = RecipeGenerateSourcesRequest()
    assert body.use_pantry is False
    assert body.use_publix_bogo is False
    assert body.count == 3


def test_recipe_generate_sources_request_accepts_publix_store() -> None:
    body = RecipeGenerateSourcesRequest(
        use_pantry=True,
        use_publix_bogo=True,
        publix_store_number=1885,
        query="quick dinner",
    )
    assert body.publix_store_number == 1885
    assert body.query == "quick dinner"


def test_recipe_generate_sources_request_rejects_invalid_store() -> None:
    with pytest.raises(ValidationError):
        RecipeGenerateSourcesRequest(use_publix_bogo=True, publix_store_number=0)


def test_recipe_publix_bogo_generate_request_count_bounds() -> None:
    with pytest.raises(ValidationError):
        RecipePublixBogoGenerateRequest(count=0)
    with pytest.raises(ValidationError):
        RecipePublixBogoGenerateRequest(count=11)
