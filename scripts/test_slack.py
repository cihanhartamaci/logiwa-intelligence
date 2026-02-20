"""
Run this script to test if your Slack webhook URL is configured correctly.
Usage: python scripts/test_slack.py
"""
import os
import sys
import requests
from dotenv import load_dotenv

load_dotenv()

webhook_url = os.getenv("SLACK_WEBHOOK_URL")

if not webhook_url:
    print("ERROR: SLACK_WEBHOOK_URL not found in your .env file")
    print("Add this line to .env:  SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...")
    sys.exit(1)

print(f"Testing webhook: {webhook_url[:50]}...")

payload = {
    "text": ":white_check_mark: *Logiwa Intelligence Bot* - Slack webhook test successful! Notifications are working."
}

response = requests.post(webhook_url, json=payload, timeout=10)

if response.status_code == 200 and response.text == "ok":
    print("SUCCESS: Slack message sent! Check your Slack channel.")
else:
    print(f"FAILED: Status={response.status_code}, Response={response.text}")
    print("\nCommon causes:")
    print("  - Webhook URL is expired or revoked")
    print("  - Wrong URL format (should start with https://hooks.slack.com/)")
    print("  - Channel was deleted or bot was removed")
