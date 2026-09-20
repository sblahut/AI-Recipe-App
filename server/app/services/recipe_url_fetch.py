"""Fetch public recipe pages and extract plain text for import."""

from __future__ import annotations

import html as html_module
import ipaddress
import re
import socket
from urllib.parse import urlparse

import httpx

MAX_RESPONSE_BYTES = 2_000_000
MAX_TEXT_CHARS = 50_000
USER_AGENT = "AI-Recipe-App/1.0 (family recipe import)"


class RecipeFetchError(Exception):
    pass


def _hostname_blocked(hostname: str) -> bool:
    host = hostname.strip().lower().rstrip(".")
    if host in {"localhost", "127.0.0.1", "0.0.0.0", "::1"}:
        return True
    if host.endswith((".local", ".internal")):
        return True

    try:
        infos = socket.getaddrinfo(host, None)
    except socket.gaierror as e:
        raise RecipeFetchError(f"Could not resolve host: {host}") from e

    for info in infos:
        ip_str = info[4][0]
        try:
            ip = ipaddress.ip_address(ip_str)
        except ValueError:
            continue
        if (
            ip.is_private
            or ip.is_loopback
            or ip.is_link_local
            or ip.is_multicast
            or ip.is_reserved
        ):
            return True
    return False


def validate_recipe_import_url(url: str) -> str:
    parsed = urlparse(url.strip())
    if parsed.scheme not in {"http", "https"}:
        raise RecipeFetchError("Only http and https URLs are allowed")
    if not parsed.hostname:
        raise RecipeFetchError("Invalid URL")
    if _hostname_blocked(parsed.hostname):
        raise RecipeFetchError("That URL host is not allowed")
    return url.strip()


def html_to_text(html: str) -> str:
    without_blocks = re.sub(r"(?is)<(script|style|noscript)[^>]*>.*?</\1>", " ", html)
    without_tags = re.sub(r"(?s)<[^>]+>", " ", without_blocks)
    unescaped = html_module.unescape(without_tags)
    collapsed = re.sub(r"\s+", " ", unescaped).strip()
    return collapsed


async def fetch_recipe_text_from_url(url: str) -> str:
    safe_url = validate_recipe_import_url(url)

    async with httpx.AsyncClient(
        timeout=httpx.Timeout(20.0, connect=8.0),
        follow_redirects=True,
        max_redirects=5,
        headers={"User-Agent": USER_AGENT, "Accept": "text/html,application/xhtml+xml"},
    ) as client:
        try:
            response = await client.get(safe_url)
        except httpx.HTTPError as e:
            raise RecipeFetchError(f"Could not fetch URL: {e}") from e

    if response.status_code >= 400:
        raise RecipeFetchError(f"URL returned HTTP {response.status_code}")

    content_type = response.headers.get("content-type", "").lower()
    if content_type and "html" not in content_type and "text" not in content_type:
        raise RecipeFetchError("URL did not return HTML or text content")

    raw = response.content
    if len(raw) > MAX_RESPONSE_BYTES:
        raise RecipeFetchError("Page is too large to import")

    encoding = response.encoding or "utf-8"
    try:
        html = raw.decode(encoding, errors="replace")
    except LookupError:
        html = raw.decode("utf-8", errors="replace")

    text = html_to_text(html)
    if len(text) < 20:
        raise RecipeFetchError("Could not extract enough text from that page")

    if len(text) > MAX_TEXT_CHARS:
        text = text[:MAX_TEXT_CHARS]
    return text
