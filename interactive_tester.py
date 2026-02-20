import logging
import sys
import os
from dotenv import load_dotenv

# Load env vars immediately
load_dotenv()

# Ensure we can import from the current directory
sys.path.append(os.getcwd())

from monitor_agent import job, run_internal_reporter, load_config
from src.notifications import Notifier
from src.internal_reporter import InternalReporter

# Configure logging to show everything in the console
logging.getLogger().setLevel(logging.INFO)

def print_menu():
    print("\n" + "="*40)
    print(" 🤖 Logiwa Intelligence - Interactive Tester")
    print("="*40)
    print("1. Run Full Monitoring Cycle (External Checks)")
    print("2. Generate Internal Report (from weekly_notes.txt)")
    print("3. Enter Custom Note & Generate Report (Validates 'Update Entry')")
    print("4. Send Test Slack/Email Alert")
    print("q. Quit")
    print("="*40)

def manual_note_entry():
    print("\n📝 Enter your progress updates (Type 'END' on a new line to finish):")
    lines = []
    while True:
        line = input("> ")
        if line.strip() == "END":
            break
        lines.append(line)
    
    raw_notes = "\n".join(lines)
    print("\n⏳ Processing with LLM...")
    
    config = load_config()
    reporter = InternalReporter(config)
    report_html = reporter.generate_report(raw_notes)
    
    print("\n✅ Report Generated! Sending to email...")
    notifier = Notifier(config)
    notifier.send_internal_report_email(report_html)
    print("📧 Check your inbox!")

def send_test_alert():
    print("\n📢 Sending Test Alert...")
    config = load_config()
    notifier = Notifier(config)
    
    test_alert = {
        "source": "Interactive Tester",
        "url": "http://localhost",
        "summary": "This is a test alert to verify Slack and Email connectivity.",
        "impact_level": "High",
        "type": "Test Alert"
    }
    
    notifier.send_slack_alert(test_alert)
    notifier.send_weekly_email([test_alert])
    print("✅ Test commands sent.")

if __name__ == "__main__":
    while True:
        print_menu()
        choice = input("Select an option: ")
        
        if choice == "1":
            print("\n🚀 Starting Full Monitoring Cycle...")
            job()
        elif choice == "2":
            print("\n📄 Generating Report from 'data/weekly_notes.txt'...")
            run_internal_reporter()
        elif choice == "3":
            manual_note_entry()
        elif choice == "4":
            send_test_alert()
        elif choice.lower() == "q":
            print("Bye!")
            sys.exit()
        else:
            print("Invalid option.")
