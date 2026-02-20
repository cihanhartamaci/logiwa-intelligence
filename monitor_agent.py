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
    fetcher = Fetcher()
    analyzer = LLMAnalyzer(config)
    notifier = Notifier(config)
    
    # 1. Fetch Updates
    updates = fetcher.check_sources(config['sources'])
    
    if not updates:
        logger.info("No new content changes detected.")
        return

    # 2. Analyze Updates
    alerts = []
    for update in updates:
        logger.info(f"Analyzing update from: {update['source']}")
        analysis = analyzer.analyze(update['content'])
        
        if analysis['is_relevant']:
            alert = {
                "source": update['source'],
                "url": update['url'],
                "summary": analysis['summary'],
                "impact_level": analysis['impact_level'], # High, Medium, Low
                "type": analysis['type'] # Breaking Change, Maintenance, etc.
            }
            alerts.append(alert)
            
            # 3. Immediate Alerting (if High or Medium Impact)
            if analysis['impact_level'] in ['High', 'Medium']:
                notifier.send_slack_alert(alert)

        # Throttling to avoid Gemini Rate Limits (Free Tier)
        logger.info("Sleeping 15s to respect Rate Limits...")
        time.sleep(15)

    # 4. Weekly Summary (if any alerts exists)
    if alerts:
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

    # Schedule
    # Run Intelligence Check every day at 09:00
    schedule.every().day.at("09:00").do(job)
    
    # Run Internal Reporter every Friday at 16:00
    schedule.every().friday.at("16:00").do(run_internal_reporter)
    
    logger.info("Logiwa Intelligence Bot Started. Waiting for schedule...")
    
    # Initial run for testing (Comment out in production)
    # job()
    
    while True:
        schedule.run_pending()
        time.sleep(60)
