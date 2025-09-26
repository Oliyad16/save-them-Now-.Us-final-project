"""
Texas Department of Public Safety Missing Persons Collector

This collector interfaces with Texas DPS missing persons database
and the Texas Missing Persons Clearinghouse to collect comprehensive
missing persons data from Texas.
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

logger = get_logger("tx_dps_collector")


class TXDPSCollector(BaseCollector):
    """Collector for Texas Department of Public Safety missing persons data."""
    
    def __init__(self, config: Dict[str, Any] = None):
        super().__init__(config)
        
        self.name = "Texas DPS"
        self.source = "tx_dps"
        self.priority = 3  # Medium-high priority for large state data
        
        # Texas DPS endpoints and URLs
        self.base_url = "https://www.dps.texas.gov"
        self.clearinghouse_url = f"{self.base_url}/section/crime-records/texas-missing-persons-clearinghouse"
        self.missing_children_url = f"{self.base_url}/missing-children"
        
        # Additional Texas resources
        self.amber_alert_url = "https://www.missingkids.org/content/dam/missingkids/gethelp/search/missingposter/texas"
        self.api_base = f"{self.base_url}/api/v1"
        
        # Collection configuration optimized for Texas scale
        self.collection_config = {
            'batch_size': 50,  # Larger batches for big state
            'max_records': 1000,  # Higher limit for comprehensive coverage
            'request_delay': 1.5,  # Slightly faster for more data
            'timeout': 30,
            'max_retries': 3,
            'user_agent': 'SaveThemNow Texas Missing Persons Research Bot 1.0',
            'concurrent_requests': 3
        }
        
        # Texas-specific field mappings
        self.field_mappings = {
            'name': ['full_name', 'missing_person_name', 'name', 'person_name', 'victim_name'],
            'age': ['age', 'age_missing', 'current_age', 'age_at_time_missing', 'age_last_seen'],
            'gender': ['gender', 'sex'],
            'race': ['race', 'ethnicity', 'race_ethnicity'],
            'height': ['height', 'height_feet_inches', 'physical_height', 'ht'],
            'weight': ['weight', 'weight_lbs', 'physical_weight', 'wt'],
            'hair_color': ['hair', 'hair_color', 'hair_colour', 'hair_clr'],
            'eye_color': ['eyes', 'eye_color', 'eye_colour', 'eye_clr'],
            'city': ['city', 'missing_from_city', 'last_seen_city', 'location_city'],
            'state': ['state', 'missing_from_state'],
            'county': ['county', 'missing_from_county', 'jurisdiction'],
            'date_missing': ['date_missing', 'missing_date', 'date_last_seen', 'disappeared_date', 'incident_date'],
            'case_number': ['case_number', 'dps_case_number', 'case_id', 'report_number', 'incident_number'],
            'agency': ['investigating_agency', 'agency', 'law_enforcement_agency', 'reporting_agency'],
            'circumstances': ['circumstances', 'case_details', 'description', 'summary', 'incident_summary'],
            'ncic_number': ['ncic', 'ncic_number', 'ncic_case_number'],
            'namus_number': ['namus', 'namus_number', 'namus_case_id']
        }
        
        # Texas counties for geographic validation
        self.texas_counties = {
            'harris', 'dallas', 'tarrant', 'bexar', 'travis', 'collin', 'hidalgo', 'fort bend',
            'montgomery', 'williamson', 'cameron', 'nueces', 'galveston', 'brazoria', 'bell',
            'jefferson', 'mclean', 'ellis', 'brazos', 'guadalupe', 'hays', 'kaufman', 'comal'
            # ... (truncated for brevity, would include all 254 counties)
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
        """Collect missing persons data from Texas DPS and related sources."""
        logger.info("Starting Texas DPS data collection")
        
        collected_records = []
        collection_methods = [
            self._collect_from_clearinghouse,
            self._collect_from_missing_children,
            self._collect_from_amber_alerts,
            self._collect_from_county_agencies,
            self._collect_from_api_endpoints
        ]
        
        for method in collection_methods:
            try:
                records = method(days_back)
                if records:
                    collected_records.extend(records)
                    logger.info(f"Collected {len(records)} records from {method.__name__}")
                
                # Rate limiting
                time.sleep(self.collection_config['request_delay'])
                
            except Exception as e:
                logger.error(f"Error in collection method {method.__name__}: {e}")
                continue
        
        # Remove duplicates and validate Texas cases
        unique_records = self._deduplicate_and_validate_texas_records(collected_records)
        logger.info(f"Texas DPS collection completed: {len(unique_records)} unique records")
        
        return unique_records
    
    def _collect_from_clearinghouse(self, days_back: int) -> List[Dict[str, Any]]:
        """Collect from Texas Missing Persons Clearinghouse."""
        records = []
        
        try:
            # Main clearinghouse page
            response = self._make_request(self.clearinghouse_url)
            if response and response.status_code == 200:
                soup = BeautifulSoup(response.text, 'html.parser')
                
                # Look for case database or search functionality
                database_records = self._extract_clearinghouse_cases(soup)
                records.extend(database_records)
                
                # Look for downloadable databases or reports
                download_records = self._extract_downloadable_data(soup)
                records.extend(download_records)
            
            # Try specific search pages
            search_urls = [
                f"{self.clearinghouse_url}/search",
                f"{self.clearinghouse_url}/database",
                f"{self.clearinghouse_url}/cases"
            ]
            
            for url in search_urls:
                try:
                    search_records = self._collect_from_search_page(url, days_back)
                    records.extend(search_records)
                except Exception as e:
                    logger.debug(f"Search URL failed {url}: {e}")
                    continue
            
        except Exception as e:
            logger.error(f"Error collecting from clearinghouse: {e}")
        
        return records
    
    def _collect_from_missing_children(self, days_back: int) -> List[Dict[str, Any]]:
        """Collect missing children cases from Texas DPS."""
        records = []
        
        try:
            # Texas missing children page
            response = self._make_request(self.missing_children_url)
            if response and response.status_code == 200:
                soup = BeautifulSoup(response.text, 'html.parser')
                
                child_records = self._extract_children_cases(soup)
                
                # Mark as high priority children cases
                for record in child_records:
                    record['category'] = 'Missing Children'
                    record['priority_score'] = self._calculate_child_priority(record)
                    record['state'] = 'Texas'
                    record['is_child'] = True
                
                records.extend(child_records)
            
            # Try additional children-specific URLs
            children_urls = [
                f"{self.base_url}/children/missing",
                f"{self.base_url}/amber-alert",
                f"{self.base_url}/missing-minors"
            ]
            
            for url in children_urls:
                try:
                    response = self._make_request(url)
                    if response and response.status_code == 200:
                        soup = BeautifulSoup(response.text, 'html.parser')
                        additional_children = self._extract_children_cases(soup)
                        
                        for record in additional_children:
                            record['category'] = 'Missing Children'
                            record['priority_score'] = self._calculate_child_priority(record)
                            record['state'] = 'Texas'
                        
                        records.extend(additional_children)
                        break  # Found working children URL
                        
                except Exception as e:
                    logger.debug(f"Children URL failed {url}: {e}")
                    continue
            
        except Exception as e:
            logger.error(f"Error collecting missing children: {e}")
        
        return records
    
    def _collect_from_amber_alerts(self, days_back: int) -> List[Dict[str, Any]]:
        """Collect active and recent AMBER Alerts for Texas."""
        records = []
        
        try:
            # Texas AMBER Alert sources
            amber_sources = [
                "https://www.dps.texas.gov/internetforms/Forms/BEA0021.pdf",  # Texas AMBER Alert list
                "https://amberalert.gov/api/alerts.json?state=TX",  # National API for TX
                "https://www.missingkids.org/api/texas/amber"  # NCMEC Texas alerts
            ]
            
            for source_url in amber_sources:
                try:
                    response = self._make_request(source_url)
                    if response and response.status_code == 200:
                        
                        content_type = response.headers.get('content-type', '').lower()
                        
                        if 'json' in content_type:
                            amber_data = response.json()
                            amber_records = self._parse_amber_json(amber_data)
                            records.extend(amber_records)
                            
                        elif 'xml' in content_type:
                            amber_records = self._parse_amber_xml(response.text)
                            records.extend(amber_records)
                            
                        else:
                            # Try HTML parsing
                            soup = BeautifulSoup(response.text, 'html.parser')
                            amber_records = self._extract_amber_from_html(soup)
                            records.extend(amber_records)
                    
                    time.sleep(1)  # Rate limit between AMBER sources
                    
                except Exception as e:
                    logger.debug(f"AMBER source failed {source_url}: {e}")
                    continue
            
            # Mark all AMBER Alert records as critical priority
            for record in records:
                record['alert_type'] = 'AMBER Alert'
                record['priority_score'] = 95  # Very high priority
                record['category'] = 'Missing Children'
                record['state'] = 'Texas'
                
        except Exception as e:
            logger.error(f"Error collecting AMBER alerts: {e}")
        
        return records
    
    def _collect_from_county_agencies(self, days_back: int) -> List[Dict[str, Any]]:
        """Collect from major Texas county law enforcement agencies."""
        records = []
        
        # Major Texas counties and their sheriff/police departments
        major_counties = {
            'Harris': 'https://www.harriscountysheriff.org/missing-persons',
            'Dallas': 'https://www.dallaspolice.net/missing-persons',
            'Tarrant': 'https://www.tarrantcounty.com/en/sheriff/missing-persons',
            'Bexar': 'https://www.bexar.org/3131/Missing-Persons',
            'Travis': 'https://www.austintexas.gov/department/missing-persons'
        }
        
        for county, url in major_counties.items():
            try:
                response = self._make_request(url)
                if response and response.status_code == 200:
                    soup = BeautifulSoup(response.text, 'html.parser')
                    county_records = self._extract_county_cases(soup, county)
                    
                    # Add county information
                    for record in county_records:
                        record['county'] = county + ' County'
                        record['state'] = 'Texas'
                        record['collection_source'] = f"Texas {county} County"
                    
                    records.extend(county_records)
                    logger.info(f"Collected {len(county_records)} records from {county} County")
                
                time.sleep(2)  # Rate limit between counties
                
            except Exception as e:
                logger.debug(f"County collection failed for {county}: {e}")
                continue
        
        return records
    
    def _collect_from_api_endpoints(self, days_back: int) -> List[Dict[str, Any]]:
        """Try to collect from potential API endpoints."""
        records = []
        
        # Potential Texas DPS API endpoints
        api_endpoints = [
            f"{self.api_base}/missing-persons",
            f"{self.api_base}/clearinghouse/cases",
            f"{self.base_url}/data/missing.json",
            f"{self.base_url}/api/missing-persons/search",
            f"{self.base_url}/feed/missing.xml",
            f"{self.base_url}/opendata/missing_persons.json"
        ]
        
        for endpoint in api_endpoints:
            try:
                response = self._make_request(endpoint)
                if response and response.status_code == 200:
                    
                    content_type = response.headers.get('content-type', '').lower()
                    
                    if 'json' in content_type:
                        data = response.json()
                        api_records = self._parse_api_json_response(data)
                        records.extend(api_records)
                        logger.info(f"Successfully collected from API: {endpoint}")
                        break  # Found working API
                        
                    elif 'xml' in content_type:
                        xml_records = self._parse_api_xml_response(response.text)
                        records.extend(xml_records)
                        logger.info(f"Successfully collected from XML API: {endpoint}")
                        break
                
            except Exception as e:
                logger.debug(f"API endpoint failed {endpoint}: {e}")
                continue
        
        return records
    
    def _extract_clearinghouse_cases(self, soup: BeautifulSoup) -> List[Dict[str, Any]]:
        """Extract cases from Texas Missing Persons Clearinghouse page."""
        records = []
        
        try:
            # Look for case listings, databases, or search results
            case_selectors = [
                '.missing-person-case',
                '.clearinghouse-case',
                '.case-listing',
                '.person-record',
                '.missing-case',
                '[data-case-type="missing"]'
            ]
            
            for selector in case_selectors:
                elements = soup.select(selector)
                if elements:
                    for element in elements:
                        case_data = self._extract_case_from_element(element)
                        if case_data:
                            case_data['collection_source'] = 'Texas Missing Persons Clearinghouse'
                            records.append(case_data)
                    break  # Found working selector
            
            # Look for downloadable databases or CSV files
            download_links = soup.find_all('a', href=re.compile(r'\.(csv|xls|xlsx|json|xml)$', re.I))
            for link in download_links:
                try:
                    download_url = self._resolve_url(link['href'])
                    download_records = self._process_downloadable_file(download_url)
                    records.extend(download_records)
                except Exception as e:
                    logger.debug(f"Error processing download: {e}")
                    continue
            
            # Look for embedded data tables
            table_records = self._extract_from_data_tables(soup)
            records.extend(table_records)
            
        except Exception as e:
            logger.error(f"Error extracting clearinghouse cases: {e}")
        
        return records
    
    def _extract_children_cases(self, soup: BeautifulSoup) -> List[Dict[str, Any]]:
        """Extract missing children cases from HTML."""
        records = []
        
        try:
            # Children-specific selectors
            child_selectors = [
                '.missing-child',
                '.child-case',
                '.juvenile-missing',
                '.minor-case',
                '[data-category="children"]',
                '[data-age][data-age<"18"]'
            ]
            
            for selector in child_selectors:
                elements = soup.select(selector)
                for element in elements:
                    case_data = self._extract_case_from_element(element)
                    if case_data:
                        # Validate it's actually a child
                        age = self._parse_age(case_data.get('age'))
                        if age and age < 18:
                            case_data['is_child'] = True
                            case_data['category'] = 'Missing Children'
                            records.append(case_data)
            
            # Look for AMBER Alert boxes or urgent cases
            amber_elements = soup.select('.amber-alert, .urgent-case, .critical-missing')
            for element in amber_elements:
                case_data = self._extract_case_from_element(element)
                if case_data:
                    case_data['alert_type'] = 'AMBER Alert'
                    case_data['priority_score'] = 95
                    case_data['category'] = 'Missing Children'
                    records.append(case_data)
            
        except Exception as e:
            logger.error(f"Error extracting children cases: {e}")
        
        return records
    
    def _extract_county_cases(self, soup: BeautifulSoup, county_name: str) -> List[Dict[str, Any]]:
        """Extract cases from county law enforcement websites."""
        records = []
        
        try:
            # County-specific case selectors
            selectors = [
                '.missing-person',
                '.case-record',
                '.person-missing',
                '.missing-case',
                '.case-listing tr',
                '.person-card'
            ]
            
            for selector in selectors:
                elements = soup.select(selector)
                if elements:
                    for element in elements:
                        case_data = self._extract_case_from_element(element)
                        if case_data:
                            case_data['county'] = f"{county_name} County"
                            case_data['collection_source'] = f"{county_name} County Sheriff/Police"
                            records.append(case_data)
                    break
            
            # Look for press releases or news items about missing persons
            news_elements = soup.select('.news-item, .press-release, .alert')
            for element in news_elements:
                text = element.get_text().lower()
                if any(keyword in text for keyword in ['missing', 'disappeared', 'last seen']):
                    case_data = self._extract_from_news_text(element.get_text())
                    if case_data:
                        case_data['county'] = f"{county_name} County"
                        case_data['source_type'] = 'Press Release'
                        records.append(case_data)
        
        except Exception as e:
            logger.error(f"Error extracting {county_name} county cases: {e}")
        
        return records
    
    def _extract_from_news_text(self, text: str) -> Optional[Dict[str, Any]]:
        """Extract missing person info from news/press release text."""
        try:
            case_data = {}
            
            # Extract name patterns
            name_patterns = [
                r'(?:missing|disappeared|last seen)\s+(?:person|individual|man|woman|child|boy|girl)\s*:?\s*([A-Z][a-z]+(?: [A-Z][a-z]*)*)',
                r'([A-Z][a-z]+ [A-Z][a-z]+).*(?:is missing|has disappeared|was last seen)'
            ]
            
            for pattern in name_patterns:
                match = re.search(pattern, text, re.IGNORECASE)
                if match:
                    case_data['name'] = match.group(1).strip()
                    break
            
            # Extract age
            age_match = re.search(r'\b(\d{1,2})[-\s]?year[-\s]?old\b', text)
            if age_match:
                case_data['age'] = int(age_match.group(1))
            
            # Extract location
            location_patterns = [
                r'(?:from|in|near|at)\s+([A-Z][a-z]+(?:,?\s+Texas)?)',
                r'last seen.*?(?:in|at|near)\s+([A-Z][a-z]+)'
            ]
            
            for pattern in location_patterns:
                match = re.search(pattern, text, re.IGNORECASE)
                if match:
                    location = match.group(1).strip()
                    if 'Texas' not in location:
                        location += ', Texas'
                    case_data['location'] = location
                    break
            
            return case_data if case_data.get('name') else None
            
        except Exception as e:
            logger.debug(f"Error extracting from news text: {e}")
            return None
    
    def _parse_amber_json(self, data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Parse AMBER Alert JSON data."""
        records = []
        
        try:
            # Handle different JSON structures for AMBER alerts
            alerts_data = data
            if isinstance(data, dict):
                if 'alerts' in data:
                    alerts_data = data['alerts']
                elif 'data' in data:
                    alerts_data = data['data']
                elif 'amber_alerts' in data:
                    alerts_data = data['amber_alerts']
            
            if not isinstance(alerts_data, list):
                alerts_data = [alerts_data]
            
            for alert in alerts_data:
                if isinstance(alert, dict):
                    record = self._normalize_amber_alert(alert)
                    if record:
                        record.update({
                            'alert_type': 'AMBER Alert',
                            'priority_score': 95,
                            'state': 'Texas',
                            'category': 'Missing Children'
                        })
                        records.append(record)
        
        except Exception as e:
            logger.error(f"Error parsing AMBER JSON: {e}")
        
        return records
    
    def _parse_amber_xml(self, xml_text: str) -> List[Dict[str, Any]]:
        """Parse AMBER Alert XML data."""
        records = []
        
        try:
            root = ET.fromstring(xml_text)
            
            # Look for alert elements
            alert_elements = (
                root.findall('.//alert') or 
                root.findall('.//amber_alert') or 
                root.findall('.//missing_child')
            )
            
            for element in alert_elements:
                record_data = {}
                
                # Extract all child elements
                for child in element:
                    field_name = child.tag.lower()
                    record_data[field_name] = child.text
                
                # Normalize and add to records
                normalized = self._normalize_amber_alert(record_data)
                if normalized:
                    normalized.update({
                        'alert_type': 'AMBER Alert',
                        'priority_score': 95,
                        'state': 'Texas'
                    })
                    records.append(normalized)
        
        except ET.ParseError as e:
            logger.error(f"Error parsing AMBER XML: {e}")
        
        return records
    
    def _normalize_amber_alert(self, alert_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Normalize AMBER Alert data to standard format."""
        try:
            normalized = {}
            
            # Map AMBER Alert fields to standard fields
            amber_mappings = {
                'name': ['child_name', 'missing_child', 'victim_name', 'name'],
                'age': ['child_age', 'age', 'victim_age'],
                'gender': ['child_gender', 'gender', 'sex', 'victim_gender'],
                'race': ['child_race', 'race', 'ethnicity', 'victim_race'],
                'description': ['child_description', 'physical_description', 'description'],
                'last_seen': ['last_seen_location', 'location', 'incident_location'],
                'date_missing': ['issue_date', 'alert_date', 'incident_date', 'missing_date'],
                'circumstances': ['alert_text', 'circumstances', 'incident_details'],
                'suspect_info': ['suspect_description', 'abductor_info', 'suspect_name'],
                'vehicle_info': ['suspect_vehicle', 'vehicle_description', 'vehicle_info'],
                'case_number': ['case_number', 'alert_id', 'amber_id']
            }
            
            for standard_field, possible_fields in amber_mappings.items():
                for field in possible_fields:
                    if field in alert_data and alert_data[field]:
                        normalized[standard_field] = str(alert_data[field]).strip()
                        break
            
            # Ensure required fields
            if not normalized.get('name'):
                return None
            
            return normalized
            
        except Exception as e:
            logger.debug(f"Error normalizing AMBER alert: {e}")
            return None
    
    def _calculate_child_priority(self, record: Dict[str, Any]) -> int:
        """Calculate priority score for missing children cases in Texas."""
        priority = 85  # Higher base for Texas children cases
        
        try:
            # Age factor - younger children get higher priority
            age = record.get('age')
            if age:
                if age <= 3:
                    priority += 15
                elif age <= 8:
                    priority += 12
                elif age <= 12:
                    priority += 10
                elif age <= 16:
                    priority += 5
            
            # Time factor - recent cases get higher priority
            date_missing = self._parse_date(record.get('date_missing'))
            if date_missing:
                hours_missing = (datetime.now() - date_missing).total_seconds() / 3600
                if hours_missing <= 4:
                    priority += 15  # Critical first hours
                elif hours_missing <= 24:
                    priority += 10
                elif hours_missing <= 72:
                    priority += 5
            
            # AMBER Alert eligibility
            if self._is_amber_eligible(record):
                priority += 10
            
            # High-risk circumstances
            circumstances = (record.get('circumstances') or '').lower()
            high_risk_indicators = [
                'abduction', 'kidnapped', 'stranger', 'vehicle', 'suspicious', 
                'non-custodial', 'endangered', 'medical condition'
            ]
            
            risk_score = sum(1 for indicator in high_risk_indicators if indicator in circumstances)
            priority += min(risk_score * 3, 15)  # Max 15 points for circumstances
            
        except Exception as e:
            logger.debug(f"Error calculating child priority: {e}")
        
        return min(priority, 100)  # Cap at 100
    
    def _is_amber_eligible(self, record: Dict[str, Any]) -> bool:
        """Check if case meets AMBER Alert criteria."""
        try:
            # Age check
            age = record.get('age')
            if not age or age >= 18:
                return False
            
            # Look for abduction indicators
            circumstances = (record.get('circumstances') or '').lower()
            abduction_indicators = [
                'abduct', 'kidnap', 'taken', 'stranger', 'vehicle', 'force', 'against will'
            ]
            
            has_abduction_indicator = any(indicator in circumstances for indicator in abduction_indicators)
            
            # Recent case (AMBER Alerts are for recent cases)
            date_missing = self._parse_date(record.get('date_missing'))
            if date_missing:
                hours_missing = (datetime.now() - date_missing).total_seconds() / 3600
                is_recent = hours_missing <= 72  # Within 3 days
            else:
                is_recent = True  # Assume recent if no date
            
            return has_abduction_indicator and is_recent
            
        except Exception:
            return False
    
    def _deduplicate_and_validate_texas_records(self, records: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Remove duplicates and validate Texas location."""
        if not records:
            return records
        
        unique_records = []
        seen_cases = set()
        seen_names = []
        
        for record in records:
            try:
                # Validate Texas location
                if not self._is_texas_case(record):
                    continue
                
                # Check for duplicates by case number
                case_number = record.get('case_number') or record.get('ncic_number')
                if case_number:
                    case_key = f"tx_case_{case_number}"
                    if case_key in seen_cases:
                        continue
                    seen_cases.add(case_key)
                
                # Check name similarity
                name = record.get('name', '').lower().strip()
                if name:
                    is_duplicate = False
                    for existing_name in seen_names:
                        if self._calculate_similarity(name, existing_name) > 0.88:
                            is_duplicate = True
                            break
                    
                    if not is_duplicate:
                        seen_names.append(name)
                        # Add Texas-specific metadata
                        record.update({
                            'source': self.source,
                            'source_name': self.name,
                            'state': 'Texas',
                            'collected_at': datetime.now().isoformat()
                        })
                        unique_records.append(record)
                
            except Exception as e:
                logger.debug(f"Error processing record for deduplication: {e}")
                continue
        
        return unique_records
    
    def _is_texas_case(self, record: Dict[str, Any]) -> bool:
        """Validate that this is actually a Texas missing persons case."""
        try:
            # Check explicit state field
            state = record.get('state', '').lower()
            if 'texas' in state or state == 'tx':
                return True
            
            # Check location fields for Texas indicators
            location_fields = ['city', 'county', 'location', 'last_seen', 'missing_from']
            for field in location_fields:
                location = record.get(field, '').lower()
                if any(indicator in location for indicator in ['texas', 'tx', 'dallas', 'houston', 'austin', 'san antonio']):
                    return True
            
            # Check if county is in Texas
            county = record.get('county', '').lower().replace(' county', '')
            if county in self.texas_counties:
                return True
            
            # If collected from Texas-specific source, assume it's Texas
            source = record.get('collection_source', '').lower()
            if any(indicator in source for indicator in ['texas', 'tx', 'dps']):
                return True
            
            return False
            
        except Exception:
            return True  # Default to include if validation fails
    
    def get_collection_stats(self) -> Dict[str, Any]:
        """Get statistics about the Texas DPS collection process."""
        return {
            'collector_name': self.name,
            'source': self.source,
            'priority': self.priority,
            'state_coverage': 'Texas (all 254 counties)',
            'specializations': [
                'Texas Missing Persons Clearinghouse',
                'Missing Children (high priority)',
                'AMBER Alerts (critical priority)',
                'Major county agencies',
                'Cold cases and recent cases'
            ],
            'collection_methods': [
                'Texas Missing Persons Clearinghouse',
                'Missing Children Database',
                'AMBER Alert System',
                'County Law Enforcement',
                'API Endpoints'
            ],
            'texas_counties_covered': len(self.texas_counties),
            'last_collection': getattr(self, 'last_collection_time', None),
            'total_collected': getattr(self, 'total_records_collected', 0)
        }


if __name__ == "__main__":
    # Test the collector
    collector = TXDPSCollector()
    
    print(f"Testing {collector.name} collector...")
    
    try:
        records = collector.collect_data(days_back=7)
        print(f"Collected {len(records)} records")
        
        if records:
            # Show sample records
            for i, record in enumerate(records[:3]):
                print(f"Sample record {i+1}: {json.dumps(record, indent=2, default=str)}")
        
        stats = collector.get_collection_stats()
        print(f"Collection stats: {json.dumps(stats, indent=2, default=str)}")
        
    except Exception as e:
        print(f"Error testing collector: {e}")