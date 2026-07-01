from datetime import datetime, timedelta

from src.status_utils import (
    normalize_impact_level,
    resolve_integration_status,
    should_include_in_digest,
    should_send_slack_alert,
)


def test_normalize_impact_level():
    assert normalize_impact_level("High (Breaking)") == "High"
    assert normalize_impact_level("medium risk") == "Medium"
    assert normalize_impact_level("low") == "Low"
    assert normalize_impact_level(None) == "Low"


def test_resolve_integration_status_priority():
    analysis = {
        "impact_level": "High",
        "type": "Breaking Change",
        "release_date": datetime.now().date().isoformat(),
        "action_required": "Migrate webhook payload before deadline.",
    }
    assert resolve_integration_status(analysis) == "Action Required"


def test_resolve_integration_status_stale_date_is_ready():
    stale = (datetime.now().date() - timedelta(days=90)).isoformat()
    analysis = {
        "impact_level": "High",
        "type": "Breaking Change",
        "release_date": stale,
        "action_required": f"Urgent change from {stale}.",
    }
    assert resolve_integration_status(analysis, freshness_days=30) == "Ready"


def test_resolve_integration_status_new_capability_medium():
    analysis = {
        "impact_level": "Medium",
        "type": "New Capability",
        "release_date": datetime.now().date().isoformat(),
        "action_required": "Evaluate new endpoint for WMS sync.",
    }
    assert resolve_integration_status(analysis) == "Needs Review"


def test_should_send_slack_alert_for_high_and_medium():
    assert should_send_slack_alert("Action Required") is True
    assert should_send_slack_alert("Needs Review") is True
    assert should_send_slack_alert("Ready") is False


def test_should_include_in_digest():
    assert should_include_in_digest("Action Required") is True
    assert should_include_in_digest("Needs Review") is True
    assert should_include_in_digest("Ready") is False
