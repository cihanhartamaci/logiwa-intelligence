import sys
import os
sys.stdout.reconfigure(encoding='utf-8')
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from src.firebase_manager import FirebaseManager

def cleanup():
    print("Scanning Firestore for empty/invalid documents...")
    firebase = FirebaseManager()
    if not firebase.db:
        print("ERROR: Could not connect to Firestore.")
        return

    docs = firebase.db.collection("monitored_urls").stream()
    deleted = 0
    found = 0
    for doc in docs:
        data = doc.to_dict()
        found += 1
        name = data.get("name", "").strip()
        url = data.get("url", "").strip()
        if not name or not url:
            print(f"  --> Deleting invalid doc (id={doc.id}): name='{name}' url='{url}'")
            firebase.db.collection("monitored_urls").document(doc.id).delete()
            deleted += 1
        else:
            print(f"  OK: {name}")

    print(f"\nDone. Scanned {found} docs, deleted {deleted} invalid entries.")

if __name__ == "__main__":
    cleanup()
