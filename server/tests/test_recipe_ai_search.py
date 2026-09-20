from app.services.recipe_ai_search import build_recipe_search_prompt


def test_build_recipe_search_prompt_includes_query_and_count() -> None:
    prompt = build_recipe_search_prompt(query="  lemon pasta  ", count=2)
    assert "Suggest 2 practical recipes" in prompt
    assert "lemon pasta" in prompt
    assert "Do not limit recipes to a specific pantry" in prompt
