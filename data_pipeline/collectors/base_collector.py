"""
Base collector class for missing persons data sources.
"""

from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional
from datetime import datetime
import logging
import requests
import time


class BaseCollector(ABC):
    """Abstract base class for all data collectors."""
    
    def __init__(self, name: str, config: Dict[str, Any]):
        self.name = name
        self.config = config
        self.logger = logging.getLogger(f"pipeline.{name}")
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'SaveThemNow.Jesus Data Pipeline 1.0 (Missing Persons Awareness)'
        })
        
        # Rate limiting configuration
        self.min_delay = config.get('min_delay', 1.0)  # seconds between requests
        self.max_retries = config.get('max_retries', 3)
        self.retry_delay = config.get('retry_delay', 5.0)
        
        self.last_request_time = 0
        
    def rate_limit(self):
        """Implement rate limiting between requests."""
        current_time = time.time()
        elapsed = current_time - self.last_request_time
        if elapsed < self.min_delay:
            sleep_time = self.min_delay - elapsed
            self.logger.debug(f"Rate limiting: sleeping for {sleep_time:.2f}s")
            time.sleep(sleep_time)
        self.last_request_time = time.time()
    
    def make_request(self, url: str, **kwargs) -> Optional[requests.Response]:
        """Make a rate-limited HTTP request with retries."""
        self.rate_limit()
        
        for attempt in range(self.max_retries):
            try:
                response = self.session.get(url, **kwargs)
                response.raise_for_status()
                return response
            except requests.RequestException as e:
                self.logger.warning(f"Request failed (attempt {attempt + 1}): {e}")
                if attempt < self.max_retries - 1:
                    time.sleep(self.retry_delay * (2 ** attempt))  # Exponential backoff
                else:
                    self.logger.error(f"All retry attempts failed for {url}")
                    raise
        
        return None
    
    @abstractmethod
    def collect_data(self) -> List[Dict[str, Any]]:
        """
        Collect data from the source.
        
        Returns:
            List of dictionaries containing missing persons data
        """
        pass
    
    @abstractmethod
    def validate_record(self, record: Dict[str, Any]) -> bool:
        """
        Validate a single record.
        
        Args:
            record: Dictionary containing missing person data
            
        Returns:
            True if record is valid, False otherwise
        """
        pass
    
    def normalize_record(self, record: Dict[str, Any]) -> Dict[str, Any]:
        """
        Normalize a record to standard format.
        
        Args:
            record: Raw record from data source
            
        Returns:
            Normalized record
        """
        # Default implementation - subclasses should override
        normalized = {
            'source': self.name,
            'collected_at': datetime.utcnow().isoformat(),
            'raw_data': record
        }
        
        # Extract common fields if available
        for field in ['name', 'age', 'location', 'date_missing', 'case_number']:
            if field in record:
                normalized[field] = record[field]
        
        return normalized
    
    def get_statistics(self) -> Dict[str, Any]:
        """Get collection statistics."""
        return {
            'source': self.name,
            'last_collection': datetime.utcnow().isoformat(),
            'status': 'active'
        }