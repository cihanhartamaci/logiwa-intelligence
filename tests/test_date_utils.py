from datetime import datetime, timedelta

from src.date_utils import (
    extract_dates_from_text,
    freshness_to_days,
    is_within_review_window,
    parse_release_date,
    resolve_release_date,
)


def test_freshness_to_days():
    assert freshness_to_days("1 Month") == 30
    assert freshness_to_days("2 weeks") == 14
    assert freshness_to_days(45) == 45


def test_parse_release_date_variants():
    assert parse_release_date("2025-06-10").isoformat() == "2025-06-10"
    assert parse_release_date("June 10, 2025").isoformat() == "2025-06-10"
    assert parse_release_date("2025-06") == parse_release_date("2025-06-01")
    assert parse_release_date("N/A") is None


def test_extract_dates_from_text():
    text = "Ship by June 29, 2025 and patch 2025-06-10."
    dates = extract_dates_from_text(text)
    assert "2025-06-29" in dates
    assert "2025-06-10" in dates


def test_resolve_release_date_prefers_action_text():
    analysis = {
        "release_date": "2024-10-01",
        "action_required": "Review OAuth change effective June 29, 2025.",
    }
    assert resolve_release_date(analysis) == "2025-06-29"


def test_is_within_review_window():
    today = datetime.now().date()
    recent = (today - timedelta(days=5)).isoformat()
    stale = (today - timedelta(days=60)).isoformat()
    future = (today + timedelta(days=10)).isoformat()

    assert is_within_review_window(recent, 30) is True
    assert is_within_review_window(future, 30) is True
    assert is_within_review_window(stale, 30) is False
    assert is_within_review_window("N/A", 30) is True
