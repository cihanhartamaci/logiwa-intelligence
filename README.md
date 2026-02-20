# Logiwa Integration Intelligence Agent

![Deploy Dashboard](https://github.com/cihanhartamaci/logiwa-intelligence/actions/workflows/deploy_dashboard.yml/badge.svg)
![Monitor Intelligence](https://github.com/cihanhartamaci/logiwa-intelligence/actions/workflows/monitor_intelligence.yml/badge.svg)

A comprehensive intelligence dashboard and automated monitoring agent for the Logiwa Integration Team.

## 🚀 Live Dashboard
View the latest integration readiness status here:
**[https://cihanhartamaci.github.io/logiwa-intelligence/](https://cihanhartamaci.github.io/logiwa-intelligence/)**

## 🛠️ Features
- **Automated Monitoring**: Daily scans of ERP, Carrier, and Marketplace release notes.
- **AI-Powered Analysis**: Uses LLM (Gemini/OpenAI) to classify updates based on Logiwa impact.
- **Instant Alerts**: High-priority updates are sent directly to Slack.
- **Weekly Reports**: Automated email digests summarizing all intelligence gathered.
- **Enterprise Dashboard**: A modern React-based UI to visualize integration readiness.

## ⚙️ Setup & Configuration
For detailed setup instructions, including how to configure API keys and Slack webhooks, see the [GitHub Setup Guide](.system/brain/github_setup_guide.md) or the [Walkthrough](.system/brain/walkthrough.md).

### Repository Secrets Required:
| Secret Name | Description |
| :--- | :--- |
| `GEMINI_API_KEY` | Logiwa's AI engine for analysis. |
| `SLACK_WEB_HOOK` | Webhook for the #integration-alerts channel. |

## 📦 Project Structure
- `monitor_agent.py`: The brain of the operation.
- `dashboard/`: React application for the web interface.
- `.github/workflows/`: Automation pipelines.
- `src/`: Modular logic for fetching and analyzing.

---
*Created for the Logiwa Integration Team.*
