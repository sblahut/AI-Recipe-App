"""Fetch grocery receipts or order invoices from public URLs (HTML, PDF, or plain text)."""

from __future__ import annotations

from io import BytesIO

import httpx

from app.services.recipe_url_fetch import (
    MAX_RESPONSE_BYTES,
    MAX_TEXT_CHARS,
    USER_AGENT,
    RecipeFetchError,
    html_to_text,
    validate_recipe_import_url,
)

PurchaseDocumentFetchError = RecipeFetchError


def _pdf_bytes_to_text(data: bytes) -> str:
    try:
        from pypdf import PdfReader
    except ImportError as e:
        raise PurchaseDocumentFetchError("PDF support is not installed on the server") from e

    try:
        reader = PdfReader(BytesIO(data))
    except Exception as e:
        raise PurchaseDocumentFetchError("Could not read that PDF") from e

    parts: list[str] = []
    for page in reader.pages:
        extracted = page.extract_text()
        if extracted:
            parts.append(extracted)
    text = "\n".join(parts).strip()
    if len(text) < 20:
        raise PurchaseDocumentFetchError(
            "Could not extract enough text from that PDF. Try a photo of the invoice instead."
        )
    if len(text) > MAX_TEXT_CHARS:
        return text[:MAX_TEXT_CHARS]
    return text


def _looks_like_pdf(raw: bytes, content_type: str, url: str) -> bool:
    if raw.startswith(b"%PDF"):
        return True
    if "pdf" in content_type:
        return True
    return url.lower().split("?")[0].endswith(".pdf")


async def fetch_purchase_document_text_from_url(url: str) -> str:
    safe_url = validate_recipe_import_url(url)

    async with httpx.AsyncClient(
        timeout=httpx.Timeout(25.0, connect=8.0),
        follow_redirects=True,
        max_redirects=5,
        headers={
            "User-Agent": USER_AGENT,
            "Accept": "text/html,application/pdf,text/plain,application/octet-stream;q=0.8,*/*;q=0.5",
        },
    ) as client:
        try:
            response = await client.get(safe_url)
        except httpx.HTTPError as e:
            raise PurchaseDocumentFetchError(f"Could not fetch URL: {e}") from e

    if response.status_code >= 400:
        raise PurchaseDocumentFetchError(f"URL returned HTTP {response.status_code}")

    raw = response.content
    if len(raw) > MAX_RESPONSE_BYTES:
        raise PurchaseDocumentFetchError("Document is too large to import")

    content_type = response.headers.get("content-type", "").lower()

    if _looks_like_pdf(raw, content_type, safe_url):
        return _pdf_bytes_to_text(raw)

    if content_type and "html" in content_type:
        encoding = response.encoding or "utf-8"
        try:
            html = raw.decode(encoding, errors="replace")
        except LookupError:
            html = raw.decode("utf-8", errors="replace")
        text = html_to_text(html)
    elif content_type and ("text" in content_type or "json" in content_type):
        encoding = response.encoding or "utf-8"
        try:
            text = raw.decode(encoding, errors="replace").strip()
        except LookupError:
            text = raw.decode("utf-8", errors="replace").strip()
    else:
        # Some stores return HTML without a helpful content-type.
        try:
            sniff = raw.decode("utf-8", errors="replace")
        except Exception as e:
            raise PurchaseDocumentFetchError("URL did not return a supported document type") from e
        if "<html" in sniff.lower()[:500]:
            text = html_to_text(sniff)
        else:
            raise PurchaseDocumentFetchError(
                "URL did not return HTML, PDF, or text. Save the invoice as PDF or use a photo."
            )

    if len(text) < 20:
        raise PurchaseDocumentFetchError("Could not extract enough text from that page")

    if len(text) > MAX_TEXT_CHARS:
        text = text[:MAX_TEXT_CHARS]
    return text
