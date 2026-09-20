from dataclasses import dataclass
from datetime import date

import pytest

from app.services.meal_plan_range import (
    filter_entries_in_range,
    meal_slot_sort_key,
    monday_on_or_before,
    parse_plan_date,
    validate_plan_date_range,
    week_bounds_containing,
)


def test_parse_plan_date_valid() -> None:
    assert parse_plan_date("2026-04-07") == date(2026, 4, 7)


def test_parse_plan_date_rejects_invalid() -> None:
    with pytest.raises(ValueError, match="YYYY-MM-DD"):
        parse_plan_date("04-07-2026")


def test_validate_plan_date_range() -> None:
    start, end = validate_plan_date_range("2026-04-07", "2026-04-13")
    assert start == date(2026, 4, 7)
    assert end == date(2026, 4, 13)


def test_validate_plan_date_range_rejects_inverted() -> None:
    with pytest.raises(ValueError, match="on or after"):
        validate_plan_date_range("2026-04-10", "2026-04-01")


@dataclass
class _Entry:
    plan_date: str


def test_filter_entries_in_range() -> None:
    entries = [_Entry("2026-04-05"), _Entry("2026-04-07"), _Entry("2026-04-12")]
    kept = filter_entries_in_range(entries, date(2026, 4, 6), date(2026, 4, 10))
    assert [row.plan_date for row in kept] == ["2026-04-07"]


def test_week_bounds_monday_to_sunday() -> None:
    start, end = week_bounds_containing(date(2026, 4, 8))
    assert start == date(2026, 4, 6)
    assert end == date(2026, 4, 12)
    assert monday_on_or_before(date(2026, 4, 6)) == date(2026, 4, 6)


def test_meal_slot_sort_key() -> None:
    assert meal_slot_sort_key("dinner") < meal_slot_sort_key("snack")
    assert meal_slot_sort_key("unknown") > meal_slot_sort_key("snack")
