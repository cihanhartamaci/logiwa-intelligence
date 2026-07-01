"""Deploy Firestore rules via Firebase Rules REST API (no Firebase CLI permissions needed)."""
import json
import os

import google.auth.transport.requests
import google.oauth2.service_account
import requests

PROJECT_ID = "logiwa-intelligence"
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SA_PATH = os.path.join(ROOT, "serviceAccountKey.json")
RULES_PATH = os.path.join(ROOT, "firestore.rules")
SCOPES = [
    "https://www.googleapis.com/auth/cloud-platform",
    "https://www.googleapis.com/auth/firebase",
]


def get_access_token():
    credentials = google.oauth2.service_account.Credentials.from_service_account_file(
        SA_PATH,
        scopes=SCOPES,
    )
    request = google.auth.transport.requests.Request()
    credentials.refresh(request)
    return credentials.token


def deploy_rules():
    with open(RULES_PATH, "r", encoding="utf-8") as handle:
        rules_content = handle.read()

    token = get_access_token()
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    }

    create_resp = requests.post(
        f"https://firebaserules.googleapis.com/v1/projects/{PROJECT_ID}/rulesets",
        headers=headers,
        json={
            "source": {
                "files": [
                    {
                        "name": "firestore.rules",
                        "content": rules_content,
                    }
                ]
            }
        },
        timeout=30,
    )
    create_resp.raise_for_status()
    ruleset_name = create_resp.json()["name"]
    print(f"Created ruleset: {ruleset_name}")

    release_resp = requests.patch(
        f"https://firebaserules.googleapis.com/v1/projects/{PROJECT_ID}/releases/cloud.firestore",
        headers=headers,
        params={"updateMask": "rulesetName"},
        json={
            "release": {
                "name": f"projects/{PROJECT_ID}/releases/cloud.firestore",
                "rulesetName": ruleset_name,
            }
        },
        timeout=30,
    )
    release_resp.raise_for_status()
    print("Published Firestore rules release: cloud.firestore")


if __name__ == "__main__":
    deploy_rules()
