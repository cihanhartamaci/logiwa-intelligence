"""
Fixes URLs in Firestore from the canonical sources.yaml manifest.
Usage: python scripts/fix_urls.py
"""
import sys
import os
sys.stdout.reconfigure(encoding='utf-8')
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from src.firebase_manager import FirebaseManager
from src.source_loader import load_default_sources


def fix_urls():
    print("Connecting to Firestore...")
    firebase = FirebaseManager()
    if not firebase.db:
        print("ERROR: Could not connect to Firestore.")
        return

    correct_sources = load_default_sources()
    docs_ref = firebase.db.collection("monitored_urls")
    all_docs = list(docs_ref.stream())

    print(f"Found {len(all_docs)} documents in Firestore.")

    existing = {doc.to_dict().get("name"): doc.id for doc in all_docs}

    for source in correct_sources:
        payload = {
            "url": source["url"],
            "category": source.get("category", "General"),
        }
        if source.get("scopes"):
            payload["scopes"] = source["scopes"]

        if source["name"] in existing:
            doc_id = existing[source["name"]]
            docs_ref.document(doc_id).update(payload)
            print(f"  Updated: {source['name']} -> {source['url']}")
        else:
            docs_ref.add(source)
            print(f"  Added: {source['name']}")

    print("\nDone! Run 'Run Intelligence Cycle' from the dashboard to get fresh results.")

if __name__ == "__main__":
    fix_urls()
