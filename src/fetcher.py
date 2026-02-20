import requests
from bs4 import BeautifulSoup
import logging
import hashlib

logger = logging.getLogger("Fetcher")

class Fetcher:
    def __init__(self):
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }

    def get_content_hash(self, content):
        return hashlib.md5(content.encode('utf-8')).hexdigest()

    def fetch_url(self, url, selector=None):
        try:
            response = requests.get(url, headers=self.headers, timeout=10)
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
                # No selector? Get full body text
                text = soup.get_text(separator='\n', strip=True)
            
            return text
            
        except requests.RequestException as e:
            logger.error(f"Error fetching {url}: {e}")
            return None

    def check_sources(self, sources_config):
        """
        Iterates through sources and returns those that have changed (mock logic for now).
        In a real app, we'd compare hash with state.json.
        """
        updates = []
        for source in sources_config:
            logger.info(f"Checking source: {source['name']}")
            content = self.fetch_url(source['url'], source.get('selector'))
            
            if content:
                # TODO: Implement state/hash comparison here.
                # For now, we return everything found for the first run demo.
                updates.append({
                    "source": source['name'],
                    "url": source['url'],
                    "content": content
                })
        
        return updates
