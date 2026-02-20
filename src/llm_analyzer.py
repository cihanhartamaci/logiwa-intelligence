import logging
import os
from openai import OpenAI
import requests
import google.generativeai as genai

logger = logging.getLogger("LLMAnalyzer")

class LLMAnalyzer:
    def __init__(self, config):
        self.provider = config.get('llm_provider', 'openai')
        self.model = config.get('llm_model', 'gpt-4-turbo-preview')
        
        if self.provider == 'openai':
            api_key = os.getenv("OPENAI_API_KEY")
            if api_key:
                self.client = OpenAI(api_key=api_key)
            else:
                logger.error("No OpenAI API Key found.")
                self.client = None
        elif self.provider == 'gemini':
            api_key = os.getenv("GOOGLE_API_KEY")
            if api_key:
                genai.configure(api_key=api_key)
                self.client = genai
            else:
                logger.error("No Google API Key found.")
                self.client = None
        else:
            self.client = None
        
    def analyze(self, content, freshness=30):
        import datetime
        today = datetime.datetime.now().strftime("%Y-%m-%d")
        
        prompt = f"""
        You are an Integration Architect for Logiwa WMS. Analyze the following update text for deep technical impact.
        
        TODAY'S DATE: {today}
        
        TEXT:
        {content[:6000]} # Increased context limit
        
        Your analysis must be detailed and professional.
        
        DATE FILTERING RULE:
        - If the technical update, release note, or fix is dated MORE THAN {freshness} AGO from TODAY'S DATE ({today}), you MUST set 'is_relevant': false.
        - We only ignore older stuff. We want fresh intelligence from the defined freshness period ({freshness}).
        
        Task:
        1. 'summary': 1-2 sentence overview.
        2. 'details': A detailed list of specific technical updates (e.g. "Endpoint X is deprecated", "New field Y added to JSON").
        3. 'logiwa_impact': Specific analysis on how this affects Logiwa's standard integration logic.
        4. 'action_required': Specific technical steps the engineering team must take (e.g. "Migrate to OAuth 2.0", "Update payload schema").
        5. 'impact_level': High (Breaking), Medium (New Risk/Capability), Low (Info).
        6. 'type': Breaking Change, New Capability, Maintenance, Info.
        7. 'release_date': The date of the update/release (e.g. "2026-02-20"). If not found, use N/A.
        8. 'is_relevant': Boolean. Is it relevant to WMS/Shipping/Ecommerce AND within the last {freshness}?
        
        Output JSON format:
        {{
            "summary": "...",
            "details": ["...", "..."],
            "logiwa_impact": "...",
            "action_required": "...",
            "impact_level": "High/Medium/Low",
            "type": "...",
            "release_date": "YYYY-MM-DD",
            "is_relevant": true
        }}
        """

        
        try:
            if not self.client:
                return {"summary": "No LLM Client", "impact_level": "Low", "type": "Error", "is_relevant": False}


            response_text = ""
            # Fallback strategy: Rotate through models if one hits a rate limit
            gemini_fallbacks = [self.model, "gemini-1.5-flash", "gemini-1.5-pro", "pollinations"]
            
            # If not using Gemini, just retry the same model
            if self.provider != 'gemini':
                gemini_fallbacks = [self.model]

            max_retries = len(gemini_fallbacks) * 2 # Allow 2 tries per model
            retry_count = 0
            model_index = 0
            import time

            while retry_count < max_retries:
                # Pick current model from rotation
                current_model_name = gemini_fallbacks[model_index % len(gemini_fallbacks)]
                
                try:
                    if current_model_name == 'pollinations':
                        logger.info("Fallback: Calling Pollinations.ai (Free Backup)...")
                        # Pollinations AI - OpenAI Compatible Endpoint
                        # Docs: https://github.com/pollinations/pollinations/blob/master/APIDOCS.md
                        resp = requests.post(
                            "https://text.pollinations.ai/openai/chat/completions",
                            headers={"Content-Type": "application/json"},
                            json={
                                "model": "openai", # Generic model selector
                                "messages": [{"role": "user", "content": prompt}],
                                "temperature": 0.1
                            },
                            timeout=30
                        )
                        if resp.status_code == 200:
                            data = resp.json()
                            if isinstance(data, dict) and 'choices' in data:
                                response_text = data['choices'][0]['message']['content']
                            else:
                                # Sometimes pollinations returns direct text if the proxy is bypassed
                                response_text = resp.text
                            break
                        else:
                            raise Exception(f"Pollinations Error: {resp.status_code} - {resp.text}")

                    elif self.provider == 'openai':
                        response = self.client.chat.completions.create(
                            model=self.model, 
                            messages=[{"role": "user", "content": prompt}],
                            response_format={ "type": "json_object" }
                        )
                        response_text = response.choices[0].message.content
                        break # Success
                        
                    elif self.provider == 'gemini':
                        logger.info(f"Attempting analysis with model: {current_model_name}")
                        model = self.client.GenerativeModel(current_model_name)
                        response = model.generate_content(prompt)
                        response_text = response.text
                        break # Success
                
                except Exception as e:
                    error_str = str(e)
                    # Pollinations errors or Gemini Quota errors triggers retry
                    if "429" in error_str or "quota" in error_str.lower() or "Pollinations Error" in error_str:
                        retry_count += 1
                        # Switch to next model
                        model_index += 1
                        next_model = gemini_fallbacks[model_index % len(gemini_fallbacks)]
                        
                        wait_time = 5 # Short wait when switching models
                        logger.warning(f"Error on {current_model_name} ({e}). Switching to {next_model} in {wait_time}s...")
                        time.sleep(wait_time)
                    else:
                        logger.error(f"Non-retriable error: {e}")
                        raise e # Not a rate limit error, re-raise

            if not response_text:
                 return {
                    "summary": "Analysis Failed (All models exhausted)",
                    "impact_level": "Low", 
                    "type": "Error", 
                    "is_relevant": False
                 }

            import json
            import re
            
            # Robust JSON extraction: find first '{' and last '}'
            match = re.search(r'(\{.*\})', response_text, re.DOTALL)
            if match:
                cleaned_text = match.group(1).strip()
            else:
                cleaned_text = response_text.replace("```json", "").replace("```", "").replace("***", "").strip()

            if not cleaned_text.startswith("{"): 
                 logger.warning(f"Invalid JSON response structure: {cleaned_text[:100]}...")
                 return {"summary": "Invalid LLM Response Format", "impact_level": "Low", "type": "Error", "is_relevant": False}
                 
            try:
                return json.loads(cleaned_text)
            except json.JSONDecodeError as e:
                logger.error(f"JSON Decode Error: {e}. Raw: {cleaned_text[:200]}")
                return {"summary": "JSON Parsing Error", "impact_level": "Low", "type": "Error", "is_relevant": False}
            
        except Exception as e:
            logger.error(f"LLM Analysis failed: {e}")
            return {
                "summary": "Analysis Failed",
                "impact_level": "Low", 
                "type": "Error",
                "is_relevant": False
            }
