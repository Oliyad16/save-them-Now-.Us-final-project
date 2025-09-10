"""
Logging utilities for the missing persons data pipeline.
"""

import logging
import logging.config
from typing import Dict, Any
from pathlib import Path
import sys

def setup_logging(config: Dict[str, Any] = None, log_level: str = "INFO"):
    """
    Set up logging configuration for the pipeline.
    
    Args:
        config: Logging configuration dictionary
        log_level: Default logging level
    """
    if config is None:
        # Default configuration if none provided
        log_dir = Path(__file__).parent.parent.parent / "logs"
        log_dir.mkdir(exist_ok=True)
        
        config = {
            'version': 1,
            'disable_existing_loggers': False,
            'formatters': {
                'detailed': {
                    'format': '%(asctime)s - %(name)s - %(levelname)s - %(funcName)s:%(lineno)d - %(message)s',
                    'datefmt': '%Y-%m-%d %H:%M:%S'
                },
                'simple': {
                    'format': '%(levelname)s - %(name)s - %(message)s'
                }
            },
            'handlers': {
                'console': {
                    'class': 'logging.StreamHandler',
                    'level': log_level,
                    'formatter': 'simple',
                    'stream': sys.stdout
                },
                'file': {
                    'class': 'logging.handlers.RotatingFileHandler',
                    'filename': str(log_dir / 'pipeline.log'),
                    'maxBytes': 10 * 1024 * 1024,  # 10MB
                    'backupCount': 5,
                    'level': 'DEBUG',
                    'formatter': 'detailed'
                },
                'error_file': {
                    'class': 'logging.handlers.RotatingFileHandler',
                    'filename': str(log_dir / 'errors.log'),
                    'maxBytes': 5 * 1024 * 1024,  # 5MB
                    'backupCount': 3,
                    'level': 'ERROR',
                    'formatter': 'detailed'
                }
            },
            'loggers': {
                'pipeline': {
                    'level': 'DEBUG',
                    'handlers': ['console', 'file', 'error_file'],
                    'propagate': False
                },
                'pipeline.collectors': {
                    'level': 'DEBUG',
                    'handlers': ['console', 'file'],
                    'propagate': False
                },
                'pipeline.processors': {
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
    
    logging.config.dictConfig(config)
    
    # Create main pipeline logger
    logger = logging.getLogger('pipeline')
    logger.info("Pipeline logging initialized")
    
    return logger

class PipelineLogger:
    """Centralized logger for pipeline operations."""
    
    def __init__(self, name: str):
        self.logger = logging.getLogger(f"pipeline.{name}")
        
    def log_collection_start(self, source: str, expected_records: int = None):
        """Log start of data collection."""
        msg = f"Starting data collection from {source}"
        if expected_records:
            msg += f" (expecting ~{expected_records} records)"
        self.logger.info(msg)
    
    def log_collection_complete(self, source: str, records_collected: int, duration: float):
        """Log completion of data collection."""
        self.logger.info(
            f"Completed data collection from {source}: "
            f"{records_collected} records in {duration:.2f}s "
            f"({records_collected/duration:.1f} records/sec)"
        )
    
    def log_validation_results(self, total: int, valid: int, invalid: int):
        """Log validation results."""
        success_rate = (valid / total) * 100 if total > 0 else 0
        self.logger.info(
            f"Validation complete: {valid}/{total} valid records "
            f"({success_rate:.1f}% success rate), {invalid} invalid"
        )
    
    def log_geocoding_progress(self, processed: int, total: int, found: int):
        """Log geocoding progress."""
        if processed % 100 == 0:  # Log every 100 records
            success_rate = (found / processed) * 100 if processed > 0 else 0
            self.logger.info(
                f"Geocoding progress: {processed}/{total} processed "
                f"({success_rate:.1f}% success rate)"
            )
    
    def log_deduplication_results(self, original: int, duplicates: int, final: int):
        """Log deduplication results."""
        self.logger.info(
            f"Deduplication complete: {original} -> {final} records "
            f"({duplicates} duplicates removed)"
        )
    
    def log_database_operation(self, operation: str, records: int, duration: float):
        """Log database operations."""
        self.logger.info(
            f"Database {operation}: {records} records in {duration:.2f}s "
            f"({records/duration:.1f} records/sec)"
        )
    
    def log_error_with_context(self, error: Exception, context: Dict[str, Any]):
        """Log error with additional context."""
        self.logger.error(
            f"Error occurred: {str(error)}\n"
            f"Context: {context}",
            exc_info=True
        )
    
    def log_pipeline_stats(self, stats: Dict[str, Any]):
        """Log overall pipeline statistics."""
        self.logger.info(f"Pipeline statistics: {stats}")

# Global logger instance
_main_logger = None

def get_logger(name: str = "main") -> PipelineLogger:
    """Get a logger instance."""
    global _main_logger
    if _main_logger is None:
        _main_logger = setup_logging()
    return PipelineLogger(name)