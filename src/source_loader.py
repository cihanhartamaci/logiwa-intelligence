import os

import yaml

DEFAULT_SOURCES_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "sources.yaml")


def load_default_sources(path: str = DEFAULT_SOURCES_PATH) -> list[dict]:
    """Load the canonical integration source manifest."""
    with open(path, "r", encoding="utf-8") as handle:
        data = yaml.safe_load(handle) or {}
    return data.get("sources", [])
