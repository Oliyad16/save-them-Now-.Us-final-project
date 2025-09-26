"""
California Department of Justice Missing Persons Collector

This collector interfaces with California DOJ's missing persons database
to collect and process missing persons cases from California.
"""

import requests
import json
import time
import re
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
from bs4 import BeautifulSoup
import xml.etree.ElementTree as ET

from .base_collector import BaseCollector
from ..utils.logger import get_logger

logger = get_logger("ca_doj_collector")


class CADOJCollector(BaseCollector):
    """Collector for California Department of Justice missing persons data."""
    
    def __init__(self, config: Dict[str, Any] = None):
        super().__init__(config)
        
        self.name = "California DOJ"
        self.source = "ca_doj"
        self.priority = 3  # Medium-high priority for state data
        
        # California DOJ endpoints and URLs
        self.base_url = "https://oag.ca.gov"
        self.missing_persons_url = f"{self.base_url}/missing"
        self.api_url = f"{self.base_url}/api/missing-persons"  # Potential API endpoint
        
        # Collection configuration
        self.collection_config = {
            'batch_size': 25,
            'max_records': 500,
            'request_delay': 2.0,  # 2 seconds between requests
            'timeout': 30,
            'max_retries': 3,
            'user_agent': 'SaveThemNow Missing Persons Research Bot 1.0'
        }
        
        # California-specific field mappings
        self.field_mappings = {
            'name': ['full_name', 'missing_person_name', 'name', 'person_name'],
            'age': ['age', 'age_missing', 'current_age', 'age_at_disappearance'],
            'gender': ['gender', 'sex'],
            'race': ['race', 'ethnicity', 'race_ethnicity'],
            'height': ['height', 'height_feet_inches', 'physical_height'],
            'weight': ['weight', 'weight_lbs', 'physical_weight'],
            'hair_color': ['hair', 'hair_color', 'hair_colour'],
            'eye_color': ['eyes', 'eye_color', 'eye_colour'],
            'city': ['city', 'missing_from_city', 'last_seen_city'],
            'state': ['state', 'missing_from_state'],
            'county': ['county', 'missing_from_county'],
            'date_missing': ['date_missing', 'missing_date', 'date_last_seen', 'disappearance_date'],
            'case_number': ['case_number', 'doj_case_number', 'case_id', 'report_number'],
            'agency': ['investigating_agency', 'agency', 'law_enforcement_agency'],
            'circumstances': ['circumstances', 'case_details', 'description', 'summary']
        }
        
        # Request headers
        self.headers = {
            'User-Agent': self.collection_config['user_agent'],
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1'
        }
    
    def collect_data(self, days_back: int = 30) -> List[Dict[str, Any]]:
        """Collect missing persons data from California DOJ."""
        logger.info("Starting California DOJ data collection")
        
        collected_records = []
        collection_methods = [
            self._collect_from_main_database,
            self._collect_from_recent_cases,
            self._collect_from_children_cases,
            self._collect_from_cold_cases
        ]
        
        for method in collection_methods:
            try:
                records = method(days_back)
                if records:
                    collected_records.extend(records)
                    logger.info(f"Collected {len(records)} records from {method.__name__}")
                
                # Respect rate limits
                time.sleep(self.collection_config['request_delay'])
                
            except Exception as e:
                logger.error(f"Error in collection method {method.__name__}: {e}")
                continue
        
        # Remove duplicates based on case number and name
        unique_records = self._deduplicate_records(collected_records)
        logger.info(f"California DOJ collection completed: {len(unique_records)} unique records")
        
        return unique_records
    
    def _collect_from_main_database(self, days_back: int) -> List[Dict[str, Any]]:
        """Collect from main missing persons database."""
        records = []
        
        try:
            # Try API endpoint first
            api_records = self._try_api_collection(days_back)
            if api_records:
                records.extend(api_records)
            
            # Fallback to web scraping
            web_records = self._scrape_missing_persons_page()
            if web_records:
                records.extend(web_records)
            
        except Exception as e:
            logger.error(f"Error collecting from main database: {e}")
        
        return records
    
    def _collect_from_recent_cases(self, days_back: int) -> List[Dict[str, Any]]:
        """Collect recent missing persons cases."""
        records = []
        
        try:
            # Look for recent cases page or RSS feed
            recent_url = f"{self.missing_persons_url}/recent"
            response = self._make_request(recent_url)
            
            if response and response.status_code == 200:
                soup = BeautifulSoup(response.text, 'html.parser')
                case_records = self._parse_case_listings(soup, days_back)
                records.extend(case_records)
            
        except Exception as e:
            logger.error(f"Error collecting recent cases: {e}")
        
        return records
    
    def _collect_from_children_cases(self, days_back: int) -> List[Dict[str, Any]]:
        """Collect missing children cases with high priority."""
        records = []
        
        try:
            # Look for children-specific page
            children_urls = [
                f"{self.missing_persons_url}/children",
                f"{self.missing_persons_url}/minors",
                f"{self.base_url}/children/missing"
            ]
            
            for url in children_urls:
                try:
                    response = self._make_request(url)
                    if response and response.status_code == 200:
                        soup = BeautifulSoup(response.text, 'html.parser')
                        child_records = self._parse_children_cases(soup)
                        
                        # Mark as high priority
                        for record in child_records:
                            record['priority_score'] = self._calculate_child_priority(record)
                            record['category'] = 'Missing Children'
                        
                        records.extend(child_records)
                        break  # Found working URL
                        
                except Exception as e:
                    logger.warning(f"Children cases URL failed {url}: {e}")
                    continue
            
        except Exception as e:
            logger.error(f"Error collecting children cases: {e}")
        
        return records
    
    def _collect_from_cold_cases(self, days_back: int) -> List[Dict[str, Any]]:
        """Collect unsolved/cold missing persons cases."""
        records = []
        
        try:
            cold_case_urls = [
                f"{self.missing_persons_url}/unsolved",
                f"{self.missing_persons_url}/cold-cases",
                f"{self.base_url}/cold-cases/missing"
            ]
            
            for url in cold_case_urls:
                try:
                    response = self._make_request(url)
                    if response and response.status_code == 200:
                        soup = BeautifulSoup(response.text, 'html.parser')
                        cold_records = self._parse_case_listings(soup, days_back * 30)  # Extended range for cold cases
                        
                        # Mark as cold cases
                        for record in cold_records:
                            record['case_type'] = 'Cold Case'
                            record['priority_score'] = self._calculate_cold_case_priority(record)
                        
                        records.extend(cold_records)
                        break
                        
                except Exception as e:
                    logger.warning(f"Cold cases URL failed {url}: {e}")
                    continue
            
        except Exception as e:
            logger.error(f"Error collecting cold cases: {e}")
        
        return records
    
    def _try_api_collection(self, days_back: int) -> List[Dict[str, Any]]:
        """Try to collect data from potential API endpoints."""
        records = []
        
        # Potential API endpoints to try
        api_endpoints = [
            f"{self.api_url}/search",
            f"{self.api_url}/cases",
            f"{self.base_url}/api/v1/missing",
            f"{self.base_url}/data/missing.json",
            f"{self.base_url}/feed/missing.xml"
        ]
        
        for endpoint in api_endpoints:
            try:
                response = self._make_request(endpoint)
                if response and response.status_code == 200:
                    
                    content_type = response.headers.get('content-type', '').lower()
                    
                    if 'application/json' in content_type:
                        data = response.json()
                        api_records = self._parse_json_response(data)
                        records.extend(api_records)
                        logger.info(f"Successfully collected from JSON API: {endpoint}")
                        break
                    
                    elif 'xml' in content_type:
                        xml_records = self._parse_xml_response(response.text)
                        records.extend(xml_records)
                        logger.info(f"Successfully collected from XML API: {endpoint}")
                        break
                
            except Exception as e:
                logger.debug(f"API endpoint failed {endpoint}: {e}")
                continue
        
        return records
    
    def _scrape_missing_persons_page(self) -> List[Dict[str, Any]]:
        """Scrape the main missing persons web page."""
        records = []
        
        try:
            response = self._make_request(self.missing_persons_url)
            if not response or response.status_code != 200:
                return records
            
            soup = BeautifulSoup(response.text, 'html.parser')
            
            # Look for various patterns of case listings
            case_selectors = [
                '.missing-person-case',
                '.case-listing',
                '.person-card',
                '.missing-case',
                '[data-case-id]',
                '.case-item'
            ]
            
            cases_found = False
            for selector in case_selectors:
                case_elements = soup.select(selector)
                if case_elements:
                    cases_found = True
                    for element in case_elements:
                        case_data = self._extract_case_from_element(element)
                        if case_data:
                            records.append(case_data)
                    break
            
            # If no structured cases found, try to extract from tables or lists
            if not cases_found:
                table_records = self._extract_from_tables(soup)
                records.extend(table_records)
            
        except Exception as e:
            logger.error(f"Error scraping missing persons page: {e}")
        
        return records
    
    def _parse_case_listings(self, soup: BeautifulSoup, days_back: int) -> List[Dict[str, Any]]:
        """Parse case listings from HTML soup."""
        records = []
        cutoff_date = datetime.now() - timedelta(days=days_back)
        
        # Look for various case listing patterns
        case_patterns = [
            {'selector': '.case', 'name': '.name, .person-name, h3, h4'},
            {'selector': '.person', 'name': '.full-name, .name'},
            {'selector': '.missing-person', 'name': '.name, h2, h3'},
            {'selector': 'tr', 'name': 'td:first-child, .name-cell'}
        ]
        
        for pattern in case_patterns:
            elements = soup.select(pattern['selector'])
            
            for element in elements:
                try:
                    case_data = self._extract_case_from_element(element)
                    if case_data:
                        # Filter by date if available
                        case_date = self._parse_date(case_data.get('date_missing'))
                        if case_date and case_date < cutoff_date:
                            continue
                        
                        records.append(case_data)
                
                except Exception as e:
                    logger.debug(f"Error parsing case element: {e}")
                    continue
            
            if records:  # Found working pattern
                break
        
        return records
    
    def _parse_children_cases(self, soup: BeautifulSoup) -> List[Dict[str, Any]]:
        """Parse missing children cases specifically."""
        records = []
        
        # Children cases often have specific styling or classes
        child_selectors = [
            '.child-case',
            '.missing-child',
            '.juvenile-case',
            '.minor-case',
            '[data-age]',
            '.age-under-18'
        ]
        
        for selector in child_selectors:
            elements = soup.select(selector)
            for element in elements:
                case_data = self._extract_case_from_element(element)
                if case_data:
                    # Ensure it's marked as a child case
                    age = self._parse_age(case_data.get('age'))
                    if age and age < 18:
                        case_data['category'] = 'Missing Children'
                        case_data['is_child'] = True
                        records.append(case_data)
        
        return records
    
    def _extract_case_from_element(self, element) -> Optional[Dict[str, Any]]:
        """Extract case data from HTML element."""
        try:
            case_data = {}
            
            # Extract name
            name_selectors = ['.name', '.person-name', '.full-name', 'h2', 'h3', 'h4', '.title']
            name = self._extract_text_by_selectors(element, name_selectors)
            if name:
                case_data['name'] = self._clean_name(name)
            
            # Extract age
            age_selectors = ['.age', '[data-age]', '.person-age']
            age_text = self._extract_text_by_selectors(element, age_selectors)
            if not age_text:
                # Look for age in text content
                age_match = re.search(r'\b(?:Age|age):\s*(\d+)', element.get_text())
                if age_match:
                    age_text = age_match.group(1)
            
            if age_text:
                case_data['age'] = self._parse_age(age_text)
            
            # Extract other fields
            field_extractions = {
                'gender': ['.gender', '.sex', '[data-gender]'],
                'race': ['.race', '.ethnicity', '[data-race]'],
                'city': ['.city', '.location', '.missing-from'],
                'date_missing': ['.date', '.missing-date', '.date-missing'],
                'case_number': ['.case-number', '.case-id', '[data-case-id]'],
                'agency': ['.agency', '.department', '.investigating-agency']
            }
            
            for field, selectors in field_extractions.items():
                value = self._extract_text_by_selectors(element, selectors)
                if value:
                    case_data[field] = value.strip()
            
            # Extract from data attributes
            for attr in element.attrs:
                if attr.startswith('data-'):
                    field_name = attr[5:]  # Remove 'data-' prefix
                    if field_name in ['name', 'age', 'gender', 'city', 'case-id']:
                        case_data[field_name.replace('-', '_')] = element[attr]
            
            # Look for links to detailed case pages
            case_link = element.find('a', href=True)
            if case_link:
                case_data['detail_url'] = self._resolve_url(case_link['href'])
            
            # Extract additional details from text content if needed
            text_content = element.get_text()
            additional_data = self._extract_from_text(text_content)
            case_data.update(additional_data)
            
            # Set source information
            case_data.update({
                'source': self.source,
                'source_name': self.name,
                'state': 'California',
                'collected_at': datetime.now().isoformat()
            })
            
            return case_data if case_data.get('name') else None
            
        except Exception as e:
            logger.debug(f"Error extracting case from element: {e}")
            return None
    
    def _extract_from_tables(self, soup: BeautifulSoup) -> List[Dict[str, Any]]:
        """Extract case data from HTML tables."""
        records = []
        
        tables = soup.find_all('table')
        for table in tables:
            try:
                # Get table headers
                headers = []
                header_row = table.find('tr')
                if header_row:
                    headers = [th.get_text().strip().lower() for th in header_row.find_all(['th', 'td'])]
                
                # Process data rows
                rows = table.find_all('tr')[1:]  # Skip header row
                for row in rows:
                    cells = row.find_all(['td', 'th'])
                    if len(cells) >= 2:  # Need at least name and one other field
                        case_data = self._extract_from_table_row(headers, cells)
                        if case_data:
                            case_data.update({
                                'source': self.source,
                                'source_name': self.name,
                                'state': 'California',
                                'collected_at': datetime.now().isoformat()
                            })
                            records.append(case_data)
            
            except Exception as e:
                logger.debug(f"Error processing table: {e}")
                continue
        
        return records
    
    def _extract_from_table_row(self, headers: List[str], cells) -> Optional[Dict[str, Any]]:
        """Extract case data from table row."""
        if not headers or len(cells) != len(headers):
            # Try to extract without headers
            if len(cells) >= 2:
                return {
                    'name': cells[0].get_text().strip(),
                    'description': ' '.join(cell.get_text().strip() for cell in cells[1:])
                }
            return None
        
        case_data = {}
        for i, header in enumerate(headers):
            if i < len(cells):
                cell_text = cells[i].get_text().strip()
                
                # Map headers to standard fields
                field_name = self._map_header_to_field(header)
                if field_name and cell_text:
                    if field_name == 'age':
                        case_data[field_name] = self._parse_age(cell_text)
                    elif field_name == 'date_missing':
                        case_data[field_name] = self._parse_date(cell_text)
                    else:
                        case_data[field_name] = cell_text
        
        return case_data if case_data.get('name') else None
    
    def _map_header_to_field(self, header: str) -> Optional[str]:
        """Map table header to standard field name."""
        header_lower = header.lower().strip()
        
        mappings = {
            'name': ['name', 'full name', 'person name', 'missing person'],
            'age': ['age', 'age missing', 'current age'],
            'gender': ['gender', 'sex'],
            'race': ['race', 'ethnicity', 'race/ethnicity'],
            'city': ['city', 'location', 'missing from', 'last seen'],
            'date_missing': ['date missing', 'missing date', 'date last seen', 'disappeared'],
            'case_number': ['case number', 'case id', 'case #', 'report number'],
            'agency': ['agency', 'department', 'investigating agency']
        }
        
        for field, aliases in mappings.items():
            if any(alias in header_lower for alias in aliases):
                return field
        
        return None
    
    def _parse_json_response(self, data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Parse JSON API response."""
        records = []
        
        try:
            # Handle different JSON structures
            if isinstance(data, list):
                records_data = data
            elif 'data' in data:
                records_data = data['data']
            elif 'cases' in data:
                records_data = data['cases']
            elif 'missing_persons' in data:
                records_data = data['missing_persons']
            else:
                records_data = [data]  # Single record
            
            for record_data in records_data:
                if isinstance(record_data, dict):
                    normalized_record = self._normalize_record(record_data)
                    normalized_record.update({
                        'source': self.source,
                        'source_name': self.name,
                        'state': 'California',
                        'collected_at': datetime.now().isoformat()
                    })
                    records.append(normalized_record)
        
        except Exception as e:
            logger.error(f"Error parsing JSON response: {e}")
        
        return records
    
    def _parse_xml_response(self, xml_text: str) -> List[Dict[str, Any]]:
        """Parse XML API response."""
        records = []
        
        try:
            root = ET.fromstring(xml_text)
            
            # Look for common XML structures
            case_elements = (
                root.findall('.//case') or 
                root.findall('.//missing_person') or 
                root.findall('.//person') or 
                root.findall('.//item')
            )
            
            for element in case_elements:
                record_data = {}
                
                # Extract all child elements
                for child in element:
                    field_name = self._map_xml_field(child.tag)
                    if field_name:
                        record_data[field_name] = child.text
                
                # Extract attributes
                for attr_name, attr_value in element.attrib.items():
                    field_name = self._map_xml_field(attr_name)
                    if field_name:
                        record_data[field_name] = attr_value
                
                if record_data:
                    normalized_record = self._normalize_record(record_data)
                    normalized_record.update({
                        'source': self.source,
                        'source_name': self.name,
                        'state': 'California',
                        'collected_at': datetime.now().isoformat()
                    })
                    records.append(normalized_record)
        
        except ET.ParseError as e:
            logger.error(f"Error parsing XML response: {e}")
        except Exception as e:
            logger.error(f"Error processing XML data: {e}")
        
        return records
    
    def _map_xml_field(self, xml_field: str) -> Optional[str]:
        """Map XML field name to standard field."""
        field_lower = xml_field.lower()
        
        mappings = {
            'name': ['name', 'fullname', 'personname', 'missingperson'],
            'age': ['age', 'agemissing', 'currentage'],
            'gender': ['gender', 'sex'],
            'race': ['race', 'ethnicity'],
            'city': ['city', 'location', 'missingfrom'],
            'date_missing': ['datemissing', 'missingdate', 'datelastseen'],
            'case_number': ['casenumber', 'caseid', 'reportnumber'],
            'agency': ['agency', 'department']
        }
        
        for standard_field, variants in mappings.items():
            if any(variant in field_lower for variant in variants):
                return standard_field
        
        return None
    
    def _calculate_child_priority(self, record: Dict[str, Any]) -> int:
        """Calculate priority score for missing children cases."""
        priority = 80  # Base high priority for children
        
        try:
            # Age factor - younger children get higher priority
            age = record.get('age')
            if age:
                if age <= 5:
                    priority += 20
                elif age <= 10:
                    priority += 15
                elif age <= 15:
                    priority += 10
                else:
                    priority += 5
            
            # Recent cases get higher priority
            date_missing = self._parse_date(record.get('date_missing'))
            if date_missing:
                days_missing = (datetime.now() - date_missing).days
                if days_missing <= 1:
                    priority += 30
                elif days_missing <= 7:
                    priority += 20
                elif days_missing <= 30:
                    priority += 10
            
            # AMBER Alert eligible cases
            if self._is_amber_alert_eligible(record):
                priority += 25
        
        except Exception as e:
            logger.debug(f"Error calculating child priority: {e}")
        
        return min(priority, 100)  # Cap at 100
    
    def _calculate_cold_case_priority(self, record: Dict[str, Any]) -> int:
        """Calculate priority score for cold cases."""
        priority = 30  # Lower base priority for cold cases
        
        try:
            # Child cold cases get higher priority
            age = record.get('age')
            if age and age < 18:
                priority += 25
            
            # Cases with more details get slightly higher priority
            detail_fields = ['circumstances', 'description', 'physical_description']
            details_count = sum(1 for field in detail_fields if record.get(field))
            priority += details_count * 3
            
            # Cases from recent years get higher priority
            date_missing = self._parse_date(record.get('date_missing'))
            if date_missing:
                years_missing = (datetime.now() - date_missing).days / 365
                if years_missing <= 2:
                    priority += 15
                elif years_missing <= 5:
                    priority += 10
                elif years_missing <= 10:
                    priority += 5
        
        except Exception as e:
            logger.debug(f"Error calculating cold case priority: {e}")
        
        return max(priority, 20)  # Minimum priority of 20
    
    def _is_amber_alert_eligible(self, record: Dict[str, Any]) -> bool:
        """Check if case might be AMBER Alert eligible."""
        try:
            age = record.get('age')
            if not age or age >= 18:
                return False
            
            # Check for suspicious circumstances
            circumstances = (record.get('circumstances') or '').lower()
            suspicious_indicators = [
                'abduction', 'kidnapped', 'taken', 'suspicious', 
                'vehicle', 'stranger', 'non-custodial'
            ]
            
            return any(indicator in circumstances for indicator in suspicious_indicators)
        
        except Exception:
            return False
    
    def _deduplicate_records(self, records: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Remove duplicate records based on case number and name similarity."""
        if not records:
            return records
        
        unique_records = []
        seen_cases = set()
        seen_names = []
        
        for record in records:
            # Check case number first
            case_number = record.get('case_number')
            if case_number:
                case_key = f"case_{case_number}"
                if case_key in seen_cases:
                    continue
                seen_cases.add(case_key)
            
            # Check name similarity
            name = record.get('name', '').lower().strip()
            if name:
                is_duplicate = False
                for existing_name in seen_names:
                    if self._calculate_similarity(name, existing_name) > 0.85:
                        is_duplicate = True
                        break
                
                if not is_duplicate:
                    seen_names.append(name)
                    unique_records.append(record)
                else:
                    continue
            else:
                # No name, keep if has case number
                if case_number:
                    unique_records.append(record)
        
        return unique_records
    
    def get_collection_stats(self) -> Dict[str, Any]:
        """Get statistics about the collection process."""
        return {
            'collector_name': self.name,
            'source': self.source,
            'priority': self.priority,
            'last_collection': getattr(self, 'last_collection_time', None),
            'total_collected': getattr(self, 'total_records_collected', 0),
            'collection_methods': [
                'Main Database',
                'Recent Cases',
                'Missing Children',
                'Cold Cases'
            ],
            'specializations': [
                'Missing Children (high priority)',
                'Cold Cases',
                'California statewide coverage',
                'Multi-source collection'
            ]
        }


if __name__ == "__main__":
    # Test the collector
    collector = CADOJCollector()
    
    print(f"Testing {collector.name} collector...")
    
    try:
        records = collector.collect_data(days_back=7)
        print(f"Collected {len(records)} records")
        
        if records:
            sample_record = records[0]
            print(f"Sample record: {json.dumps(sample_record, indent=2, default=str)}")
        
        stats = collector.get_collection_stats()
        print(f"Collection stats: {json.dumps(stats, indent=2, default=str)}")
        
    except Exception as e:
        print(f"Error testing collector: {e}")