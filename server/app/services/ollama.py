import json
import re

import httpx
from pydantic import ValidationError

from app.config import settings
from app.schemas import GeneratedRecipe
from app.services.recipe_ai_search import build_recipe_search_prompt
from app.services.recipe_generate_sources import build_selected_sources_prompt


class OllamaError(Exception):
    pass


async def ollama_reachable() -> bool:
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            r = await client.get(f"{settings.ollama_host}/api/tags")
            return r.is_success
    except httpx.HTTPError:
        return False


def _extract_json(text: str) -> object:
    text = text.strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        match = re.search(r"\{[\s\S]*\}|\[[\s\S]*\]", text)
        if not match:
            raise OllamaError("Model did not return valid JSON") from None
        return json.loads(match.group())


async def generate_recipes(
    ingredient_lines: list[str],
    *,
    count: int,
    constraints: str | None,
    prioritize_expiring: bool,
) -> list[GeneratedRecipe]:
    pantry = "\n".join(f"- {line}" for line in ingredient_lines) or "- (empty pantry)"
    extra = ""
    if constraints:
        extra += f"\nConstraints: {constraints}"
    if prioritize_expiring:
        extra += "\nPrefer ingredients that expire soon when possible."

    prompt = f"""You are a home chef. Create {count} practical recipes using primarily these pantry items.
Return ONLY a JSON object with key "recipes" (array). Each recipe must have:
title (string), servings (integer), prep_minutes (integer),
ingredients (array of {{name, quantity}} where quantity is a string like "2" or "1 cup"),
steps (array of strings),
uses_from_pantry (array of strings — subset of pantry item names used),
uses_from_publix_bogo (empty array []).

Pantry:
{pantry}
{extra}
"""

    payload = {
        "model": settings.ollama_text_model,
        "prompt": prompt,
        "stream": False,
        "format": "json",
        "options": {"temperature": 0.7},
    }

    async with httpx.AsyncClient(timeout=120.0) as client:
        r = await client.post(f"{settings.ollama_host}/api/generate", json=payload)
        if not r.is_success:
            raise OllamaError(f"Ollama generate failed: {r.status_code} {r.text}")
        data = r.json()
        raw = data.get("response", "")
        parsed = _extract_json(raw)
        if isinstance(parsed, dict) and "recipes" in parsed:
            recipes_raw = parsed["recipes"]
        elif isinstance(parsed, list):
            recipes_raw = parsed
        else:
            raise OllamaError("Unexpected JSON shape from model")

    recipes: list[GeneratedRecipe] = []
    if not isinstance(recipes_raw, list):
        raise OllamaError("Unexpected JSON shape from model")
    for item in recipes_raw:
        try:
            recipes.append(GeneratedRecipe.model_validate(item))
        except ValidationError as e:
            raise OllamaError(f"Model returned an invalid recipe: {e}") from e
    return recipes


async def generate_recipes_from_bogo_deals(
    deal_lines: list[str],
    *,
    count: int,
    constraints: str | None,
) -> list[GeneratedRecipe]:
    deals = "\n".join(f"- {line}" for line in deal_lines) or "- (no BOGO items)"
    extra = ""
    if constraints:
        extra += f"\nConstraints: {constraints}"

    prompt = f"""You are a home chef planning meals around Publix weekly-ad BOGO (buy one get one) deals.
Create {count} practical recipes that use primarily these sale items (shop the deals; pantry staples like salt, oil, or spices are fine).
Return ONLY a JSON object with key "recipes" (array). Each recipe must have:
title (string), servings (integer), prep_minutes (integer),
ingredients (array of {{name, quantity}} where quantity is a string like "2" or "1 cup"),
steps (array of strings),
uses_from_pantry (empty array []),
uses_from_publix_bogo (array of strings — BOGO deal item names used from the list below).

Publix BOGO deals this week:
{deals}
{extra}
"""

    payload = {
        "model": settings.ollama_text_model,
        "prompt": prompt,
        "stream": False,
        "format": "json",
        "options": {"temperature": 0.7},
    }

    async with httpx.AsyncClient(timeout=120.0) as client:
        r = await client.post(f"{settings.ollama_host}/api/generate", json=payload)
        if not r.is_success:
            raise OllamaError(f"Ollama generate failed: {r.status_code} {r.text}")
        data = r.json()
        raw = data.get("response", "")
        parsed = _extract_json(raw)
        if isinstance(parsed, dict) and "recipes" in parsed:
            recipes_raw = parsed["recipes"]
        elif isinstance(parsed, list):
            recipes_raw = parsed
        else:
            raise OllamaError("Unexpected JSON shape from model")

    recipes: list[GeneratedRecipe] = []
    if not isinstance(recipes_raw, list):
        raise OllamaError("Unexpected JSON shape from model")
    for item in recipes_raw:
        try:
            recipes.append(GeneratedRecipe.model_validate(item))
        except ValidationError as e:
            raise OllamaError(f"Model returned an invalid recipe: {e}") from e
    return recipes


async def generate_recipes_from_selected_sources(
    *,
    pantry_lines: list[str],
    bogo_lines: list[str],
    count: int,
    constraints: str | None,
    prioritize_expiring: bool,
    idea_query: str | None,
) -> list[GeneratedRecipe]:
    prompt = build_selected_sources_prompt(
        count=count,
        pantry_lines=pantry_lines,
        bogo_lines=bogo_lines,
        constraints=constraints,
        prioritize_expiring=prioritize_expiring,
        idea_query=idea_query,
    )

    payload = {
        "model": settings.ollama_text_model,
        "prompt": prompt,
        "stream": False,
        "format": "json",
        "options": {"temperature": 0.7},
    }

    async with httpx.AsyncClient(timeout=120.0) as client:
        r = await client.post(f"{settings.ollama_host}/api/generate", json=payload)
        if not r.is_success:
            raise OllamaError(f"Ollama generate failed: {r.status_code} {r.text}")
        data = r.json()
        raw = data.get("response", "")
        parsed = _extract_json(raw)
        if isinstance(parsed, dict) and "recipes" in parsed:
            recipes_raw = parsed["recipes"]
        elif isinstance(parsed, list):
            recipes_raw = parsed
        else:
            raise OllamaError("Unexpected JSON shape from model")

    recipes: list[GeneratedRecipe] = []
    if not isinstance(recipes_raw, list):
        raise OllamaError("Unexpected JSON shape from model")
    for item in recipes_raw:
        try:
            recipes.append(GeneratedRecipe.model_validate(item))
        except ValidationError as e:
            raise OllamaError(f"Model returned an invalid recipe: {e}") from e
    return recipes


async def search_recipes(
    *, query: str, count: int, constraints: str | None = None
) -> list[GeneratedRecipe]:
    prompt = build_recipe_search_prompt(query=query, count=count)
    if constraints:
        prompt += f"\nConstraints: {constraints}"

    payload = {
        "model": settings.ollama_text_model,
        "prompt": prompt,
        "stream": False,
        "format": "json",
        "options": {"temperature": 0.7},
    }

    async with httpx.AsyncClient(timeout=120.0) as client:
        r = await client.post(f"{settings.ollama_host}/api/generate", json=payload)
        if not r.is_success:
            raise OllamaError(f"Ollama generate failed: {r.status_code} {r.text}")
        data = r.json()
        raw = data.get("response", "")
        parsed = _extract_json(raw)
        if isinstance(parsed, dict) and "recipes" in parsed:
            recipes_raw = parsed["recipes"]
        elif isinstance(parsed, list):
            recipes_raw = parsed
        else:
            raise OllamaError("Unexpected JSON shape from model")

    recipes: list[GeneratedRecipe] = []
    if not isinstance(recipes_raw, list):
        raise OllamaError("Unexpected JSON shape from model")
    for item in recipes_raw:
        try:
            recipes.append(GeneratedRecipe.model_validate(item))
        except ValidationError as e:
            raise OllamaError(f"Model returned an invalid recipe: {e}") from e
    return recipes


async def import_recipe_from_text(text: str) -> GeneratedRecipe:
    snippet = text.strip()
    if len(snippet) < 20:
        raise OllamaError("Recipe text is too short to parse")

    prompt = f"""Parse the following home recipe into structured JSON.
Return ONLY a JSON object (not an array) with:
title (string), servings (integer or null), prep_minutes (integer or null),
ingredients (array of {{name, quantity}} where quantity is a string like "2 cups" or "1 lb"),
steps (array of strings, in order),
uses_from_pantry (empty array [] if unknown),
uses_from_publix_bogo (empty array []).

Preserve ingredient amounts and step order from the source text. Do not invent extra ingredients.

Recipe text:
{snippet}
"""

    payload = {
        "model": settings.ollama_text_model,
        "prompt": prompt,
        "stream": False,
        "format": "json",
        "options": {"temperature": 0.2},
    }

    async with httpx.AsyncClient(timeout=120.0) as client:
        r = await client.post(f"{settings.ollama_host}/api/generate", json=payload)
        if not r.is_success:
            raise OllamaError(f"Ollama generate failed: {r.status_code} {r.text}")
        data = r.json()
        raw = data.get("response", "")
        parsed = _extract_json(raw)

    if isinstance(parsed, dict) and "recipes" in parsed and isinstance(parsed["recipes"], list):
        if not parsed["recipes"]:
            raise OllamaError("Model returned no recipe")
        parsed = parsed["recipes"][0]

    if not isinstance(parsed, dict):
        raise OllamaError("Unexpected JSON shape from model")

    try:
        return GeneratedRecipe.model_validate(parsed)
    except ValidationError as e:
        raise OllamaError(f"Model returned an invalid recipe: {e}") from e


async def generate_text_json(prompt: str) -> object:
    payload = {
        "model": settings.ollama_text_model,
        "prompt": prompt,
        "stream": False,
        "format": "json",
        "options": {"temperature": 0.1},
    }

    async with httpx.AsyncClient(timeout=120.0) as client:
        r = await client.post(f"{settings.ollama_host}/api/generate", json=payload)
        if not r.is_success:
            raise OllamaError(f"Ollama generate failed: {r.status_code} {r.text}")
        data = r.json()
        raw = data.get("response", "")
        if not isinstance(raw, str) or not raw.strip():
            raise OllamaError("Model returned an empty response")

    return _extract_json(raw)


async def generate_vision_json(prompt: str, image_base64: str) -> object:
    payload = {
        "model": settings.ollama_vision_model,
        "messages": [
            {
                "role": "user",
                "content": prompt,
                "images": [image_base64],
            }
        ],
        "stream": False,
        "format": "json",
        "options": {"temperature": 0.1},
    }

    async with httpx.AsyncClient(timeout=180.0) as client:
        r = await client.post(f"{settings.ollama_host}/api/chat", json=payload)
        if not r.is_success:
            raise OllamaError(
                f"Ollama vision failed: {r.status_code} {r.text}. "
                f"Install a vision model with `ollama pull {settings.ollama_vision_model}`."
            )
        data = r.json()
        message = data.get("message") or {}
        raw = message.get("content", "")
        if not isinstance(raw, str) or not raw.strip():
            raise OllamaError("Vision model returned an empty response")

    return _extract_json(raw)
