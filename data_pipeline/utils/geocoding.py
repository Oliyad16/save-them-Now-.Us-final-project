"""
Geocoding utilities for the missing persons pipeline.
"""

import json
import time
import requests
from typing import Dict, Any, Optional, Tuple, List
from pathlib import Path
import hashlib

from .logger import get_logger

logger = get_logger("geocoding")

class GeocodingService:
    """Handles geocoding of addresses to coordinates."""
    
    def __init__(self, cache_file: str = None, config: Dict[str, Any] = None):
        self.cache_file = Path(cache_file) if cache_file else Path("geocache.json")
        self.config = config or {}
        
        # Load existing cache
        self.cache = self._load_cache()
        
        # Geocoding providers configuration
        self.providers = self.config.get('providers', [
            {
                'name': 'nominatim',
                'base_url': 'https://nominatim.openstreetmap.org/search',
                'rate_limit': 1.0,
                'timeout': 10
            }
        ])
        
        # US bounds for validation
        self.us_bounds = self.config.get('us_bounds', {
            'min_lat': 24.0,
            'max_lat': 49.0, 
            'min_lon': -125.0,
            'max_lon': -66.0
        })
        
        self.last_request_time = 0
        self.stats = {
            'cache_hits': 0,
            'api_calls': 0,
            'successful_geocodes': 0,
            'failed_geocodes': 0
        }
    
    def _load_cache(self) -> Dict[str, Dict[str, Any]]:
        """Load geocoding cache from file."""
        try:
            if self.cache_file.exists():
                with open(self.cache_file, 'r', encoding='utf-8') as f:
                    cache_data = json.load(f)
                    logger.logger.info(f"Loaded geocoding cache with {len(cache_data)} entries")
                    return cache_data
        except Exception as e:
            logger.logger.warning(f"Could not load geocoding cache: {e}")
        
        return {}
    
    def _save_cache(self):
        """Save geocoding cache to file."""
        try:
            with open(self.cache_file, 'w', encoding='utf-8') as f:
                json.dump(self.cache, f, indent=2, ensure_ascii=False)
            logger.logger.debug(f"Saved geocoding cache with {len(self.cache)} entries")
        except Exception as e:
            logger.logger.error(f"Could not save geocoding cache: {e}")
    
    def _normalize_location(self, city: str, state: str, country: str = "USA") -> str:
        """Normalize location for consistent caching."""
        # Clean and standardize location components
        city = city.strip().title() if city else ""
        state = state.strip().upper() if state else ""
        country = country.strip().upper() if country else "USA"
        
        # Create normalized key
        location_key = f"{city}, {state}, {country}"
        return location_key.lower()
    
    def _create_cache_key(self, location: str) -> str:
        """Create a hash-based cache key for a location."""
        return hashlib.md5(location.encode('utf-8')).hexdigest()
    
    def _validate_coordinates(self, lat: float, lon: float) -> bool:
        """Validate that coordinates are within US bounds."""
        return (
            self.us_bounds['min_lat'] <= lat <= self.us_bounds['max_lat'] and
            self.us_bounds['min_lon'] <= lon <= self.us_bounds['max_lon']
        )
    
    def _rate_limit(self, provider_config: Dict[str, Any]):
        """Implement rate limiting for API requests."""
        rate_limit = provider_config.get('rate_limit', 1.0)
        current_time = time.time()
        elapsed = current_time - self.last_request_time
        
        if elapsed < rate_limit:
            sleep_time = rate_limit - elapsed
            logger.logger.debug(f"Rate limiting: sleeping for {sleep_time:.2f}s")
            time.sleep(sleep_time)
        
        self.last_request_time = time.time()
    
    def _geocode_nominatim(self, location: str, provider_config: Dict[str, Any]) -> Optional[Tuple[float, float]]:
        """Geocode using Nominatim/OpenStreetMap."""
        self._rate_limit(provider_config)
        
        params = {
            'q': location,
            'format': 'json',
            'limit': 1,
            'countrycodes': 'us',
            'addressdetails': 1
        }
        
        try:
            response = requests.get(
                provider_config['base_url'],
                params=params,
                timeout=provider_config.get('timeout', 10),
                headers={
                    'User-Agent': 'SaveThemNow.Jesus Missing Persons Pipeline (contact@savethemnow.jesus)'
                }
            )
            response.raise_for_status()
            
            data = response.json()
            if data and len(data) > 0:
                result = data[0]
                lat = float(result['lat'])
                lon = float(result['lon'])
                
                if self._validate_coordinates(lat, lon):
                    return lat, lon
                else:
                    logger.logger.warning(f"Coordinates outside US bounds for {location}: {lat}, {lon}")
            
        except Exception as e:
            logger.logger.warning(f"Nominatim geocoding failed for {location}: {e}")
        
        return None
    
    def geocode(self, city: str, state: str, country: str = "USA") -> Optional[Dict[str, Any]]:
        """
        Geocode a location to coordinates.
        
        Args:
            city: City name
            state: State code/name
            country: Country (default: USA)
            
        Returns:
            Dictionary with lat, lon, source, and cached flag, or None if failed
        """
        # Normalize and create cache key
        location = self._normalize_location(city, state, country)
        cache_key = self._create_cache_key(location)
        
        # Check cache first
        if cache_key in self.cache:
            self.stats['cache_hits'] += 1
            result = self.cache[cache_key].copy()
            result['cached'] = True
            logger.logger.debug(f"Cache hit for {location}")
            return result
        
        # Try geocoding with available providers
        for provider in self.providers:
            if provider['name'] == 'nominatim':
                coords = self._geocode_nominatim(location, provider)
                if coords:
                    lat, lon = coords
                    result = {
                        'lat': lat,
                        'lon': lon,
                        'source': provider['name'],
                        'location': location,
                        'timestamp': time.time(),
                        'cached': False
                    }
                    
                    # Cache the result
                    self.cache[cache_key] = {
                        'lat': lat,
                        'lon': lon,
                        'source': provider['name'],
                        'location': location,
                        'timestamp': time.time()
                    }
                    
                    self.stats['api_calls'] += 1
                    self.stats['successful_geocodes'] += 1
                    
                    # Save cache periodically
                    if len(self.cache) % 10 == 0:
                        self._save_cache()
                    
                    logger.logger.debug(f"Successfully geocoded {location}: {lat}, {lon}")
                    return result
        
        # Failed to geocode
        self.stats['api_calls'] += 1
        self.stats['failed_geocodes'] += 1
        logger.logger.warning(f"Failed to geocode {location}")
        return None
    
    def batch_geocode(self, locations: List[Dict[str, Any]], 
                     progress_callback=None) -> List[Dict[str, Any]]:
        """
        Batch geocode multiple locations.
        
        Args:
            locations: List of location dicts with 'city', 'state', optionally 'country'
            progress_callback: Function to call with progress updates
            
        Returns:
            List of geocoding results
        """
        results = []
        
        for i, location in enumerate(locations):
            city = location.get('city', '')
            state = location.get('state', '')
            country = location.get('country', 'USA')
            
            if not city or not state:
                results.append(None)
                continue
            
            result = self.geocode(city, state, country)
            if result:
                result.update(location)  # Include original location data
            results.append(result)
            
            # Progress callback
            if progress_callback and (i + 1) % 10 == 0:
                progress_callback(i + 1, len(locations))
        
        # Save cache after batch operation
        self._save_cache()
        
        return results
    
    def get_cache_stats(self) -> Dict[str, Any]:
        """Get geocoding cache statistics."""
        return {
            'cache_size': len(self.cache),
            'cache_file_size': self.cache_file.stat().st_size if self.cache_file.exists() else 0,
            'cache_hits': self.stats['cache_hits'],
            'api_calls': self.stats['api_calls'],
            'successful_geocodes': self.stats['successful_geocodes'],
            'failed_geocodes': self.stats['failed_geocodes'],
            'success_rate': (
                self.stats['successful_geocodes'] / max(self.stats['api_calls'], 1)
            ) * 100
        }
    
    def cleanup_cache(self, max_age_days: int = 90):
        """Remove old entries from cache."""
        current_time = time.time()
        max_age_seconds = max_age_days * 24 * 60 * 60
        
        old_keys = []
        for key, entry in self.cache.items():
            if current_time - entry.get('timestamp', 0) > max_age_seconds:
                old_keys.append(key)
        
        for key in old_keys:
            del self.cache[key]
        
        if old_keys:
            self._save_cache()
            logger.logger.info(f"Cleaned {len(old_keys)} old entries from geocoding cache")
    
    def export_cache(self, export_file: str):
        """Export cache to a file."""
        export_path = Path(export_file)
        with open(export_path, 'w', encoding='utf-8') as f:
            json.dump(self.cache, f, indent=2, ensure_ascii=False)
        logger.logger.info(f"Exported geocoding cache to {export_path}")
    
    def import_cache(self, import_file: str, merge: bool = True):
        """Import cache from a file."""
        import_path = Path(import_file)
        if not import_path.exists():
            logger.logger.error(f"Import file not found: {import_path}")
            return
        
        try:
            with open(import_path, 'r', encoding='utf-8') as f:
                imported_cache = json.load(f)
            
            if merge:
                self.cache.update(imported_cache)
                logger.logger.info(f"Merged {len(imported_cache)} entries into cache")
            else:
                self.cache = imported_cache
                logger.logger.info(f"Replaced cache with {len(imported_cache)} entries")
            
            self._save_cache()
            
        except Exception as e:
            logger.logger.error(f"Failed to import cache: {e}")

# Global geocoding service instance
_geocoding_service = None

def get_geocoding_service(cache_file: str = None, config: Dict[str, Any] = None) -> GeocodingService:
    """Get the global geocoding service instance."""
    global _geocoding_service
    if _geocoding_service is None:
        _geocoding_service = GeocodingService(cache_file, config)
    return _geocoding_service