"""Prompt builder for pantry-free AI recipe search."""


def build_recipe_search_prompt(*, query: str, count: int) -> str:
    trimmed = query.strip()
    return f"""You are a home chef. Suggest exactly {count} different practical recipes matching this request.
Do not limit recipes to ingredients on hand — include what a cook would typically buy.
The "recipes" array MUST contain exactly {count} recipe objects (not fewer).
Return ONLY a JSON object with key "recipes" (array). Each recipe must have:
title (string), servings (integer), prep_minutes (integer),
ingredients (array of {{name, quantity}} where quantity is a string like "2" or "1 cup"),
steps (array of strings),
uses_from_pantry (empty array []).

Request: {trimmed}
"""
