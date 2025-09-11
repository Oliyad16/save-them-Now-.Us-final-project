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
                'trigger': IntervalTrigger(hours=6),  # Every 6 hours
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
                'trigger': IntervalTrigger(minutes=30),  # Every 30 minutes
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
            if staleness_info['level'] in ['critical', 'emergency']:\n                logger.logger.warning(f\"Data staleness level: {staleness_info['level']}, triggering update\")\n                \n                # Trigger immediate incremental update\n                self.stats['data_freshness_triggers'] += 1\n                await self.run_incremental_update()\n                \n                # If still critical after incremental, trigger full pipeline\n                if staleness_info['level'] == 'emergency':\n                    logger.logger.critical(\"Emergency staleness level, triggering full pipeline\")\n                    await self.run_full_pipeline()\n            \n            return staleness_info\n            \n        except Exception as e:\n            logger.logger.error(f\"Data freshness check failed: {e}\")\n            raise\n    \n    async def monitor_urgent_cases(self):\n        \"\"\"Monitor for urgent missing children cases and prioritize updates.\"\"\"\n        try:\n            # Query for recent missing children cases\n            urgent_cases = self.get_urgent_cases()\n            \n            if urgent_cases:\n                logger.logger.info(f\"Found {len(urgent_cases)} urgent cases\")\n                \n                # Trigger immediate targeted collection for urgent cases\n                await self.process_urgent_cases(urgent_cases)\n                self.stats['urgent_cases_processed'] += len(urgent_cases)\n            \n            return {'urgent_cases_found': len(urgent_cases)}\n            \n        except Exception as e:\n            logger.logger.error(f\"Urgent case monitoring failed: {e}\")\n            raise\n    \n    async def system_health_check(self):\n        \"\"\"Perform system health and performance monitoring.\"\"\"\n        try:\n            health_info = {\n                'timestamp': datetime.now().isoformat(),\n                'scheduler_status': 'running' if self.scheduler.running else 'stopped',\n                'active_jobs': len(self.scheduler.get_jobs()),\n                'stats': self.stats.copy()\n            }\n            \n            # Check database connectivity\n            try:\n                conn = sqlite3.connect(self.db_path)\n                cursor = conn.cursor()\n                cursor.execute(\"SELECT COUNT(*) FROM missing_persons\")\n                health_info['database_records'] = cursor.fetchone()[0]\n                conn.close()\n                health_info['database_status'] = 'healthy'\n            except Exception as e:\n                health_info['database_status'] = f'error: {e}'\n            \n            # Check disk space\n            disk_usage = self.check_disk_space()\n            health_info['disk_usage'] = disk_usage\n            \n            # Log health summary\n            logger.logger.info(f\"System health check: {health_info['database_status']}, \"\n                             f\"{health_info['database_records']} records, \"\n                             f\"{disk_usage['free_gb']:.1f}GB free\")\n            \n            return health_info\n            \n        except Exception as e:\n            logger.logger.error(f\"System health check failed: {e}\")\n            raise\n    \n    def get_urgent_cases(self) -> List[Dict[str, Any]]:\n        \"\"\"Get urgent missing children cases from the last 48 hours.\"\"\"\n        try:\n            conn = sqlite3.connect(self.db_path)\n            conn.row_factory = sqlite3.Row\n            \n            cursor = conn.cursor()\n            cursor.execute(\"\"\"\n                SELECT * FROM missing_persons \n                WHERE category = 'Missing Children'\n                  AND age < 18\n                  AND datetime(created_at) > datetime('now', '-48 hours')\n                ORDER BY created_at DESC\n                LIMIT 50\n            \"\"\")\n            \n            cases = [dict(row) for row in cursor.fetchall()]\n            conn.close()\n            \n            return cases\n            \n        except Exception as e:\n            logger.logger.error(f\"Error querying urgent cases: {e}\")\n            return []\n    \n    async def process_urgent_cases(self, cases: List[Dict[str, Any]]):\n        \"\"\"Process urgent cases with high priority.\"\"\"\n        logger.logger.info(f\"Processing {len(cases)} urgent cases\")\n        \n        # For now, just log the urgent cases\n        # In a real system, this would trigger immediate notifications,\n        # social media alerts, etc.\n        \n        for case in cases:\n            logger.logger.warning(\n                f\"URGENT: Missing child {case.get('name', 'Unknown')} \"\n                f\"from {case.get('location', 'Unknown location')}\"\n            )\n    \n    async def run_selective_collectors(self, pipeline, collector_names: List[str]) -> Dict[str, Any]:\n        \"\"\"Run only specific collectors for targeted updates.\"\"\"\n        # This would be implemented to run only specific data collectors\n        # For now, return a mock result\n        return {\n            'total_collected': 0,\n            'total_processed': 0,\n            'collectors_run': collector_names\n        }\n    \n    def update_data_timestamps(self):\n        \"\"\"Update data file timestamps for freshness tracking.\"\"\"\n        try:\n            csv_path = Path(self.config.get('csv_path', 'missing-persons.csv'))\n            if csv_path.exists():\n                # Touch the file to update its modification time\n                csv_path.touch()\n                logger.logger.debug(\"Updated CSV timestamp\")\n        except Exception as e:\n            logger.logger.error(f\"Failed to update data timestamps: {e}\")\n    \n    def check_disk_space(self) -> Dict[str, float]:\n        \"\"\"Check available disk space.\"\"\"\n        try:\n            if platform.system() == \"Windows\":\n                import shutil\n                total, used, free = shutil.disk_usage(\".\")\n                return {\n                    'total_gb': total / (1024**3),\n                    'used_gb': used / (1024**3),\n                    'free_gb': free / (1024**3),\n                    'usage_percent': (used / total) * 100\n                }\n            else:\n                result = subprocess.run(['df', '-h', '.'], capture_output=True, text=True)\n                # Parse df output for Unix systems\n                return {'free_gb': 0, 'usage_percent': 0}  # Simplified\n        except Exception:\n            return {'free_gb': 0, 'usage_percent': 0}\n    \n    def job_executed_listener(self, event):\n        \"\"\"Handle successful job execution.\"\"\"\n        self.stats['jobs_executed'] += 1\n        logger.logger.info(f\"Job completed: {event.job_id}\")\n    \n    def job_error_listener(self, event):\n        \"\"\"Handle job execution errors.\"\"\"\n        self.stats['jobs_failed'] += 1\n        logger.logger.error(f\"Job failed: {event.job_id} - {event.exception}\")\n    \n    def job_missed_listener(self, event):\n        \"\"\"Handle missed job executions.\"\"\"\n        self.stats['jobs_missed'] += 1\n        logger.logger.warning(f\"Job missed: {event.job_id}\")\n    \n    def start(self):\n        \"\"\"Start the automated scheduler.\"\"\"\n        logger.logger.info(\"Starting automated scheduler\")\n        \n        try:\n            self.initialize_jobs()\n            self.scheduler.start()\n            logger.logger.info(\"Automated scheduler started successfully\")\n            \n            # Log scheduled jobs\n            jobs = self.scheduler.get_jobs()\n            for job in jobs:\n                logger.logger.info(f\"Active job: {job.id} - next run: {job.next_run_time}\")\n            \n        except Exception as e:\n            logger.logger.error(f\"Failed to start scheduler: {e}\")\n            raise\n    \n    def stop(self):\n        \"\"\"Stop the automated scheduler.\"\"\"\n        logger.logger.info(\"Stopping automated scheduler\")\n        \n        try:\n            self.scheduler.shutdown(wait=True)\n            logger.logger.info(\"Automated scheduler stopped\")\n        except Exception as e:\n            logger.logger.error(f\"Error stopping scheduler: {e}\")\n    \n    def get_status(self) -> Dict[str, Any]:\n        \"\"\"Get scheduler status and statistics.\"\"\"\n        jobs = self.scheduler.get_jobs()\n        \n        return {\n            'running': self.scheduler.running,\n            'active_jobs': len(jobs),\n            'next_jobs': [\n                {\n                    'id': job.id,\n                    'name': job.name,\n                    'next_run': job.next_run_time.isoformat() if job.next_run_time else None\n                }\n                for job in jobs[:5]  # Show next 5 jobs\n            ],\n            'statistics': self.stats,\n            'data_freshness': self.staleness_monitor.get_staleness_summary()\n        }\n\nasync def main():\n    \"\"\"Main entry point for running the automated scheduler.\"\"\"\n    import argparse\n    \n    parser = argparse.ArgumentParser(description=\"Automated Missing Persons Data Scheduler\")\n    parser.add_argument('--config', help='Configuration file path')\n    parser.add_argument('--daemon', action='store_true', help='Run as daemon')\n    \n    args = parser.parse_args()\n    \n    # Default configuration\n    config = {\n        'database_path': 'database/app.db',\n        'scheduler_db_path': 'scheduler.db',\n        'csv_path': 'missing-persons.csv',\n        'alerts': {\n            'webhook_url': '',\n            'email': {'enabled': False}\n        }\n    }\n    \n    scheduler = AutomatedScheduler(config)\n    \n    try:\n        scheduler.start()\n        \n        if args.daemon:\n            # Run indefinitely\n            logger.logger.info(\"Running in daemon mode - press Ctrl+C to stop\")\n            while True:\n                await asyncio.sleep(60)\n        else:\n            # Run for a short time for testing\n            logger.logger.info(\"Running for 5 minutes for testing\")\n            await asyncio.sleep(300)\n            \n    except KeyboardInterrupt:\n        logger.logger.info(\"Received interrupt signal\")\n    finally:\n        scheduler.stop()\n\nif __name__ == '__main__':\n    asyncio.run(main())