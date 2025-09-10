"""
Data validation and quality assessment for missing persons records.
"""

import re
from datetime import datetime, date
from typing import Dict, Any, List, Tuple, Optional, Set
import difflib

from ..utils.logger import get_logger

logger = get_logger("validation")

class ValidationRule:
    """Base class for validation rules."""
    
    def __init__(self, name: str, weight: float = 1.0):
        self.name = name
        self.weight = weight
    
    def validate(self, record: Dict[str, Any]) -> Tuple[bool, str]:
        """
        Validate a record.
        
        Returns:
            Tuple of (is_valid, error_message)
        """
        raise NotImplementedError

class RequiredFieldRule(ValidationRule):
    """Validates that required fields are present and not empty."""
    
    def __init__(self, field: str, weight: float = 1.0):
        super().__init__(f"required_{field}", weight)
        self.field = field
    
    def validate(self, record: Dict[str, Any]) -> Tuple[bool, str]:
        value = record.get(self.field)
        if not value or str(value).strip() == "":
            return False, f"Required field '{self.field}' is missing or empty"
        return True, ""

class AgeRangeRule(ValidationRule):
    """Validates age is within reasonable bounds."""
    
    def __init__(self, min_age: int = 0, max_age: int = 120, weight: float = 1.0):
        super().__init__("age_range", weight)
        self.min_age = min_age
        self.max_age = max_age
    
    def validate(self, record: Dict[str, Any]) -> Tuple[bool, str]:
        age = record.get('age')
        if age is None:
            return True, ""  # Optional field
        
        try:
            age = int(age)
            if not (self.min_age <= age <= self.max_age):
                return False, f"Age {age} is outside valid range ({self.min_age}-{self.max_age})"
            return True, ""
        except (ValueError, TypeError):
            return False, f"Invalid age value: {age}"

class StateCodeRule(ValidationRule):
    """Validates US state codes."""
    
    VALID_STATES = {
        'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
        'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
        'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
        'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
        'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY', 'DC'
    }
    
    def __init__(self, weight: float = 1.0):
        super().__init__("state_code", weight)
    
    def validate(self, record: Dict[str, Any]) -> Tuple[bool, str]:
        state = record.get('state')
        if not state:
            return False, "State is required"
        
        state = str(state).strip().upper()
        if state not in self.VALID_STATES:
            return False, f"Invalid state code: {state}"
        return True, ""

class DateFormatRule(ValidationRule):
    """Validates date formats."""
    
    DATE_FORMATS = [
        '%Y-%m-%d',
        '%m/%d/%Y', 
        '%m-%d-%Y',
        '%d/%m/%Y',
        '%Y/%m/%d',
        '%B %d, %Y',
        '%b %d, %Y'
    ]
    
    def __init__(self, field: str, weight: float = 1.0):
        super().__init__(f"date_format_{field}", weight)
        self.field = field
    
    def validate(self, record: Dict[str, Any]) -> Tuple[bool, str]:
        date_value = record.get(self.field)
        if not date_value:
            return True, ""  # Optional field
        
        date_str = str(date_value).strip()
        if not date_str:
            return True, ""
        
        for fmt in self.DATE_FORMATS:
            try:
                parsed_date = datetime.strptime(date_str, fmt)
                # Check if date is reasonable (not in future, not too old)
                current_year = datetime.now().year
                if parsed_date.year > current_year + 1:
                    return False, f"Date {date_str} is in the future"
                if parsed_date.year < 1900:
                    return False, f"Date {date_str} is too old"
                return True, ""
            except ValueError:
                continue
        
        return False, f"Invalid date format: {date_str}"

class CoordinateRule(ValidationRule):
    """Validates geographic coordinates."""
    
    def __init__(self, us_bounds: Dict[str, float] = None, weight: float = 1.0):
        super().__init__("coordinates", weight)
        self.us_bounds = us_bounds or {
            'min_lat': 24.0,
            'max_lat': 49.0,
            'min_lon': -125.0,
            'max_lon': -66.0
        }
    
    def validate(self, record: Dict[str, Any]) -> Tuple[bool, str]:
        lat = record.get('latitude')
        lon = record.get('longitude')
        
        # Both or neither should be present
        if (lat is None) != (lon is None):
            return False, "Both latitude and longitude must be provided together"
        
        if lat is None and lon is None:
            return True, ""  # Optional fields
        
        try:
            lat = float(lat)
            lon = float(lon)
            
            # Check bounds
            if not (self.us_bounds['min_lat'] <= lat <= self.us_bounds['max_lat']):
                return False, f"Latitude {lat} is outside US bounds"
            if not (self.us_bounds['min_lon'] <= lon <= self.us_bounds['max_lon']):
                return False, f"Longitude {lon} is outside US bounds"
            
            return True, ""
        except (ValueError, TypeError):
            return False, f"Invalid coordinate values: lat={lat}, lon={lon}"

class CaseNumberRule(ValidationRule):
    """Validates case number format."""
    
    def __init__(self, weight: float = 1.0):
        super().__init__("case_number", weight)
    
    def validate(self, record: Dict[str, Any]) -> Tuple[bool, str]:
        case_number = record.get('case_number')
        if not case_number:
            return False, "Case number is required"
        
        case_str = str(case_number).strip()
        if not case_str:
            return False, "Case number cannot be empty"
        
        # Basic format validation (alphanumeric, dashes, underscores allowed)
        if not re.match(r'^[A-Za-z0-9\-_]+$', case_str):
            return False, f"Invalid case number format: {case_str}"
        
        return True, ""

class DataValidator:
    """Main data validation engine."""
    
    def __init__(self, config: Dict[str, Any] = None):
        self.config = config or {}
        self.rules = self._setup_validation_rules()
        self.deduplication_config = self.config.get('deduplication', {
            'similarity_threshold': 0.85,
            'match_fields': ['name', 'location', 'case_number']
        })
    
    def _setup_validation_rules(self) -> List[ValidationRule]:
        """Setup validation rules based on configuration."""
        rules = []
        
        # Required fields
        required_fields = self.config.get('required_fields', ['name', 'case_number'])
        for field in required_fields:
            rules.append(RequiredFieldRule(field, weight=2.0))
        
        # Age validation
        age_range = self.config.get('age_range', (0, 120))
        rules.append(AgeRangeRule(age_range[0], age_range[1]))
        
        # State validation
        rules.append(StateCodeRule())
        
        # Date validations
        rules.append(DateFormatRule('date_missing'))
        rules.append(DateFormatRule('date_reported'))
        
        # Coordinate validation
        us_bounds = self.config.get('us_bounds')
        rules.append(CoordinateRule(us_bounds))
        
        # Case number validation
        rules.append(CaseNumberRule(weight=1.5))
        
        return rules
    
    def validate_record(self, record: Dict[str, Any]) -> Dict[str, Any]:
        """
        Validate a single record.
        
        Returns:
            Dictionary with validation results
        """
        results = {
            'is_valid': True,
            'errors': [],
            'warnings': [],
            'quality_score': 0.0,
            'field_scores': {}
        }
        
        total_weight = 0
        achieved_weight = 0
        
        for rule in self.rules:
            is_valid, error_msg = rule.validate(record)
            total_weight += rule.weight
            
            if is_valid:
                achieved_weight += rule.weight
                results['field_scores'][rule.name] = 1.0
            else:
                results['is_valid'] = False
                results['errors'].append(f"{rule.name}: {error_msg}")
                results['field_scores'][rule.name] = 0.0
        
        # Calculate quality score
        results['quality_score'] = (achieved_weight / total_weight) if total_weight > 0 else 0.0
        
        # Additional quality checks
        results.update(self._assess_data_completeness(record))
        
        return results
    
    def _assess_data_completeness(self, record: Dict[str, Any]) -> Dict[str, Any]:
        """Assess overall data completeness."""
        important_fields = [
            'name', 'age', 'gender', 'ethnicity', 'city', 'state',
            'date_missing', 'latitude', 'longitude', 'description'
        ]
        
        completeness_score = 0
        field_completeness = {}
        
        for field in important_fields:
            value = record.get(field)
            is_complete = value is not None and str(value).strip() != ""
            field_completeness[field] = is_complete
            if is_complete:
                completeness_score += 1
        
        completeness_percentage = (completeness_score / len(important_fields)) * 100
        
        return {
            'completeness_score': completeness_percentage,
            'field_completeness': field_completeness
        }
    
    def clean_record(self, record: Dict[str, Any]) -> Dict[str, Any]:
        """Clean and normalize a record."""
        cleaned = record.copy()
        
        # Clean string fields
        string_fields = ['name', 'city', 'county', 'state', 'gender', 'ethnicity', 'description']
        for field in string_fields:
            if field in cleaned and cleaned[field]:
                cleaned[field] = str(cleaned[field]).strip().title()
        
        # Normalize state to uppercase
        if 'state' in cleaned and cleaned['state']:
            cleaned['state'] = str(cleaned['state']).strip().upper()
        
        # Clean case number
        if 'case_number' in cleaned and cleaned['case_number']:
            cleaned['case_number'] = str(cleaned['case_number']).strip().upper()
        
        # Normalize age
        if 'age' in cleaned and cleaned['age']:
            try:
                cleaned['age'] = int(cleaned['age'])
            except (ValueError, TypeError):
                cleaned['age'] = None
        
        # Normalize coordinates
        for coord_field in ['latitude', 'longitude']:
            if coord_field in cleaned and cleaned[coord_field]:
                try:
                    cleaned[coord_field] = float(cleaned[coord_field])
                except (ValueError, TypeError):
                    cleaned[coord_field] = None
        
        return cleaned
    
    def batch_validate(self, records: List[Dict[str, Any]], 
                      progress_callback=None) -> List[Dict[str, Any]]:
        """Validate multiple records."""
        results = []
        
        for i, record in enumerate(records):
            # Clean record first
            cleaned_record = self.clean_record(record)
            
            # Validate cleaned record
            validation_result = self.validate_record(cleaned_record)
            validation_result['record'] = cleaned_record
            validation_result['original_index'] = i
            
            results.append(validation_result)
            
            # Progress callback
            if progress_callback and (i + 1) % 100 == 0:
                progress_callback(i + 1, len(records))
        
        return results
    
    def detect_duplicates(self, records: List[Dict[str, Any]]) -> List[List[int]]:
        """
        Detect potential duplicate records.
        
        Returns:
            List of lists, where each inner list contains indices of potential duplicates
        """
        threshold = self.deduplication_config['similarity_threshold']
        match_fields = self.deduplication_config['match_fields']
        
        duplicate_groups = []
        processed = set()
        
        for i, record1 in enumerate(records):
            if i in processed:
                continue
            
            current_group = [i]
            
            for j, record2 in enumerate(records[i+1:], i+1):
                if j in processed:
                    continue
                
                similarity = self._calculate_similarity(record1, record2, match_fields)
                if similarity >= threshold:
                    current_group.append(j)
                    processed.add(j)
            
            if len(current_group) > 1:
                duplicate_groups.append(current_group)
            
            processed.add(i)
        
        return duplicate_groups
    
    def _calculate_similarity(self, record1: Dict[str, Any], record2: Dict[str, Any], 
                            fields: List[str]) -> float:
        """Calculate similarity between two records."""
        similarities = []
        
        for field in fields:
            val1 = str(record1.get(field, "")).lower().strip()
            val2 = str(record2.get(field, "")).lower().strip()
            
            if not val1 or not val2:
                similarities.append(0.0 if val1 != val2 else 1.0)
                continue
            
            # Use SequenceMatcher for string similarity
            similarity = difflib.SequenceMatcher(None, val1, val2).ratio()
            similarities.append(similarity)
        
        # Return average similarity
        return sum(similarities) / len(similarities) if similarities else 0.0
    
    def get_validation_summary(self, validation_results: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Generate summary statistics for validation results."""
        if not validation_results:
            return {}
        
        total_records = len(validation_results)
        valid_records = sum(1 for r in validation_results if r['is_valid'])
        
        # Quality score statistics
        quality_scores = [r['quality_score'] for r in validation_results]
        avg_quality = sum(quality_scores) / len(quality_scores)
        
        # Completeness statistics
        completeness_scores = [r.get('completeness_score', 0) for r in validation_results]
        avg_completeness = sum(completeness_scores) / len(completeness_scores)
        
        # Error frequency
        error_counts = {}
        for result in validation_results:
            for error in result.get('errors', []):
                rule_name = error.split(':')[0]
                error_counts[rule_name] = error_counts.get(rule_name, 0) + 1
        
        return {
            'total_records': total_records,
            'valid_records': valid_records,
            'invalid_records': total_records - valid_records,
            'validity_percentage': (valid_records / total_records) * 100,
            'average_quality_score': avg_quality,
            'average_completeness': avg_completeness,
            'common_errors': dict(sorted(error_counts.items(), key=lambda x: x[1], reverse=True)[:10])
        }