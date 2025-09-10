"""
NamUs (National Missing and Unidentified Persons System) data collector.
"""

import requests
from bs4 import BeautifulSoup
import re
import json
from datetime import datetime
from typing import Dict, Any, List, Optional
from urllib.parse import urljoin, urlparse

from .base_collector import BaseCollector
from ..utils.logger import get_logger

logger = get_logger("namus")

class NamUsCollector(BaseCollector):
    """Collector for NamUs missing persons database."""
    
    def __init__(self, config: Dict[str, Any]):
        super().__init__("namus", config)
        
        # NamUs specific configuration - Updated 2025 endpoints
        self.base_url = config.get('base_url', 'https://www.namus.gov')
        self.api_base = 'https://api.ojp.gov/ojpdataset/v1'
        self.search_url = f"{self.base_url}/api/CaseSets/NamUs/MissingPersons/Search"
        self.export_url = f"{self.base_url}/api/CaseSets/NamUs/MissingPersons/Export"
        
        # Updated API endpoints discovered
        self.data_endpoints = {
            'missing_persons': 't6xz-x8i9.json',  # Missing persons dataset
            'unidentified': 'tzug-2jqt.json'      # Unidentified persons dataset
        }
        
        # Search parameters for missing persons (updated structure)
        self.search_params = {
            'searchType': 'missing',
            'caseStatus': 'open',
            'take': 100,  # Records per request
            'skip': 0     # Pagination offset
        }
        
        # Field mappings from NamUs to our schema
        self.field_mapping = {
            'case_number': ['namus_number', 'case_number', 'id'],
            'name': ['first_name', 'last_name', 'full_name', 'name'],
            'age': ['age_last_seen', 'age', 'current_age'],
            'gender': ['sex', 'gender'],
            'ethnicity': ['race_ethnicity', 'race', 'ethnicity'],
            'city': ['city_last_seen', 'city', 'location_city'],
            'county': ['county_last_seen', 'county', 'location_county'],
            'state': ['state_last_seen', 'state', 'location_state'],
            'date_missing': ['date_last_seen', 'date_missing', 'disappeared_date'],
            'description': ['circumstances', 'description', 'details'],
            'height': ['height_from', 'height_to', 'height'],
            'weight': ['weight_from', 'weight_to', 'weight'],
            'hair_color': ['hair_color'],
            'eye_color': ['eye_color']
        }
    
    def collect_data(self) -> List[Dict[str, Any]]:
        """
        Collect missing persons data from NamUs.
        
        Returns:
            List of missing person records
        """
        logger.logger.info("Starting NamUs data collection")
        records = []
        
        try:
            # Get search results page
            search_response = self.make_request(
                f"{self.search_url}/search",
                params=self.search_params,
                timeout=30
            )
            
            if not search_response:
                logger.logger.error("Failed to get NamUs search page")
                return []
            
            # Parse search results to get case URLs
            case_urls = self._parse_search_results(search_response.text)
            logger.logger.info(f"Found {len(case_urls)} cases to process")
            
            # Process each case
            for i, case_url in enumerate(case_urls[:100]):  # Limit for initial testing
                try:
                    case_data = self._fetch_case_details(case_url)
                    if case_data and self.validate_record(case_data):
                        records.append(self.normalize_record(case_data))
                    
                    if (i + 1) % 10 == 0:
                        logger.logger.info(f"Processed {i + 1}/{len(case_urls)} cases")
                        
                except Exception as e:
                    logger.logger.warning(f"Failed to process case {case_url}: {e}")
                    continue
            
            logger.logger.info(f"Successfully collected {len(records)} records from NamUs")
            return records
            
        except Exception as e:
            logger.logger.error(f"NamUs collection failed: {e}")
            return []
    
    def _parse_search_results(self, html: str) -> List[str]:
        """Parse search results page to extract case URLs."""
        soup = BeautifulSoup(html, 'html.parser')
        case_urls = []
        
        # Look for case links (NamUs uses different patterns)
        # This is a simplified implementation - actual NamUs parsing would be more complex
        
        # Method 1: Look for links with case numbers
        case_links = soup.find_all('a', href=re.compile(r'/case/\d+'))
        for link in case_links:
            case_urls.append(urljoin(self.base_url, link.get('href')))
        
        # Method 2: Look for data-case-id attributes or similar
        case_elements = soup.find_all(attrs={'data-case-id': True})
        for element in case_elements:
            case_id = element.get('data-case-id')
            if case_id:
                case_urls.append(f"{self.search_url}/{case_id}")
        
        # Method 3: Look for JSON data in script tags (common in modern web apps)
        script_tags = soup.find_all('script', string=re.compile(r'case'))
        for script in script_tags:
            script_content = script.string
            if script_content:
                # Extract case IDs from JSON-like structures
                case_ids = re.findall(r'"case_id"\s*:\s*"?(\d+)"?', script_content)
                for case_id in case_ids:
                    case_urls.append(f"{self.search_url}/{case_id}")
        
        # Remove duplicates
        case_urls = list(set(case_urls))
        
        return case_urls
    
    def _fetch_case_details(self, case_url: str) -> Optional[Dict[str, Any]]:
        """Fetch detailed information for a specific case."""
        try:
            response = self.make_request(case_url, timeout=20)
            if not response:
                return None
            
            soup = BeautifulSoup(response.text, 'html.parser')
            
            # Extract case data - this is a simplified implementation
            case_data = {
                'source_url': case_url,
                'source_name': 'namus',
                'collected_at': datetime.utcnow().isoformat()
            }
            
            # Extract case number from URL or page
            case_number_match = re.search(r'/case/(\d+)', case_url)
            if case_number_match:
                case_data['case_number'] = f"MP{case_number_match.group(1)}"
            
            # Method 1: Look for structured data in meta tags
            self._extract_meta_data(soup, case_data)
            
            # Method 2: Look for data in tables or definition lists
            self._extract_table_data(soup, case_data)
            
            # Method 3: Look for JSON-LD structured data
            self._extract_json_ld(soup, case_data)
            
            # Method 4: Extract from specific HTML elements
            self._extract_html_elements(soup, case_data)
            
            return case_data
            
        except Exception as e:
            logger.logger.warning(f"Failed to fetch case details from {case_url}: {e}")
            return None
    
    def _extract_meta_data(self, soup: BeautifulSoup, case_data: Dict[str, Any]):
        """Extract data from meta tags."""
        meta_tags = soup.find_all('meta')
        for meta in meta_tags:
            name = meta.get('name') or meta.get('property')
            content = meta.get('content')
            
            if name and content:
                # Map common meta tag names to our fields
                if 'title' in name.lower():
                    case_data['title'] = content
                elif 'description' in name.lower():
                    case_data['description'] = content
    
    def _extract_table_data(self, soup: BeautifulSoup, case_data: Dict[str, Any]):
        """Extract data from HTML tables."""
        tables = soup.find_all('table')
        
        for table in tables:
            rows = table.find_all('tr')
            
            for row in rows:
                cells = row.find_all(['td', 'th'])
                if len(cells) >= 2:
                    key = cells[0].get_text(strip=True).lower()
                    value = cells[1].get_text(strip=True)
                    
                    # Map table keys to our fields
                    self._map_field(key, value, case_data)
        
        # Also look for definition lists
        dls = soup.find_all('dl')
        for dl in dls:
            terms = dl.find_all('dt')
            definitions = dl.find_all('dd')
            
            for term, definition in zip(terms, definitions):
                key = term.get_text(strip=True).lower()
                value = definition.get_text(strip=True)
                self._map_field(key, value, case_data)
    
    def _extract_json_ld(self, soup: BeautifulSoup, case_data: Dict[str, Any]):
        """Extract JSON-LD structured data."""
        json_scripts = soup.find_all('script', type='application/ld+json')
        
        for script in json_scripts:
            try:
                data = json.loads(script.string)
                if isinstance(data, dict):
                    self._extract_from_json(data, case_data)
            except (json.JSONDecodeError, TypeError):
                continue
    
    def _extract_html_elements(self, soup: BeautifulSoup, case_data: Dict[str, Any]):
        """Extract data from specific HTML elements."""
        # Look for common class names and IDs
        common_selectors = [
            '.case-details', '.missing-person', '.person-info',
            '#case-info', '#person-details', '.profile-info'
        ]
        
        for selector in common_selectors:
            elements = soup.select(selector)
            for element in elements:
                # Extract text content and look for patterns
                text = element.get_text()
                
                # Look for patterns like "Age: 25", "Gender: Female", etc.
                patterns = {
                    r'age:\s*(\d+)': 'age',
                    r'gender:\s*(\w+)': 'gender', 
                    r'sex:\s*(\w+)': 'gender',
                    r'race:\s*([^,\n]+)': 'ethnicity',
                    r'city:\s*([^,\n]+)': 'city',
                    r'state:\s*([A-Z]{2})': 'state',
                    r'height:\s*([^,\n]+)': 'height',
                    r'weight:\s*([^,\n]+)': 'weight'
                }
                
                for pattern, field in patterns.items():
                    match = re.search(pattern, text, re.IGNORECASE)
                    if match:
                        case_data[field] = match.group(1).strip()
    
    def _extract_from_json(self, data: Dict[str, Any], case_data: Dict[str, Any]):
        """Extract data from JSON structure."""
        # Recursively look for relevant fields
        for key, value in data.items():
            if isinstance(value, dict):
                self._extract_from_json(value, case_data)
            elif isinstance(value, str) and value.strip():
                self._map_field(key.lower(), value.strip(), case_data)
    
    def _map_field(self, key: str, value: str, case_data: Dict[str, Any]):
        """Map a key-value pair to our case data structure."""
        if not value or value.lower() in ['unknown', 'n/a', 'not available', '']:
            return
        
        # Clean the key
        key = re.sub(r'[^\w\s]', '', key.lower()).strip()
        key = re.sub(r'\s+', '_', key)
        
        # Map to our standard fields
        mapping = {
            'first_name': 'first_name',
            'last_name': 'last_name', 
            'age_last_seen': 'age',
            'age_now': 'age',
            'current_age': 'age',
            'sex': 'gender',
            'gender': 'gender',
            'race': 'ethnicity',
            'ethnicity': 'ethnicity',
            'race_ethnicity': 'ethnicity',
            'city_last_seen': 'city',
            'city': 'city',
            'county_last_seen': 'county',
            'county': 'county', 
            'state_last_seen': 'state',
            'state': 'state',
            'date_last_seen': 'date_missing',
            'date_missing': 'date_missing',
            'disappeared_date': 'date_missing',
            'circumstances': 'description',
            'case_number': 'case_number',
            'namus_number': 'case_number',
            'case_id': 'case_number'
        }
        
        mapped_field = mapping.get(key)
        if mapped_field:
            case_data[mapped_field] = value
        else:
            # Store unmapped fields in raw_data
            if 'raw_data' not in case_data:
                case_data['raw_data'] = {}
            case_data['raw_data'][key] = value
    
    def validate_record(self, record: Dict[str, Any]) -> bool:
        """Validate a NamUs record."""
        # Must have at least a case number or name
        has_case_number = bool(record.get('case_number'))
        has_name = bool(record.get('first_name')) or bool(record.get('last_name'))
        
        if not (has_case_number or has_name):
            return False
        
        # Should have location information
        has_location = bool(record.get('city')) or bool(record.get('state'))
        if not has_location:
            logger.logger.warning(f"Record missing location: {record.get('case_number', 'Unknown')}")
        
        return True
    
    def normalize_record(self, record: Dict[str, Any]) -> Dict[str, Any]:
        """Normalize a NamUs record to standard format."""
        normalized = super().normalize_record(record)
        
        # Combine first and last names
        first_name = record.get('first_name', '').strip()
        last_name = record.get('last_name', '').strip()
        if first_name or last_name:
            normalized['name'] = f"{first_name} {last_name}".strip()
        
        # Set source-specific fields
        normalized['source_name'] = 'namus'
        normalized['category'] = self._determine_category(record)
        normalized['status'] = 'Active'
        
        # Add source ID for deduplication
        case_number = record.get('case_number')
        if case_number:
            normalized['source_id'] = case_number
        
        return normalized
    
    def _determine_category(self, record: Dict[str, Any]) -> str:
        """Determine the category based on age."""
        age = record.get('age')
        if age:
            try:
                age_int = int(age)
                return 'Missing Children' if age_int < 18 else 'Missing Adults'
            except (ValueError, TypeError):
                pass
        
        return 'Missing Adults'  # Default