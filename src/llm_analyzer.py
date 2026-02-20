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
        
    def analyze(self, content):
        prompt = f"""
        You are an Integration Architect for Logiwa WMS. Analyze the following update text for deep technical impact.
        
        TEXT:
        {content[:6000]} # Increased context limit
        
        Your analysis must be detailed and professional.
        
        Task:
        1. 'summary': 1-2 sentence overview.
        2. 'details': A detailed list of specific technical updates (e.g. "Endpoint X is deprecated", "New field Y added to JSON").
        3. 'logiwa_impact': Specific analysis on how this affects Logiwa's standard integration logic.
        4. 'action_required': Specific technical steps the engineering team must take (e.g. "Migrate to OAuth 2.0", "Update payload schema").
        5. 'impact_level': High (Breaking), Medium (New Risk/Capability), Low (Info).
        6. 'type': Breaking Change, New Capability, Maintenance, Info.
        7. 'is_relevant': Boolean. Is it relevant to WMS/Shipping/Ecommerce?
        
        Output JSON format:
        {{
            "summary": "...",
            "details": ["...", "..."],
            "logiwa_impact": "...",
            "action_required": "...",
            "impact_level": "High/Medium/Low", // MUST be exactly one of these three strings
            "type": "...",
            "is_relevant": true
        }}
        """

        
        try:
            if not self.client:
                return {"summary": "No LLM Client", "impact_level": "Low", "type": "Error", "is_relevant": False}


            response_text = ""
            # Fallback strategy: Rotate through models if one hits a rate limit
            # Note: Quotas are often per-model, so switching helps.
            gemini_fallbacks = [self.model, "pollinations"]
            
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
                            response_text = data['choices'][0]['message']['content']
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
            cleaned_text = response_text.replace("```json", "").replace("```", "").strip()
            if not cleaned_text.startswith("{"): 
                 # Sometimes safety filters return empty or weird text
                 logger.warning(f"Invalid JSON response: {cleaned_text}")
                 return {"summary": "Invalid LLM Response", "impact_level": "Low", "type": "Error", "is_relevant": False}
                 
            return json.loads(cleaned_text)
            
        except Exception as e:
            logger.error(f"LLM Analysis failed: {e}")
            return {
                "summary": "Analysis Failed",
                "impact_level": "Low", 
                "type": "Error",
                "is_relevant": False
            }
