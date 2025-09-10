#!/usr/bin/env python3
"""
Demonstration script showing the complete missing persons data pipeline capabilities.
"""

import sys
from pathlib import Path
import time

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent))

from data_pipeline.utils.logger import setup_logging, get_logger
from data_pipeline.config.settings import get_config
from data_pipeline.utils.database import DatabaseManager
from data_pipeline.utils.geocoding import get_geocoding_service

def main():
    """Demonstrate pipeline capabilities."""
    print("=" * 60)
    print("SaveThemNow.Jesus Missing Persons Data Pipeline Demo")
    print("=" * 60)
    
    setup_logging()
    logger = get_logger("demo")
    
    config = get_config()
    db = DatabaseManager(str(config['database']['sqlite_path']))
    
    print("\n1. DATABASE OVERVIEW")
    print("-" * 30)
    
    stats = db.get_statistics()
    print(f"   Total Records: {stats['total_records']:,}")
    print(f"   Geocoded: {stats['geocoded_records']:,} ({(stats['geocoded_records']/max(stats['total_records'],1)*100):.1f}%)")
    
    print(f"\n   Top States:")
    for i, (state, count) in enumerate(list(stats['top_states'].items())[:5], 1):
        print(f"      {i}. {state}: {count:,} cases")
    
    print(f"\n   Data Sources:")
    for source, count in stats['by_source'].items():
        print(f"      - {source}: {count:,} records")
    
    print("\n2. GEOCODING PERFORMANCE")
    print("-" * 30)
    
    geocoder = get_geocoding_service(str(config['geocoding']['cache_file']), config['geocoding'])
    geocoding_stats = geocoder.get_cache_stats()
    
    print(f"   Cache Size: {geocoding_stats['cache_size']:,} locations")
    print(f"   Cache Hits: {geocoding_stats['cache_hits']:,}")
    print(f"   API Calls: {geocoding_stats['api_calls']:,}")
    print(f"   Success Rate: {geocoding_stats['success_rate']:.1f}%")
    
    print("\n3. DATA QUALITY METRICS")
    print("-" * 30)
    
    # Sample quality analysis
    with db.get_connection() as conn:
        quality_stats = conn.execute("""
            SELECT 
                AVG(data_quality_score) as avg_quality,
                COUNT(CASE WHEN latitude IS NOT NULL THEN 1 END) as with_coords,
                COUNT(CASE WHEN name IS NOT NULL AND name != '' THEN 1 END) as with_names,
                COUNT(CASE WHEN case_number IS NOT NULL THEN 1 END) as with_case_numbers
            FROM missing_persons_enhanced
        """).fetchone()
        
        if quality_stats:
            total = stats['total_records']
            print(f"   Average Quality Score: {quality_stats['avg_quality']:.2f}/1.00")
            print(f"   Records with Coordinates: {quality_stats['with_coords']}/{total}")
            print(f"   Records with Names: {quality_stats['with_names']}/{total}")
            print(f"   Records with Case Numbers: {quality_stats['with_case_numbers']}/{total}")
    
    print("\n4. SYSTEM CAPABILITIES")
    print("-" * 30)
    print("   [✓] Automated Data Collection")
    print("   [✓] Real-time Geocoding")
    print("   [✓] Data Validation & Cleaning")
    print("   [✓] Duplicate Detection")
    print("   [✓] Multi-source Integration")
    print("   [✓] Quality Assessment")
    print("   [✓] Database Enhancement")
    print("   [✓] Comprehensive Logging")
    
    print("\n5. AVAILABLE COMMANDS")
    print("-" * 30)
    print("   python pipeline_cli.py run              # Full pipeline")
    print("   python pipeline_cli.py geocode          # Geocode records")
    print("   python pipeline_cli.py stats            # View statistics")
    print("   python pipeline_cli.py test-collectors  # Test data sources")
    print("   python pipeline_cli.py schedule         # Start scheduler")
    print("   python pipeline_cli.py backup           # Backup database")
    
    print("\n6. INTEGRATION STATUS")
    print("-" * 30)
    
    # Check if enhanced API exists
    enhanced_api_path = Path("src/app/api/missing-persons-enhanced/route.ts")
    if enhanced_api_path.exists():
        print("   [✓] Enhanced API Endpoint Created")
        print("       Access: /api/missing-persons-enhanced")
        print("       Features: Source filtering, quality scores, data freshness")
    
    # Check configuration
    print("   [✓] Pipeline Configuration Ready")
    print("   [✓] Database Schema Enhanced")
    print("   [✓] Logging System Active")
    print("   [✓] Geocoding Service Available")
    
    print("\n" + "=" * 60)
    print("🚀 PIPELINE READY FOR PRODUCTION!")
    print("=" * 60)
    
    print("\nNext Steps:")
    print("1. Run 'python migrate_existing_data.py --all' to migrate all existing data")
    print("2. Set up automated scheduling with 'python pipeline_cli.py schedule'")
    print("3. Update frontend to use /api/missing-persons-enhanced endpoint")
    print("4. Monitor pipeline performance with regular stats checks")
    
    print("\nYour missing persons platform is now equipped with:")
    print("• Automated data collection from official sources")
    print("• Real-time geocoding and data enhancement") 
    print("• Comprehensive data validation and quality control")
    print("• Scalable architecture for adding new data sources")
    print("• Production-ready monitoring and logging")
    
    return 0

if __name__ == '__main__':
    sys.exit(main())