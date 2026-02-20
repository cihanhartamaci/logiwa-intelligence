import logging
import os
import requests
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

logger = logging.getLogger("Notifier")

class Notifier:
    def __init__(self, config):
        self.config = config['notifications']
        self.slack_webhook = os.getenv(self.config['slack']['webhook_url_env'])
        
        self.smtp_server = self.config['email']['smtp_server']
        self.smtp_port = self.config['email']['smtp_port']
        self.sender_email = os.getenv(self.config['email']['sender_email_env'])
        self.sender_password = os.getenv(self.config['email']['sender_password_env'])
        self.recipients = self.config['email']['recipients']

    def send_slack_alert(self, alert):
        if not self.config['slack']['enabled'] or not self.slack_webhook:
            logger.warning("Slack notification skipped (Disabled or missing WebhookURL)")
            return

        color = "#FF0000" if alert['impact_level'] == 'High' else "#FFA500"
        payload = {
            "attachments": [
                {
                    "color": color,
                    "pretext": f"🚨 *Integration Alert: {alert['source']}*",
                    "title": alert['type'],
                    "title_link": alert['url'],
                    "text": f"*{alert['impact_level']} Impact*\n{alert['summary']}"
                }
            ]
        }
        
        try:
            requests.post(self.slack_webhook, json=payload)
            logger.info(f"Sent Slack alert for {alert['source']}")
        except Exception as e:
            logger.error(f"Failed to send Slack alert: {e}")

    def send_weekly_email(self, alerts):
        if not self.config['email']['enabled'] or not self.sender_email:
            logger.warning("Email notification skipped (Disabled or missing credentials)")
            return

        subject = f"📊 Weekly Integration Intelligence Report ({len(alerts)} items)"
        
        body = "<h1>Weekly Integration Updates</h1><ul>"
        for alert in alerts:
            icon = "🔴" if alert['impact_level'] == 'High' else "🟡"
            body += f"<li>{icon} <b>{alert['source']}</b>: {alert['summary']} (<a href='{alert['url']}'>Link</a>)</li>"
        body += "</ul>"

        self._send_email(subject, body, self.recipients)

    def send_internal_report_email(self, html_content):
         if not self.config['email']['enabled']:
            return
         self._send_email("🗓️ Internal Integration Progress Update", html_content, self.recipients)

    def _send_email(self, subject, html_body, recipients):
        msg = MIMEMultipart()
        msg['From'] = self.sender_email
        msg['To'] = ", ".join(recipients)
        msg['Subject'] = subject
        msg.attach(MIMEText(html_body, 'html'))

        try:
            server = smtplib.SMTP(self.smtp_server, self.smtp_port)
            server.starttls()
            server.login(self.sender_email, self.sender_password)
            server.send_message(msg)
            server.quit()
            logger.info(f"Sent email to {recipients}")
        except Exception as e:
            logger.error(f"Failed to send email: {e}")
