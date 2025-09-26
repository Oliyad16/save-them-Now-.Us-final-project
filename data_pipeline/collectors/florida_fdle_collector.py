"""
Florida Department of Law Enforcement (FDLE) Missing Persons Collector

This collector interfaces with FDLE's missing persons database and various
Florida law enforcement agencies to collect comprehensive missing persons
data from Florida.
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

logger = get_logger("florida_fdle_collector")


class FloridaFDLECollector(BaseCollector):
    """Collector for Florida Department of Law Enforcement missing persons data."""
    
    def __init__(self, config: Dict[str, Any] = None):
        super().__init__(config)
        
        self.name = "Florida FDLE"
        self.source = "florida_fdle"
        self.priority = 3  # Medium-high priority for state data
        
        # FDLE endpoints and URLs
        self.base_url = "https://www.fdle.state.fl.us"
        self.missing_persons_url = f"{self.base_url}/Missing-Persons"
        self.missing_children_url = f"{self.base_url}/Missing-Children"
        self.cold_cases_url = f"{self.base_url}/Cold-Cases"
        
        # Additional Florida resources
        self.florida_amber_url = "https://www.flmissingkids.com"
        self.api_base = f"{self.base_url}/api/v1"
        
        # Collection configuration optimized for Florida
        self.collection_config = {
            'batch_size': 40,
            'max_records': 800,
            'request_delay': 1.5,
            'timeout': 30,
            'max_retries': 3,
            'user_agent': 'SaveThemNow Florida Missing Persons Research Bot 1.0',
            'concurrent_requests': 2
        }
        
        # Florida-specific field mappings
        self.field_mappings = {
            'name': ['full_name', 'missing_person_name', 'name', 'person_name', 'subject_name'],
            'age': ['age', 'age_missing', 'current_age', 'age_at_disappearance', 'age_when_missing'],
            'gender': ['gender', 'sex'],
            'race': ['race', 'ethnicity', 'race_ethnicity'],
            'height': ['height', 'height_feet_inches', 'physical_height', 'ht'],
            'weight': ['weight', 'weight_lbs', 'physical_weight', 'wt'],
            'hair_color': ['hair', 'hair_color', 'hair_colour', 'hair_clr'],
            'eye_color': ['eyes', 'eye_color', 'eye_colour', 'eye_clr'],
            'city': ['city', 'missing_from_city', 'last_seen_city', 'location_city'],
            'state': ['state', 'missing_from_state'],
            'county': ['county', 'missing_from_county', 'jurisdiction', 'county_missing'],
            'date_missing': ['date_missing', 'missing_date', 'date_last_seen', 'disappeared_date', 'incident_date'],
            'case_number': ['case_number', 'fdle_case_number', 'case_id', 'report_number', 'ori_number'],
            'agency': ['investigating_agency', 'agency', 'law_enforcement_agency', 'reporting_agency'],
            'circumstances': ['circumstances', 'case_details', 'description', 'summary', 'narrative'],
            'ncic_number': ['ncic', 'ncic_number', 'ncic_case_number'],
            'namus_number': ['namus', 'namus_number', 'namus_case_id']
        }
        
        # Florida counties for validation
        self.florida_counties = {
            'alachua', 'baker', 'bay', 'bradford', 'brevard', 'broward', 'calhoun', 'charlotte',
            'citrus', 'clay', 'collier', 'columbia', 'desoto', 'dixie', 'duval', 'escambia',
            'flagler', 'franklin', 'gadsden', 'gilchrist', 'glades', 'gulf', 'hamilton',
            'hardee', 'hendry', 'hernando', 'highlands', 'hillsborough', 'holmes', 'indian river',
            'jackson', 'jefferson', 'lafayette', 'lake', 'lee', 'leon', 'levy', 'liberty',
            'madison', 'manatee', 'marion', 'martin', 'miami-dade', 'monroe', 'nassau',
            'okaloosa', 'okeechobee', 'orange', 'osceola', 'palm beach', 'pasco', 'pinellas',
            'polk', 'putnam', 'santa rosa', 'sarasota', 'seminole', 'st. johns', 'st. lucie',
            'sumter', 'suwannee', 'taylor', 'union', 'volusia', 'wakulla', 'walton', 'washington'
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
        """Collect missing persons data from Florida FDLE and related sources."""
        logger.info("Starting Florida FDLE data collection")
        
        collected_records = []
        collection_methods = [
            self._collect_from_fdle_database,
            self._collect_from_missing_children,
            self._collect_from_cold_cases,
            self._collect_from_amber_alerts,
            self._collect_from_county_agencies,
            self._collect_from_universities,
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
        
        # Remove duplicates and validate Florida cases
        unique_records = self._deduplicate_and_validate_florida_records(collected_records)
        logger.info(f"Florida FDLE collection completed: {len(unique_records)} unique records")
        
        return unique_records
    
    def _collect_from_fdle_database(self, days_back: int) -> List[Dict[str, Any]]:
        """Collect from main FDLE missing persons database."""
        records = []
        
        try:
            # Main FDLE missing persons page
            response = self._make_request(self.missing_persons_url)
            if response and response.status_code == 200:
                soup = BeautifulSoup(response.text, 'html.parser')
                
                # Extract main database cases
                database_records = self._extract_fdle_cases(soup)
                records.extend(database_records)
                
                # Look for searchable database or case listings
                search_records = self._extract_searchable_cases(soup)
                records.extend(search_records)
            
            # Try specific database URLs
            database_urls = [
                f"{self.missing_persons_url}/database",
                f"{self.missing_persons_url}/search",
                f"{self.missing_persons_url}/cases",
                f"{self.base_url}/CriminalHistory/MissingPersons"
            ]
            
            for url in database_urls:
                try:
                    db_records = self._collect_from_database_page(url, days_back)
                    records.extend(db_records)
                except Exception as e:
                    logger.debug(f"Database URL failed {url}: {e}")
                    continue
            
        except Exception as e:
            logger.error(f"Error collecting from FDLE database: {e}")
        
        return records
    
    def _collect_from_missing_children(self, days_back: int) -> List[Dict[str, Any]]:
        """Collect missing children cases from FDLE."""
        records = []
        
        try:
            # FDLE missing children page
            response = self._make_request(self.missing_children_url)
            if response and response.status_code == 200:
                soup = BeautifulSoup(response.text, 'html.parser')
                
                child_records = self._extract_children_cases(soup)
                
                # Mark as high priority children cases
                for record in child_records:
                    record['category'] = 'Missing Children'
                    record['priority_score'] = self._calculate_child_priority(record)
                    record['state'] = 'Florida'
                    record['is_child'] = True
                
                records.extend(child_records)
            
            # Try Florida Missing Kids website
            try:
                fl_kids_response = self._make_request(self.florida_amber_url)
                if fl_kids_response and fl_kids_response.status_code == 200:
                    soup = BeautifulSoup(fl_kids_response.text, 'html.parser')
                    fl_kids_records = self._extract_fl_missing_kids_cases(soup)
                    
                    for record in fl_kids_records:
                        record['category'] = 'Missing Children'
                        record['state'] = 'Florida'
                        record['collection_source'] = 'Florida Missing Kids'
                    
                    records.extend(fl_kids_records)
            except Exception as e:
                logger.debug(f"Florida Missing Kids collection failed: {e}")
            
        except Exception as e:
            logger.error(f"Error collecting missing children: {e}")
        
        return records
    
    def _collect_from_cold_cases(self, days_back: int) -> List[Dict[str, Any]]:
        """Collect cold missing persons cases from FDLE."""
        records = []
        
        try:
            # FDLE cold cases page
            response = self._make_request(self.cold_cases_url)
            if response and response.status_code == 200:
                soup = BeautifulSoup(response.text, 'html.parser')
                
                cold_records = self._extract_cold_cases(soup)
                
                # Mark as cold cases with appropriate priority
                for record in cold_records:
                    record['case_type'] = 'Cold Case'
                    record['priority_score'] = self._calculate_cold_case_priority(record)
                    record['state'] = 'Florida'
                
                records.extend(cold_records)
            
            # Try additional cold case resources
            cold_case_urls = [
                f"{self.base_url}/FCIC/PublicDataSearch/ColdCase",
                f"{self.base_url}/ColdCases/MissingPersons",
                f"{self.base_url}/UnsolvedCases"
            ]
            
            for url in cold_case_urls:
                try:
                    response = self._make_request(url)
                    if response and response.status_code == 200:
                        soup = BeautifulSoup(response.text, 'html.parser')
                        additional_cold = self._extract_cold_cases(soup)
                        
                        for record in additional_cold:
                            record['case_type'] = 'Cold Case'
                            record['state'] = 'Florida'
                        
                        records.extend(additional_cold)
                        break  # Found working cold case URL
                        
                except Exception as e:
                    logger.debug(f"Cold case URL failed {url}: {e}")
                    continue
            
        except Exception as e:
            logger.error(f"Error collecting cold cases: {e}")
        
        return records
    
    def _collect_from_amber_alerts(self, days_back: int) -> List[Dict[str, Any]]:
        """Collect active and recent AMBER Alerts for Florida."""
        records = []
        
        try:
            # Florida AMBER Alert sources
            amber_sources = [
                f"{self.base_url}/amber-alert",
                "https://amberalert.gov/api/alerts.json?state=FL",
                "https://www.flmissingkids.com/amber",
                "https://www.missingkids.org/api/florida/amber"
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
                    
                    time.sleep(1)  # Rate limit between sources
                    
                except Exception as e:
                    logger.debug(f"AMBER source failed {source_url}: {e}")
                    continue
            
            # Mark all AMBER Alert records as critical priority
            for record in records:
                record['alert_type'] = 'AMBER Alert'
                record['priority_score'] = 95  # Very high priority
                record['category'] = 'Missing Children'
                record['state'] = 'Florida'
                
        except Exception as e:
            logger.error(f"Error collecting AMBER alerts: {e}")
        
        return records
    
    def _collect_from_county_agencies(self, days_back: int) -> List[Dict[str, Any]]:
        """Collect from major Florida county law enforcement agencies."""
        records = []
        
        # Major Florida counties and their law enforcement websites
        major_counties = {
            'Miami-Dade': 'https://www.miamidade.gov/police/missing-persons.asp',
            'Broward': 'https://sheriff.org/missing-persons',
            'Palm Beach': 'https://www.pbso.org/missing-persons',
            'Hillsborough': 'https://www.hcso.tampa.fl.us/missing-persons',
            'Orange': 'https://www.ocfl.net/CivicAlerts.aspx?CID=1',
            'Pinellas': 'https://www.pcsoweb.com/missing-persons',
            'Duval': 'https://www.jaxsheriff.org/Missing-Persons',
            'Lee': 'https://www.sheriffleefl.org/missing-persons'
        }
        
        for county, url in major_counties.items():
            try:
                response = self._make_request(url)
                if response and response.status_code == 200:
                    soup = BeautifulSoup(response.text, 'html.parser')
                    county_records = self._extract_county_cases(soup, county)
                    
                    # Add county information
                    for record in county_records:
                        record['county'] = f"{county} County"
                        record['state'] = 'Florida'
                        record['collection_source'] = f"Florida {county} County"
                    
                    records.extend(county_records)
                    logger.info(f"Collected {len(county_records)} records from {county} County")
                
                time.sleep(2)  # Rate limit between counties
                
            except Exception as e:
                logger.debug(f"County collection failed for {county}: {e}")
                continue
        
        return records
    
    def _collect_from_universities(self, days_back: int) -> List[Dict[str, Any]]:
        """Collect from Florida university police departments (students often go missing)."""
        records = []
        
        # Major Florida universities with active police departments
        universities = {
            'University of Florida': 'https://www.police.ufl.edu/missing-students',
            'Florida State University': 'https://police.fsu.edu/alerts',
            'University of Central Florida': 'https://police.ucf.edu/alerts',
            'Florida International University': 'https://police.fiu.edu/missing-persons',
            'University of South Florida': 'https://www.usf.edu/police/alerts'
        }
        
        for university, url in universities.items():
            try:
                response = self._make_request(url)
                if response and response.status_code == 200:
                    soup = BeautifulSoup(response.text, 'html.parser')
                    student_records = self._extract_student_cases(soup)
                    
                    # Add university context
                    for record in student_records:
                        record['institution'] = university
                        record['category'] = 'Missing Student'
                        record['state'] = 'Florida'
                        record['priority_score'] = self._calculate_student_priority(record)
                    
                    records.extend(student_records)
                
                time.sleep(1)  # Rate limit
                
            except Exception as e:
                logger.debug(f"University collection failed for {university}: {e}")
                continue
        
        return records
    
    def _collect_from_api_endpoints(self, days_back: int) -> List[Dict[str, Any]]:
        """Try to collect from potential API endpoints."""
        records = []
        
        # Potential FDLE API endpoints
        api_endpoints = [
            f"{self.api_base}/missing-persons",
            f"{self.api_base}/fcic/missing",
            f"{self.base_url}/data/missing.json",
            f"{self.base_url}/api/missing-persons/search",
            f"{self.base_url}/feed/missing.xml",
            f"{self.base_url}/opendata/missing_persons.json",
            f"{self.base_url}/FCIC/api/missing"
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
    
    def _extract_fdle_cases(self, soup: BeautifulSoup) -> List[Dict[str, Any]]:
        """Extract cases from FDLE missing persons page."""
        records = []
        
        try:
            # FDLE-specific case selectors
            case_selectors = [
                '.missing-person-record',
                '.fdle-case',
                '.case-record',
                '.person-missing',
                '.missing-case',
                '[data-case-type="missing"]',
                '.database-record'
            ]
            
            for selector in case_selectors:
                elements = soup.select(selector)
                if elements:
                    for element in elements:
                        case_data = self._extract_case_from_element(element)
                        if case_data:
                            case_data['collection_source'] = 'FDLE Missing Persons Database'
                            records.append(case_data)
                    break  # Found working selector
            
            # Look for data tables
            table_records = self._extract_from_data_tables(soup)
            records.extend(table_records)
            
            # Look for case detail pages
            case_links = soup.find_all('a', href=re.compile(r'/case/|/missing-person/|/details/', re.I))
            for link in case_links[:10]:  # Limit to prevent too many requests
                try:
                    case_url = self._resolve_url(link['href'])
                    case_detail = self._extract_case_details(case_url)
                    if case_detail:
                        records.append(case_detail)
                except Exception as e:
                    logger.debug(f"Error extracting case details: {e}")
                    continue
            
        except Exception as e:
            logger.error(f"Error extracting FDLE cases: {e}")
        
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
                '.amber-alert-child',
                '.child-alert'
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
            
            # Look for urgent child alerts
            urgent_elements = soup.select('.urgent-alert, .critical-missing, .endangered-child')
            for element in urgent_elements:
                case_data = self._extract_case_from_element(element)
                if case_data:
                    case_data['alert_level'] = 'URGENT'
                    case_data['priority_score'] = 90
                    case_data['category'] = 'Missing Children'
                    records.append(case_data)
            
        except Exception as e:
            logger.error(f"Error extracting children cases: {e}")
        
        return records
    
    def _extract_fl_missing_kids_cases(self, soup: BeautifulSoup) -> List[Dict[str, Any]]:
        """Extract cases from Florida Missing Kids website."""
        records = []
        
        try:
            # Florida Missing Kids specific patterns
            selectors = [
                '.missing-child-profile',
                '.child-profile',
                '.missing-poster',
                '.case-profile',
                '.child-case'
            ]
            
            for selector in selectors:
                elements = soup.select(selector)
                for element in elements:
                    case_data = self._extract_case_from_element(element)
                    if case_data:
                        case_data['collection_source'] = 'Florida Missing Kids'
                        case_data['category'] = 'Missing Children'
                        records.append(case_data)
            
            # Look for featured cases or alerts
            featured = soup.select('.featured-case, .alert-case, .recent-case')
            for element in featured:
                case_data = self._extract_case_from_element(element)
                if case_data:
                    case_data['featured'] = True
                    case_data['priority_score'] = self._calculate_child_priority(case_data) + 5
                    records.append(case_data)
            
        except Exception as e:
            logger.error(f"Error extracting FL Missing Kids cases: {e}")
        
        return records
    
    def _extract_cold_cases(self, soup: BeautifulSoup) -> List[Dict[str, Any]]:
        """Extract cold missing persons cases."""
        records = []
        
        try:
            # Cold case specific selectors
            cold_selectors = [
                '.cold-case',
                '.unsolved-case',
                '.long-term-missing',
                '[data-case-status="cold"]',
                '.historic-case'
            ]
            
            for selector in cold_selectors:
                elements = soup.select(selector)
                for element in elements:
                    case_data = self._extract_case_from_element(element)
                    if case_data:
                        case_data['case_type'] = 'Cold Case'
                        case_data['priority_score'] = self._calculate_cold_case_priority(case_data)
                        records.append(case_data)
            
            # Look for cases by year or decade
            year_sections = soup.select('.year-section, .decade-section, [data-year]')
            for section in year_sections:
                year_cases = self._extract_cases_from_year_section(section)
                records.extend(year_cases)
            
        except Exception as e:
            logger.error(f"Error extracting cold cases: {e}")
        
        return records
    
    def _extract_student_cases(self, soup: BeautifulSoup) -> List[Dict[str, Any]]:
        """Extract missing student cases from university pages."""
        records = []
        
        try:
            # Student-specific selectors
            student_selectors = [
                '.missing-student',
                '.student-alert',
                '.campus-alert',
                '.student-missing',
                '[data-category="student"]'
            ]
            
            for selector in student_selectors:
                elements = soup.select(selector)
                for element in elements:
                    case_data = self._extract_case_from_element(element)
                    if case_data:
                        case_data['category'] = 'Missing Student'
                        # Students are typically young adults (18-25)
                        if not case_data.get('age'):
                            case_data['estimated_age_range'] = '18-25'
                        records.append(case_data)
            
            # Look for safety alerts that might include missing students
            alert_elements = soup.select('.safety-alert, .campus-security-alert, .emergency-alert')
            for element in alert_elements:
                text = element.get_text().lower()
                if any(keyword in text for keyword in ['missing', 'disappeared', 'last seen', 'whereabouts unknown']):
                    case_data = self._extract_case_from_element(element)
                    if case_data:
                        case_data['category'] = 'Missing Student'
                        case_data['source_type'] = 'Safety Alert'
                        records.append(case_data)
            
        except Exception as e:
            logger.error(f"Error extracting student cases: {e}")
        
        return records
    
    def _calculate_child_priority(self, record: Dict[str, Any]) -> int:
        """Calculate priority score for missing children cases in Florida."""
        priority = 80  # High base for children cases
        
        try:
            # Age factor
            age = record.get('age')
            if age:
                if age <= 5:
                    priority += 20  # Very young children
                elif age <= 12:
                    priority += 15
                elif age <= 16:
                    priority += 10
                else:
                    priority += 5
            
            # Recency factor
            date_missing = self._parse_date(record.get('date_missing'))
            if date_missing:
                hours_missing = (datetime.now() - date_missing).total_seconds() / 3600
                if hours_missing <= 6:
                    priority += 20  # Critical first hours
                elif hours_missing <= 24:
                    priority += 15
                elif hours_missing <= 72:
                    priority += 10
                elif hours_missing <= 168:  # 1 week
                    priority += 5
            
            # Florida-specific factors
            county = record.get('county', '').lower()
            if any(major_county in county for major_county in ['miami-dade', 'broward', 'orange', 'hillsborough']):
                priority += 5  # Major metropolitan areas
            
            # Special circumstances
            circumstances = (record.get('circumstances') or '').lower()
            high_risk = ['abduction', 'kidnapped', 'stranger', 'vehicle', 'endangered', 'medical']
            priority += sum(3 for indicator in high_risk if indicator in circumstances)
            
        except Exception as e:
            logger.debug(f"Error calculating child priority: {e}")
        
        return min(priority, 100)
    
    def _calculate_cold_case_priority(self, record: Dict[str, Any]) -> int:
        """Calculate priority for cold cases."""
        priority = 25  # Lower base for cold cases
        
        try:
            # Child cold cases get higher priority
            age = record.get('age')
            if age and age < 18:
                priority += 30
            elif age and age < 25:
                priority += 15
            
            # Cases with more information
            info_fields = ['circumstances', 'description', 'physical_description', 'last_known_location']
            info_score = sum(5 for field in info_fields if record.get(field))
            priority += min(info_score, 20)
            
            # Recent cold cases (within last 10 years)
            date_missing = self._parse_date(record.get('date_missing'))
            if date_missing:
                years_missing = (datetime.now() - date_missing).days / 365
                if years_missing <= 5:
                    priority += 15
                elif years_missing <= 10:
                    priority += 10
                elif years_missing <= 20:
                    priority += 5
            
        except Exception as e:
            logger.debug(f"Error calculating cold case priority: {e}")
        
        return max(priority, 20)
    
    def _calculate_student_priority(self, record: Dict[str, Any]) -> int:
        """Calculate priority for missing student cases."""
        priority = 60  # Medium-high priority for students
        
        try:
            # Recent cases get higher priority
            date_missing = self._parse_date(record.get('date_missing'))
            if date_missing:
                days_missing = (datetime.now() - date_missing).days
                if days_missing <= 3:
                    priority += 25
                elif days_missing <= 7:
                    priority += 15
                elif days_missing <= 30:
                    priority += 10
            
            # High-risk circumstances for students
            circumstances = (record.get('circumstances') or '').lower()
            student_risks = ['depression', 'suicidal', 'drugs', 'alcohol', 'party', 'spring break', 'exam stress']
            priority += sum(2 for risk in student_risks if risk in circumstances)
            
            # Out-of-state students get slightly higher priority
            if 'out-of-state' in circumstances or 'international' in circumstances:
                priority += 5
            
        except Exception as e:
            logger.debug(f"Error calculating student priority: {e}")
        
        return min(priority, 95)
    
    def _deduplicate_and_validate_florida_records(self, records: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Remove duplicates and validate Florida location."""
        if not records:
            return records
        
        unique_records = []
        seen_cases = set()
        seen_names = []
        
        for record in records:
            try:
                # Validate Florida location
                if not self._is_florida_case(record):
                    continue
                
                # Check duplicates by case number
                case_number = record.get('case_number') or record.get('fdle_number')
                if case_number:
                    case_key = f"fl_case_{case_number}"
                    if case_key in seen_cases:
                        continue
                    seen_cases.add(case_key)
                
                # Check name similarity
                name = record.get('name', '').lower().strip()
                if name:
                    is_duplicate = False
                    for existing_name in seen_names:
                        if self._calculate_similarity(name, existing_name) > 0.87:
                            is_duplicate = True
                            break
                    
                    if not is_duplicate:
                        seen_names.append(name)
                        # Add Florida-specific metadata
                        record.update({
                            'source': self.source,
                            'source_name': self.name,
                            'state': 'Florida',
                            'collected_at': datetime.now().isoformat()
                        })
                        unique_records.append(record)
                
            except Exception as e:
                logger.debug(f"Error processing record for deduplication: {e}")
                continue
        
        return unique_records
    
    def _is_florida_case(self, record: Dict[str, Any]) -> bool:
        """Validate that this is actually a Florida missing persons case."""
        try:
            # Check explicit state field
            state = record.get('state', '').lower()
            if 'florida' in state or state == 'fl':
                return True
            
            # Check location fields
            location_fields = ['city', 'county', 'location', 'last_seen', 'missing_from']
            for field in location_fields:
                location = record.get(field, '').lower()
                if any(indicator in location for indicator in ['florida', 'fl', 'miami', 'tampa', 'orlando', 'jacksonville']):
                    return True
            
            # Check if county is in Florida
            county = record.get('county', '').lower().replace(' county', '')
            if county in self.florida_counties:
                return True
            
            # If collected from Florida-specific source
            source = record.get('collection_source', '').lower()
            if any(indicator in source for indicator in ['florida', 'fl', 'fdle']):
                return True
            
            return False
            
        except Exception:
            return True  # Default to include if validation fails
    
    def get_collection_stats(self) -> Dict[str, Any]:
        """Get statistics about the Florida FDLE collection process."""
        return {
            'collector_name': self.name,
            'source': self.source,
            'priority': self.priority,
            'state_coverage': 'Florida (all 67 counties)',
            'specializations': [
                'FDLE Missing Persons Database',
                'Missing Children (high priority)',
                'AMBER Alerts (critical priority)',
                'Cold Cases',
                'University Students',
                'Major county agencies'
            ],
            'collection_methods': [
                'FDLE Missing Persons Database',
                'Missing Children System',
                'Cold Cases Database',
                'AMBER Alert System',
                'County Law Enforcement',
                'University Police',
                'API Endpoints'
            ],
            'florida_counties_covered': len(self.florida_counties),
            'university_coverage': [
                'University of Florida',
                'Florida State University', 
                'University of Central Florida',
                'Florida International University',
                'University of South Florida'
            ],
            'last_collection': getattr(self, 'last_collection_time', None),
            'total_collected': getattr(self, 'total_records_collected', 0)
        }


if __name__ == "__main__":
    # Test the collector
    collector = FloridaFDLECollector()
    
    print(f"Testing {collector.name} collector...")
    
    try:
        records = collector.collect_data(days_back=7)
        print(f"Collected {len(records)} records")
        
        if records:
            # Show sample records by category
            categories = {}
            for record in records:
                category = record.get('category', 'General')
                if category not in categories:
                    categories[category] = []
                categories[category].append(record)
            
            for category, cat_records in categories.items():
                print(f"\n{category}: {len(cat_records)} records")
                if cat_records:
                    sample = cat_records[0]
                    print(f"Sample {category} record: {json.dumps(sample, indent=2, default=str)}")
        
        stats = collector.get_collection_stats()
        print(f"\nCollection stats: {json.dumps(stats, indent=2, default=str)}")
        
    except Exception as e:
        print(f"Error testing collector: {e}")