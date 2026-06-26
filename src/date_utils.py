import re
from datetime import datetime, timedelta


def freshness_to_days(freshness) -> int:
    """Convert dashboard freshness setting to days."""
    if isinstance(freshness, (int, float)):
        return int(freshness)

    text = str(freshness or "1 Month").strip().lower()
    match = re.match(r"^(\d+)\s*(week|month|year)s?$", text)
    if not match:
        return 30

    amount = int(match.group(1))
    unit = match.group(2)
    if unit == "week":
        return amount * 7
    if unit == "month":
        return amount * 30
    if unit == "year":
        return amount * 365
    return 30


def parse_release_date(date_str):
    """Parse YYYY-MM-DD (or common variants) into a date, or None."""
    if not date_str or date_str in ("N/A", "Pending Analysis"):
        return None

    value = str(date_str).strip()
    for fmt in ("%Y-%m-%d", "%Y/%m/%d", "%d-%m-%Y", "%B %d, %Y", "%b %d, %Y"):
        try:
            return datetime.strptime(value, fmt).date()
        except ValueError:
            continue

    iso_match = re.search(r"(\d{4}-\d{2}-\d{2})", value)
    if iso_match:
        try:
            return datetime.strptime(iso_match.group(1), "%Y-%m-%d").date()
        except ValueError:
            return None
    return None


def is_within_review_window(date_str, max_age_days: int = 30) -> bool:
    """
    True when release date is within max_age_days of today or in the future.
    Missing/unparseable dates are treated as in-window (pending analysis).
    """
    release_date = parse_release_date(date_str)
    if release_date is None:
        return True

    today = datetime.now().date()
    cutoff = today - timedelta(days=max_age_days)
    return release_date >= cutoff
