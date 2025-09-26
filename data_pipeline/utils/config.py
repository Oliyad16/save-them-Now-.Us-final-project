"""
Configuration management for the data pipeline.

This module handles loading environment variables and configuration
settings for all data collectors and pipeline components.
"""

import os
from typing import Dict, Any, Optional
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables from .env.local file
env_path = Path(__file__).parent.parent.parent / '.env.local'
if env_path.exists():
    load_dotenv(env_path)


class DataCollectionConfig:
    """Configuration class for data collection settings."""
    
    def __init__(self):
        self.load_config()
    
    def load_config(self):
        """Load all configuration settings from environment variables."""
        
        # Basic data collection settings
        self.enabled = self._get_bool('DATA_COLLECTION_ENABLED', True)
        self.interval_hours = self._get_int('DATA_COLLECTION_INTERVAL_HOURS', 6)
        self.batch_size = self._get_int('DATA_COLLECTION_BATCH_SIZE', 50)
        self.max_records = self._get_int('DATA_COLLECTION_MAX_RECORDS', 1000)
        
        # API Keys and credentials
        self.api_keys = {
            'namus': os.getenv('NAMUS_API_KEY'),
            'ncmec': os.getenv('NCMEC_API_KEY'),
            'google_maps': os.getenv('GOOGLE_MAPS_API_KEY')
        }
        
        # Data source URLs
        self.data_sources = {
            'namus_base_url': os.getenv('NAMUS_BASE_URL', 'https://www.namus.gov'),
            'ncmec_base_url': os.getenv('NCMEC_BASE_URL', 'https://api.missingkids.org'),
            'amber_alert_rss_url': os.getenv('AMBER_ALERT_RSS_URL', 'https://amberalert.gov/rss.xml'),
            'california_doj_url': os.getenv('CALIFORNIA_DOJ_URL', 'https://oag.ca.gov/missing'),
            'texas_dps_url': os.getenv('TEXAS_DPS_URL', 'https://www.dps.texas.gov'),
            'florida_fdle_url': os.getenv('FLORIDA_FDLE_URL', 'https://www.fdle.state.fl.us')
        }
        
        # Rate limiting settings
        self.rate_limits = {
            'request_delay': self._get_float('COLLECTION_REQUEST_DELAY', 2.0),
            'retry_attempts': self._get_int('COLLECTION_RETRY_ATTEMPTS', 3),
            'timeout_seconds': self._get_int('COLLECTION_TIMEOUT_SECONDS', 30)
        }
        
        # Priority settings
        self.priority = {
            'high_priority_age_threshold': self._get_int('HIGH_PRIORITY_AGE_THRESHOLD', 16),
            'critical_priority_hours': self._get_int('CRITICAL_PRIORITY_HOURS', 24),
            'amber_alert_priority_score': self._get_int('AMBER_ALERT_PRIORITY_SCORE', 95),
            'child_case_priority_boost': self._get_int('CHILD_CASE_PRIORITY_BOOST', 20)
        }
        
        # Geocoding settings
        self.geocoding = {
            'enabled': self._get_bool('GEOCODING_ENABLED', True),
            'batch_size': self._get_int('GEOCODING_BATCH_SIZE', 100),
            'rate_limit': self._get_int('GEOCODING_RATE_LIMIT', 50),
            'cache_hours': self._get_int('GEOCODING_CACHE_HOURS', 168)
        }
        
        # Data quality settings
        self.data_quality = {
            'duplicate_similarity_threshold': self._get_float('DUPLICATE_SIMILARITY_THRESHOLD', 0.85),
            'name_similarity_threshold': self._get_float('NAME_SIMILARITY_THRESHOLD', 0.80),
            'minimum_record_fields': self._get_int('MINIMUM_RECORD_FIELDS', 3)
        }
        
        # Storage paths
        self.storage = {
            'csv_output_path': os.getenv('CSV_OUTPUT_PATH', './missing-persons.csv'),
            'database_backup_path': os.getenv('DATABASE_BACKUP_PATH', './backups/'),
            'log_file_path': os.getenv('LOG_FILE_PATH', './logs/data-collection.log')
        }
        
        # Notification settings
        self.notifications = {
            'webhook_url': os.getenv('WEBHOOK_URL'),
            'email_alerts_enabled': self._get_bool('EMAIL_ALERTS_ENABLED', False),
            'alert_email': os.getenv('ALERT_EMAIL', 'alerts@savethemnow.jesus')
        }
        
        # Scheduler configuration
        self.scheduler = {
            'enabled': self._get_bool('SCHEDULER_ENABLED', True),
            'full_collection_cron': os.getenv('FULL_COLLECTION_CRON', '0 2 * * *'),
            'incremental_collection_hours': self._get_int('INCREMENTAL_COLLECTION_HOURS', 6),
            'geocoding_batch_hours': self._get_int('GEOCODING_BATCH_HOURS', 4),
            'health_check_minutes': self._get_int('HEALTH_CHECK_MINUTES', 30),
            'urgent_monitor_minutes': self._get_int('URGENT_MONITOR_MINUTES', 15)
        }
        
        # Debug and development settings
        self.debug = {
            'data_collection_debug': self._get_bool('DATA_COLLECTION_DEBUG', False),
            'verbose_logging': self._get_bool('VERBOSE_LOGGING', False),
            'dry_run_mode': self._get_bool('DRY_RUN_MODE', False)
        }
        
        # Database settings
        self.database = {
            'path': os.getenv('DATABASE_PATH', './database.sqlite'),
            'firebase_project_id': os.getenv('FIREBASE_PROJECT_ID'),
            'firebase_client_email': os.getenv('FIREBASE_CLIENT_EMAIL'),
            'firebase_private_key': os.getenv('FIREBASE_PRIVATE_KEY'),
            'firebase_storage_bucket': os.getenv('FIREBASE_STORAGE_BUCKET')
        }
    
    def _get_bool(self, key: str, default: bool = False) -> bool:
        """Get boolean value from environment variable."""
        value = os.getenv(key, '').lower()
        if value in ('true', '1', 'yes', 'on'):
            return True
        elif value in ('false', '0', 'no', 'off'):
            return False
        return default
    
    def _get_int(self, key: str, default: int = 0) -> int:
        """Get integer value from environment variable."""
        try:
            return int(os.getenv(key, str(default)))
        except (ValueError, TypeError):
            return default
    
    def _get_float(self, key: str, default: float = 0.0) -> float:
        """Get float value from environment variable."""
        try:
            return float(os.getenv(key, str(default)))
        except (ValueError, TypeError):
            return default
    
    def get_collector_config(self, collector_name: str) -> Dict[str, Any]:
        """Get configuration specific to a collector."""
        base_config = {
            'batch_size': self.batch_size,
            'max_records': self.max_records,
            'request_delay': self.rate_limits['request_delay'],
            'timeout': self.rate_limits['timeout_seconds'],
            'max_retries': self.rate_limits['retry_attempts'],
            'debug': self.debug['data_collection_debug'],
            'dry_run': self.debug['dry_run_mode']
        }
        
        # Collector-specific configurations
        if collector_name == 'namus':
            base_config.update({
                'api_key': self.api_keys['namus'],
                'base_url': self.data_sources['namus_base_url'],
                'priority': 4  # High priority for national database
            })
        
        elif collector_name == 'ncmec':
            base_config.update({
                'api_key': self.api_keys['ncmec'],
                'base_url': self.data_sources['ncmec_base_url'],
                'priority': 5,  # Highest priority for missing children
                'focus_children': True
            })
        
        elif collector_name == 'amber_alert':
            base_config.update({
                'rss_url': self.data_sources['amber_alert_rss_url'],
                'priority': 5,  # Highest priority for active alerts
                'update_interval_minutes': 5,  # Very frequent updates
                'critical_priority': True
            })
        
        elif collector_name == 'california_doj':
            base_config.update({
                'base_url': self.data_sources['california_doj_url'],
                'priority': 3,  # Medium-high priority for state data
                'state': 'California'
            })
        
        elif collector_name == 'texas_dps':
            base_config.update({
                'base_url': self.data_sources['texas_dps_url'],
                'priority': 3,
                'state': 'Texas',
                'concurrent_requests': 3  # Texas is large, allow more concurrent requests
            })
        
        elif collector_name == 'florida_fdle':
            base_config.update({
                'base_url': self.data_sources['florida_fdle_url'],
                'priority': 3,
                'state': 'Florida',
                'include_universities': True  # Florida has many universities
            })
        
        return base_config
    
    def get_scheduler_config(self) -> Dict[str, Any]:
        """Get scheduler configuration."""
        return {
            'enabled': self.scheduler['enabled'],
            'database_path': self.database['path'],
            'scheduler_db_path': './scheduler.db',
            'csv_path': self.storage['csv_output_path'],
            'full_collection_cron': self.scheduler['full_collection_cron'],
            'incremental_hours': self.scheduler['incremental_collection_hours'],
            'geocoding_hours': self.scheduler['geocoding_batch_hours'],
            'health_check_minutes': self.scheduler['health_check_minutes'],
            'urgent_monitor_minutes': self.scheduler['urgent_monitor_minutes'],
            'alerts': {
                'webhook_url': self.notifications['webhook_url'],
                'email': {
                    'enabled': self.notifications['email_alerts_enabled'],
                    'recipient': self.notifications['alert_email']
                }
            }
        }
    
    def get_geocoding_config(self) -> Dict[str, Any]:
        """Get geocoding configuration."""
        return {
            'enabled': self.geocoding['enabled'],
            'api_key': self.api_keys['google_maps'],
            'batch_size': self.geocoding['batch_size'],
            'rate_limit': self.geocoding['rate_limit'],
            'cache_hours': self.geocoding['cache_hours']
        }
    
    def validate_config(self) -> Dict[str, Any]:
        """Validate configuration and return status."""
        issues = []
        warnings = []
        
        # Check required API keys
        if not self.api_keys['google_maps']:
            warnings.append("Google Maps API key not set - geocoding will be limited")
        
        if not self.api_keys['namus']:
            warnings.append("NamUs API key not set - may have rate limiting issues")
        
        if not self.api_keys['ncmec']:
            warnings.append("NCMEC API key not set - collection may be limited")
        
        # Check paths
        csv_dir = Path(self.storage['csv_output_path']).parent
        if not csv_dir.exists():
            issues.append(f"CSV output directory does not exist: {csv_dir}")
        
        backup_dir = Path(self.storage['database_backup_path'])
        if not backup_dir.exists():
            warnings.append(f"Backup directory does not exist: {backup_dir}")
        
        log_dir = Path(self.storage['log_file_path']).parent
        if not log_dir.exists():
            warnings.append(f"Log directory does not exist: {log_dir}")
        
        # Check database configuration
        if not self.database['firebase_project_id']:
            warnings.append("Firebase project ID not set - Firestore integration disabled")
        
        # Check notification configuration
        if self.notifications['email_alerts_enabled'] and not self.notifications['alert_email']:
            issues.append("Email alerts enabled but no recipient email configured")
        
        return {
            'valid': len(issues) == 0,
            'issues': issues,
            'warnings': warnings,
            'config_loaded': True
        }
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert configuration to dictionary for logging/debugging."""
        return {
            'data_collection': {
                'enabled': self.enabled,
                'interval_hours': self.interval_hours,
                'batch_size': self.batch_size,
                'max_records': self.max_records
            },
            'rate_limits': self.rate_limits,
            'priority': self.priority,
            'geocoding': self.geocoding,
            'data_quality': self.data_quality,
            'scheduler': self.scheduler,
            'debug': self.debug,
            'api_keys_configured': {
                'namus': bool(self.api_keys['namus']),
                'ncmec': bool(self.api_keys['ncmec']),
                'google_maps': bool(self.api_keys['google_maps'])
            },
            'notifications_configured': {
                'webhook': bool(self.notifications['webhook_url']),
                'email': self.notifications['email_alerts_enabled']
            }
        }


# Global configuration instance
config = DataCollectionConfig()


def get_config() -> DataCollectionConfig:
    """Get the global configuration instance."""
    return config


def reload_config() -> DataCollectionConfig:
    """Reload configuration from environment variables."""
    global config
    config = DataCollectionConfig()
    return config


# Convenience functions for common configuration access
def get_collector_config(collector_name: str) -> Dict[str, Any]:
    """Get configuration for a specific collector."""
    return config.get_collector_config(collector_name)


def get_scheduler_config() -> Dict[str, Any]:
    """Get scheduler configuration."""
    return config.get_scheduler_config()


def get_geocoding_config() -> Dict[str, Any]:
    """Get geocoding configuration."""
    return config.get_geocoding_config()


def is_debug_mode() -> bool:
    """Check if debug mode is enabled."""
    return config.debug['data_collection_debug']


def is_dry_run_mode() -> bool:
    """Check if dry run mode is enabled."""
    return config.debug['dry_run_mode']


if __name__ == "__main__":
    # Test configuration loading
    print("Testing configuration loading...")
    
    config = get_config()
    validation = config.validate_config()
    
    print(f"Configuration valid: {validation['valid']}")
    
    if validation['issues']:
        print("Issues found:")
        for issue in validation['issues']:
            print(f"  - {issue}")
    
    if validation['warnings']:
        print("Warnings:")
        for warning in validation['warnings']:
            print(f"  - {warning}")
    
    print("\nConfiguration summary:")
    config_dict = config.to_dict()
    import json
    print(json.dumps(config_dict, indent=2))