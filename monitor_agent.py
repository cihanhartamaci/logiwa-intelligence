import logging
import time
import os
import yaml
import schedule
from dotenv import load_dotenv
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
    event_name = os.getenv("GITHUB_EVENT_NAME", "local")
    is_manual = event_name == "workflow_dispatch"
    
    logger.info(f"Event detected: {event_name}. Frequency: {frequency}. Manual Bypass: {is_manual}")
    
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
        logger.info("No URLs found in Firestore, falling back to config.yaml")
        sources = config.get('sources', [])
    
    if not sources:
        logger.warning("No sources to monitor. Exiting.")
        return

    # 2. Fetch Updates
    updates = fetcher.check_sources(sources)
    
    if not updates:
        logger.info("No new content changes detected.")
        return

    # 3. Analyze Updates
    alerts = []
    report_content = "# Intelligence Discovery Report\n\n"
    report_content += f"**Date:** {time.strftime('%Y-%m-%d %H:%M:%S')}\n\n"
    
    for update in updates:
        logger.info(f"Analyzing update from: {update['source']}")
        analysis = analyzer.analyze(update['content'])
        
        if analysis.get('is_relevant'):
            alert = {
                "source": update['source'],
                "url": update['url'],
                "summary": analysis['summary'],
                "details": analysis.get('details', []),
                "logiwa_impact": analysis.get('logiwa_impact', 'N/A'),
                "action_required": analysis.get('action_required', 'N/A'),
                "impact_level": analysis['impact_level'],
                "type": analysis['type']
            }
            alerts.append(alert)
            
            # Sync Status back to Firestore if we have a source_id
            source_id = update.get('id')
            if firebase and source_id:
                status_map = {
                    "High": "Action Required",
                    "Medium": "Needs Review",
                    "Low": "Ready"
                }
                status_data = {
                    "last_status": status_map.get(analysis['impact_level'], "Ready"),
                    "last_impact": analysis['type'],
                    "next_action": analysis.get('action_required', "Monitoring")
                }
                logger.info(f"Updating Firestore status for {update['source']}...")
                firebase.update_url_status(source_id, status_data)

            # Format for the detailed report content
            report_content += f"## {update['source']}\n"
            report_content += f"**Type:** {analysis['type']} | **Impact:** {analysis['impact_level']}\n\n"
            report_content += f"### Summary\n{analysis['summary']}\n\n"
            report_content += "### Technical Details\n"
            for detail in analysis.get('details', []):
                report_content += f"- {detail}\n"
            report_content += f"\n### Logiwa Impact\n{analysis.get('logiwa_impact')}\n\n"
            report_content += f"### Action Required\n{analysis.get('action_required')}\n\n"
            report_content += "---\n\n"

            # 4. Immediate Alerting (if High or Medium Impact)
            impact_check = str(analysis.get('impact_level', '')).lower()
            if 'high' in impact_check or 'medium' in impact_check:
                logger.info(f"High/Medium impact detected ({analysis['impact_level']}). Sending Slack alert...")
                notifier.send_slack_alert(alert)
            else:
                logger.info(f"Impact level '{analysis['impact_level']}' below threshold. Skipping Slack alert.")

        logger.info("Sleeping 10s to respect Rate Limits...")
        time.sleep(10)

    # 5. Persistence (Save to Firestore)
    if alerts:
        firebase.save_report({
            "name": f"Intel Report - {time.strftime('%b %d, %Y')}",
            "content": report_content,
            "status": "Ready",
            "alert_count": len(alerts)
        })
        notifier.send_weekly_email(alerts)
    
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

    # Check if running in GitHub Actions (Single Run)
    if os.getenv("GITHUB_ACTIONS") == "true":
        logger.info("Detected GitHub Actions environment. Running one-time cycle...")
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

