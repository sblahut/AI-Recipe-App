from types import SimpleNamespace

from app.services.scan_quantity import resolve_scan_quantity


def test_packages_times_package_size() -> None:
    product = SimpleNamespace(
        default_quantity_kind="volume",
        default_quantity=1.0,
        default_unit="l",
    )
    kind, qty, unit = resolve_scan_quantity(
        use_product_defaults=True,
        packages=2,
        quantity_kind="count",
        unit="each",
        product=product,
    )
    assert kind == "volume"
    assert qty == 2.0
    assert unit == "l"


def test_manual_scan_ignores_catalog() -> None:
    product = SimpleNamespace(
        default_quantity_kind="volume",
        default_quantity=1.0,
        default_unit="l",
    )
    kind, qty, unit = resolve_scan_quantity(
        use_product_defaults=False,
        packages=3,
        quantity_kind="count",
        unit="each",
        product=product,
    )
    assert kind == "count"
    assert qty == 3
    assert unit == "each"
