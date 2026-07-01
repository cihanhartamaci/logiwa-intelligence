import sys
import os
sys.stdout.reconfigure(encoding='utf-8')

# Add parent directory to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from src.firebase_manager import FirebaseManager
from src.source_loader import load_default_sources

def seed():
    print("Initializing Logiwa Intelligence Database Seeding...")

    if not os.path.exists("serviceAccountKey.json"):
        print("ERROR: serviceAccountKey.json not found in the root directory.")
        print("Please follow the Firebase Setup Guide to create this file.")
        return

    firebase = FirebaseManager()
    if not firebase.db:
        print("ERROR: Could not initialize Firestore. Check your credentials.")
        return

    defaults = load_default_sources()
    print(f"Found {len(defaults)} default sources to seed.")

    existing_urls = firebase.get_monitored_urls()
    existing_names = [u['name'] for u in existing_urls]

    count = 0
    for source in defaults:
        if source['name'] not in existing_names:
            print(f"Adding: {source['name']}...")
            firebase.db.collection("monitored_urls").add(source)
            count += 1
        else:
            print(f"Skipping (already exists): {source['name']}")

    print(f"Seeding Complete. Added {count} new sources to your Firestore.")

if __name__ == "__main__":
    seed()
