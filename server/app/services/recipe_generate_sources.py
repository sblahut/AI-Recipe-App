"""Prompt building for pantry / Publix BOGO / idea-blended recipe generation."""


def build_selected_sources_prompt(
    *,
    count: int,
    pantry_lines: list[str],
    bogo_lines: list[str],
    constraints: str | None,
    prioritize_expiring: bool,
    idea_query: str | None,
) -> str:
    sections: list[str] = []
    if pantry_lines:
        pantry = "\n".join(f"- {line}" for line in pantry_lines)
        sections.append(f"Pantry at home:\n{pantry}")
    if bogo_lines:
        deals = "\n".join(f"- {line}" for line in bogo_lines)
        sections.append(f"Publix weekly-ad BOGO deals:\n{deals}")

    sources = "\n\n".join(sections) if sections else "- (no items listed)"
    extra = ""
    if idea_query:
        extra += f"\nRecipe idea to lean toward: {idea_query.strip()}"
    if constraints:
        extra += f"\nConstraints: {constraints}"
    if prioritize_expiring and pantry_lines:
        extra += "\nPrefer pantry ingredients that expire soon when possible."

    return f"""You are a home chef. Create {count} practical recipes using primarily the items below.
Pantry staples (salt, oil, spices) are fine when needed. BOGO items are store sale products to shop for.
Return ONLY a JSON object with key "recipes" (array). Each recipe must have:
title (string), servings (integer), prep_minutes (integer),
ingredients (array of {{name, quantity}} where quantity is a string like "2" or "1 cup"),
steps (array of strings),
uses_from_pantry (array of strings — names of items used from the lists below).

Available items:
{sources}
{extra}
"""
