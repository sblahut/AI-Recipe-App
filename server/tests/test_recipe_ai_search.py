from app.services.recipe_ai_search import build_recipe_search_prompt


def test_build_recipe_search_prompt_includes_query_and_count() -> None:
    prompt = build_recipe_search_prompt(query="  lemon pasta  ", count=2)
    assert "lemon pasta" in prompt
    assert "exactly 2 different practical recipes" in prompt
    assert "MUST contain exactly 2 recipe objects" in prompt
