import re
from datetime import datetime, timedelta

MONTH_NAME_PATTERN = (
    r"January|February|March|April|May|June|July|August|September|October|November|December"
)


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

    month_year = re.search(rf"\b({MONTH_NAME_PATTERN})\s+(20\d{{2}})\b", value, re.I)
    if month_year:
        try:
            return datetime.strptime(f"{month_year.group(1)} 1 {month_year.group(2)}", "%B %d %Y").date()
        except ValueError:
            return None

    year_month = re.search(r"\b(20\d{2})-(0[1-9]|1[0-2])\b(?!-\d{2})", value)
    if year_month:
        try:
            return datetime.strptime(f"{year_month.group(1)}-{year_month.group(2)}-01", "%Y-%m-%d").date()
        except ValueError:
            return None
    return None


def format_release_date(value) -> str:
    parsed = parse_release_date(value)
    if parsed:
        return parsed.isoformat()
    return str(value or "N/A")


def extract_dates_from_text(text) -> list[str]:
    """Extract candidate release dates from free text."""
    if not text:
        return []

    found: list[str] = []
    value = str(text)

    for match in re.finditer(r"\b(20\d{2}-\d{2}-\d{2})\b", value):
        found.append(match.group(1))

    for match in re.finditer(r"\b(20\d{2})-(0[1-9]|1[0-2])\b(?!-\d{2})", value):
        found.append(f"{match.group(1)}-{match.group(2)}-01")

    for match in re.finditer(
        rf"\b({MONTH_NAME_PATTERN})\s+(\d{{1,2}}),?\s+(20\d{{2}})\b",
        value,
        re.I,
    ):
        try:
            parsed = datetime.strptime(
                f"{match.group(1)} {match.group(2)} {match.group(3)}",
                "%B %d %Y",
            )
            found.append(parsed.date().isoformat())
        except ValueError:
            continue

    for match in re.finditer(rf"\b({MONTH_NAME_PATTERN})\s+(20\d{{2}})\b", value, re.I):
        try:
            parsed = datetime.strptime(f"{match.group(1)} 1 {match.group(2)}", "%B %d %Y")
            found.append(parsed.date().isoformat())
        except ValueError:
            continue

    deduped = []
    for item in found:
        if item not in deduped:
            deduped.append(item)
    return deduped


def resolve_release_date(analysis: dict) -> str:
    """
    Pick the release date that matches the actionable finding.
    Prefer explicit dates in action_required over a stale LLM release_date field.
    """
    action_text = analysis.get("action_required", "") or ""
    action_dates = [
        (parse_release_date(token), format_release_date(token))
        for token in extract_dates_from_text(action_text)
        if parse_release_date(token)
    ]
    if action_dates:
        return max(action_dates, key=lambda item: item[0])[1]

    for field in ("summary", "logiwa_impact"):
        for token in extract_dates_from_text(analysis.get(field, "") or ""):
            parsed = parse_release_date(token)
            if parsed:
                return parsed.isoformat()

    for detail in analysis.get("details") or []:
        for token in extract_dates_from_text(detail):
            parsed = parse_release_date(token)
            if parsed:
                return parsed.isoformat()

    primary = analysis.get("release_date", "N/A")
    parsed_primary = parse_release_date(primary)
    if parsed_primary:
        return parsed_primary.isoformat()
    return primary if primary else "N/A"


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
