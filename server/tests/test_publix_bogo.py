import pytest

from app.services.publix_bogo import PublixBogoError, decode_publix_title, parse_bogo_titles


def test_decode_publix_title_unescapes_html() -> None:
    assert decode_publix_title("Nature&#39;s Own Butterbread") == "Nature's Own Butterbread"


def test_parse_bogo_titles_filters_category() -> None:
    payload = {
        "Savings": [
            {"title": "Cheerios", "categories": ["grocery", "bogo"]},
            {"title": "Ground Chuck", "categories": ["meat"]},
            {"title": "Thomas&#39; Bagels", "categories": ["bogo"]},
        ]
    }
    titles = parse_bogo_titles(payload)
    assert titles == ["Cheerios", "Thomas' Bagels"]


def test_parse_bogo_titles_raises_when_no_bogo_rows() -> None:
    with pytest.raises(PublixBogoError, match="No BOGO items"):
        parse_bogo_titles({"Savings": [{"title": "Milk", "categories": ["grocery"]}]})


def test_parse_bogo_titles_deduplicates() -> None:
    payload = {
        "Savings": [
            {"title": "Oreos", "categories": ["bogo"]},
            {"title": "Oreos", "categories": ["bogo"]},
        ]
    }
    assert parse_bogo_titles(payload) == ["Oreos"]
