import logging
import os
from jinja2 import Environment, FileSystemLoader
from src.llm_analyzer import LLMAnalyzer

logger = logging.getLogger("InternalReporter")

class InternalReporter:
    def __init__(self, config):
        self.config = config
        self.analyzer = LLMAnalyzer(config) # Reuse LLM logic
        self.template_dir = "templates"
        self.env = Environment(loader=FileSystemLoader(self.template_dir))

    def generate_report(self, raw_notes):
        """
        Takes raw text notes and returns a polished HTML report.
        """
        logger.info("Generating internal report from raw notes...")
        
        # 1. Use LLM to structure the data
        structured_data = self._process_notes_with_llm(raw_notes)
        
        if not structured_data:
            logger.error("Failed to process notes with LLM.")
            return "<p>Error generating report.</p>"

        # 2. Render HTML
        try:
            template = self.env.get_template("progress_email_template.html")
            return template.render(
                week_date="Feb 4-11, 2026", # Dynamic date in real app
                summary=structured_data.get('executive_summary', 'No summary available.'),
                completed_items=structured_data.get('completed', []),
                in_progress_items=structured_data.get('in_progress', []),
                risks=structured_data.get('risks', [])
            )
        except Exception as e:
            logger.error(f"Template rendering failed: {e}")
            return "<p>Error rendering report template.</p>"

    def _process_notes_with_llm(self, notes):
        prompt = f"""
        You are an Executive Assistant for the Logiwa Integration Team.
        Process the following raw engineering notes into a structured JSON for a Weekly Report.
        
        RAW NOTES:
        {notes}
        
        Task:
        1. Write a professional 'executive_summary' (2-3 sentences).
        2. Categorize items into 'completed', 'in_progress', and 'risks'.
        3. Polish the language of each item to be business-professional.
        
        Output JSON format:
        {{
            "executive_summary": "...",
            "completed": ["Item 1", "Item 2"],
            "in_progress": ["Item 3"],
            "risks": ["Risk 1"]
        }}
        """
        
        # Reusing the analyzer's provider logic for simplicity, though we might want a dedicated method in LLMAnalyzer
        # Here we duplicate the calling logic slightly for the specific prompt.
        try:
            if not self.analyzer.client:
                return None

            response_text = ""
            if self.analyzer.provider == 'openai':
                response = self.analyzer.client.chat.completions.create(
                    model=self.analyzer.model,
                    messages=[{"role": "user", "content": prompt}],
                    response_format={ "type": "json_object" }
                )
                response_text = response.choices[0].message.content
            elif self.analyzer.provider == 'gemini':
                model = self.analyzer.client.GenerativeModel('gemini-pro')
                response = model.generate_content(prompt)
                response_text = response.text

            import json
            return json.loads(response_text)
            
        except Exception as e:
            logger.error(f"LLM Processing of notes failed: {e}")
            return None
