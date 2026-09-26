from io import BytesIO

import pytest
from pypdf import PdfWriter

from app.services.purchase_document_fetch import PurchaseDocumentFetchError, _pdf_bytes_to_text


def test_pdf_bytes_to_text_rejects_blank_pdf() -> None:
    writer = PdfWriter()
    writer.add_blank_page(width=200, height=200)
    buffer = BytesIO()
    writer.write(buffer)
    with pytest.raises(PurchaseDocumentFetchError, match="enough text"):
        _pdf_bytes_to_text(buffer.getvalue())
