#!/usr/bin/env python3
"""
Simple test script for the Missing Persons Data Pipeline.
"""

import sys
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent))

def test_imports():
    """Test that all pipeline components can be imported."""
    print("Testing Pipeline Imports...")
    
    try:
        from data_pipeline.config.settings import get_config
        print("   [OK] Configuration module")
        
        from data_pipeline.utils.logger import setup_logging, get_logger
        print("   [OK] Logging module")
        
        from data_pipeline.utils.database import DatabaseManager
        print("   [OK] Database module")
        
        from data_pipeline.utils.geocoding import GeocodingService
        print("   [OK] Geocoding module") 
        
        from data_pipeline.processors.validation import DataValidator
        print("   [OK] Validation module")
        
        from data_pipeline.collectors.namus_collector import NamUsCollector
        print("   [OK] NamUs collector")
        
        from data_pipeline.collectors.florida_collector import FloridaCollector
        print("   [OK] Florida collector")
        
        from data_pipeline.pipeline import MissingPersonsPipeline
        print("   [OK] Main pipeline")
        
        return True
        
    except ImportError as e:
        print(f"   [FAIL] Import failed: {e}")
        return False

def test_configuration():
    """Test configuration loading."""
    print("\nTesting Configuration...")
    
    try:
        from data_pipeline.config.settings import get_config
        
        config = get_config()
        print(f"   [OK] Loaded configuration with {len(config)} sections")
        
        # Check key sections
        required_sections = ['database', 'geocoding', 'data_sources', 'validation']
        for section in required_sections:
            if section in config:
                print(f"   [OK] {section} configuration loaded")
            else:
                print(f"   [FAIL] Missing {section} configuration")
                return False
        
        return True
        
    except Exception as e:
        print(f"   [FAIL] Configuration test failed: {e}")
        return False

def test_logging():
    """Test logging setup."""
    print("\nTesting Logging...")
    
    try:
        from data_pipeline.utils.logger import setup_logging, get_logger
        
        # Setup logging
        main_logger = setup_logging()
        print("   [OK] Main logger setup")
        
        # Get component logger
        test_logger = get_logger("test")
        test_logger.logger.info("Test log message")
        print("   [OK] Component logger working")
        
        return True
        
    except Exception as e:
        print(f"   [FAIL] Logging test failed: {e}")
        return False

def test_database():
    """Test database initialization."""
    print("\nTesting Database...")
    
    try:
        from data_pipeline.utils.database import DatabaseManager
        from data_pipeline.config.settings import get_config
        
        config = get_config()
        db_path = config['database']['sqlite_path']
        
        # Initialize database manager
        db = DatabaseManager(str(db_path))
        print("   [OK] Database manager initialized")
        
        # Test basic operations
        stats = db.get_statistics()
        print(f"   [OK] Statistics retrieved: {stats.get('total_records', 0)} records")
        
        return True
        
    except Exception as e:
        print(f"   [FAIL] Database test failed: {e}")
        return False

def test_geocoding():
    """Test geocoding service."""
    print("\nTesting Geocoding...")
    
    try:
        from data_pipeline.utils.geocoding import GeocodingService
        
        # Initialize geocoding service
        geocoder = GeocodingService(cache_file="test_geocache.json")
        print("   [OK] Geocoding service initialized")
        
        # Test cache stats
        stats = geocoder.get_cache_stats()
        print(f"   [OK] Cache stats: {stats['cache_size']} entries")
        
        return True
        
    except Exception as e:
        print(f"   [FAIL] Geocoding test failed: {e}")
        return False

def test_validation():
    """Test data validation."""
    print("\nTesting Validation...")
    
    try:
        from data_pipeline.processors.validation import DataValidator
        
        # Initialize validator
        validator = DataValidator()
        print("   [OK] Data validator initialized")
        
        # Test validation with sample record
        sample_record = {
            'name': 'John Doe',
            'case_number': 'MP12345', 
            'age': '25',
            'state': 'CA',
            'city': 'Los Angeles'
        }
        
        result = validator.validate_record(sample_record)
        print(f"   [OK] Validation test: {result['is_valid']} (score: {result['quality_score']:.2f})")
        
        return True
        
    except Exception as e:
        print(f"   [FAIL] Validation test failed: {e}")
        return False

def test_collectors():
    """Test data collectors initialization."""
    print("\nTesting Collectors...")
    
    try:
        from data_pipeline.collectors.namus_collector import NamUsCollector
        from data_pipeline.collectors.florida_collector import FloridaCollector
        from data_pipeline.config.settings import get_config
        
        config = get_config()
        
        # Test NamUs collector
        namus_collector = NamUsCollector(config['data_sources']['namus'])
        print("   [OK] NamUs collector initialized")
        
        # Test Florida collector  
        florida_collector = FloridaCollector(config['data_sources']['florida_mepic'])
        print("   [OK] Florida collector initialized")
        
        return True
        
    except Exception as e:
        print(f"   [FAIL] Collector test failed: {e}")
        return False

def test_pipeline():
    """Test main pipeline initialization."""
    print("\nTesting Pipeline...")
    
    try:
        from data_pipeline.pipeline import MissingPersonsPipeline
        
        # Initialize pipeline
        pipeline = MissingPersonsPipeline()
        print("   [OK] Pipeline initialized")
        print(f"   [OK] Loaded {len(pipeline.collectors)} collectors")
        
        return True
        
    except Exception as e:
        print(f"   [FAIL] Pipeline test failed: {e}")
        return False

def main():
    """Run all tests."""
    print("SaveThemNow.Jesus Pipeline Test Suite")
    print("=" * 50)
    
    tests = [
        test_imports,
        test_configuration,
        test_logging,
        test_database,
        test_geocoding,
        test_validation,
        test_collectors,
        test_pipeline
    ]
    
    passed = 0
    failed = 0
    
    for test in tests:
        try:
            if test():
                passed += 1
            else:
                failed += 1
        except Exception as e:
            print(f"   [FAIL] Test error: {e}")
            failed += 1
    
    print(f"\nTest Results:")
    print(f"   [OK] Passed: {passed}")
    print(f"   [FAIL] Failed: {failed}")
    print(f"   Success Rate: {(passed/(passed+failed)*100):.1f}%")
    
    if failed == 0:
        print(f"\nAll tests passed! Pipeline is ready to use.")
        print(f"   Run: python pipeline_cli.py run")
        return 0
    else:
        print(f"\nSome tests failed. Check the errors above.")
        return 1

if __name__ == '__main__':
    sys.exit(main())