"""
Backup data sources collector for continuity.
Implements multiple fallback sources when primary APIs fail.
"""

import requests
import json
import csv
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
from pathlib import Path
import time
import re
from bs4 import BeautifulSoup
import xml.etree.ElementTree as ET

from .base_collector import BaseCollector
from ..utils.logger import get_logger

logger = get_logger("backup_sources")

class BackupSourcesCollector(BaseCollector):
    """Collector that maintains multiple backup data sources for continuity."""
    
    def __init__(self, config: Dict[str, Any]):
        super().__init__("backup_sources", config)
        
        # Configure backup sources that don't require partnerships
        self.backup_sources = {
            'rss_feeds': {
                'enabled': True,
                'sources': [
                    {
                        'name': 'amber_alerts_rss',
                        'url': 'https://feeds.amberalert.gov/active.rss',
                        'type': 'rss',
                        'rate_limit': 5.0
                    },
                    {
                        'name': 'missing_persons_blog',
                        'url': 'https://findthemissing.org/feed/',
                        'type': 'rss',
                        'rate_limit': 3.0
                    }
                ]
            },
            'public_csv_sources': {
                'enabled': True,
                'sources': [
                    {
                        'name': 'california_open_data',
                        'url': 'https://data.ca.gov/dataset/missing-persons/resource/missing-persons.csv',
                        'type': 'csv',
                        'rate_limit': 10.0
                    },
                    {
                        'name': 'texas_dps_missing',
                        'url': 'https://www.dps.texas.gov/internetforms/Forms/CHL-16.pdf',
                        'type': 'pdf_scrape',
                        'rate_limit': 15.0
                    }
                ]
            },
            'web_scraping': {
                'enabled': True,
                'sources': [
                    {
                        'name': 'florida_fdle_scrape',
                        'url': 'https://www.fdle.state.fl.us/MEPIC/Pages/Missing.aspx',
                        'type': 'html_scrape',
                        'rate_limit': 5.0
                    },
                    {
                        'name': 'charley_project_scrape',
                        'url': 'http://charleyproject.org/recent.html',
                        'type': 'html_scrape',
                        'rate_limit': 8.0
                    }
                ]
            },
            'social_media_monitoring': {
                'enabled': False,  # Disabled for privacy/legal compliance
                'sources': []
            }
        }
        
        self.fallback_data_path = Path('fallback_data')
        self.fallback_data_path.mkdir(exist_ok=True)
        
        # Data quality filters
        self.quality_filters = {
            'min_name_length': 3,
            'required_location': True,
            'exclude_patterns': [
                r'test\s+case',
                r'example\s+person',
                r'john\s+doe',
                r'jane\s+doe'
            ]
        }
    
    def fetch_rss_feeds(self) -> List[Dict[str, Any]]:
        """Fetch data from RSS feeds."""
        logger.logger.info("Fetching RSS feed data")
        records = []
        
        if not self.backup_sources['rss_feeds']['enabled']:
            return records
        
        for source in self.backup_sources['rss_feeds']['sources']:
            try:
                logger.logger.info(f"Fetching RSS from {source['name']}")
                
                response = self.session.get(source['url'], timeout=30)
                response.raise_for_status()
                
                # Parse RSS/XML
                root = ET.fromstring(response.content)
                
                # Handle different RSS formats
                items = root.findall('.//item') or root.findall('.//{http://www.w3.org/2005/Atom}entry')\n                \nfor item in items[:20]:  # Limit to recent items\n                    title = item.find('title') or item.find('{http://www.w3.org/2005/Atom}title')\n                    description = item.find('description') or item.find('{http://www.w3.org/2005/Atom}summary')\n                    pub_date = item.find('pubDate') or item.find('{http://www.w3.org/2005/Atom}updated')\n                    \n                    if title is not None and description is not None:\n                        record = self.parse_rss_item({\n                            'title': title.text or '',\n                            'description': description.text or '',\n                            'pub_date': pub_date.text if pub_date is not None else '',\n                            'source': source['name']\n                        })\n                        \n                        if record and self.passes_quality_filter(record):\n                            records.append(record)\n                \ntime.sleep(source['rate_limit'])\n                logger.logger.info(f\"Collected {len([r for r in records if r.get('source') == source['name']])} records from {source['name']}\")\n                \nexcept Exception as e:\n                logger.logger.error(f\"Failed to fetch RSS from {source['name']}: {e}\")\n        \nreturn records\n    \ndef parse_rss_item(self, item: Dict[str, Any]) -> Optional[Dict[str, Any]]:\n        \"\"\"Parse RSS item into standard record format.\"\"\"\n        try:\n            title = item.get('title', '')\n            description = item.get('description', '')\n            \n            # Extract information from title and description\n            # This is a simplified parser - real implementation would be more sophisticated\n            \n            # Look for name patterns\n            name_match = re.search(r'(?:missing|alert for|looking for)\\s+([A-Za-z\\s]+?)(?:\\s*,|\\s*from|\\s*age)', title + ' ' + description, re.IGNORECASE)\n            name = name_match.group(1).strip() if name_match else ''\n            \n            # Look for age patterns\n            age_match = re.search(r'(?:age|aged)\\s+(\\d+)', description, re.IGNORECASE)\n            age = age_match.group(1) if age_match else ''\n            \n            # Look for location patterns\n            location_match = re.search(r'(?:from|in|near)\\s+([A-Za-z\\s,]+?)(?:\\s*\\.|\n|$)', description, re.IGNORECASE)\n            location = location_match.group(1).strip() if location_match else ''\n            \n            if not name or len(name) < self.quality_filters['min_name_length']:\n                return None\n            \n            return {\n                'case_number': f\"RSS{datetime.now().year}{hash(title) % 10000:04d}\",\n                'name': name,\n                'age': age,\n                'gender': '',  # Not usually available in RSS\n                'ethnicity': '',\n                'city': location.split(',')[0].strip() if ',' in location else location,\n                'county': '',\n                'state': location.split(',')[-1].strip() if ',' in location else '',\n                'date_missing': item.get('pub_date', ''),\n                'description': description[:200] + '...' if len(description) > 200 else description,\n                'source': f\"rss_{item.get('source', 'unknown')}\",\n                'source_url': '',\n                'updated': datetime.now().isoformat()\n            }\n            \nexcept Exception as e:\n            logger.logger.error(f\"Error parsing RSS item: {e}\")\n            return None\n    \ndef fetch_web_scraping_sources(self) -> List[Dict[str, Any]]:\n        \"\"\"Fetch data via web scraping public sites.\"\"\"\n        logger.logger.info(\"Fetching web scraping data\")\n        records = []\n        \n        if not self.backup_sources['web_scraping']['enabled']:\n            return records\n        \n        for source in self.backup_sources['web_scraping']['sources']:\n            try:\n                logger.logger.info(f\"Scraping {source['name']}\")\n                \n                headers = {\n                    'User-Agent': 'SaveThemNow.Jesus Data Collector (Educational/Awareness Purpose)',\n                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'\n                }\n                \n                response = self.session.get(source['url'], headers=headers, timeout=30)\n                response.raise_for_status()\n                \n                # Parse HTML\n                soup = BeautifulSoup(response.content, 'html.parser')\n                \n                # Extract missing persons data based on site structure\n                if 'charley' in source['name'].lower():\n                    source_records = self.scrape_charley_project(soup, source)\n                elif 'florida' in source['name'].lower():\n                    source_records = self.scrape_florida_fdle(soup, source)\n                else:\n                    source_records = self.scrape_generic_site(soup, source)\n                \n                records.extend(source_records)\n                time.sleep(source['rate_limit'])\n                \n                logger.logger.info(f\"Scraped {len(source_records)} records from {source['name']}\")\n                \n            except Exception as e:\n                logger.logger.error(f\"Failed to scrape {source['name']}: {e}\")\n        \n        return records\n    \n    def scrape_charley_project(self, soup: BeautifulSoup, source: Dict[str, Any]) -> List[Dict[str, Any]]:\n        \"\"\"Scrape Charley Project missing persons site.\"\"\"\n        records = []\n        \n        try:\n            # Look for missing person entries\n            case_divs = soup.find_all('div', class_='case') or soup.find_all('p')\n            \n            for div in case_divs[:10]:  # Limit for testing\n                text = div.get_text().strip()\n                if len(text) < 50:  # Skip short entries\n                    continue\n                \n                # Extract basic information\n                lines = text.split('\\n')\n                if lines:\n                    # First line usually contains name\n                    name_line = lines[0].strip()\n                    \n                    # Look for patterns like \"John Smith, 25, missing since...\"\n                    name_match = re.match(r'^([A-Za-z\\s]+?)(?:,|\\s+)(?:age\\s+)?(\\d+)', name_line)\n                    if name_match:\n                        name = name_match.group(1).strip()\n                        age = name_match.group(2)\n                        \n                        record = {\n                            'case_number': f\"CP{datetime.now().year}{hash(name) % 10000:04d}\",\n                            'name': name,\n                            'age': age,\n                            'gender': '',\n                            'ethnicity': '',\n                            'city': '',\n                            'county': '',\n                            'state': '',\n                            'date_missing': '',\n                            'description': text[:200] + '...',\n                            'source': 'charley_project_scrape',\n                            'source_url': source['url'],\n                            'updated': datetime.now().isoformat()\n                        }\n                        \n                        if self.passes_quality_filter(record):\n                            records.append(record)\n                            \n        except Exception as e:\n            logger.logger.error(f\"Error scraping Charley Project: {e}\")\n        \n        return records\n    \n    def scrape_florida_fdle(self, soup: BeautifulSoup, source: Dict[str, Any]) -> List[Dict[str, Any]]:\n        \"\"\"Scrape Florida FDLE missing persons page.\"\"\"\n        records = []\n        \n        try:\n            # Look for missing person tables or lists\n            tables = soup.find_all('table')\n            \n            for table in tables:\n                rows = table.find_all('tr')\n                for row in rows[1:]:  # Skip header\n                    cells = row.find_all(['td', 'th'])\n                    if len(cells) >= 3:\n                        # Extract data from table cells\n                        name = cells[0].get_text().strip() if len(cells) > 0 else ''\n                        age = cells[1].get_text().strip() if len(cells) > 1 else ''\n                        location = cells[2].get_text().strip() if len(cells) > 2 else ''\n                        \n                        if name and len(name) > self.quality_filters['min_name_length']:\n                            record = {\n                                'case_number': f\"FL{datetime.now().year}{hash(name) % 10000:04d}\",\n                                'name': name,\n                                'age': re.search(r'\\d+', age).group() if re.search(r'\\d+', age) else '',\n                                'gender': '',\n                                'ethnicity': '',\n                                'city': location.split(',')[0].strip() if ',' in location else location,\n                                'county': '',\n                                'state': 'FL',\n                                'date_missing': '',\n                                'description': f\"Missing person from Florida: {name}\",\n                                'source': 'florida_fdle_scrape',\n                                'source_url': source['url'],\n                                'updated': datetime.now().isoformat()\n                            }\n                            \n                            if self.passes_quality_filter(record):\n                                records.append(record)\n                                \n        except Exception as e:\n            logger.logger.error(f\"Error scraping Florida FDLE: {e}\")\n        \n        return records\n    \n    def scrape_generic_site(self, soup: BeautifulSoup, source: Dict[str, Any]) -> List[Dict[str, Any]]:\n        \"\"\"Generic scraper for unknown site structures.\"\"\"\n        records = []\n        \n        try:\n            # Look for common patterns in missing person sites\n            text_content = soup.get_text()\n            \n            # Split into potential case entries\n            potential_cases = re.split(r'\\n\\s*\\n|\\r\\n\\s*\\r\\n', text_content)\n            \n            for case_text in potential_cases[:5]:  # Limit for testing\n                if len(case_text.strip()) < 30:\n                    continue\n                \n                # Look for missing person patterns\n                missing_patterns = [\n                    r'missing\\s+person[:\\s]+([A-Za-z\\s]+)',\n                    r'([A-Za-z\\s]+)\\s+is\\s+missing',\n                    r'help\\s+find\\s+([A-Za-z\\s]+)'\n                ]\n                \n                name = ''\n                for pattern in missing_patterns:\n                    match = re.search(pattern, case_text, re.IGNORECASE)\n                    if match:\n                        name = match.group(1).strip()\n                        break\n                \n                if name and len(name) > self.quality_filters['min_name_length']:\n                    record = {\n                        'case_number': f\"GEN{datetime.now().year}{hash(name) % 10000:04d}\",\n                        'name': name,\n                        'age': '',\n                        'gender': '',\n                        'ethnicity': '',\n                        'city': '',\n                        'county': '',\n                        'state': '',\n                        'date_missing': '',\n                        'description': case_text[:200] + '...',\n                        'source': 'generic_scrape',\n                        'source_url': source['url'],\n                        'updated': datetime.now().isoformat()\n                    }\n                    \n                    if self.passes_quality_filter(record):\n                        records.append(record)\n                        \n        except Exception as e:\n            logger.logger.error(f\"Error in generic scraping: {e}\")\n        \n        return records\n    \n    def passes_quality_filter(self, record: Dict[str, Any]) -> bool:\n        \"\"\"Check if record passes quality filters.\"\"\"\n        try:\n            name = record.get('name', '').lower()\n            \n            # Check minimum name length\n            if len(name) < self.quality_filters['min_name_length']:\n                return False\n            \n            # Check for test/example patterns\n            for pattern in self.quality_filters['exclude_patterns']:\n                if re.search(pattern, name, re.IGNORECASE):\n                    return False\n            \n            # Check for required location if enabled\n            if self.quality_filters['required_location']:\n                location = record.get('city', '') + record.get('state', '')\n                if not location.strip():\n                    return False\n            \n            return True\n            \n        except Exception as e:\n            logger.logger.error(f\"Error in quality filter: {e}\")\n            return False\n    \n    def save_fallback_data(self, records: List[Dict[str, Any]]) -> bool:\n        \"\"\"Save collected data as fallback for future use.\"\"\"\n        try:\n            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')\n            fallback_file = self.fallback_data_path / f\"backup_data_{timestamp}.json\"\n            \n            with open(fallback_file, 'w', encoding='utf-8') as f:\n                json.dump({\n                    'timestamp': datetime.now().isoformat(),\n                    'record_count': len(records),\n                    'sources': list(set(r.get('source', 'unknown') for r in records)),\n                    'records': records\n                }, f, indent=2)\n            \n            logger.logger.info(f\"Saved {len(records)} backup records to {fallback_file}\")\n            return True\n            \n        except Exception as e:\n            logger.logger.error(f\"Failed to save fallback data: {e}\")\n            return False\n    \n    def collect_data(self) -> List[Dict[str, Any]]:\n        \"\"\"Main data collection method for backup sources.\"\"\"\n        logger.logger.info(\"Starting backup sources data collection\")\n        \n        all_records = []\n        \n        # Collect from RSS feeds\n        rss_records = self.fetch_rss_feeds()\n        all_records.extend(rss_records)\n        \n        # Collect from web scraping\n        scraping_records = self.fetch_web_scraping_sources()\n        all_records.extend(scraping_records)\n        \n        # Remove duplicates based on name similarity\n        unique_records = self.deduplicate_records(all_records)\n        \n        # Save as fallback data\n        if unique_records:\n            self.save_fallback_data(unique_records)\n        \n        logger.logger.info(f\"Collected {len(unique_records)} unique records from backup sources\")\n        return unique_records\n    \n    def deduplicate_records(self, records: List[Dict[str, Any]]) -> List[Dict[str, Any]]:\n        \"\"\"Remove duplicate records based on name similarity.\"\"\"\n        if not records:\n            return records\n        \n        unique_records = []\n        seen_names = set()\n        \n        for record in records:\n            name_key = record.get('name', '').lower().strip()\n            if name_key and name_key not in seen_names:\n                seen_names.add(name_key)\n                unique_records.append(record)\n        \n        logger.logger.info(f\"Deduplicated {len(records)} records to {len(unique_records)} unique records\")\n        return unique_records