#!/usr/bin/env python3
"""Push CI/CD variables from local .env + Firebase key to GitLab."""

from __future__ import annotations

import argparse
import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PROJECT_PATH = "logiwa-tech/integrations/integration-newsletter"
GITLAB_API = "https://gitlab.com/api/v4"
EXPORT_FILE = ROOT / "gitlab-variables-export.json"


def load_dotenv(path: Path) -> dict[str, str]:
    values: dict[str, str] = {}
    if not path.exists():
        return values
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        values[key.strip()] = value.strip()
    return values


def minified_json(path: Path) -> str:
    return json.dumps(json.loads(path.read_text(encoding="utf-8")), separators=(",", ":"))


def api_request(token: str, method: str, url: str, data: dict | None = None) -> bytes:
    body = urllib.parse.urlencode(data).encode() if data else None
    req = urllib.request.Request(
        url,
        data=body,
        method=method,
        headers={"PRIVATE-TOKEN": token},
    )
    try:
        with urllib.request.urlopen(req) as resp:
            return resp.read()
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"HTTP {exc.code} for {method} {url}\n{detail}") from exc


def collect_variables() -> dict[str, str]:
    env = load_dotenv(ROOT / ".env")
    firebase_path = ROOT / "serviceAccountKey.json"

    variables: dict[str, str] = {
        "GOOGLE_API_KEY": env.get("GOOGLE_API_KEY", ""),
        "GEMINI_API_KEY": env.get("GEMINI_API_KEY") or env.get("GOOGLE_API_KEY", ""),
        "OPENAI_API_KEY": env.get("OPENAI_API_KEY", ""),
        "SLACK_WEBHOOK_URL": env.get("SLACK_WEBHOOK_URL", ""),
        "SMTP_EMAIL": env.get("SMTP_EMAIL", ""),
        "SMTP_PASSWORD": env.get("SMTP_PASSWORD", ""),
    }

    if firebase_path.exists():
        variables["FIREBASE_SERVICE_ACCOUNT_JSON"] = minified_json(firebase_path)

    return {
        key: value
        for key, value in variables.items()
        if value and not value.startswith("your-") and not value.startswith("sk-your-")
    }


def verify_token(token: str) -> str:
    payload = json.loads(api_request(token, "GET", f"{GITLAB_API}/user"))
    username = payload.get("username", "unknown")
    print(f"Token OK — logged in as @{username}")
    return username


def verify_project_access(token: str, project: str) -> dict:
    encoded = urllib.parse.quote(project, safe="")
    payload = json.loads(api_request(token, "GET", f"{GITLAB_API}/projects/{encoded}"))
    access = payload.get("permissions", {}).get("project_access", {})
    level = access.get("access_level")
    level_names = {
        10: "Guest",
        20: "Reporter",
        30: "Developer",
        40: "Maintainer",
        50: "Owner",
    }
    name = level_names.get(level, f"level {level}")
    print(f"Project access: {name}")
    if level is not None and level < 40:
        print(
            "\n403 nedeni büyük ihtimalle bu: CI/CD variable eklemek için "
            "Maintainer veya Owner rolü gerekir.\n"
            "Maintainer'dan rol yükseltmesi isteyin veya --export ile dosya üretip "
            "onlara iletin.\n"
        )
    return payload


def list_existing_keys(token: str, project: str) -> set[str]:
    encoded = urllib.parse.quote(project, safe="")
    url = f"{GITLAB_API}/projects/{encoded}/variables?per_page=100"
    payload = json.loads(api_request(token, "GET", url))
    return {item["key"] for item in payload}


def upsert_variable(
    token: str,
    project: str,
    key: str,
    value: str,
    existing: set[str],
    protected: bool = True,
) -> None:
    encoded = urllib.parse.quote(project, safe="")
    base = f"{GITLAB_API}/projects/{encoded}/variables"

    # Firebase JSON cannot be masked in GitLab (multiline/special chars).
    masked = key != "FIREBASE_SERVICE_ACCOUNT_JSON"

    payload = {
        "key": key,
        "value": value,
        "masked": "true" if masked else "false",
        "protected": "true" if protected else "false",
        "raw": "true",
    }

    if key in existing:
        api_request(token, "PUT", f"{base}/{urllib.parse.quote(key, safe='')}", payload)
        print(f"  updated {key}")
    else:
        api_request(token, "POST", base, payload)
        print(f"  created {key}")


def export_variables(variables: dict[str, str]) -> Path:
    EXPORT_FILE.write_text(json.dumps(variables, indent=2), encoding="utf-8")
    print(f"Exported {len(variables)} variables to {EXPORT_FILE}")
    print("Bu dosyayı Maintainer'a verin; GitLab UI'dan elle ekleyebilir.")
    print("Dosyayı commit etmeyin — hassas bilgi içerir.")
    return EXPORT_FILE


def main() -> int:
    parser = argparse.ArgumentParser(description="Sync local secrets to GitLab CI/CD variables.")
    parser.add_argument(
        "--export",
        action="store_true",
        help="Write variables to gitlab-variables-export.json for manual import.",
    )
    args = parser.parse_args()

    variables = collect_variables()
    if not variables:
        print("No variables found in .env / serviceAccountKey.json")
        return 1

    if args.export:
        export_variables(variables)
        return 0

    token = os.getenv("GITLAB_TOKEN") or os.getenv("GL_TOKEN")
    if not token:
        print("GITLAB_TOKEN yok. Ya token ayarlayın ya da --export kullanın.")
        return 1

    print(f"Syncing variables to {PROJECT_PATH}...")
    try:
        verify_token(token)
        verify_project_access(token, PROJECT_PATH)
        existing = list_existing_keys(token, PROJECT_PATH)
    except RuntimeError as exc:
        print(f"\nErişim hatası:\n{exc}")
        print("\nAlternatif: python scripts/setup_gitlab_variables.py --export")
        return 1

    try:
        for key, value in variables.items():
            upsert_variable(token, PROJECT_PATH, key, value, existing)
    except RuntimeError as exc:
        print(f"\nVariable yazılamadı:\n{exc}")
        print("\nAlternatif: python scripts/setup_gitlab_variables.py --export")
        return 1

    print("Done.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
