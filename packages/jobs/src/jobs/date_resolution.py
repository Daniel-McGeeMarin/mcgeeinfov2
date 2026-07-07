"""
Shared date math and year-resolution for universal dates (YYYY-MM-DD).
All functions are pure math helpers — each mapper parses its own date strings
and decides which helper to call.
"""
from __future__ import annotations

from datetime import date, datetime, timedelta, timezone

FUTURE_SLOP_DAYS = 3


def _today_utc() -> date:
    return datetime.now(timezone.utc).date()


def resolve_year_for_month_day(month: int, day: int, reference_date: date | None = None) -> int:
    if reference_date is None:
        reference_date = _today_utc()
    this_year = reference_date.year
    try:
        candidate = date(this_year, month, day)
    except ValueError:
        return this_year
    delta = (candidate - reference_date).days
    if delta <= FUTURE_SLOP_DAYS:
        return this_year
    return this_year - 1


def to_iso_date(month: int, day: int, year: int | None = None, reference_date: date | None = None) -> str | None:
    if reference_date is None:
        reference_date = _today_utc()
    if year is None:
        year = resolve_year_for_month_day(month, day, reference_date)
    try:
        return date(year, month, day).isoformat()
    except ValueError:
        return None


def iso_from_days_ago(days: int, reference_date: date | None = None) -> str:
    if reference_date is None:
        reference_date = _today_utc()
    return (reference_date - timedelta(days=days)).isoformat()


def iso_from_weeks_ago(weeks: int, reference_date: date | None = None) -> str:
    if reference_date is None:
        reference_date = _today_utc()
    return (reference_date - timedelta(weeks=weeks)).isoformat()


def iso_from_months_ago(months: int, reference_date: date | None = None) -> str:
    if reference_date is None:
        reference_date = _today_utc()
    return _subtract_months(reference_date, months)


def _subtract_months(d: date, n: int) -> str:
    month = d.month - n
    year = d.year
    while month < 1:
        month += 12
        year -= 1
    if month == 12:
        last_day = (date(year + 1, 1, 1) - timedelta(days=1)).day
    else:
        last_day = (date(year, month + 1, 1) - timedelta(days=1)).day
    return date(year, month, min(d.day, last_day)).isoformat()
