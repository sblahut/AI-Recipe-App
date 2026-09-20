"""Date-range helpers for meal plan entries."""

from __future__ import annotations

from datetime import date, timedelta
from typing import Protocol, TypeVar


class MealPlanEntryDate(Protocol):
    plan_date: str


TEntry = TypeVar("TEntry", bound=MealPlanEntryDate)

MEAL_SLOT_ORDER: tuple[str, ...] = ("breakfast", "lunch", "dinner", "snack")


def parse_plan_date(value: str) -> date:
    text = value.strip()
    try:
        parsed = date.fromisoformat(text)
    except ValueError as e:
        raise ValueError("plan_date must be YYYY-MM-DD") from e
    if parsed.isoformat() != text:
        raise ValueError("plan_date must be YYYY-MM-DD")
    return parsed


def validate_plan_date_range(start: str, end: str) -> tuple[date, date]:
    start_d = parse_plan_date(start)
    end_d = parse_plan_date(end)
    if end_d < start_d:
        raise ValueError("end_date must be on or after start_date")
    return start_d, end_d


def filter_entries_in_range(
    entries: list[TEntry],
    start: date,
    end: date,
) -> list[TEntry]:
    kept: list[TEntry] = []
    for entry in entries:
        day = parse_plan_date(entry.plan_date)
        if start <= day <= end:
            kept.append(entry)
    return kept


def monday_on_or_before(day: date) -> date:
    return day - timedelta(days=day.weekday())


def sunday_on_or_after(day: date) -> date:
    return day + timedelta(days=(6 - day.weekday()))


def week_bounds_containing(day: date) -> tuple[date, date]:
    return monday_on_or_before(day), sunday_on_or_after(day)


def meal_slot_sort_key(slot: str) -> int:
    normalized = slot.strip().lower()
    try:
        return MEAL_SLOT_ORDER.index(normalized)
    except ValueError:
        return len(MEAL_SLOT_ORDER)
