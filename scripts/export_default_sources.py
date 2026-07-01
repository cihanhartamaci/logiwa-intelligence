"""Export sources.yaml to dashboard JSON for client-side seeding."""
import json
import os
import sys

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from src.source_loader import load_default_sources

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
OUTPUT = os.path.join(ROOT, "dashboard", "src", "defaultSources.json")


def main():
    sources = load_default_sources()
    payload = [
        {
            "name": source["name"],
            "url": source["url"],
            "category": source.get("category", "General"),
            **({"scopes": source["scopes"]} if source.get("scopes") else {}),
        }
        for source in sources
    ]
    with open(OUTPUT, "w", encoding="utf-8") as handle:
        json.dump(payload, handle, indent=2)
        handle.write("\n")
    print(f"Wrote {len(payload)} sources to {OUTPUT}")


if __name__ == "__main__":
    main()
