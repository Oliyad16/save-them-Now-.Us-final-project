"""
Advanced automated scheduler for missing persons data pipeline.
Implements intelligent scheduling with persistence, failure recovery, and monitoring.
"""

import asyncio
import json
import sqlite3
import time
import platform
import subprocess
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional, Callable
from pathlib import Path
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.jobstores.sqlalchemy import SQLAlchemyJobStore
from apscheduler.executors.pool import ThreadPoolExecutor
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.interval import IntervalTrigger
from apscheduler.events import EVENT_JOB_EXECUTED, EVENT_JOB_ERROR, EVENT_JOB_MISSED

from ..utils.logger import get_logger
from ..pipeline import MissingPersonsPipeline
from ..utils.data_staleness_monitor import DataStalenessMonitor

logger = get_logger("automated_scheduler")

class AutomatedScheduler:
    """Advanced scheduler for automated missing persons data updates."""
    
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.db_path = Path(config.get('database_path', 'database/app.db'))
        self.scheduler_db_path = Path(config.get('scheduler_db_path', 'scheduler.db'))
        
        # Configure job store for persistence
        jobstores = {
            'default': SQLAlchemyJobStore(url=f'sqlite:///{self.scheduler_db_path}')
        }
        
        # Configure executors
        executors = {
            'default': ThreadPoolExecutor(max_workers=4),
            'pipeline': ThreadPoolExecutor(max_workers=2)
        }
        
        # Job defaults
        job_defaults = {
            'coalesce': True,  # Combine multiple pending executions
            'max_instances': 1,  # Only one instance of each job type
            'misfire_grace_time': 300  # 5 minutes grace for missed jobs
        }
        
        # Initialize scheduler
        self.scheduler = AsyncIOScheduler(
            jobstores=jobstores,
            executors=executors,
            job_defaults=job_defaults,
            timezone='UTC'
        )
        
        # Scheduling configurations
        self.schedule_configs = {
            'full_pipeline': {
                'trigger': CronTrigger(hour=2, minute=0),  # Daily at 2 AM
                'function': self.run_full_pipeline,
                'description': 'Full data collection pipeline',
                'priority': 1,
                'enabled': True
            },
            'incremental_update': {
                'trigger': IntervalTrigger(hours=3),  # Every 3 hours (increased from 6)
                'function': self.run_incremental_update,
                'description': 'Incremental data updates',
                'priority': 2,
                'enabled': True
            },
            'geocoding_batch': {
                'trigger': IntervalTrigger(hours=4),  # Every 4 hours
                'function': self.run_geocoding_batch,
                'description': 'Batch geocoding for new records',
                'priority': 3,
                'enabled': True
            },
            'data_freshness_check': {
                'trigger': IntervalTrigger(minutes=10),  # Every 10 minutes (increased from 30)
                'function': self.check_data_freshness,
                'description': 'Monitor data freshness and trigger updates',
                'priority': 4,
                'enabled': True
            },
            'urgent_case_monitor': {
                'trigger': IntervalTrigger(minutes=15),  # Every 15 minutes
                'function': self.monitor_urgent_cases,
                'description': 'Monitor for urgent missing children cases',
                'priority': 5,
                'enabled': True
            },
            'system_health_check': {
                'trigger': IntervalTrigger(hours=1),  # Hourly
                'function': self.system_health_check,
                'description': 'System health and performance monitoring',
                'priority': 6,
                'enabled': True
            }
        }
        
        # Add event listeners
        self.scheduler.add_listener(self.job_executed_listener, EVENT_JOB_EXECUTED)
        self.scheduler.add_listener(self.job_error_listener, EVENT_JOB_ERROR)
        self.scheduler.add_listener(self.job_missed_listener, EVENT_JOB_MISSED)
        
        # Statistics tracking
        self.stats = {
            'jobs_executed': 0,
            'jobs_failed': 0,
            'jobs_missed': 0,
            'last_successful_full_pipeline': None,
            'last_incremental_update': None,
            'data_freshness_triggers': 0,
            'urgent_cases_processed': 0
        }
        
        # Data staleness monitor
        self.staleness_monitor = DataStalenessMonitor({
            'csv_path': config.get('csv_path', 'missing-persons.csv'),
            'database_path': str(self.db_path),
            'warning_threshold_hours': 24,
            'critical_threshold_hours': 48,
            'emergency_threshold_hours': 72,
            'alerts': config.get('alerts', {})
        })
    
    def initialize_jobs(self):
        """Initialize all scheduled jobs."""
        logger.logger.info("Initializing scheduled jobs")
        
        for job_id, job_config in self.schedule_configs.items():
            if not job_config.get('enabled', True):
                continue
            
            try:
                self.scheduler.add_job(
                    func=job_config['function'],
                    trigger=job_config['trigger'],
                    id=job_id,
                    name=job_config['description'],
                    executor='pipeline' if 'pipeline' in job_id else 'default',
                    replace_existing=True
                )
                logger.logger.info(f"Scheduled job: {job_id} - {job_config['description']}")
                
            except Exception as e:
                logger.logger.error(f"Failed to schedule job {job_id}: {e}")
    
    async def run_full_pipeline(self):
        """Execute full data collection pipeline."""
        logger.logger.info("Starting scheduled full pipeline run")
        start_time = time.time()
        
        try:
            pipeline = MissingPersonsPipeline()
            results = pipeline.run_full_pipeline()
            
            duration = time.time() - start_time
            self.stats['last_successful_full_pipeline'] = datetime.now().isoformat()
            
            logger.logger.info(
                f"Full pipeline completed: {results['total_processed']} records "
                f"processed in {duration:.2f} seconds"
            )
            
            # Update CSV file timestamp for freshness tracking
            self.update_data_timestamps()
            
            return results
            
        except Exception as e:
            logger.logger.error(f"Scheduled full pipeline failed: {e}")
            raise
    
    async def run_incremental_update(self):
        """Execute incremental data updates."""
        logger.logger.info("Starting scheduled incremental update")
        start_time = time.time()
        
        try:
            # Check what needs updating
            staleness_info = self.staleness_monitor.get_staleness_summary()
            
            # Only run if data is getting stale
            csv_age = staleness_info['csv']['age_hours']
            if csv_age < 12:  # Less than 12 hours old
                logger.logger.info("Data is fresh, skipping incremental update")
                return {'skipped': True, 'reason': 'data_fresh'}
            
            # Run targeted collectors for recent data
            pipeline = MissingPersonsPipeline()
            
            # Run only fast collectors for incremental updates
            collectors_to_run = ['automated_csv', 'backup_sources']
            results = await self.run_selective_collectors(pipeline, collectors_to_run)
            
            duration = time.time() - start_time
            self.stats['last_incremental_update'] = datetime.now().isoformat()
            
            logger.logger.info(
                f"Incremental update completed: {results.get('total_processed', 0)} "
                f"records in {duration:.2f} seconds"
            )
            
            return results
            
        except Exception as e:
            logger.logger.error(f"Scheduled incremental update failed: {e}")
            raise
    
    async def run_geocoding_batch(self):
        """Execute batch geocoding for records missing coordinates."""
        logger.logger.info("Starting scheduled geocoding batch")
        
        try:
            pipeline = MissingPersonsPipeline()
            results = pipeline.run_geocoding_only(limit=500)
            
            logger.logger.info(
                f"Geocoding batch completed: {results['successful_geocodes']} "
                f"successful out of {results['processed_records']} records"
            )
            
            return results
            
        except Exception as e:
            logger.logger.error(f"Scheduled geocoding batch failed: {e}")
            raise
    
    async def check_data_freshness(self):
        """Monitor data freshness and trigger updates if needed."""
        try:
            staleness_info = self.staleness_monitor.check_and_alert()
            
            # Trigger updates based on staleness level
            if staleness_info['level'] in ['critical', 'emergency']:
                logger.logger.warning(f"Data staleness level: {staleness_info['level']}, triggering update")
                
                # Trigger immediate incremental update
                self.stats['data_freshness_triggers'] += 1
                await self.run_incremental_update()
                
                # If still critical after incremental, trigger full pipeline
                if staleness_info['level'] == 'emergency':
                    logger.logger.critical("Emergency staleness level, triggering full pipeline")
                    await self.run_full_pipeline()
            
            return staleness_info
            
        except Exception as e:
            logger.logger.error(f"Data freshness check failed: {e}")
            raise
    
    async def monitor_urgent_cases(self):
        """Monitor for urgent missing children cases and prioritize updates."""
        try:
            # Query for recent missing children cases
            urgent_cases = self.get_urgent_cases()
            
            if urgent_cases:
                logger.logger.info(f"Found {len(urgent_cases)} urgent cases")
                
                # Trigger immediate targeted collection for urgent cases
                await self.process_urgent_cases(urgent_cases)
                self.stats['urgent_cases_processed'] += len(urgent_cases)
            
            return {'urgent_cases_found': len(urgent_cases)}
            
        except Exception as e:
            logger.logger.error(f"Urgent case monitoring failed: {e}")
            raise
    
    async def system_health_check(self):
        """Perform system health and performance monitoring."""
        try:
            health_info = {
                'timestamp': datetime.now().isoformat(),
                'scheduler_status': 'running' if self.scheduler.running else 'stopped',
                'active_jobs': len(self.scheduler.get_jobs()),
                'stats': self.stats.copy()
            }
            
            # Check database connectivity
            try:
                conn = sqlite3.connect(self.db_path)
                cursor = conn.cursor()
                cursor.execute("SELECT COUNT(*) FROM missing_persons")
                health_info['database_records'] = cursor.fetchone()[0]
                conn.close()
                health_info['database_status'] = 'healthy'
            except Exception as e:
                health_info['database_status'] = f'error: {e}'
            
            # Check disk space
            disk_usage = self.check_disk_space()
            health_info['disk_usage'] = disk_usage
            
            # Log health summary
            logger.logger.info(f"System health check: {health_info['database_status']}, "
                             f"{health_info['database_records']} records, "
                             f"{disk_usage['free_gb']:.1f}GB free")
            
            return health_info
            
        except Exception as e:
            logger.logger.error(f"System health check failed: {e}")
            raise
    
    def get_urgent_cases(self) -> List[Dict[str, Any]]:
        """Get urgent missing children cases from the last 48 hours."""
        try:
            conn = sqlite3.connect(self.db_path)
            conn.row_factory = sqlite3.Row
            
            cursor = conn.cursor()
            cursor.execute("""
                SELECT * FROM missing_persons 
                WHERE category = 'Missing Children'
                  AND age < 18
                  AND datetime(created_at) > datetime('now', '-48 hours')
                ORDER BY created_at DESC
                LIMIT 50
            """)
            
            cases = [dict(row) for row in cursor.fetchall()]
            conn.close()
            
            return cases
            
        except Exception as e:
            logger.logger.error(f"Error querying urgent cases: {e}")
            return []
    
    async def process_urgent_cases(self, cases: List[Dict[str, Any]]):
        """Process urgent cases with high priority."""
        logger.logger.info(f"Processing {len(cases)} urgent cases")
        
        # For now, just log the urgent cases
        # In a real system, this would trigger immediate notifications,
        # social media alerts, etc.
        
        for case in cases:
            logger.logger.warning(
                f"URGENT: Missing child {case.get('name', 'Unknown')} "
                f"from {case.get('location', 'Unknown location')}"
            )
    
    async def run_selective_collectors(self, pipeline, collector_names: List[str]) -> Dict[str, Any]:
        """Run only specific collectors for targeted updates."""
        # This would be implemented to run only specific data collectors
        # For now, return a mock result
        return {
            'total_collected': 0,
            'total_processed': 0,
            'collectors_run': collector_names
        }
    
    def update_data_timestamps(self):
        """Update data file timestamps for freshness tracking."""
        try:
            csv_path = Path(self.config.get('csv_path', 'missing-persons.csv'))
            if csv_path.exists():
                # Touch the file to update its modification time
                csv_path.touch()
                logger.logger.debug("Updated CSV timestamp")
        except Exception as e:
            logger.logger.error(f"Failed to update data timestamps: {e}")
    
    def check_disk_space(self) -> Dict[str, float]:
        """Check available disk space."""
        try:
            if platform.system() == "Windows":
                import shutil
                total, used, free = shutil.disk_usage(".")
                return {
                    'total_gb': total / (1024**3),
                    'used_gb': used / (1024**3),
                    'free_gb': free / (1024**3),
                    'usage_percent': (used / total) * 100
                }
            else:
                result = subprocess.run(['df', '-h', '.'], capture_output=True, text=True)
                # Parse df output for Unix systems
                return {'free_gb': 0, 'usage_percent': 0}  # Simplified
        except Exception:
            return {'free_gb': 0, 'usage_percent': 0}
    
    def job_executed_listener(self, event):
        """Handle successful job execution."""
        self.stats['jobs_executed'] += 1
        logger.logger.info(f"Job completed: {event.job_id}")
    
    def job_error_listener(self, event):
        """Handle job execution errors."""
        self.stats['jobs_failed'] += 1
        logger.logger.error(f"Job failed: {event.job_id} - {event.exception}")
    
    def job_missed_listener(self, event):
        """Handle missed job executions."""
        self.stats['jobs_missed'] += 1
        logger.logger.warning(f"Job missed: {event.job_id}")
    
    def start(self):
        """Start the automated scheduler."""
        logger.logger.info("Starting automated scheduler")
        
        try:
            self.initialize_jobs()
            self.scheduler.start()
            logger.logger.info("Automated scheduler started successfully")
            
            # Log scheduled jobs
            jobs = self.scheduler.get_jobs()
            for job in jobs:
                logger.logger.info(f"Active job: {job.id} - next run: {job.next_run_time}")
            
        except Exception as e:
            logger.logger.error(f"Failed to start scheduler: {e}")
            raise
    
    def stop(self):
        """Stop the automated scheduler."""
        logger.logger.info("Stopping automated scheduler")
        
        try:
            self.scheduler.shutdown(wait=True)
            logger.logger.info("Automated scheduler stopped")
        except Exception as e:
            logger.logger.error(f"Error stopping scheduler: {e}")
    
    def get_status(self) -> Dict[str, Any]:
        """Get scheduler status and statistics."""
        jobs = self.scheduler.get_jobs()
        
        return {
            'running': self.scheduler.running,
            'active_jobs': len(jobs),
            'next_jobs': [
                {
                    'id': job.id,
                    'name': job.name,
                    'next_run': job.next_run_time.isoformat() if job.next_run_time else None
                }
                for job in jobs[:5]  # Show next 5 jobs
            ],
            'statistics': self.stats,
            'data_freshness': self.staleness_monitor.get_staleness_summary()
        }


async def main():
    """Main entry point for running the automated scheduler."""
    import argparse
    
    parser = argparse.ArgumentParser(description="Automated Missing Persons Data Scheduler")
    parser.add_argument('--config', help='Configuration file path')
    parser.add_argument('--daemon', action='store_true', help='Run as daemon')
    
    args = parser.parse_args()
    
    # Default configuration
    config = {
        'database_path': 'database/app.db',
        'scheduler_db_path': 'scheduler.db',
        'csv_path': 'missing-persons.csv',
        'alerts': {
            'webhook_url': '',
            'email': {'enabled': False}
        }
    }
    
    scheduler = AutomatedScheduler(config)
    
    try:
        scheduler.start()
        
        if args.daemon:
            # Run indefinitely
            logger.logger.info("Running in daemon mode - press Ctrl+C to stop")
            while True:
                await asyncio.sleep(60)
        else:
            # Run for a short time for testing
            logger.logger.info("Running for 5 minutes for testing")
            await asyncio.sleep(300)
            
    except KeyboardInterrupt:
        logger.logger.info("Received interrupt signal")
    finally:
        scheduler.stop()


if __name__ == '__main__':
    asyncio.run(main())