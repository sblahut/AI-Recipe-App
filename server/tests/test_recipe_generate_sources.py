from app.services.recipe_generate_sources import build_selected_sources_prompt


def test_build_selected_sources_prompt_includes_pantry_and_bogo() -> None:
    prompt = build_selected_sources_prompt(
        count=2,
        pantry_lines=["milk (expires 2026-01-01)"],
        bogo_lines=["Cheerios (Publix BOGO)"],
        constraints=None,
        prioritize_expiring=True,
        idea_query="quick breakfast",
    )
    assert "Pantry at home" in prompt
    assert "milk" in prompt
    assert "Publix weekly-ad BOGO" in prompt
    assert "Cheerios" in prompt
    assert "quick breakfast" in prompt
    assert "expire soon" in prompt


def test_build_selected_sources_prompt_idea_only_section_when_empty_lists() -> None:
    prompt = build_selected_sources_prompt(
        count=3,
        pantry_lines=[],
        bogo_lines=[],
        constraints="vegetarian",
        prioritize_expiring=False,
        idea_query=None,
    )
    assert "vegetarian" in prompt
