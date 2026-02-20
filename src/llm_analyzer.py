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
            # 3-Tier Fallback Strategy:
            # Tier 1: Gemini (Flash, Flash-8b, Pro)
            # Tier 2: Pollinations.ai (Main Model)
            # Tier 3: Pollinations.ai (Alternative Model)
            fallbacks = [
                {"provider": "gemini", "model": self.model},
                {"provider": "gemini", "model": "gemini-1.5-flash-latest"},
                {"provider": "gemini", "model": "gemini-1.5-flash-8b-latest"},
                {"provider": "gemini", "model": "gemini-1.5-pro-latest"},
                {"provider": "pollinations", "model": "openai"}, # GPT-4o-mini proxy
                {"provider": "pollinations", "model": "mistral-large"}, # Mistral backup
                {"provider": "pollinations", "model": "llama"} # Llama backup
            ]
            
            # If not using Gemini initially, adjust list
            if self.provider != 'gemini':
                fallbacks = [{"provider": self.provider, "model": self.model}] + [f for f in fallbacks if f['provider'] == 'pollinations']

            max_retries = len(fallbacks)
            retry_count = 0
            import time

            while retry_count < max_retries:
                current = fallbacks[retry_count]
                current_provider = current['provider']
                current_model = current['model']
                
                try:
                    if current_provider == 'pollinations':
                        logger.info(f"Tier {retry_count+1}: Calling Pollinations.ai ({current_model})...")
                        resp = requests.post(
                            "https://text.pollinations.ai/openai/chat/completions",
                            headers={"Content-Type": "application/json"},
                            json={
                                "model": current_model,
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
                                response_text = resp.text
                            if response_text: break
                        else:
                            raise Exception(f"Pollinations Error: {resp.status_code}")

                    elif current_provider == 'openai':
                        response = self.client.chat.completions.create(
                            model=current_model, 
                            messages=[{"role": "user", "content": prompt}],
                            response_format={ "type": "json_object" }
                        )
                        response_text = response.choices[0].message.content
                        break
                        
                    elif current_provider == 'gemini':
                        logger.info(f"Tier {retry_count+1}: Attempting Gemini with model: {current_model}")
                        model = self.client.GenerativeModel(current_model)
                        response = model.generate_content(prompt)
                        response_text = response.text
                        break
                
                except Exception as e:
                    error_str = str(e)
                    retry_count += 1
                    if retry_count < max_retries:
                        # "Beklemeden" fallback for 429/404
                        wait_time = 2 if ("429" in error_str or "quota" in error_str.lower() or "404" in error_str) else 5
                        logger.warning(f"Error on {current_model}: {e}. Switching to Tier {retry_count+1} in {wait_time}s...")
                        time.sleep(wait_time)
                    else:
                        logger.error(f"All tiers failed. Final error: {e}")

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
