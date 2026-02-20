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
            for script in soup(["script", "style", "meta", "noscript", "header", "footer", "nav"]):
                script.extract()

            if selector:
                elements = soup.select(selector)
                if elements:
                    text = "\n".join([el.get_text(separator=' ', strip=True) for el in elements])
                else:
                    text = soup.get_text(separator='\n', strip=True)
            else:
                text = soup.get_text(separator='\n', strip=True)
            
            return text, soup
            
        except requests.RequestException as e:
            logger.error(f"Error fetching {url}: {e}")
            return None, None

    def fetch_deep_content(self, url, base_soup):
        """
        Looks for 'Detail' or 'Read More' type links related to releases and fetches their content.
        """
        logger.info(f"Performing deep fetch for {url}...")
        detail_links = []
        
        # Heuristic for detail links: containing 'release', 'v[0-9]', 'update', or 'news'
        for a in base_soup.find_all('a', href=True):
            href = a['href']
            text = a.get_text().lower()
            if any(k in text or k in href.lower() for k in ['release', 'update', 'v2.', '2026', 'changelog']):
                # Resolve relative URLs
                if href.startswith('/'):
                    from urllib.parse import urljoin
                    href = urljoin(url, href)
                if href.startswith('http') and href not in detail_links:
                    detail_links.append(href)
            if len(detail_links) >= 3: # Cap at 3 detailed links to avoid bloat
                break
        
        deep_text = ""
        for link in detail_links:
            logger.info(f"Fetching sub-detail: {link}")
            text, _ = self.fetch_url(link)
            if text:
                deep_text += f"\n--- SUB-DETAIL FROM {link} ---\n{text[:2000]}\n"
        
        return deep_text


    def check_sources(self, sources_config):
        """
        Iterates through sources and returns those that have changed using hash comparison.
        """
        updates = []
        state_changed = False
        
        for source in sources_config:
            logger.info(f"Checking source: {source['name']}")
            content, soup = self.fetch_url(source['url'], source.get('selector'))
            
            if content:
                hash_text = content[:5000] # Use a stable prefix for hashing
                current_hash = self.get_content_hash(hash_text)
                previous_hash = self.state.get(source['name'])
                
                if current_hash != previous_hash:
                    logger.info(f"New content detected for: {source['name']}")
                    
                    # For new content, we perform a deep fetch to get better context
                    context_content = content
                    if soup:
                        deep_text = self.fetch_deep_content(source['url'], soup)
                        context_content += deep_text

                    updates.append({
                        "source": source['name'],
                        "url": source['url'],
                        "content": context_content
                    })
                    self.state[source['name']] = current_hash
                    state_changed = True
                else:
                    logger.info(f"No changes for: {source['name']}")
        
        if state_changed:
            self._save_state()
            
        return updates


