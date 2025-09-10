"""
Database utilities for the missing persons pipeline.
"""

import sqlite3
import json
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime
from pathlib import Path
import shutil
from contextlib import contextmanager

from .logger import get_logger

logger = get_logger("database")

class DatabaseManager:
    """Manages database operations for the missing persons pipeline."""
    
    def __init__(self, db_path: str):
        self.db_path = Path(db_path)
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self.init_pipeline_tables()
    
    @contextmanager
    def get_connection(self):
        """Get database connection with proper error handling."""
        conn = None
        try:
            conn = sqlite3.connect(str(self.db_path))
            conn.row_factory = sqlite3.Row
            yield conn
        except Exception as e:
            if conn:
                conn.rollback()
            logger.logger.error(f"Database error: {e}")
            raise
        finally:
            if conn:
                conn.close()
    
    def init_pipeline_tables(self):
        """Initialize pipeline-specific database tables."""
        with self.get_connection() as conn:
            # Pipeline runs tracking
            conn.execute("""
                CREATE TABLE IF NOT EXISTS pipeline_runs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    run_id TEXT UNIQUE NOT NULL,
                    start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    end_time TIMESTAMP,
                    status TEXT CHECK(status IN ('running', 'completed', 'failed')) DEFAULT 'running',
                    total_records INTEGER DEFAULT 0,
                    new_records INTEGER DEFAULT 0,
                    updated_records INTEGER DEFAULT 0,
                    errors TEXT,
                    metadata TEXT
                )
            """)
            
            # Data source tracking
            conn.execute("""
                CREATE TABLE IF NOT EXISTS data_sources (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    source_name TEXT UNIQUE NOT NULL,
                    last_update TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    last_successful_run TIMESTAMP,
                    total_records INTEGER DEFAULT 0,
                    status TEXT CHECK(status IN ('active', 'inactive', 'error')) DEFAULT 'active',
                    configuration TEXT,
                    statistics TEXT
                )
            """)
            
            # Missing persons enhanced table (if not exists)
            conn.execute("""
                CREATE TABLE IF NOT EXISTS missing_persons_enhanced (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    case_number TEXT,
                    name TEXT,
                    age INTEGER,
                    gender TEXT,
                    ethnicity TEXT,
                    city TEXT,
                    county TEXT,
                    state TEXT,
                    country TEXT DEFAULT 'USA',
                    latitude REAL,
                    longitude REAL,
                    date_missing DATE,
                    date_reported DATE,
                    date_modified TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    status TEXT DEFAULT 'Active',
                    category TEXT,
                    description TEXT,
                    circumstances TEXT,
                    source_name TEXT,
                    source_id TEXT,
                    source_url TEXT,
                    data_quality_score REAL DEFAULT 0.0,
                    geocoding_source TEXT,
                    last_verified TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    raw_data TEXT,
                    UNIQUE(source_name, source_id)
                )
            """)
            
            # Pipeline metrics
            conn.execute("""
                CREATE TABLE IF NOT EXISTS pipeline_metrics (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    run_id TEXT,
                    metric_name TEXT,
                    metric_value REAL,
                    metric_type TEXT,
                    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    metadata TEXT
                )
            """)
            
            # Create indexes for better performance
            conn.execute("CREATE INDEX IF NOT EXISTS idx_missing_case_number ON missing_persons_enhanced(case_number)")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_missing_source ON missing_persons_enhanced(source_name, source_id)")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_missing_location ON missing_persons_enhanced(state, city)")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_missing_coords ON missing_persons_enhanced(latitude, longitude)")
            
            conn.commit()
            logger.logger.info("Database tables initialized successfully")
    
    def start_pipeline_run(self, run_id: str, metadata: Dict[str, Any] = None) -> int:
        """Start a new pipeline run."""
        with self.get_connection() as conn:
            cursor = conn.execute("""
                INSERT INTO pipeline_runs (run_id, metadata)
                VALUES (?, ?)
            """, (run_id, json.dumps(metadata) if metadata else None))
            conn.commit()
            run_pk = cursor.lastrowid
            logger.logger.info(f"Started pipeline run {run_id} (ID: {run_pk})")
            return run_pk
    
    def complete_pipeline_run(self, run_id: str, stats: Dict[str, Any]):
        """Complete a pipeline run with statistics."""
        with self.get_connection() as conn:
            conn.execute("""
                UPDATE pipeline_runs 
                SET end_time = CURRENT_TIMESTAMP,
                    status = 'completed',
                    total_records = ?,
                    new_records = ?,
                    updated_records = ?
                WHERE run_id = ?
            """, (
                stats.get('total_records', 0),
                stats.get('new_records', 0), 
                stats.get('updated_records', 0),
                run_id
            ))
            conn.commit()
            logger.logger.info(f"Completed pipeline run {run_id}")
    
    def fail_pipeline_run(self, run_id: str, error_msg: str):
        """Mark a pipeline run as failed."""
        with self.get_connection() as conn:
            conn.execute("""
                UPDATE pipeline_runs 
                SET end_time = CURRENT_TIMESTAMP,
                    status = 'failed',
                    errors = ?
                WHERE run_id = ?
            """, (error_msg, run_id))
            conn.commit()
            logger.logger.error(f"Failed pipeline run {run_id}: {error_msg}")
    
    def upsert_missing_person(self, record: Dict[str, Any]) -> Tuple[int, bool]:
        """
        Insert or update a missing person record.
        
        Returns:
            Tuple of (record_id, was_inserted)
        """
        with self.get_connection() as conn:
            # Try to find existing record
            existing = conn.execute("""
                SELECT id FROM missing_persons_enhanced 
                WHERE source_name = ? AND source_id = ?
            """, (record.get('source_name'), record.get('source_id'))).fetchone()
            
            if existing:
                # Update existing record
                conn.execute("""
                    UPDATE missing_persons_enhanced 
                    SET case_number = ?, name = ?, age = ?, gender = ?, ethnicity = ?,
                        city = ?, county = ?, state = ?, latitude = ?, longitude = ?,
                        date_missing = ?, date_reported = ?, status = ?, category = ?,
                        description = ?, circumstances = ?, source_url = ?,
                        data_quality_score = ?, geocoding_source = ?,
                        last_verified = CURRENT_TIMESTAMP, raw_data = ?
                    WHERE id = ?
                """, (
                    record.get('case_number'), record.get('name'), record.get('age'),
                    record.get('gender'), record.get('ethnicity'), record.get('city'),
                    record.get('county'), record.get('state'), record.get('latitude'),
                    record.get('longitude'), record.get('date_missing'),
                    record.get('date_reported'), record.get('status'),
                    record.get('category'), record.get('description'),
                    record.get('circumstances'), record.get('source_url'),
                    record.get('data_quality_score'), record.get('geocoding_source'),
                    json.dumps(record.get('raw_data')), existing['id']
                ))
                conn.commit()
                return existing['id'], False
            else:
                # Insert new record
                cursor = conn.execute("""
                    INSERT INTO missing_persons_enhanced (
                        case_number, name, age, gender, ethnicity, city, county, state,
                        latitude, longitude, date_missing, date_reported, status, category,
                        description, circumstances, source_name, source_id, source_url,
                        data_quality_score, geocoding_source, raw_data
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    record.get('case_number'), record.get('name'), record.get('age'),
                    record.get('gender'), record.get('ethnicity'), record.get('city'),
                    record.get('county'), record.get('state'), record.get('latitude'),
                    record.get('longitude'), record.get('date_missing'),
                    record.get('date_reported'), record.get('status'),
                    record.get('category'), record.get('description'),
                    record.get('circumstances'), record.get('source_name'),
                    record.get('source_id'), record.get('source_url'),
                    record.get('data_quality_score'), record.get('geocoding_source'),
                    json.dumps(record.get('raw_data'))
                ))
                conn.commit()
                return cursor.lastrowid, True
    
    def get_records_needing_geocoding(self, limit: int = 1000) -> List[Dict[str, Any]]:
        """Get records that need geocoding."""
        with self.get_connection() as conn:
            rows = conn.execute("""
                SELECT id, city, county, state, country
                FROM missing_persons_enhanced 
                WHERE (latitude IS NULL OR longitude IS NULL)
                  AND city IS NOT NULL 
                  AND state IS NOT NULL
                LIMIT ?
            """, (limit,)).fetchall()
            
            return [dict(row) for row in rows]
    
    def update_coordinates(self, record_id: int, latitude: float, longitude: float, 
                          geocoding_source: str = None):
        """Update coordinates for a record."""
        with self.get_connection() as conn:
            conn.execute("""
                UPDATE missing_persons_enhanced 
                SET latitude = ?, longitude = ?, geocoding_source = ?
                WHERE id = ?
            """, (latitude, longitude, geocoding_source, record_id))
            conn.commit()
    
    def get_statistics(self) -> Dict[str, Any]:
        """Get database statistics."""
        with self.get_connection() as conn:
            stats = {}
            
            # Total records
            total = conn.execute("SELECT COUNT(*) as count FROM missing_persons_enhanced").fetchone()
            stats['total_records'] = total['count'] if total else 0
            
            # Records with coordinates
            with_coords = conn.execute("""
                SELECT COUNT(*) as count FROM missing_persons_enhanced 
                WHERE latitude IS NOT NULL AND longitude IS NOT NULL
            """).fetchone()
            stats['geocoded_records'] = with_coords['count'] if with_coords else 0
            
            # Records by source
            by_source = conn.execute("""
                SELECT source_name, COUNT(*) as count
                FROM missing_persons_enhanced 
                WHERE source_name IS NOT NULL
                GROUP BY source_name
            """).fetchall()
            stats['by_source'] = {row['source_name']: row['count'] for row in by_source}
            
            # Records by state
            by_state = conn.execute("""
                SELECT state, COUNT(*) as count
                FROM missing_persons_enhanced 
                WHERE state IS NOT NULL
                GROUP BY state
                ORDER BY count DESC
                LIMIT 10
            """).fetchall()
            stats['top_states'] = {row['state']: row['count'] for row in by_state}
            
            # Recent pipeline runs
            recent_runs = conn.execute("""
                SELECT run_id, start_time, status, total_records, new_records
                FROM pipeline_runs
                ORDER BY start_time DESC
                LIMIT 5
            """).fetchall()
            stats['recent_runs'] = [dict(row) for row in recent_runs]
            
            return stats
    
    def backup_database(self, backup_dir: str = None) -> str:
        """Create a backup of the database."""
        if backup_dir is None:
            backup_dir = self.db_path.parent / "backups"
        
        backup_dir = Path(backup_dir)
        backup_dir.mkdir(parents=True, exist_ok=True)
        
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_file = backup_dir / f"database_backup_{timestamp}.db"
        
        shutil.copy2(self.db_path, backup_file)
        logger.logger.info(f"Database backed up to {backup_file}")
        
        return str(backup_file)