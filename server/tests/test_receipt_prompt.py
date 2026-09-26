from app.services.receipt_extract import build_purchase_text_prompt


def test_build_purchase_text_prompt_includes_ocr_and_json_shape() -> None:
    ocr = "WALMART\nBANANAS 1.24 lb\nGV MILK 2.99"
    prompt = build_purchase_text_prompt(ocr)
    assert "BANANAS" in prompt
    assert '"items"' in prompt
    assert "{document_text}" not in prompt
