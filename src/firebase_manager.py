import firebase_admin
from firebase_admin import credentials, firestore
import os
import logging
from datetime import datetime

logger = logging.getLogger("FirebaseManager")

class FirebaseManager:
    def __init__(self):
        self.db = None
        self._initialize()

    def _initialize(self):
        # Avoid re-initializing if already done
        if firebase_admin._apps:
            self.db = firestore.client()
            return
        try:
            # 1. GitHub Actions: FIREBASE_SERVICE_ACCOUNT_JSON is a full JSON string
            sa_json = os.getenv("FIREBASE_SERVICE_ACCOUNT_JSON")
            if sa_json:
                import json
                sa_dict = json.loads(sa_json)
                cred = credentials.Certificate(sa_dict)
                firebase_admin.initialize_app(cred)
                self.db = firestore.client()
                logger.info("Firebase initialized from JSON env variable.")
                return

            # 2. Local dev: serviceAccountKey.json file
            sa_path = "serviceAccountKey.json"
            if os.path.exists(sa_path):
                cred = credentials.Certificate(sa_path)
                firebase_admin.initialize_app(cred)
                self.db = firestore.client()
                logger.info("Firebase initialized from serviceAccountKey.json file.")
                return

            logger.warning("No Firebase credentials found. Firestore features will be disabled.")
        except Exception as e:
            logger.error(f"Failed to initialize Firebase: {e}")

    def get_monitored_urls(self):
        if not self.db:
            return []
        
        try:
            docs = self.db.collection("monitored_urls").stream()
            urls = []
            for doc in docs:
                data = doc.to_dict()
                urls.append({
                    "id": doc.id,
                    "name": data.get("name"),
                    "url": data.get("url"),
                    "category": data.get("category", "General")
                })
            return urls
        except Exception as e:
            logger.error(f"Error fetching URLs from Firestore: {e}")
            return []

    def update_url_status(self, url_id, status_data):
        """
        Updates the status fields for a specific monitored URL.
        status_data: dict with last_status, last_impact, next_action
        """
        if not self.db:
            return
        
        try:
            self.db.collection("monitored_urls").document(url_id).update(status_data)
            logger.info(f"Updated Firestore status for {url_id}")
        except Exception as e:
            logger.error(f"Error updating URL status in Firestore: {e}")

    def save_report(self, report_data):
        if not self.db:
            return
        
        try:
            # report_data should be a dict with name, content, timestamp, etc.
            self.db.collection("intel_reports").add({
                **report_data,
                "timestamp": firestore.SERVER_TIMESTAMP
            })
            logger.info("Intelligence report saved to Firestore.")
        except Exception as e:
            logger.error(f"Error saving report to Firestore: {e}")
