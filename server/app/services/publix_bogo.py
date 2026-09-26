"""Fetch current Publix weekly-ad BOGO product titles for recipe generation."""

from __future__ import annotations

import html
import re

import httpx

PUBLIX_BOGO_PAGE_URL = "https://www.publix.com/savings/weekly-ad/bogo"
SAVINGS_API_URL = "https://services.publix.com/api/v4/savings"
MAX_BOGO_ITEMS_FOR_PROMPT = 80
USER_AGENT = "AI-Recipe-App/1.0 (family recipe planner)"


class PublixBogoError(Exception):
    pass


def decode_publix_title(raw: str) -> str:
    text = html.unescape(raw).strip()
    text = re.sub(r"\s+", " ", text)
    return text


def parse_bogo_titles(payload: object) -> list[str]:
    if not isinstance(payload, dict):
        raise PublixBogoError("Unexpected Publix savings response shape")
    savings = payload.get("Savings")
    if not isinstance(savings, list):
        raise PublixBogoError("Publix savings response missing Savings list")

    titles: list[str] = []
    seen: set[str] = set()
    for row in savings:
        if not isinstance(row, dict):
            continue
        categories = row.get("categories") or []
        if not isinstance(categories, list):
            continue
        cat_lower = {str(c).lower() for c in categories}
        if "bogo" not in cat_lower:
            continue
        title_raw = row.get("title")
        if not isinstance(title_raw, str) or not title_raw.strip():
            continue
        title = decode_publix_title(title_raw)
        key = title.casefold()
        if key in seen:
            continue
        seen.add(key)
        titles.append(title)

    if not titles:
        raise PublixBogoError("No BOGO items returned for this store")
    return titles


async def fetch_publix_bogo_titles(
    store_number: int,
    *,
    max_items: int = MAX_BOGO_ITEMS_FOR_PROMPT,
) -> list[str]:
    if store_number <= 0:
        raise PublixBogoError("Invalid Publix store number")

    params = {
        "smImg": 235,
        "enImg": 368,
        "fallbackImg": False,
        "isMobile": False,
        "page": 1,
        "pageSize": 0,
        "includePersonalizedDeals": False,
        "languageID": 1,
        "isWeb": True,
        "category": "bogo",
        "getSavingType": "WeeklyAd",
    }
    headers = {
        "accept": "application/json",
        "User-Agent": USER_AGENT,
        "origin": "https://www.publix.com",
        "referer": PUBLIX_BOGO_PAGE_URL,
        "PublixStore": str(store_number),
    }

    async with httpx.AsyncClient(
        timeout=httpx.Timeout(25.0, connect=8.0),
        follow_redirects=True,
        headers={"User-Agent": USER_AGENT},
    ) as client:
        await client.get(PUBLIX_BOGO_PAGE_URL)
        try:
            response = await client.get(SAVINGS_API_URL, params=params, headers=headers)
        except httpx.HTTPError as e:
            raise PublixBogoError(f"Could not reach Publix: {e}") from e

    if response.status_code >= 400:
        raise PublixBogoError(f"Publix savings API returned HTTP {response.status_code}")

    try:
        payload = response.json()
    except ValueError as e:
        raise PublixBogoError("Publix savings API returned invalid JSON") from e

    titles = parse_bogo_titles(payload)
    if len(titles) > max_items:
        return titles[:max_items]
    return titles
