"""One-off ops for Phase 1 deploy: publish Firestore rules and strip legacy token fields."""
import json
import os
import subprocess
import sys

import firebase_admin
from firebase_admin import credentials, firestore
from google.cloud.firestore_v1 import DELETE_FIELD

PROJECT_ID = "logiwa-intelligence"
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SA_PATH = os.path.join(ROOT, "serviceAccountKey.json")
RULES_PATH = os.path.join(ROOT, "firestore.rules")


def init_firebase():
    if firebase_admin._apps:
        return firestore.client()
    if not os.path.exists(SA_PATH):
        raise FileNotFoundError(f"Missing {SA_PATH}")
    cred = credentials.Certificate(SA_PATH)
    firebase_admin.initialize_app(cred)
    return firestore.client()


def strip_legacy_tokens(db):
    doc_ref = db.collection("config").document("system")
    snapshot = doc_ref.get()
    if not snapshot.exists:
        print("config/system not found; nothing to strip.")
        return

    data = snapshot.to_dict() or {}
    token_fields = [key for key in ("gh_pat", "gl_pat", "gl_trigger_token") if key in data]
    if not token_fields:
        print("No legacy token fields in Firestore.")
        return

    doc_ref.update(
        {
            "gh_pat": DELETE_FIELD,
            "gl_pat": DELETE_FIELD,
            "gl_trigger_token": DELETE_FIELD,
        }
    )
    print(f"Removed legacy token fields from Firestore: {', '.join(token_fields)}")


def deploy_rules_with_cli():
    env = os.environ.copy()
    env["GOOGLE_APPLICATION_CREDENTIALS"] = SA_PATH
    npx = "npx.cmd" if os.name == "nt" else "npx"
    cmd = [
        npx,
        "--yes",
        "firebase-tools",
        "deploy",
        "--only",
        "firestore:rules",
        "--project",
        PROJECT_ID,
        "--non-interactive",
    ]
    result = subprocess.run(cmd, cwd=ROOT, env=env, capture_output=True, text=True)
    print(result.stdout)
    if result.stderr:
        print(result.stderr, file=sys.stderr)
    if result.returncode != 0:
        raise RuntimeError("firebase deploy failed")
    print("Firestore rules deployed.")


def verify_config(db):
    data = db.collection("config").document("system").get().to_dict() or {}
    remaining = [key for key in ("gh_pat", "gl_pat", "gl_trigger_token") if key in data]
    print("config/system snapshot:", json.dumps({k: data.get(k) for k in sorted(data.keys()) if k not in remaining}, indent=2))
    if remaining:
        raise RuntimeError(f"Token fields still present: {remaining}")
    print("Verified: no CI token fields in Firestore.")


def main():
    db = init_firebase()
    deploy_rules_with_cli()
    strip_legacy_tokens(db)
    verify_config(db)


if __name__ == "__main__":
    main()
