#!/usr/bin/env python3
"""
SaveThemNow.Jesus Missing Persons Data Pipeline CLI
=================================================

Command-line interface for running the automated data collection pipeline.

Usage:
    python pipeline_cli.py run                 # Run full pipeline
    python pipeline_cli.py geocode            # Geocode existing records  
    python pipeline_cli.py stats              # Show database statistics
    python pipeline_cli.py schedule           # Start scheduled pipeline
    python pipeline_cli.py test-collectors    # Test individual collectors
    python pipeline_cli.py backup             # Backup database
    python pipeline_cli.py --help             # Show help
"""

import argparse
import sys
import json
import schedule
import time
from datetime import datetime
from pathlib import Path

# Add the project root to Python path
sys.path.insert(0, str(Path(__file__).parent))

from data_pipeline.pipeline import MissingPersonsPipeline
from data_pipeline.config.settings import get_config
from data_pipeline.utils.logger import setup_logging, get_logger
from data_pipeline.utils.database import DatabaseManager

def setup_cli_logging():
    """Setup logging for CLI usage."""
    return setup_logging(log_level="INFO")

def run_full_pipeline(args):
    """Run the complete data collection pipeline."""
    logger = get_logger("cli")
    logger.logger.info("Starting full pipeline run via CLI")
    
    try:
        pipeline = MissingPersonsPipeline()
        results = pipeline.run_full_pipeline()
        
        print("Pipeline completed successfully!")
        print(f"Statistics:")
        print(f"   - Total collected: {results['total_collected']}")
        print(f"   - Total processed: {results['total_processed']}")
        print(f"   - New records: {results['new_records']}")
        print(f"   - Updated records: {results['updated_records']}")
        print(f"   - Geocoded: {results['total_geocoded']}")
        print(f"   - Duration: {results['duration']:.1f} seconds")
        
        if args.output:
            with open(args.output, 'w') as f:
                json.dump(results, f, indent=2, default=str)
            print(f"Results saved to {args.output}")
        
        return 0
        
    except Exception as e:
        logger.logger.error(f"Pipeline failed: {e}")
        print(f"[ERROR] Pipeline failed: {e}")
        return 1

def run_geocoding_only(args):
    """Run geocoding for existing records."""
    logger = get_logger("cli")
    logger.logger.info("Starting geocoding-only run via CLI")
    
    try:
        pipeline = MissingPersonsPipeline()
        results = pipeline.run_geocoding_only(limit=args.limit)
        
        print("Geocoding completed!")
        print(f"Statistics:")
        print(f"   - Records processed: {results['processed_records']}")
        print(f"   - Successful geocodes: {results['successful_geocodes']}")
        print(f"   - Failed geocodes: {results['failed_geocodes']}")
        print(f"   - Success rate: {results['success_rate']:.1f}%")
        print(f"   - Duration: {results['duration']:.1f} seconds")
        
        return 0
        
    except Exception as e:
        logger.logger.error(f"Geocoding failed: {e}")
        print(f"[ERROR] Geocoding failed: {e}")
        return 1

def show_statistics(args):
    """Show database and pipeline statistics."""
    try:
        config = get_config()
        db = DatabaseManager(str(config['database']['sqlite_path']))
        stats = db.get_statistics()
        
        print("Database Statistics:")
        print(f"   - Total records: {stats['total_records']:,}")
        print(f"   - Geocoded records: {stats['geocoded_records']:,}")
        print(f"   - Geocoding coverage: {(stats['geocoded_records']/max(stats['total_records'], 1)*100):.1f}%")
        
        print(f"\nTop States:")
        for i, (state, count) in enumerate(list(stats['top_states'].items())[:5], 1):
            print(f"   {i}. {state}: {count:,} cases")
        
        print(f"\nRecords by Source:")
        for source, count in stats['by_source'].items():
            print(f"   - {source}: {count:,} records")
        
        print(f"\nRecent Pipeline Runs:")
        for run in stats['recent_runs'][:3]:
            print(f"   - {run['run_id']}: {run['status']} ({run.get('total_records', 0)} records)")
        
        if args.output:
            with open(args.output, 'w') as f:
                json.dump(stats, f, indent=2, default=str)
            print(f"\nStatistics saved to {args.output}")
        
        return 0
        
    except Exception as e:
        print(f"[ERROR] Failed to get statistics: {e}")
        return 1

def test_collectors(args):
    """Test individual data collectors."""
    logger = get_logger("cli")
    logger.logger.info("Testing data collectors")
    
    try:
        config = get_config()
        pipeline = MissingPersonsPipeline()
        
        print("Testing Data Collectors:")
        
        for source_name, collector in pipeline.collectors.items():
            print(f"\nTesting {source_name}...")
            
            try:
                # Test with limited data collection
                start_time = time.time()
                test_records = collector.collect_data()[:10]  # Limit for testing
                duration = time.time() - start_time
                
                print(f"   [OK] Success: {len(test_records)} records in {duration:.2f}s")
                
                if test_records:
                    # Show sample record
                    sample = test_records[0]
                    print(f"   Sample fields: {list(sample.keys())[:8]}")
                    
            except Exception as e:
                print(f"   [ERROR] Failed: {e}")
        
        return 0
        
    except Exception as e:
        logger.logger.error(f"Collector testing failed: {e}")
        print(f"[ERROR] Collector testing failed: {e}")
        return 1

def backup_database(args):
    """Create a database backup."""
    try:
        config = get_config()
        db = DatabaseManager(str(config['database']['sqlite_path']))
        
        backup_file = db.backup_database()
        print(f"Database backed up to: {backup_file}")
        
        return 0
        
    except Exception as e:
        print(f"[ERROR] Backup failed: {e}")
        return 1

def start_scheduler(args):
    """Start the scheduled pipeline runner."""
    logger = get_logger("cli")
    logger.logger.info("Starting scheduled pipeline runner")
    
    print("Starting Pipeline Scheduler")
    print("   - Full pipeline: Daily at 2:00 AM")
    print("   - Geocoding only: Every 6 hours")
    print("   - Statistics check: Every 4 hours")
    print("   - Press Ctrl+C to stop\n")
    
    # Schedule full pipeline daily
    schedule.every().day.at("02:00").do(run_scheduled_pipeline)
    
    # Schedule geocoding every 6 hours  
    schedule.every(6).hours.do(run_scheduled_geocoding)
    
    # Schedule statistics check every 4 hours
    schedule.every(4).hours.do(run_scheduled_stats_check)
    
    try:
        while True:
            schedule.run_pending()
            time.sleep(60)  # Check every minute
            
    except KeyboardInterrupt:
        print("\nScheduler stopped")
        return 0

def run_scheduled_pipeline():
    """Run pipeline on schedule."""
    logger = get_logger("scheduler")
    logger.logger.info("Running scheduled full pipeline")
    
    try:
        pipeline = MissingPersonsPipeline()
        results = pipeline.run_full_pipeline()
        logger.logger.info(f"Scheduled pipeline completed: {results['total_processed']} records")
        
    except Exception as e:
        logger.logger.error(f"Scheduled pipeline failed: {e}")

def run_scheduled_geocoding():
    """Run geocoding on schedule."""
    logger = get_logger("scheduler")
    logger.logger.info("Running scheduled geocoding")
    
    try:
        pipeline = MissingPersonsPipeline()
        results = pipeline.run_geocoding_only(limit=500)
        logger.logger.info(f"Scheduled geocoding completed: {results['successful_geocodes']} geocoded")
        
    except Exception as e:
        logger.logger.error(f"Scheduled geocoding failed: {e}")

def run_scheduled_stats_check():
    """Check statistics on schedule."""
    logger = get_logger("scheduler")
    
    try:
        config = get_config()
        db = DatabaseManager(str(config['database']['sqlite_path']))
        stats = db.get_statistics()
        
        logger.logger.info(f"Statistics check: {stats['total_records']} total records")
        
    except Exception as e:
        logger.logger.error(f"Stats check failed: {e}")

def main():
    """Main CLI entry point."""
    parser = argparse.ArgumentParser(
        description="SaveThemNow.Jesus Missing Persons Data Pipeline",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
    python pipeline_cli.py run                        # Run full pipeline
    python pipeline_cli.py run --output results.json # Save results to file
    python pipeline_cli.py geocode --limit 1000      # Geocode 1000 records
    python pipeline_cli.py stats                     # Show statistics
    python pipeline_cli.py test-collectors           # Test data sources
    python pipeline_cli.py schedule                  # Start scheduler
    python pipeline_cli.py backup                    # Backup database
        """
    )
    
    # Setup logging first
    setup_cli_logging()
    
    subparsers = parser.add_subparsers(dest='command', help='Available commands')
    
    # Run command
    run_parser = subparsers.add_parser('run', help='Run the full data pipeline')
    run_parser.add_argument('--output', '-o', help='Save results to JSON file')
    run_parser.set_defaults(func=run_full_pipeline)
    
    # Geocode command
    geocode_parser = subparsers.add_parser('geocode', help='Run geocoding for existing records')
    geocode_parser.add_argument('--limit', '-l', type=int, default=1000, 
                               help='Maximum records to process (default: 1000)')
    geocode_parser.set_defaults(func=run_geocoding_only)
    
    # Stats command
    stats_parser = subparsers.add_parser('stats', help='Show database statistics')
    stats_parser.add_argument('--output', '-o', help='Save statistics to JSON file')
    stats_parser.set_defaults(func=show_statistics)
    
    # Test command
    test_parser = subparsers.add_parser('test-collectors', help='Test data collectors')
    test_parser.set_defaults(func=test_collectors)
    
    # Backup command
    backup_parser = subparsers.add_parser('backup', help='Backup the database')
    backup_parser.set_defaults(func=backup_database)
    
    # Schedule command
    schedule_parser = subparsers.add_parser('schedule', help='Start scheduled pipeline runs')
    schedule_parser.set_defaults(func=start_scheduler)
    
    # Parse arguments
    args = parser.parse_args()
    
    if not args.command:
        parser.print_help()
        return 1
    
    # Run the selected command
    try:
        return args.func(args)
    except KeyboardInterrupt:
        print("\nOperation cancelled")
        return 1
    except Exception as e:
        print(f"[ERROR] Command failed: {e}")
        return 1

if __name__ == '__main__':
    sys.exit(main())