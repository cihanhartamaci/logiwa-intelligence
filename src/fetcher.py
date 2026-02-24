import requests
from bs4 import BeautifulSoup
import logging
import hashlib

import json
import os

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


    def check_sources(self, sources_config, force=False):
        """
        Iterates through sources and returns those that have changed using hash comparison.
        If force is True, hash comparison is bypassed.
        Bypasses local state and uses 'last_hash' from the source config (Firestore).
        """
        updates = []
        
        for source in sources_config:
            logger.info(f"Checking source: {source['name']}")
            content, soup = self.fetch_url(source['url'], source.get('selector'))
            
            if content:
                hash_text = content[:5000] # Use a stable prefix for hashing
                current_hash = self.get_content_hash(hash_text)
                previous_hash = source.get('last_hash')
                
                if force or current_hash != previous_hash:
                    if force:
                        logger.info(f"Force fetch active fully for: {source['name']}")
                    else:
                        logger.info(f"New content detected for: {source['name']}")
                    
                    # For new content, we perform a deep fetch to get better context
                    context_content = content
                    if soup:
                        deep_text = self.fetch_deep_content(source['url'], soup)
                        context_content += deep_text

                    updates.append({
                        "id": source.get("id"),
                        "source": source['name'],
                        "url": source['url'],
                        "content": context_content,
                        "new_hash": current_hash # Return the new hash to be saved by the controller
                    })
                else:
                    logger.info(f"No changes for: {source['name']}")
            
        return updates


