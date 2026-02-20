import requests
from bs4 import BeautifulSoup
import logging
import hashlib

import json
import os

logger = logging.getLogger("Fetcher")

class Fetcher:
    def __init__(self, state_path="data/state.json"):
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
        self.state_path = state_path
        self.state = self._load_state()

    def _load_state(self):
        if os.path.exists(self.state_path):
            try:
                with open(self.state_path, 'r') as f:
                    return json.load(f)
            except Exception as e:
                logger.error(f"Error loading state: {e}")
                return {}
        return {}

    def _save_state(self):
        os.makedirs(os.path.dirname(self.state_path), exist_ok=True)
        try:
            with open(self.state_path, 'w') as f:
                json.dump(self.state, f, indent=2)
        except Exception as e:
            logger.error(f"Error saving state: {e}")

    def get_content_hash(self, content):
        return hashlib.md5(content.encode('utf-8')).hexdigest()

    def fetch_url(self, url, selector=None):
        try:
            response = requests.get(url, headers=self.headers, timeout=15)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.text, 'html.parser')
            
            # Remove script and style elements
            for script in soup(["script", "style", "meta", "noscript", "header", "footer"]):
                script.extract()

            if selector:
                elements = soup.select(selector)
                if elements:
                    text = "\n".join([el.get_text(strip=True) for el in elements])
                else:
                    logger.warning(f"Selector {selector} found no content at {url}. Falling back to full body.")
                    text = soup.get_text(separator='\n', strip=True)
            else:
                text = soup.get_text(separator='\n', strip=True)
            
            return text
            
        except requests.RequestException as e:
            logger.error(f"Error fetching {url}: {e}")
            return None

    def check_sources(self, sources_config):
        """
        Iterates through sources and returns those that have changed using hash comparison.
        """
        updates = []
        state_changed = False
        
        for source in sources_config:
            logger.info(f"Checking source: {source['name']}")
            content = self.fetch_url(source['url'], source.get('selector'))
            
            if content:
                current_hash = self.get_content_hash(content)
                previous_hash = self.state.get(source['name'])
                
                if current_hash != previous_hash:
                    logger.info(f"New content detected for: {source['name']}")
                    updates.append({
                        "source": source['name'],
                        "url": source['url'],
                        "content": content
                    })
                    self.state[source['name']] = current_hash
                    state_changed = True
                else:
                    logger.info(f"No changes for: {source['name']}")
        
        if state_changed:
            self._save_state()
            
        return updates

