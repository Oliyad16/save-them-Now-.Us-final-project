"""
AMBER Alert collector for real-time critical missing children cases.
Highest priority collector with 5-minute update intervals.
"""

import requests
from bs4 import BeautifulSoup
import json
import xml.etree.ElementTree as ET
import re
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
from urllib.parse import urljoin, urlparse
import time

from .base_collector import BaseCollector
from ..utils.logger import get_logger

logger = get_logger("amber_alert")

class AmberAlertCollector(BaseCollector):
    """Collector for AMBER Alert system - critical priority missing children."""
    
    def __init__(self, config: Dict[str, Any]):
        super().__init__("amber_alert", config)
        
        # AMBER Alert specific configuration
        self.base_url = config.get('base_url', 'https://www.amberalert.gov')
        
        # Multiple AMBER Alert data sources
        self.data_sources = {
            'national_rss': 'https://www.amberalert.gov/feeds/alerts.xml',
            'api_endpoint': 'https://api.amberalert.gov/alerts/active',
            'backup_rss': 'https://feeds.amberalert.gov/active.rss',
            'state_feeds': {
                'texas': 'https://www.dps.texas.gov/rss/amberAlert.xml',
                'california': 'https://www.chp.ca.gov/ChpRss/AmberAlerts',
                'florida': 'https://www.fdle.state.fl.us/FCIC/MissingPersons/rss.xml',
                'new_york': 'http://www.nysp.ny.gov/RSS/amber.xml'
            }
        }
        
        # AMBER Alert specific fields
        self.alert_fields = {
            'alert_id': ['alertId', 'id', 'guid'],
            'case_number': ['caseNumber', 'incidentNumber', 'alertNumber'],
            'issue_date': ['issueDate', 'dateIssued', 'pubDate'],
            'expiration_date': ['expirationDate', 'expires'],
            'alert_status': ['status', 'alertStatus'],
            'issuing_agency': ['issuingAgency', 'agency', 'organization'],
            'incident_location': ['incidentLocation', 'lastSeenLocation', 'location'],
            'suspect_vehicle': ['suspectVehicle', 'vehicle'],
            'suspect_info': ['suspectInfo', 'suspect']
        }
        
        # High priority settings for AMBER Alerts
        self.priority_config = {
            'max_age_hours': 72,  # Only collect alerts from last 72 hours
            'urgent_age_hours': 24,  # Alerts less than 24 hours are marked urgent
            'critical_age_hours': 6,  # Alerts less than 6 hours are critical
            'min_delay': 1.0,  # Minimum delay between requests (respectful)
            'max_retries': 5  # More retries for critical data
        }
    
    def collect_data(self) -> List[Dict[str, Any]]:
        """
        Collect active AMBER Alert data from multiple sources.
        
        Returns:
            List of active AMBER Alert records
        """
        logger.logger.info("Starting AMBER Alert collection (CRITICAL PRIORITY)")
        all_records = []
        
        try:
            # Collect from national RSS feed
            national_records = self._collect_from_national_rss()
            all_records.extend(national_records)
            
            # Collect from API endpoint
            api_records = self._collect_from_api()
            all_records.extend(api_records)
            
            # Collect from state-specific feeds
            state_records = self._collect_from_state_feeds()
            all_records.extend(state_records)
            
            # Deduplicate and filter
            filtered_records = self._filter_and_deduplicate(all_records)
            
            # Add AMBER Alert specific metadata
            for record in filtered_records:
                record['source_name'] = 'amber_alert'
                record['category'] = 'AMBER Alert'
                record['priority'] = self._calculate_urgency_priority(record)
                record['collection_timestamp'] = datetime.now().isoformat()
                
                # Mark as urgent/critical based on age
                issue_age = self._get_alert_age_hours(record)
                if issue_age is not None:
                    if issue_age <= self.priority_config['critical_age_hours']:
                        record['alert_level'] = 'CRITICAL'
                        record['urgent'] = True
                    elif issue_age <= self.priority_config['urgent_age_hours']:
                        record['alert_level'] = 'URGENT'
                        record['urgent'] = True
                    else:
                        record['alert_level'] = 'ACTIVE'
            
            logger.logger.info(f"✅ AMBER Alert collection completed: {len(filtered_records)} active alerts")
            
            # Log critical alerts
            critical_alerts = [r for r in filtered_records if r.get('alert_level') == 'CRITICAL']
            if critical_alerts:
                logger.logger.warning(f"🚨 {len(critical_alerts)} CRITICAL AMBER ALERTS found!")
                for alert in critical_alerts[:3]:  # Log first 3 critical alerts
                    logger.logger.warning(f"CRITICAL: {alert.get('name', 'Unknown')} - {alert.get('location', 'Unknown location')}")
            
            return filtered_records
            
        except Exception as e:
            logger.logger.error(f"AMBER Alert collection failed: {e}")
            return []
    
    def _collect_from_national_rss(self) -> List[Dict[str, Any]]:
        """Collect from national AMBER Alert RSS feed."""
        records = []
        
        try:
            response = self.make_request(self.data_sources['national_rss'], timeout=15)
            if not response:
                logger.logger.warning("Failed to fetch national AMBER Alert RSS")
                return records
            
            # Parse XML
            try:
                root = ET.fromstring(response.text)
                
                # Handle both RSS and Atom formats
                items = root.findall('.//item') or root.findall('.//{http://www.w3.org/2005/Atom}entry')
                
                for item in items:
                    try:
                        record = self._parse_rss_item(item)
                        if record and self.validate_record(record):
                            records.append(self.normalize_record(record))
                    except Exception as e:
                        logger.logger.warning(f"Failed to parse RSS item: {e}")
                        continue
                
                logger.logger.info(f"National RSS: collected {len(records)} alerts")
                
            except ET.ParseError as e:
                logger.logger.error(f"XML parsing error for national RSS: {e}")
        
        except Exception as e:
            logger.logger.error(f"National RSS collection error: {e}")
        
        return records
    
    def _collect_from_api(self) -> List[Dict[str, Any]]:
        """Collect from AMBER Alert API endpoint."""
        records = []
        
        try:
            headers = {
                'Accept': 'application/json',
                'User-Agent': 'SaveThemNow.Jesus AMBER Alert Monitor 1.0'
            }
            
            response = self.make_request(
                self.data_sources['api_endpoint'], 
                timeout=15,
                headers=headers
            )
            
            if not response:
                logger.logger.warning("Failed to fetch AMBER Alert API")
                return records
            
            try:
                data = response.json()
                
                # Handle different API response formats
                alerts = data if isinstance(data, list) else data.get('alerts', [])
                
                for alert_data in alerts:
                    try:
                        record = self._parse_api_alert(alert_data)
                        if record and self.validate_record(record):
                            records.append(self.normalize_record(record))
                    except Exception as e:
                        logger.logger.warning(f"Failed to parse API alert: {e}")
                        continue
                
                logger.logger.info(f"API endpoint: collected {len(records)} alerts")
                
            except json.JSONDecodeError as e:
                logger.logger.error(f"JSON parsing error for API: {e}")
                
        except Exception as e:
            logger.logger.error(f"API collection error: {e}")
        
        return records
    
    def _collect_from_state_feeds(self) -> List[Dict[str, Any]]:
        """Collect from state-specific AMBER Alert feeds."""
        records = []
        
        for state, feed_url in self.data_sources['state_feeds'].items():
            try:
                logger.logger.debug(f"Collecting from {state} AMBER Alert feed")
                
                response = self.make_request(feed_url, timeout=10)
                if not response:
                    continue
                
                # Parse state-specific feed
                state_records = self._parse_state_feed(response.text, state)
                
                for record in state_records:
                    if self.validate_record(record):
                        record['source_state'] = state
                        records.append(self.normalize_record(record))
                
                logger.logger.info(f"{state.title()}: collected {len(state_records)} alerts")
                
                # Rate limiting between state requests
                time.sleep(1)
                
            except Exception as e:
                logger.logger.warning(f"Failed to collect from {state}: {e}")
                continue
        
        return records
    
    def _parse_rss_item(self, item: ET.Element) -> Optional[Dict[str, Any]]:
        """Parse RSS/XML item into alert record."""
        record = {}
        
        try:
            # Handle different XML namespaces
            namespaces = {
                'atom': 'http://www.w3.org/2005/Atom',
                'dc': 'http://purl.org/dc/elements/1.1/'
            }
            
            # Extract title/name
            title_elem = item.find('title') or item.find('.//atom:title', namespaces)
            if title_elem is not None:
                title = title_elem.text or ''
                record['title'] = title
                
                # Try to extract child name from title
                name_patterns = [
                    r'AMBER Alert[:\s]*(.+?)(?:\s*\(|$|,)',
                    r'Missing[:\s]*(.+?)(?:\s*\(|$|,)',
                    r'Alert for[:\s]*(.+?)(?:\s*\(|$|,)',
                    r'^([^,()]+)(?:\s*\(|\s*,|$)'
                ]
                
                for pattern in name_patterns:
                    match = re.search(pattern, title, re.I)
                    if match:
                        name = match.group(1).strip()
                        if len(name) > 2 and not re.match(r'^\d+$', name):
                            record['name'] = name
                            break
            
            # Extract description
            desc_elem = item.find('description') or item.find('.//atom:content', namespaces)
            if desc_elem is not None:
                description = desc_elem.text or ''
                record['description'] = description
                self._extract_details_from_description(record, description)
            
            # Extract link/source URL
            link_elem = item.find('link') or item.find('.//atom:link', namespaces)
            if link_elem is not None:
                if hasattr(link_elem, 'get') and link_elem.get('href'):
                    record['source_url'] = link_elem.get('href')
                elif link_elem.text:
                    record['source_url'] = link_elem.text
            
            # Extract publication date
            date_elem = item.find('pubDate') or item.find('.//atom:published', namespaces) or item.find('.//dc:date', namespaces)
            if date_elem is not None:
                record['issue_date'] = self._parse_date(date_elem.text)
            
            # Extract GUID as alert ID
            guid_elem = item.find('guid')
            if guid_elem is not None:
                record['alert_id'] = guid_elem.text
            
            return record
            
        except Exception as e:
            logger.logger.error(f"Error parsing RSS item: {e}")
            return None
    
    def _parse_api_alert(self, alert_data: Dict) -> Optional[Dict[str, Any]]:
        """Parse API alert data into record."""
        record = {}
        
        try:
            # Map API fields to our schema
            field_mappings = {
                'alert_id': ['id', 'alertId', 'guid'],
                'name': ['childName', 'victimName', 'missingPerson', 'name'],
                'age': ['age', 'childAge', 'victimAge'],
                'gender': ['gender', 'sex', 'childGender'],
                'description': ['description', 'circumstances', 'details'],
                'location': ['lastSeenLocation', 'incidentLocation', 'location'],
                'issue_date': ['issueDate', 'dateIssued', 'timestamp'],
                'case_number': ['caseNumber', 'incidentNumber', 'alertNumber']
            }
            
            for field, possible_keys in field_mappings.items():
                for key in possible_keys:
                    if key in alert_data and alert_data[key]:
                        record[field] = alert_data[key]
                        break
            
            # Extract nested child information
            if 'children' in alert_data and alert_data['children']:
                child = alert_data['children'][0]  # Take first child
                record.update({
                    'name': child.get('firstName', '') + ' ' + child.get('lastName', ''),
                    'age': child.get('age'),
                    'gender': child.get('sex'),
                    'height': child.get('height'),
                    'weight': child.get('weight'),
                    'hair_color': child.get('hairColor'),
                    'eye_color': child.get('eyeColor')
                })
            
            # Extract location details
            if 'incidentInformation' in alert_data:
                incident = alert_data['incidentInformation']
                record['date_missing'] = incident.get('incidentDate')
                
                if 'incidentLocation' in incident:
                    loc = incident['incidentLocation']
                    record.update({
                        'city': loc.get('city'),
                        'state': loc.get('state'),
                        'county': loc.get('county')
                    })
            
            # Extract suspect vehicle information
            if 'vehicles' in alert_data and alert_data['vehicles']:
                vehicle = alert_data['vehicles'][0]
                record['suspect_vehicle'] = f"{vehicle.get('make', '')} {vehicle.get('model', '')} {vehicle.get('color', '')}".strip()
                record['license_plate'] = vehicle.get('licensePlate')
            
            return record
            
        except Exception as e:
            logger.logger.error(f"Error parsing API alert: {e}")
            return None
    
    def _parse_state_feed(self, content: str, state: str) -> List[Dict[str, Any]]:
        """Parse state-specific feed content."""
        records = []
        
        try:
            # Try XML parsing first
            try:
                root = ET.fromstring(content)
                items = root.findall('.//item')
                
                for item in items:
                    record = self._parse_rss_item(item)
                    if record:
                        record['source_state'] = state
                        records.append(record)
                        
            except ET.ParseError:
                # Try HTML parsing if XML fails
                soup = BeautifulSoup(content, 'html.parser')
                
                # Look for alert-specific elements
                alert_elements = soup.find_all(['div', 'article', 'section'], 
                                             class_=re.compile(r'alert|amber|missing', re.I))
                
                for element in alert_elements[:5]:  # Limit to 5 alerts per state
                    record = self._parse_html_alert(element, state)
                    if record:
                        records.append(record)
        
        except Exception as e:
            logger.logger.warning(f"Error parsing {state} feed: {e}")
        
        return records
    
    def _parse_html_alert(self, element, state: str) -> Optional[Dict[str, Any]]:
        """Parse HTML alert element."""
        record = {'source_state': state}
        
        try:
            text = element.get_text()
            
            # Extract name
            name_match = re.search(r'(?:Alert for|Missing|AMBER)[:\s]*([A-Za-z\s]+)', text, re.I)
            if name_match:
                record['name'] = name_match.group(1).strip()
            
            # Extract age
            age_match = re.search(r'age[:\s]*(\d+)', text, re.I)
            if age_match:
                record['age'] = int(age_match.group(1))
            
            # Extract location
            location_match = re.search(r'(?:from|in|near)[:\s]*([^,.\n]+)', text, re.I)
            if location_match:
                record['location'] = location_match.group(1).strip()
            
            return record if record.get('name') else None
            
        except Exception as e:
            logger.logger.warning(f"Error parsing HTML alert: {e}")
            return None
    
    def _extract_details_from_description(self, record: Dict, description: str):
        """Extract detailed information from alert description."""
        try:
            # Age extraction
            age_patterns = [
                r'(\d+)[\s-]?year[\s-]?old',
                r'age[:\s]*(\d+)',
                r'(\d+)\s*years?\s*of\s*age'
            ]
            
            for pattern in age_patterns:
                match = re.search(pattern, description, re.I)
                if match:
                    record['age'] = int(match.group(1))
                    break
            
            # Gender extraction
            gender_match = re.search(r'\b(male|female|boy|girl)\b', description, re.I)
            if gender_match:
                gender = gender_match.group(1).lower()
                record['gender'] = 'Male' if gender in ['male', 'boy'] else 'Female'
            
            # Location extraction
            location_patterns = [
                r'last seen in ([^,.\n]+)',
                r'missing from ([^,.\n]+)',
                r'taken from ([^,.\n]+)',
                r'abducted from ([^,.\n]+)'
            ]
            
            for pattern in location_patterns:
                match = re.search(pattern, description, re.I)
                if match:
                    location = match.group(1).strip()
                    record['location'] = location
                    self._parse_location_string(record, location)
                    break
            
            # Physical description
            height_match = re.search(r'height[:\s]*([0-9\'"\s]+)', description, re.I)
            if height_match:
                record['height'] = height_match.group(1).strip()
            
            weight_match = re.search(r'weight[:\s]*(\d+\s*(?:lbs?|pounds?))', description, re.I)
            if weight_match:
                record['weight'] = weight_match.group(1)
            
            hair_match = re.search(r'hair[:\s]*([^,.\n]+)', description, re.I)
            if hair_match:
                record['hair_color'] = hair_match.group(1).strip()
            
            eyes_match = re.search(r'eyes?[:\s]*([^,.\n]+)', description, re.I)
            if eyes_match:
                record['eye_color'] = eyes_match.group(1).strip()
            
            # Vehicle information
            vehicle_patterns = [
                r'vehicle[:\s]*([^,.\n]+)',
                r'driving[:\s]*([^,.\n]+)',
                r'car[:\s]*([^,.\n]+)'
            ]
            
            for pattern in vehicle_patterns:
                match = re.search(pattern, description, re.I)
                if match:
                    record['suspect_vehicle'] = match.group(1).strip()
                    break
            
            # License plate
            plate_match = re.search(r'license[^:]*[:\s]*([A-Z0-9\s-]+)', description, re.I)
            if plate_match:
                record['license_plate'] = plate_match.group(1).strip()
                
        except Exception as e:
            logger.logger.warning(f"Error extracting from description: {e}")
    
    def _parse_location_string(self, record: Dict, location: str):
        """Parse location string into components."""
        try:
            parts = [part.strip() for part in location.split(',')]
            
            if len(parts) >= 2:
                record['city'] = parts[0]
                # Check if last part is state
                if len(parts[-1]) == 2 and parts[-1].isupper():
                    record['state'] = parts[-1]
                    if len(parts) >= 3:
                        record['county'] = parts[-2]
            elif len(parts) == 1:
                # Could be city or state
                if len(parts[0]) == 2 and parts[0].isupper():
                    record['state'] = parts[0]
                else:
                    record['city'] = parts[0]
                    
        except Exception as e:
            logger.logger.warning(f"Error parsing location: {e}")
    
    def _parse_date(self, date_str: str) -> str:
        """Parse various date formats to ISO format."""
        try:
            # Common date formats
            formats = [
                '%a, %d %b %Y %H:%M:%S %Z',
                '%Y-%m-%dT%H:%M:%S%z',
                '%Y-%m-%d %H:%M:%S',
                '%m/%d/%Y %H:%M:%S',
                '%m/%d/%Y',
                '%Y-%m-%d'
            ]
            
            date_str = date_str.strip()
            
            for fmt in formats:
                try:
                    dt = datetime.strptime(date_str, fmt)
                    return dt.strftime('%Y-%m-%d %H:%M:%S')
                except ValueError:
                    continue
            
            # If all else fails, return original
            return date_str
            
        except Exception:
            return date_str
    
    def _get_alert_age_hours(self, record: Dict) -> Optional[float]:
        """Get age of alert in hours."""
        try:
            issue_date = record.get('issue_date')
            if not issue_date:
                return None
            
            if isinstance(issue_date, str):
                # Try to parse the date
                dt = datetime.fromisoformat(issue_date.replace('Z', '+00:00'))
            else:
                dt = issue_date
            
            age = datetime.now() - dt.replace(tzinfo=None)
            return age.total_seconds() / 3600
            
        except Exception:
            return None
    
    def _calculate_urgency_priority(self, record: Dict) -> int:
        """Calculate priority for AMBER alerts (all are high priority)."""
        try:
            age_hours = self._get_alert_age_hours(record)
            child_age = record.get('age', 18)
            
            # All AMBER alerts start with high priority
            priority = 1
            
            # Adjust based on time since alert
            if age_hours:
                if age_hours <= 1:
                    priority = 1  # Immediate
                elif age_hours <= 6:
                    priority = 1  # Critical
                elif age_hours <= 24:
                    priority = 2  # Urgent
                else:
                    priority = 3  # Important
            
            # Younger children get higher priority
            if isinstance(child_age, (int, float)):
                if child_age <= 5:
                    priority = max(1, priority - 1)
                elif child_age <= 10:
                    priority = max(1, priority)
            
            return max(1, min(5, priority))  # Ensure 1-5 range
            
        except Exception:
            return 1  # Default to highest priority
    
    def _filter_and_deduplicate(self, records: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Filter old alerts and remove duplicates."""
        # Filter by age
        cutoff_time = datetime.now() - timedelta(hours=self.priority_config['max_age_hours'])
        
        active_records = []
        for record in records:
            # Check if alert is still active
            issue_date = record.get('issue_date')
            if issue_date:
                try:
                    if isinstance(issue_date, str):
                        dt = datetime.fromisoformat(issue_date.replace('Z', '+00:00'))
                    else:
                        dt = issue_date
                    
                    if dt.replace(tzinfo=None) >= cutoff_time:
                        active_records.append(record)
                except:
                    # If date parsing fails, include the record
                    active_records.append(record)
            else:
                # If no date, assume recent
                active_records.append(record)
        
        # Deduplicate
        seen = set()
        deduplicated = []
        
        for record in active_records:
            # Create dedup key
            name = record.get('name', '').lower().strip()
            alert_id = record.get('alert_id', '').lower().strip()
            location = record.get('location', '').lower().strip()
            
            key = f"{name}|{alert_id}|{location}"
            
            if key not in seen:
                seen.add(key)
                deduplicated.append(record)
        
        logger.logger.info(f"Filtered {len(records)} -> {len(active_records)} active -> {len(deduplicated)} unique AMBER alerts")
        
        return deduplicated
    
    def validate_record(self, record: Dict[str, Any]) -> bool:
        """Validate AMBER Alert record."""
        # Must have name or some identifying information
        if not record.get('name') and not record.get('alert_id'):
            return False
        
        # Age should be reasonable for children (AMBER alerts are for minors)
        age = record.get('age')
        if age is not None:
            try:
                age_num = int(age) if isinstance(age, str) else age
                if age_num < 0 or age_num > 17:
                    return False
            except:
                pass  # Age validation failed, allow it
        
        return True
    
    def normalize_record(self, record: Dict[str, Any]) -> Dict[str, Any]:
        """Normalize AMBER Alert record."""
        normalized = super().normalize_record(record)
        
        # AMBER Alert specific normalizations
        normalized['source_name'] = 'amber_alert'
        normalized['category'] = 'AMBER Alert'
        normalized['priority'] = normalized.get('priority', 1)
        normalized['urgent'] = True  # All AMBER alerts are urgent
        normalized['country'] = 'USA'
        
        # Ensure case number
        if not normalized.get('case_number'):
            alert_id = normalized.get('alert_id', '')
            name = normalized.get('name', 'unknown').replace(' ', '-').lower()
            normalized['case_number'] = f"amber-{alert_id or name}-{datetime.now().strftime('%Y%m%d')}"
        
        # Set reported missing date
        normalized['reported_missing'] = normalized.get('issue_date', 
                                                      datetime.now().strftime('%Y-%m-%d'))
        
        return normalized


def main():
    """CLI entry point for AMBER Alert collection."""
    import argparse
    
    parser = argparse.ArgumentParser(description="AMBER Alert Collector")
    parser.add_argument('--config', help='Configuration file path')
    parser.add_argument('--output', help='Output file path', default='amber_alerts.json')
    
    args = parser.parse_args()
    
    config = {
        'base_url': 'https://www.amberalert.gov',
        'enabled': True,
        'min_delay': 1.0,
        'max_retries': 5,
        'retry_delay': 3.0
    }
    
    collector = AmberAlertCollector(config)
    
    try:
        records = collector.collect_data()
        
        print(f"🚨 Collected {len(records)} active AMBER alerts")
        
        # Save to file
        with open(args.output, 'w') as f:
            json.dump(records, f, indent=2, default=str)
        
        print(f"Saved to {args.output}")
        
        # Show alert summary
        critical = [r for r in records if r.get('alert_level') == 'CRITICAL']
        urgent = [r for r in records if r.get('alert_level') == 'URGENT']
        active = [r for r in records if r.get('alert_level') == 'ACTIVE']
        
        print(f"\\nAlert Summary:")
        print(f"  🔴 CRITICAL: {len(critical)} alerts")
        print(f"  🟡 URGENT: {len(urgent)} alerts") 
        print(f"  🟢 ACTIVE: {len(active)} alerts")
        
        # Show sample records
        for i, record in enumerate(records[:2]):
            print(f"\\nAlert {i+1} [{record.get('alert_level', 'ACTIVE')}]:")
            print(f"  Name: {record.get('name', 'Unknown')}")
            print(f"  Age: {record.get('age', 'Unknown')}")
            print(f"  Location: {record.get('location', 'Unknown')}")
            print(f"  Case: {record.get('case_number', 'Unknown')}")
            print(f"  Issued: {record.get('issue_date', 'Unknown')}")
        
    except Exception as e:
        print(f"🚨 AMBER Alert collection failed: {e}")
        return 1
    
    return 0


if __name__ == '__main__':
    exit(main())