"""
Configuration settings for the missing persons data pipeline.
"""

import os
from typing import Dict, Any
from pathlib import Path

# Base directory
BASE_DIR = Path(__file__).parent.parent.parent

# Database configuration
DATABASE_CONFIG = {
    'sqlite_path': BASE_DIR / 'database' / 'app.db',
    'backup_dir': BASE_DIR / 'database' / 'backups',
    'connection_pool_size': 10
}

# Geocoding configuration
GEOCODING_CONFIG = {
    'cache_file': BASE_DIR / 'geocache.json',
    'providers': [
        {
            'name': 'nominatim',
            'base_url': 'https://nominatim.openstreetmap.org/search',
            'rate_limit': 1.0,  # seconds between requests
            'timeout': 10
        }
    ],
    'us_bounds': {
        'min_lat': 24.0,
        'max_lat': 49.0,
        'min_lon': -125.0,
        'max_lon': -66.0
    }
}

# Data source configurations
DATA_SOURCES = {
    'namus': {
        'name': 'NamUs',
        'enabled': True,
        'base_url': 'https://namus.nij.ojp.gov',
        'min_delay': 2.0,
        'max_retries': 3,
        'retry_delay': 5.0,
        'update_frequency': 'daily'
    },
    'ncmec': {
        'name': 'NCMEC',
        'enabled': True,
        'base_url': 'https://www.missingkids.org',
        'min_delay': 1.0,
        'max_retries': 3,
        'retry_delay': 3.0,
        'update_frequency': 'hourly'
    },
    'florida_mepic': {
        'name': 'Florida MEPIC',
        'enabled': True,
        'base_url': 'https://www.fdle.state.fl.us',
        'min_delay': 1.0,
        'max_retries': 3,
        'retry_delay': 3.0,
        'update_frequency': 'daily'
    },
    'california_doj': {
        'name': 'California DOJ',
        'enabled': True,
        'base_url': 'https://oag.ca.gov',
        'min_delay': 1.0,
        'max_retries': 3,
        'retry_delay': 3.0,
        'update_frequency': 'daily'
    }
}

# Data validation rules
VALIDATION_RULES = {
    'required_fields': ['name', 'case_number'],
    'age_range': (0, 120),
    'valid_states': [
        'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
        'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
        'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
        'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
        'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY', 'DC'
    ],
    'deduplication': {
        'similarity_threshold': 0.85,
        'match_fields': ['name', 'location', 'case_number']
    }
}

# Logging configuration
LOGGING_CONFIG = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'detailed': {
            'format': '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        },
        'simple': {
            'format': '%(levelname)s - %(message)s'
        }
    },
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'level': 'INFO',
            'formatter': 'simple'
        },
        'file': {
            'class': 'logging.FileHandler',
            'filename': str(BASE_DIR / 'data_pipeline.log'),
            'level': 'DEBUG',
            'formatter': 'detailed'
        }
    },
    'loggers': {
        'pipeline': {
            'level': 'DEBUG',
            'handlers': ['console', 'file'],
            'propagate': False
        }
    },
    'root': {
        'level': 'INFO',
        'handlers': ['console']
    }
}

# Pipeline execution settings
PIPELINE_CONFIG = {
    'batch_size': 500,
    'max_workers': 4,
    'processing_timeout': 3600,  # 1 hour
    'data_retention_days': 90,
    'enable_monitoring': True
}

# Monitoring and alerting
MONITORING_CONFIG = {
    'enable_email_alerts': False,
    'email_settings': {
        'smtp_server': os.getenv('SMTP_SERVER', ''),
        'smtp_port': int(os.getenv('SMTP_PORT', '587')),
        'username': os.getenv('EMAIL_USERNAME', ''),
        'password': os.getenv('EMAIL_PASSWORD', ''),
        'recipients': []
    },
    'webhook_url': os.getenv('WEBHOOK_URL', ''),
    'alert_thresholds': {
        'failure_rate': 0.1,  # Alert if >10% failure rate
        'processing_time': 7200,  # Alert if processing takes >2 hours
        'data_freshness': 86400  # Alert if data is >24 hours old
    }
}

def get_config() -> Dict[str, Any]:
    """Get complete configuration dictionary."""
    return {
        'database': DATABASE_CONFIG,
        'geocoding': GEOCODING_CONFIG,
        'data_sources': DATA_SOURCES,
        'validation': VALIDATION_RULES,
        'logging': LOGGING_CONFIG,
        'pipeline': PIPELINE_CONFIG,
        'monitoring': MONITORING_CONFIG
    }