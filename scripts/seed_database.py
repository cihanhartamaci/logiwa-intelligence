import firebase_admin
from firebase_admin import credentials, firestore
import os
import sys

# Add current directory to path to import FirebaseManager
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from src.firebase_manager import FirebaseManager

def seed():
    print("🚀 Initializing Logiwa Intelligence Database Seeding...")
    
    # Ensure service account key exists
    if not os.path.exists("serviceAccountKey.json"):
        print("❌ Error: serviceAccountKey.json not found in the root directory.")
        print("Please follow the Firebase Setup Guide to create this file.")
        return

    firebase = FirebaseManager()
    if not firebase.db:
        print("❌ Error: Could not initialize Firestore. Check your credentials.")
        return

    defaults = [
        { "name": "NetSuite Release Notes", "url": "https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/latest-release.html", "category": "ERPs" },
        { "name": "Shopify Changelog", "url": "https://shopify.dev/changelog", "category": "Marketplaces" },
        { "name": "Shippo Changelog", "url": "https://goshippo.com/docs/changelog/", "category": "Carriers" },
        { "name": "FedEx Announcements", "url": "https://developer.fedex.com/api/en-us/announcements.html", "category": "Carriers" },
        { "name": "Amazon SP-API Blog", "url": "https://developer-docs.amazon.com/sp-api/blog", "category": "Marketplaces" },
        { "name": "Walmart Developer News", "url": "https://developer.walmart.com/news", "category": "Marketplaces" },
        { "name": "TikTok Shop News", "url": "https://developers.tiktok-shops.com/documents/news", "category": "Marketplaces" },
        { "name": "Etsy Developer News", "url": "https://www.etsy.com/developers/news", "category": "Marketplaces" }
    ]

    print(f"📦 Found {len(defaults)} default sources to seed.")
    
    # Check existing URLs to avoid duplicates (optional but good)
    existing_urls = firebase.get_monitored_urls()
    existing_names = [u['name'] for u in existing_urls]

    count = 0
    for source in defaults:
        if source['name'] not in existing_names:
            print(f"➕ Adding: {source['name']}...")
            firebase.db.collection("monitored_urls").add(source)
            count += 1
        else:
            print(f"⏭️ Skipping (already exists): {source['name']}")

    print(f"✅ Seeding Complete. Added {count} new templates to your Firestore.")

if __name__ == "__main__":
    seed()
