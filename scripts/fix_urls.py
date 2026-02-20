"""
Fixes broken URLs in Firestore and optionally resets state so the bot detects "new" content.
Usage: python scripts/fix_urls.py
"""
import sys
import os
sys.stdout.reconfigure(encoding='utf-8')
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from src.firebase_manager import FirebaseManager

# Correct, verified URLs for all 8 integrations
CORRECT_SOURCES = [
    {
        "name": "NetSuite Release Notes",
        "url": "https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/section_n3441190.html",
        "category": "ERPs"
    },
    {
        "name": "Shopify Changelog",
        "url": "https://shopify.dev/changelog",
        "category": "Marketplaces"
    },
    {
        "name": "Shippo Changelog",
        "url": "https://goshippo.com/docs/changelog/",
        "category": "Carriers"
    },
    {
        "name": "FedEx Announcements",
        "url": "https://developer.fedex.com/api/en-us/announcements.html",
        "category": "Carriers"
    },
    {
        "name": "Amazon SP-API Blog",
        "url": "https://developer-docs.amazon.com/sp-api/blog",
        "category": "Marketplaces"
    },
    {
        "name": "Walmart Developer News",
        "url": "https://developer.walmart.com/news",
        "category": "Marketplaces"
    },
    {
        "name": "TikTok Shop Changelog",
        # TikTok blocks bots, using GitHub releases as proxy
        "url": "https://github.com/topics/tiktok-shop-api",
        "category": "Marketplaces"
    },
    {
        "name": "Etsy Open API Releases",
        "url": "https://github.com/etsy/open-api/releases",
        "category": "Marketplaces"
    },
]

def fix_urls():
    print("Connecting to Firestore...")
    firebase = FirebaseManager()
    if not firebase.db:
        print("ERROR: Could not connect to Firestore.")
        return

    docs_ref = firebase.db.collection("monitored_urls")
    all_docs = list(docs_ref.stream())

    print(f"Found {len(all_docs)} documents in Firestore.")

    # Build index by name
    existing = {doc.to_dict().get("name"): doc.id for doc in all_docs}

    for source in CORRECT_SOURCES:
        if source["name"] in existing:
            doc_id = existing[source["name"]]
            docs_ref.document(doc_id).update({"url": source["url"]})
            print(f"  Updated: {source['name']} -> {source['url']}")
        else:
            docs_ref.add(source)
            print(f"  Added: {source['name']}")

    print("\nAll URLs fixed. Now resetting state.json so the bot will re-scan everything...")
    state_path = "data/state.json"
    if os.path.exists(state_path):
        os.remove(state_path)
        print(f"  Deleted {state_path}")
    print("\nDone! Run 'Run Intelligence Cycle' from the dashboard to get fresh results.")

if __name__ == "__main__":
    fix_urls()
