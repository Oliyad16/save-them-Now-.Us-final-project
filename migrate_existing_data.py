#!/usr/bin/env python3
"""
Migrate existing missing persons data to the enhanced pipeline schema.
This demonstrates the pipeline's geocoding and data enhancement capabilities.
"""

import sys
from pathlib import Path
import json

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent))

from data_pipeline.config.settings import get_config
from data_pipeline.utils.database import DatabaseManager
from data_pipeline.utils.geocoding import get_geocoding_service
from data_pipeline.utils.logger import setup_logging, get_logger

def migrate_data(limit=100):
    """Migrate existing data to enhanced schema with geocoding."""
    setup_logging()
    logger = get_logger("migrate")
    
    config = get_config()
    db = DatabaseManager(str(config['database']['sqlite_path']))
    geocoder = get_geocoding_service(
        str(config['geocoding']['cache_file']),
        config['geocoding']
    )
    
    logger.logger.info(f"Starting data migration (limit: {limit})")
    
    # Get existing records
    with db.get_connection() as conn:
        rows = conn.execute(f"""
            SELECT * FROM missing_person 
            WHERE latitude IS NOT NULL AND longitude IS NOT NULL
            LIMIT {limit}
        """).fetchall()
        
        logger.logger.info(f"Found {len(rows)} records to migrate")
        
        migrated = 0
        geocoded = 0
        
        for row in rows:
            record_dict = dict(row)
            
            # Map to enhanced schema
            enhanced_record = {
                'case_number': record_dict.get('caseNumber', f"LEGACY_{record_dict['id']}"),
                'name': f"{record_dict.get('firstName', '')} {record_dict.get('lastName', '')}".strip(),
                'age': record_dict.get('age'),
                'gender': record_dict.get('sex'),
                'ethnicity': record_dict.get('race'),
                'city': record_dict.get('city'),
                'county': record_dict.get('county'),
                'state': record_dict.get('state'),
                'latitude': record_dict.get('latitude'),
                'longitude': record_dict.get('longitude'),
                'date_missing': record_dict.get('dlc'),
                'status': 'Active',
                'category': 'Missing Adults' if not record_dict.get('age') or int(record_dict.get('age', 18)) >= 18 else 'Missing Children',
                'source_name': 'legacy_csv',
                'source_id': str(record_dict['id']),
                'data_quality_score': 0.8,
                'raw_data': record_dict
            }
            
            # Try to enhance with geocoding if missing coordinates
            if not enhanced_record['latitude'] and enhanced_record['city'] and enhanced_record['state']:
                result = geocoder.geocode(enhanced_record['city'], enhanced_record['state'])
                if result:
                    enhanced_record['latitude'] = result['lat']
                    enhanced_record['longitude'] = result['lon']
                    enhanced_record['geocoding_source'] = result['source']
                    geocoded += 1
            
            # Insert to enhanced table
            try:
                record_id, was_inserted = db.upsert_missing_person(enhanced_record)
                if was_inserted:
                    migrated += 1
                
                if migrated % 10 == 0:
                    logger.logger.info(f"Migration progress: {migrated}/{len(rows)}")
                    
            except Exception as e:
                logger.logger.error(f"Failed to migrate record {record_dict['id']}: {e}")
        
        logger.logger.info(f"Migration complete: {migrated} records migrated, {geocoded} geocoded")
        
        return {
            'total_processed': len(rows),
            'migrated': migrated,
            'geocoded': geocoded
        }

def main():
    """Main migration entry point."""
    import argparse
    
    parser = argparse.ArgumentParser(description="Migrate existing data to enhanced schema")
    parser.add_argument('--limit', type=int, default=100, help='Limit number of records to migrate')
    parser.add_argument('--all', action='store_true', help='Migrate all records (no limit)')
    
    args = parser.parse_args()
    limit = 10000 if args.all else args.limit
    
    print(f"Migrating up to {limit} existing records...")
    
    try:
        results = migrate_data(limit)
        print(f"Migration Results:")
        print(f"   - Total processed: {results['total_processed']}")
        print(f"   - Successfully migrated: {results['migrated']}")
        print(f"   - Records geocoded: {results['geocoded']}")
        
        if results['migrated'] > 0:
            print(f"\nNow run: python pipeline_cli.py stats")
        
        return 0
        
    except Exception as e:
        print(f"Migration failed: {e}")
        return 1

if __name__ == '__main__':
    sys.exit(main())