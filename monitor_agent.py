import logging
import time
import os
import yaml
import schedule
import urllib.parse
from dotenv import load_dotenv
from src.date_utils import freshness_to_days, is_within_review_window, resolve_release_date
from src.status_utils import (
    normalize_impact_level,
    resolve_integration_status,
    should_include_in_digest,
    should_send_slack_alert,
)
from src.source_loader import load_default_sources
from src.fetcher import Fetcher
from src.llm_analyzer import LLMAnalyzer
from src.notifications import Notifier
from src.internal_reporter import InternalReporter
from src.firebase_manager import FirebaseManager

# Setup Logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("intelligence_bot.log"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger("Main")

def load_config():
    with open("config.yaml", "r") as f:
        return yaml.safe_load(f)

def job():
    logger.info("Starting Intelligence Cycle...")
    config = load_config()
    
    # Initialize Modules
    firebase = FirebaseManager()
    fetcher = Fetcher()
    analyzer = LLMAnalyzer(config)
    notifier = Notifier(config)
    
    # 0. Check System Config (Pause/Frequency)
    sys_config = firebase.get_system_config()
    if sys_config.get('is_paused'):
        logger.info("Workflow is PAUSED via dashboard. Skipping cycle.")
        return

    frequency = sys_config.get('frequency', 'Daily')
    last_run = sys_config.get('last_run')
    # Manual run bypass (triggered via Dashboard)
    pipeline_source = os.getenv("CI_PIPELINE_SOURCE", "")
    event_name = os.getenv("GITHUB_EVENT_NAME") or (
        "workflow_dispatch"
        if pipeline_source in ("web", "api", "trigger") or os.getenv("INTELLIGENCE_CYCLE") == "true"
        else "local"
    )
    is_manual = event_name == "workflow_dispatch"
    
    # Select freshness based on run type
    if is_manual:
        freshness = sys_config.get('manual_intelligence_freshness', '3 Months')
    else:
        freshness = sys_config.get('intelligence_freshness', '1 Month')
    
    logger.info(f"Event detected: {event_name}. Frequency: {frequency}. Manual Bypass: {is_manual}. Freshness: {freshness}")
    
    if last_run and frequency != 'Manual' and not is_manual:
        from datetime import datetime, timezone
        # last_run is usually already a datetime object from firebase-admin
        now = datetime.now(timezone.utc)
        # Ensure last_run is offset-aware for comparison
        if last_run.tzinfo is None:
            last_run = last_run.replace(tzinfo=timezone.utc)
            
        diff = now - last_run
        
        if frequency == 'Daily' and diff.total_seconds() < 22 * 3600:
            logger.info(f"Skipping: Daily frequency not met. Last run: {last_run}")
            return
        if frequency == 'Weekly' and diff.total_seconds() < 6 * 24 * 3600:
            logger.info(f"Skipping: Weekly frequency not met. Last run: {last_run}")
            return
        if frequency == 'Monthly' and diff.total_seconds() < 28 * 24 * 3600:
            logger.info(f"Skipping: Monthly frequency not met. Last run: {last_run}")
            return

    # 1. Fetch URLs (Prioritize Firestore)
    sources = firebase.get_monitored_urls()
    if not sources:
        logger.info("No URLs found in Firestore, falling back to sources.yaml")
        sources = load_default_sources()
    
    if not sources:
        logger.warning("No sources to monitor. Exiting.")
        return

    # 2. Fetch Updates
    updates = fetcher.check_sources(sources, force=is_manual)
    
    # 2.1 Fetch Manual Injections from Firestore (Custom Scraper Hooks)
    manual_entries = firebase.get_manual_injections()
    for entry in manual_entries:
        logger.info(f"Picked up manual injection: {entry['source']}")
        updates.append({
            "id": entry['id'],
            "source": entry['source'],
            "url": "Manual Injection",
            "content": entry['content'],
            "is_manual_injection": True
        })
    
    if not updates:
        logger.info("No new content changes detected.")
        firebase.record_cycle_run()
        return

    # 3. Analyze Updates
    alerts = []
    report_content = "# Intelligence Discovery Report\n\n"
    report_content += f"**Date:** {time.strftime('%Y-%m-%d %H:%M:%S')}\n\n"
    
    for update in updates:
        category = update.get('category', 'General')
        scopes = update.get('scopes')
        
        # If no explicit scopes, apply category-specific strict scope rules.
        # These map to the exact API areas Logiwa's integration team cares about.
        if not scopes:
            if category in ('Marketplaces', 'Marketplace', 'ERPs'):
                # Focus: core WMS-facing commerce endpoints
                scopes = [
                    'Orders API', 'Create Order', 'Update Order', 'Cancel Order',
                    'Products API', 'Product listing', 'Variant', 'SKU',
                    'Inventory API', 'Stock update', 'Fulfillment', 'Shipment notification',
                    'Receipt', 'Purchase Order', 'Receiving'
                ]
            elif category == 'Carriers':
                # Focus: shipping label lifecycle endpoints
                scopes = [
                    'Create Label', 'Void Label', 'Refund Label',
                    'Get Rate', 'Rate Shop', 'Tracking', 'Pickup',
                    'Manifest', 'End of Day', 'Address Validation'
                ]
            elif category == 'General':
                # Focus: authentication, webhooks, API versioning — infra-level changes
                scopes = [
                    'Authentication', 'OAuth', 'API Key', 'Webhook',
                    'Rate Limit', 'API versioning', 'Deprecation', 'Breaking change'
                ]
        logger.info(f"Analyzing update from: {update['source']} (Category: {category})")
        freshness_days = freshness_to_days(freshness)
        analysis = analyzer.analyze(
            update['content'],
            update['url'],
            freshness=freshness_days,
            scopes=scopes
        )

        # Always persist hash after analysis so irrelevant/stale items are not re-analyzed forever
        if firebase and update.get('new_hash'):
            firebase.update_url_hash(update['id'], update['new_hash'])

        if analysis.get('is_relevant'):
            resolved_release_date = resolve_release_date(analysis)
            if not is_within_review_window(resolved_release_date, freshness_days):
                logger.info(
                    f"Update from {update['source']} ({resolved_release_date}) is outside "
                    f"{freshness_days}-day window; skipping alert/status update."
                )
                continue

            resolved_status = resolve_integration_status(analysis, freshness_days)
            alert = {
                "source": update['source'],
                "url": analysis.get('source_url', update['url']),
                "summary": analysis['summary'],
                "details": analysis.get('details', []),
                "logiwa_impact": analysis.get('logiwa_impact', 'N/A'),
                "action_required": analysis.get('action_required', 'N/A'),
                "impact_level": analysis['impact_level'],
                "type": analysis['type'],
                "release_date": resolved_release_date,
                "exact_quote": analysis.get('exact_quote', ''),
                "resolved_status": resolved_status,
            }
            alerts.append(alert)
            
            # Sync Status back to Firestore if we have a source_id
            source_id = update.get('id')
            if firebase and source_id:
                impact_level = normalize_impact_level(analysis.get("impact_level"))
                status_data = {
                    "last_status": resolved_status,
                    "last_impact": analysis['type'],
                    "last_impact_level": impact_level,
                    "next_action": analysis.get('action_required', "Monitoring"),
                    "last_date": resolved_release_date,
                }
                logger.info(f"Updating Firestore status for {update['source']}...")
                if update.get('is_manual_injection'):
                    firebase.mark_manual_injection_processed(source_id)
                else:
                    firebase.update_url_status(source_id, status_data)

            # Format for the detailed report content
            
            deep_link = alert['url']
            if alert.get('exact_quote'):
                deep_link = f"{alert['url']}#:~:text={urllib.parse.quote(alert['exact_quote'])}"
            
            report_content += f"## {update['source']}\n"
            report_content += f"**Release Date:** {resolved_release_date} | **Type:** {analysis['type']} | **Impact:** {analysis['impact_level']}\n"
            report_content += f"**Source:** [View Documentation]({deep_link})\n\n"
            report_content += f"### Summary\n{analysis['summary']}\n\n"
            report_content += "### Technical Details\n"
            for detail in analysis.get('details', []):
                report_content += f"- {detail}\n"
            report_content += f"\n### Logiwa Impact\n{analysis.get('logiwa_impact')}\n\n"
            report_content += f"### ✅ Recommended Action\n> {analysis.get('action_required')}\n\n"
            report_content += "---\n\n"

            # 4. Immediate alerting: Slack for Action Required and Needs Review (High/Medium)
            if should_send_slack_alert(resolved_status):
                logger.info(f"{resolved_status} for {update['source']}. Sending Slack alert...")
                notifier.send_slack_alert(alert)
            else:
                logger.info(f"Status '{resolved_status}' does not require Slack alert.")

        logger.info("Sleeping 10s to respect Rate Limits...")
        time.sleep(10)

    # 5. Persistence (Save to Firestore)
    if alerts:
        # Generate Customer Facing Notes from the aggregate technical content
        logger.info("Generating professional customer-facing release notes...")
        customer_notes = analyzer.generate_customer_notes(report_content)

        firebase.save_report({
            "name": f"Intel Report - {time.strftime('%b %d, %Y')}",
            "content": report_content,
            "customer_content": customer_notes, # New field for Export Center
            "status": "Ready",
            "alert_count": len(alerts)
        })
        if not is_manual:
            digest_alerts = [alert for alert in alerts if should_include_in_digest(alert.get("resolved_status"))]
            if digest_alerts:
                notifier.send_digest_email(digest_alerts)
            else:
                logger.info("No Action Required / Needs Review items for digest email.")
        else:
            logger.info("Manual run: skipping digest email.")

    firebase.record_cycle_run()
    logger.info("Intelligence Cycle Completed.")

def run_internal_reporter():
    logger.info("Running Internal Progress Reporter...")
    config = load_config()
    reporter = InternalReporter(config)
    
    # In a real scenario, this might read from a file or API. 
    # For now, we assume a 'notes.txt' exists in the data directory.
    notes_path = "data/weekly_notes.txt"
    if os.path.exists(notes_path):
        with open(notes_path, "r", encoding="utf-8") as f:
            raw_notes = f.read()
        
        report_html = reporter.generate_report(raw_notes)
        notifier = Notifier(config)
        notifier.send_internal_report_email(report_html)
        
        # Renaissance: Clear notes after reporting?
        # open(notes_path, 'w').close() 
    else:
        logger.warning(f"No internal notes found at {notes_path}")

if __name__ == "__main__":
    load_dotenv()
    
    # Verify Environment Variables
    if not os.getenv("OPENAI_API_KEY") and not os.getenv("GOOGLE_API_KEY"):
        logger.warning("No LLM API Key found! Analysis will be failing.")

    # Check if running in CI (GitHub Actions or GitLab CI) — single run, no scheduler
    if os.getenv("GITHUB_ACTIONS") == "true" or os.getenv("GITLAB_CI") == "true":
        logger.info("Detected CI environment. Running one-time cycle...")
        job()
        # Optional: Run reporter if it's Friday in UTC? 
        # For now, just run the main job.
        logger.info("CI Run Completed. Exiting.")
    else:
        # Schedule
        # Run Intelligence Check every day at 09:00
        schedule.every().day.at("09:00").do(job)
        
        # Run Internal Reporter every Friday at 16:00
        schedule.every().friday.at("16:00").do(run_internal_reporter)
        
        logger.info("Logiwa Intelligence Bot Started. Waiting for schedule...")
        
        while True:
            schedule.run_pending()
            time.sleep(60)

