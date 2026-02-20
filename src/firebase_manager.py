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
        try:
            # We look for GOOGLE_APPLICATION_CREDENTIALS path or a local serviceAccountKey.json
            service_account_path = os.getenv("FIREBASE_SERVICE_ACCOUNT_JSON", "serviceAccountKey.json")
            
            if os.path.exists(service_account_path):
                cred = credentials.Certificate(service_account_path)
                firebase_admin.initialize_app(cred)
                self.db = firestore.client()
                logger.info("Firebase initialized with Service Account JSON.")
            else:
                logger.warning(f"Firebase Service Account JSON not found at {service_account_path}. Firestore features will be disabled.")
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
