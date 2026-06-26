def normalize_impact_level(raw) -> str:
    if not raw:
        return "Low"
    text = str(raw).strip().lower()
    if text.startswith("high") or "breaking" in text or "critical" in text:
        return "High"
    if text.startswith("medium") or "moderate" in text:
        return "Medium"
    if text.startswith("low"):
        return "Low"
    return "Low"


def has_actionable_recommendation(action) -> bool:
    if not action:
        return False
    normalized = str(action).strip().lower()
    return normalized not in {"monitoring", "n/a", "none", ""}


def resolve_integration_status(analysis: dict) -> str:
    """
    Map LLM analysis to dashboard status.
    Priority: Action Required > Needs Review > Ready
    """
    impact_level = normalize_impact_level(analysis.get("impact_level"))
    change_type = str(analysis.get("type", "")).lower()
    release_date = analysis.get("release_date", "N/A")
    action = analysis.get("action_required", "Monitoring")

    status_map = {
        "High": "Action Required",
        "Medium": "Needs Review",
        "Low": "Ready",
    }
    status = status_map.get(impact_level, "Ready")

    has_date = release_date not in (None, "", "N/A", "Pending Analysis")
    has_action = has_actionable_recommendation(action)

    if not has_date or not has_action:
        return status

    if "breaking" in change_type:
        return "Action Required" if impact_level == "High" else "Needs Review"

    if any(token in change_type for token in ("maintenance", "new capability", "deprecation")):
        if status == "Ready":
            return "Needs Review"

    return status
