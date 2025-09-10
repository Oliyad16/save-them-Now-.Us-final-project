"""
Main pipeline orchestrator for missing persons data collection and processing.
"""

import asyncio
import time
import uuid
from datetime import datetime
from typing import Dict, Any, List, Optional
from concurrent.futures import ThreadPoolExecutor, as_completed
import traceback

from .config.settings import get_config
from .utils.logger import setup_logging, get_logger
from .utils.database import DatabaseManager
from .utils.geocoding import get_geocoding_service
from .processors.validation import DataValidator
from .collectors.namus_collector import NamUsCollector
from .collectors.florida_collector import FloridaCollector

logger = get_logger("pipeline")

class MissingPersonsPipeline:
    """Main pipeline for collecting and processing missing persons data."""
    
    def __init__(self, config: Dict[str, Any] = None):
        self.config = config or get_config()
        
        # Initialize components
        self.db = DatabaseManager(str(self.config['database']['sqlite_path']))
        self.geocoding = get_geocoding_service(
            str(self.config['geocoding']['cache_file']),
            self.config['geocoding']
        )
        self.validator = DataValidator(self.config['validation'])
        
        # Initialize collectors
        self.collectors = self._init_collectors()
        
        # Pipeline statistics
        self.stats = {
            'run_id': None,
            'start_time': None,
            'end_time': None,
            'total_collected': 0,
            'total_processed': 0,
            'total_geocoded': 0,
            'new_records': 0,
            'updated_records': 0,
            'validation_errors': 0,
            'geocoding_errors': 0,
            'database_errors': 0
        }
    
    def _init_collectors(self) -> Dict[str, Any]:
        """Initialize data collectors."""
        collectors = {}
        
        for source_name, source_config in self.config['data_sources'].items():
            if not source_config.get('enabled', True):
                continue
            
            try:
                if source_name == 'namus':
                    collectors[source_name] = NamUsCollector(source_config)
                elif source_name == 'florida_mepic':
                    collectors[source_name] = FloridaCollector(source_config)
                # Add more collectors as needed
                
                logger.logger.info(f"Initialized {source_name} collector")
                
            except Exception as e:
                logger.logger.error(f"Failed to initialize {source_name} collector: {e}")
        
        return collectors
    
    def run_full_pipeline(self) -> Dict[str, Any]:
        """Run the complete data collection and processing pipeline."""
        run_id = f"pipeline_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{uuid.uuid4().hex[:8]}"
        self.stats['run_id'] = run_id
        self.stats['start_time'] = time.time()
        
        logger.logger.info(f"Starting full pipeline run: {run_id}")
        
        try:
            # Start pipeline run in database
            self.db.start_pipeline_run(run_id, {
                'pipeline_version': '1.0.0',
                'enabled_collectors': list(self.collectors.keys()),
                'config_snapshot': self.config['pipeline']
            })
            
            # Step 1: Collect data from all sources
            all_records = self._collect_from_all_sources()
            self.stats['total_collected'] = len(all_records)
            logger.logger.info(f"Collected {len(all_records)} total records")
            
            if not all_records:
                logger.logger.warning("No records collected, ending pipeline")
                self.db.complete_pipeline_run(run_id, self.stats)
                return self._finalize_stats()
            
            # Step 2: Validate and clean data
            validated_records = self._validate_and_clean_data(all_records)
            self.stats['total_processed'] = len(validated_records)
            logger.logger.info(f"Validated {len(validated_records)} records")
            
            # Step 3: Geocode missing coordinates
            geocoded_records = self._geocode_records(validated_records)
            logger.logger.info(f"Geocoding completed")
            
            # Step 4: Detect and handle duplicates
            final_records = self._deduplicate_records(geocoded_records)
            logger.logger.info(f"Deduplication completed, {len(final_records)} final records")
            
            # Step 5: Save to database
            self._save_to_database(final_records)
            logger.logger.info(f"Database operations completed")
            
            # Complete pipeline run
            self.db.complete_pipeline_run(run_id, self.stats)
            
            return self._finalize_stats()
            
        except Exception as e:
            error_msg = f"Pipeline failed: {str(e)}\n{traceback.format_exc()}"
            logger.logger.error(error_msg)
            self.db.fail_pipeline_run(run_id, error_msg)
            raise
        
    def _collect_from_all_sources(self) -> List[Dict[str, Any]]:
        """Collect data from all enabled sources in parallel."""
        all_records = []
        
        with ThreadPoolExecutor(max_workers=4) as executor:
            # Submit collection tasks
            future_to_source = {
                executor.submit(collector.collect_data): source_name
                for source_name, collector in self.collectors.items()
            }
            
            # Collect results
            for future in as_completed(future_to_source):
                source_name = future_to_source[future]
                try:
                    records = future.result(timeout=1800)  # 30 minutes timeout
                    all_records.extend(records)
                    logger.logger.info(f"{source_name}: collected {len(records)} records")
                except Exception as e:
                    logger.logger.error(f"{source_name}: collection failed: {e}")
        
        return all_records
    
    def _validate_and_clean_data(self, records: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Validate and clean collected records."""
        logger.logger.info("Starting data validation and cleaning")
        
        def progress_callback(processed, total):
            if processed % 500 == 0:
                logger.logger.info(f"Validation progress: {processed}/{total}")
        
        validation_results = self.validator.batch_validate(records, progress_callback)
        
        # Collect valid records
        valid_records = []
        for result in validation_results:
            if result['is_valid']:
                valid_records.append(result['record'])
            else:
                self.stats['validation_errors'] += 1
                logger.logger.debug(f"Invalid record: {result['errors']}")
        
        # Log validation summary
        summary = self.validator.get_validation_summary(validation_results)
        logger.logger.info(f"Validation summary: {summary}")
        
        return valid_records
    
    def _geocode_records(self, records: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Geocode records that are missing coordinates."""
        logger.logger.info("Starting geocoding process")
        
        records_to_geocode = []
        for record in records:
            if not record.get('latitude') or not record.get('longitude'):
                if record.get('city') and record.get('state'):
                    records_to_geocode.append(record)
        
        logger.logger.info(f"Geocoding {len(records_to_geocode)} records")
        
        def progress_callback(processed, total):
            if processed % 100 == 0:
                logger.logger.info(f"Geocoding progress: {processed}/{total}")
        
        # Batch geocode
        geocoded_results = self.geocoding.batch_geocode(
            [{'city': r['city'], 'state': r['state']} for r in records_to_geocode],
            progress_callback
        )
        
        # Update records with coordinates
        for i, result in enumerate(geocoded_results):
            if result:
                records_to_geocode[i]['latitude'] = result['lat']
                records_to_geocode[i]['longitude'] = result['lon']
                records_to_geocode[i]['geocoding_source'] = result['source']
                self.stats['total_geocoded'] += 1
            else:
                self.stats['geocoding_errors'] += 1
        
        return records
    
    def _deduplicate_records(self, records: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Detect and handle duplicate records."""
        logger.logger.info("Starting deduplication process")
        
        # Detect duplicate groups
        duplicate_groups = self.validator.detect_duplicates(records)
        
        if duplicate_groups:
            logger.logger.info(f"Found {len(duplicate_groups)} duplicate groups")
            
            # For each group, keep the most complete record
            records_to_remove = set()
            
            for group in duplicate_groups:
                if len(group) <= 1:
                    continue
                
                # Find the most complete record in the group
                best_record_idx = group[0]
                best_completeness = 0
                
                for idx in group:
                    completeness = self._calculate_record_completeness(records[idx])
                    if completeness > best_completeness:
                        best_completeness = completeness
                        best_record_idx = idx
                
                # Mark others for removal
                for idx in group:
                    if idx != best_record_idx:
                        records_to_remove.add(idx)
            
            # Remove duplicates
            final_records = [
                record for i, record in enumerate(records)
                if i not in records_to_remove
            ]
            
            logger.logger.info(f"Removed {len(records_to_remove)} duplicate records")
            return final_records
        
        return records
    
    def _calculate_record_completeness(self, record: Dict[str, Any]) -> float:
        """Calculate completeness score for a record."""
        important_fields = [
            'name', 'age', 'gender', 'ethnicity', 'city', 'state',
            'date_missing', 'latitude', 'longitude', 'case_number'
        ]
        
        complete_fields = sum(
            1 for field in important_fields
            if record.get(field) is not None and str(record.get(field)).strip() != ""
        )
        
        return complete_fields / len(important_fields)
    
    def _save_to_database(self, records: List[Dict[str, Any]]):
        """Save records to database."""
        logger.logger.info(f"Saving {len(records)} records to database")
        
        for i, record in enumerate(records):
            try:
                record_id, was_inserted = self.db.upsert_missing_person(record)
                
                if was_inserted:
                    self.stats['new_records'] += 1
                else:
                    self.stats['updated_records'] += 1
                
                if (i + 1) % 100 == 0:
                    logger.logger.info(f"Database progress: {i + 1}/{len(records)}")
                    
            except Exception as e:
                self.stats['database_errors'] += 1
                logger.logger.error(f"Failed to save record: {e}")
    
    def _finalize_stats(self) -> Dict[str, Any]:
        """Finalize and return pipeline statistics."""
        self.stats['end_time'] = time.time()
        self.stats['duration'] = self.stats['end_time'] - self.stats['start_time']
        
        # Get final database statistics
        db_stats = self.db.get_statistics()
        self.stats.update({
            'final_database_stats': db_stats,
            'geocoding_stats': self.geocoding.get_cache_stats()
        })
        
        logger.logger.info(f"Pipeline completed in {self.stats['duration']:.2f} seconds")
        logger.logger.info(f"Final statistics: {self.stats}")
        
        return self.stats
    
    def run_geocoding_only(self, limit: int = 1000) -> Dict[str, Any]:
        """Run only the geocoding process for existing records."""
        logger.logger.info(f"Starting geocoding-only run (limit: {limit})")
        
        start_time = time.time()
        
        # Get records needing geocoding
        records = self.db.get_records_needing_geocoding(limit)
        logger.logger.info(f"Found {len(records)} records needing geocoding")
        
        geocoded_count = 0
        failed_count = 0
        
        for i, record in enumerate(records):
            try:
                result = self.geocoding.geocode(
                    record['city'], 
                    record['state'], 
                    record.get('country', 'USA')
                )
                
                if result:
                    self.db.update_coordinates(
                        record['id'], 
                        result['lat'], 
                        result['lon'],
                        result['source']
                    )
                    geocoded_count += 1
                else:
                    failed_count += 1
                
                if (i + 1) % 50 == 0:
                    logger.logger.info(f"Geocoding progress: {i + 1}/{len(records)}")
                    
            except Exception as e:
                logger.logger.error(f"Geocoding failed for record {record['id']}: {e}")
                failed_count += 1
        
        duration = time.time() - start_time
        
        stats = {
            'operation': 'geocoding_only',
            'duration': duration,
            'processed_records': len(records),
            'successful_geocodes': geocoded_count,
            'failed_geocodes': failed_count,
            'success_rate': (geocoded_count / len(records)) * 100 if records else 0
        }
        
        logger.logger.info(f"Geocoding completed: {stats}")
        return stats

def main():
    """Main entry point for pipeline execution."""
    # Setup logging
    setup_logging()
    
    # Create and run pipeline
    pipeline = MissingPersonsPipeline()
    
    try:
        results = pipeline.run_full_pipeline()
        print(f"Pipeline completed successfully!")
        print(f"Statistics: {results}")
        
    except Exception as e:
        logger.logger.error(f"Pipeline failed: {e}")
        print(f"Pipeline failed: {e}")
        return 1
    
    return 0

if __name__ == "__main__":
    exit(main())