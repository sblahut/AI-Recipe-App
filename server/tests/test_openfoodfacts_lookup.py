from unittest.mock import MagicMock, patch

import httpx

from app.services.openfoodfacts_lookup import lookup_product, lookup_product_name


def test_lookup_product_returns_none_on_http_error() -> None:
    with patch("app.services.openfoodfacts_lookup.httpx.Client") as client_cls:
        client_cls.return_value.__enter__.return_value.get.side_effect = httpx.ConnectError(
            "offline",
            request=MagicMock(),
        )
        assert lookup_product("4011") is None


def test_lookup_product_parses_success_payload() -> None:
    payload = {
        "status": 1,
        "product": {
            "product_name": "Test Cereal",
            "brands": "Acme",
            "quantity": "500 g",
        },
    }
    response = MagicMock()
    response.status_code = 200
    response.json.return_value = payload

    with patch("app.services.openfoodfacts_lookup.httpx.Client") as client_cls:
        client_cls.return_value.__enter__.return_value.get.return_value = response
        info = lookup_product("1234567890123")
        assert info is not None
        assert info.name == "Test Cereal"
        assert info.brand == "Acme"
        assert lookup_product_name("1234567890123") == ("Test Cereal", "Acme")


def test_lookup_product_returns_none_when_status_not_found() -> None:
    response = MagicMock()
    response.status_code = 200
    response.json.return_value = {"status": 0}

    with patch("app.services.openfoodfacts_lookup.httpx.Client") as client_cls:
        client_cls.return_value.__enter__.return_value.get.return_value = response
        assert lookup_product("000") is None
