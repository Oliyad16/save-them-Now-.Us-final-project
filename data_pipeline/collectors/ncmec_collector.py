"""
NCMEC (National Center for Missing & Exploited Children) data collector.
Focuses on missing children cases with high priority processing.
"""

import requests
from bs4 import BeautifulSoup
import json
import re
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
from urllib.parse import urljoin, urlparse
import xml.etree.ElementTree as ET

from .base_collector import BaseCollector
from ..utils.logger import get_logger

logger = get_logger("ncmec")

class NCMECCollector(BaseCollector):
    """Collector for NCMEC missing children database."""
    
    def __init__(self, config: Dict[str, Any]):
        super().__init__("ncmec", config)
        
        # NCMEC specific configuration
        self.base_url = config.get('base_url', 'https://www.missingkids.org')
        self.search_url = f"{self.base_url}/gethelpnow/search"
        
        # RSS and API endpoints
        self.api_endpoints = {
            'rss_feed': f"{self.base_url}/missingkids/servlet/NewsEventServlet?LanguageCountry=en_US&PageId=4681",
            'search_api': f"{self.base_url}/api/search",
            'case_details': f"{self.base_url}/photographs"
        }
        
        # Search parameters for missing children
        self.search_params = {
            'searchType': 'missing',
            'caseType': 'Missing',
            'ageFrom': '0',
            'ageTo': '17',  # Focus on children
            'resultsPerPage': '50',
            'pageNumber': '1'
        }
        
        # Priority categories for NCMEC cases
        self.priority_categories = {
            'infant': {'max_age': 2, 'priority': 1},
            'toddler': {'max_age': 5, 'priority': 2}, 
            'child': {'max_age': 12, 'priority': 3},
            'teen': {'max_age': 17, 'priority': 4}
        }
        
        # Field mappings from NCMEC to our schema
        self.field_mapping = {
            'case_number': ['caseNumber', 'ncmecNumber', 'id'],
            'name': ['firstName', 'lastName', 'fullName', 'childName'],
            'age': ['ageAtTimeOfDisappearance', 'currentAge', 'age'],
            'gender': ['sex', 'gender'],
            'ethnicity': ['race', 'ethnicity'],
            'city': ['cityOfRecovery', 'lastSeenCity', 'city'],
            'county': ['countyOfRecovery', 'lastSeenCounty', 'county'],
            'state': ['stateOfRecovery', 'lastSeenState', 'state'],
            'date_missing': ['dateMissing', 'dateOfDisappearance', 'disappearanceDate'],
            'description': ['circumstances', 'description', 'caseDetails'],
            'height': ['height'],
            'weight': ['weight'],
            'hair_color': ['hairColor'],
            'eye_color': ['eyeColor'],
            'photo_url': ['photoUrl', 'imageUrl', 'primaryPhoto']
        }
    
    def collect_data(self) -> List[Dict[str, Any]]:
        """
        Collect missing children data from NCMEC.
        
        Returns:
            List of missing children records
        """
        logger.logger.info("Starting NCMEC missing children data collection")
        records = []
        
        try:
            # First, try RSS feed for most recent cases
            rss_records = self._collect_from_rss()
            records.extend(rss_records)
            
            # Then, try web scraping for additional cases
            web_records = self._collect_from_web_search()
            records.extend(web_records)
            
            # Deduplicate records
            records = self._deduplicate_records(records)
            
            # Add priority scoring for children
            for record in records:
                record['priority'] = self._calculate_priority(record)
                record['source_name'] = 'ncmec'
                record['category'] = 'Missing Children'
            
            logger.logger.info(f"Successfully collected {len(records)} records from NCMEC")
            return records
            
        except Exception as e:
            logger.logger.error(f"NCMEC collection failed: {e}")
            return []
    
    def _collect_from_rss(self) -> List[Dict[str, Any]]:
        """Collect recent cases from NCMEC RSS feed."""
        records = []
        
        try:
            response = self.make_request(self.api_endpoints['rss_feed'], timeout=30)
            if not response:
                return records
            
            # Parse RSS XML
            root = ET.fromstring(response.text)
            
            # Look for RSS items
            for item in root.findall('.//item'):
                try:
                    record = self._parse_rss_item(item)
                    if record and self.validate_record(record):
                        records.append(self.normalize_record(record))
                except Exception as e:
                    logger.logger.warning(f"Failed to parse RSS item: {e}")
                    continue
            
            logger.logger.info(f"Collected {len(records)} records from NCMEC RSS")
            
        except Exception as e:
            logger.logger.warning(f"RSS collection failed: {e}")
        
        return records
    
    def _collect_from_web_search(self) -> List[Dict[str, Any]]:
        """Collect cases from NCMEC web search interface."""
        records = []
        
        try:
            # Get search results page
            response = self.make_request(
                self.search_url,
                params=self.search_params,
                timeout=30
            )
            
            if not response:
                return records
            
            soup = BeautifulSoup(response.text, 'html.parser')
            
            # Look for case cards or result items
            case_elements = self._find_case_elements(soup)
            
            for element in case_elements[:25]:  # Limit to first 25 cases
                try:
                    record = self._parse_case_element(element)
                    if record and self.validate_record(record):
                        records.append(self.normalize_record(record))
                except Exception as e:
                    logger.logger.warning(f"Failed to parse case element: {e}")
                    continue
            
            logger.logger.info(f"Collected {len(records)} records from NCMEC web search")
            
        except Exception as e:
            logger.logger.warning(f"Web search collection failed: {e}")
        
        return records
    
    def _parse_rss_item(self, item: ET.Element) -> Optional[Dict[str, Any]]:
        """Parse an RSS item into a case record."""
        record = {}
        
        try:
            # Extract basic information
            title = item.find('title')
            if title is not None:
                record['title'] = title.text
                # Try to extract name from title
                name_match = re.search(r'Missing:\s*(.+?)(?:\s*\(|$)', title.text)
                if name_match:
                    record['name'] = name_match.group(1).strip()
            
            description = item.find('description')
            if description is not None:
                record['description'] = description.text
                # Extract additional details from description
                self._extract_from_description(record, description.text)
            
            link = item.find('link')
            if link is not None:
                record['source_url'] = link.text
                # Try to extract case number from URL
                case_num_match = re.search(r'/(\d+)/?$', link.text)
                if case_num_match:
                    record['case_number'] = f"NCMEC-{case_num_match.group(1)}"
            
            pub_date = item.find('pubDate')
            if pub_date is not None:
                try:
                    record['date_missing'] = datetime.strptime(
                        pub_date.text, '%a, %d %b %Y %H:%M:%S %Z'
                    ).strftime('%Y-%m-%d')
                except:
                    record['date_missing'] = pub_date.text
            
            return record
            
        except Exception as e:
            logger.logger.error(f"Error parsing RSS item: {e}")
            return None
    
    def _find_case_elements(self, soup: BeautifulSoup) -> List:
        """Find case elements on the search results page."""
        # Try multiple selectors for case elements
        selectors = [
            '.search-result',
            '.case-result',
            '.missing-person-result',
            '.child-case',
            '.result-item',
            'div[class*="case"]',
            'div[class*="result"]'
        ]
        
        for selector in selectors:
            elements = soup.select(selector)
            if elements:
                logger.logger.debug(f"Found {len(elements)} case elements with selector: {selector}")
                return elements
        
        # Fallback: look for any div with relevant text
        elements = soup.find_all('div', string=re.compile(r'(Missing|Age:|Last Seen)', re.I))
        return elements[:10] if elements else []
    
    def _parse_case_element(self, element) -> Optional[Dict[str, Any]]:
        """Parse a case element from the web page."""
        record = {}
        
        try:
            # Extract text content
            text = element.get_text() if hasattr(element, 'get_text') else str(element)
            
            # Extract name
            name_patterns = [
                r'Name:\s*([^,\n]+)',
                r'Missing:\s*([^,\n]+)',
                r'Child:\s*([^,\n]+)'
            ]
            
            for pattern in name_patterns:
                match = re.search(pattern, text, re.I)
                if match:
                    record['name'] = match.group(1).strip()
                    break
            
            # Extract age
            age_match = re.search(r'Age:\s*(\d+)', text, re.I)
            if age_match:
                record['age'] = int(age_match.group(1))
            
            # Extract gender
            gender_match = re.search(r'(Male|Female)', text, re.I)
            if gender_match:
                record['gender'] = gender_match.group(1).title()
            
            # Extract location
            location_patterns = [
                r'Last Seen:\s*([^,\n]+(?:,\s*[A-Z]{2})?)',
                r'Location:\s*([^,\n]+(?:,\s*[A-Z]{2})?)',
                r'From:\s*([^,\n]+(?:,\s*[A-Z]{2})?)'
            ]
            
            for pattern in location_patterns:
                match = re.search(pattern, text, re.I)
                if match:
                    location = match.group(1).strip()
                    record['location'] = location
                    self._parse_location(record, location)
                    break
            
            # Extract case number if available
            case_match = re.search(r'Case[#\s]*:?\s*([A-Z0-9-]+)', text, re.I)
            if case_match:
                record['case_number'] = case_match.group(1)
            else:
                # Generate a temporary case number
                record['case_number'] = f"NCMEC-WEB-{datetime.now().strftime('%Y%m%d')}-{hash(text) % 10000}"
            
            # Extract date if available
            date_patterns = [
                r'Missing since:\s*(\d{1,2}/\d{1,2}/\d{4})',
                r'Date missing:\s*(\d{1,2}/\d{1,2}/\d{4})',
                r'(\d{1,2}/\d{1,2}/\d{4})'
            ]
            
            for pattern in date_patterns:
                match = re.search(pattern, text, re.I)
                if match:
                    try:
                        date_obj = datetime.strptime(match.group(1), '%m/%d/%Y')
                        record['date_missing'] = date_obj.strftime('%Y-%m-%d')
                        break
                    except:
                        record['date_missing'] = match.group(1)
                        break
            
            # Look for image URLs
            img_elements = element.find_all('img') if hasattr(element, 'find_all') else []
            for img in img_elements:
                src = img.get('src', '')
                if src and any(ext in src.lower() for ext in ['.jpg', '.jpeg', '.png', '.gif']):
                    record['photo_url'] = urljoin(self.base_url, src)
                    break
            
            return record if record.get('name') else None
            
        except Exception as e:
            logger.logger.error(f"Error parsing case element: {e}")
            return None
    
    def _extract_from_description(self, record: Dict, description: str):
        """Extract additional information from description text."""
        try:
            # Look for age
            age_match = re.search(r'age[:\s]*(\d+)', description, re.I)
            if age_match:
                record['age'] = int(age_match.group(1))
            
            # Look for location
            location_patterns = [
                r'from\s+([^,.]+(?:,\s*[A-Z]{2})?)',
                r'in\s+([^,.]+(?:,\s*[A-Z]{2})?)',
                r'near\s+([^,.]+(?:,\s*[A-Z]{2})?)'
            ]
            
            for pattern in location_patterns:
                match = re.search(pattern, description, re.I)
                if match:
                    location = match.group(1).strip()
                    record['location'] = location
                    self._parse_location(record, location)
                    break
            
            # Look for physical characteristics
            height_match = re.search(r'height[:\s]*([0-9\'"\s]+)', description, re.I)
            if height_match:
                record['height'] = height_match.group(1).strip()
            
            weight_match = re.search(r'weight[:\s]*(\d+\s*lbs?)', description, re.I)
            if weight_match:
                record['weight'] = weight_match.group(1)
            
            hair_match = re.search(r'hair[:\s]*([^,.\n]+)', description, re.I)
            if hair_match:
                record['hair_color'] = hair_match.group(1).strip()
            
            eyes_match = re.search(r'eyes?[:\s]*([^,.\n]+)', description, re.I)
            if eyes_match:
                record['eye_color'] = eyes_match.group(1).strip()
                
        except Exception as e:
            logger.logger.warning(f"Error extracting from description: {e}")
    
    def _parse_location(self, record: Dict, location: str):
        """Parse location string into city, state components."""
        try:
            parts = [part.strip() for part in location.split(',')]
            
            if len(parts) >= 2:
                record['city'] = parts[0]
                # Check if last part is a state code
                if len(parts[-1]) == 2 and parts[-1].isupper():
                    record['state'] = parts[-1]
                    if len(parts) >= 3:
                        record['county'] = parts[-2]
            elif len(parts) == 1:
                record['city'] = parts[0]
            
        except Exception as e:
            logger.logger.warning(f"Error parsing location '{location}': {e}")
    
    def _calculate_priority(self, record: Dict[str, Any]) -> int:
        """Calculate priority score for missing children cases."""
        try:
            age = record.get('age', 18)
            if isinstance(age, str):
                age = int(re.search(r'\d+', str(age)).group()) if re.search(r'\d+', str(age)) else 18
            
            # Younger children get higher priority
            for category, config in self.priority_categories.items():
                if age <= config['max_age']:
                    return config['priority']
            
            return 5  # Default priority for older children
            
        except:
            return 5  # Default priority
    
    def _deduplicate_records(self, records: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Remove duplicate records based on name and case number."""
        seen = set()
        deduplicated = []
        
        for record in records:
            # Create a key for deduplication
            name = record.get('name', '').lower().strip()
            case_num = record.get('case_number', '').lower().strip()
            age = str(record.get('age', ''))
            
            key = f"{name}|{case_num}|{age}"
            
            if key not in seen:
                seen.add(key)
                deduplicated.append(record)
        
        logger.logger.info(f"Deduplicated {len(records)} -> {len(deduplicated)} NCMEC records")
        return deduplicated
    
    def validate_record(self, record: Dict[str, Any]) -> bool:
        """Validate an NCMEC record."""
        required_fields = ['name']
        
        # Must have a name
        if not record.get('name'):
            return False
        
        # Age should be reasonable for missing children
        age = record.get('age')
        if age is not None:
            try:
                age_num = int(age) if isinstance(age, str) else age
                if age_num < 0 or age_num > 17:
                    logger.logger.debug(f"Invalid age {age} for missing child: {record.get('name')}")
                    return False
            except:
                pass  # Age validation failed, but we'll allow it
        
        return True
    
    def normalize_record(self, record: Dict[str, Any]) -> Dict[str, Any]:
        """Normalize an NCMEC record to standard format."""
        normalized = super().normalize_record(record)
        
        # NCMEC specific normalizations
        normalized['source_name'] = 'ncmec'
        normalized['category'] = 'Missing Children'
        normalized['country'] = 'USA'
        
        # Ensure we have a case number
        if not normalized.get('case_number'):
            name = normalized.get('name', 'unknown').replace(' ', '-').lower()
            normalized['case_number'] = f"ncmec-{name}-{datetime.now().strftime('%Y%m%d')}"
        
        # Set urgency flag for very young children
        age = normalized.get('age')
        if age is not None:
            try:
                age_num = int(age) if isinstance(age, str) else age
                if age_num <= 5:
                    normalized['urgent'] = True
                    normalized['priority'] = 1
            except:
                pass
        
        # Add report timestamp
        normalized['reported_missing'] = normalized.get('date_missing', 
                                                      datetime.now().strftime('%Y-%m-%d'))
        
        return normalized


def main():
    """CLI entry point for NCMEC collection."""
    import argparse
    
    parser = argparse.ArgumentParser(description="NCMEC Missing Children Collector")
    parser.add_argument('--config', help='Configuration file path')
    parser.add_argument('--output', help='Output file path', default='ncmec_cases.json')
    
    args = parser.parse_args()
    
    config = {
        'base_url': 'https://www.missingkids.org',
        'enabled': True,
        'min_delay': 2.0,
        'max_retries': 3,
        'retry_delay': 5.0
    }
    
    collector = NCMECCollector(config)
    
    try:
        records = collector.collect_data()
        
        print(f"Collected {len(records)} missing children cases from NCMEC")
        
        # Save to file
        with open(args.output, 'w') as f:
            json.dump(records, f, indent=2, default=str)
        
        print(f"Saved to {args.output}")
        
        # Show sample records
        for i, record in enumerate(records[:3]):
            print(f"\nSample Record {i+1}:")
            print(f"  Name: {record.get('name', 'Unknown')}")
            print(f"  Age: {record.get('age', 'Unknown')}")
            print(f"  Location: {record.get('location', 'Unknown')}")
            print(f"  Case: {record.get('case_number', 'Unknown')}")
            print(f"  Priority: {record.get('priority', 5)}")
        
    except Exception as e:
        print(f"Collection failed: {e}")
        return 1
    
    return 0


if __name__ == '__main__':
    exit(main())