"""
Intelligent update frequency system.
Dynamically adjusts update schedules based on data source activity, case urgency, and system performance.
"""

import sqlite3
import json
import math
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional, Tuple
from pathlib import Path
from dataclasses import dataclass, asdict
from enum import Enum
import statistics

from .logger import get_logger

logger = get_logger("intelligent_scheduler")

class UpdateFrequency(Enum):
    """Update frequency levels."""
    CRITICAL = "critical"      # Every 5-15 minutes
    HIGH = "high"             # Every 30 minutes - 1 hour
    NORMAL = "normal"         # Every 2-6 hours
    LOW = "low"              # Every 12-24 hours
    MINIMAL = "minimal"       # Every 24-72 hours

class ActivityPattern(Enum):
    """Data source activity patterns."""
    BURST = "burst"           # High activity in short periods
    STEADY = "steady"         # Consistent activity
    PERIODIC = "periodic"     # Regular patterns
    SPORADIC = "sporadic"     # Irregular activity
    DORMANT = "dormant"       # Very low activity

@dataclass
class SourceMetrics:
    """Metrics for a data source."""
    source_name: str
    avg_records_per_hour: float
    change_rate: float
    error_rate: float
    response_time_avg: float
    activity_pattern: ActivityPattern
    peak_hours: List[int]
    last_significant_update: datetime
    urgency_score: float

@dataclass
class ScheduleRecommendation:
    """Scheduling recommendation."""
    source_name: str
    update_frequency: UpdateFrequency
    interval_minutes: int
    next_update_time: datetime
    reason: str
    confidence: float
    adaptive_factors: Dict[str, float]

class IntelligentScheduler:
    """Manages intelligent, adaptive update scheduling."""
    
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.db_path = Path(config.get('database_path', 'database/app.db'))
        self.scheduler_db_path = Path(config.get('scheduler_db_path', 'intelligent_scheduler.db'))
        
        # Initialize scheduler database
        self.init_scheduler_database()
        
        # Scheduling configuration
        self.schedule_config = {
            # Base intervals for each frequency level (in minutes)
            'frequency_intervals': {
                UpdateFrequency.CRITICAL: (5, 15),
                UpdateFrequency.HIGH: (30, 60),
                UpdateFrequency.NORMAL: (120, 360),
                UpdateFrequency.LOW: (720, 1440),
                UpdateFrequency.MINIMAL: (1440, 4320)
            },
            
            # Thresholds for frequency decisions
            'thresholds': {
                'high_activity_records_per_hour': 50,
                'high_change_rate': 0.1,
                'high_error_rate': 0.05,
                'slow_response_time': 10.0,
                'urgent_case_threshold': 0.8,
                'system_load_threshold': 0.7
            },
            
            # Adaptive factors weights
            'factor_weights': {
                'activity_level': 0.25,
                'change_rate': 0.20,
                'urgency_score': 0.20,
                'error_rate': -0.15,  # Negative because high errors reduce frequency
                'response_time': -0.10,
                'system_load': -0.10
            },
            
            # Learning parameters
            'learning_window_hours': 168,  # 1 week
            'min_samples_for_learning': 10,
            'adaptation_speed': 0.3  # How quickly to adapt (0.0-1.0)
        }
        
    def init_scheduler_database(self):
        """Initialize the intelligent scheduler database."""
        try:
            conn = sqlite3.connect(self.scheduler_db_path)
            cursor = conn.cursor()
            
            # Source metrics history table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS source_metrics_history (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    source_name TEXT NOT NULL,
                    timestamp TEXT NOT NULL,
                    records_processed INTEGER DEFAULT 0,
                    records_changed INTEGER DEFAULT 0,
                    errors_count INTEGER DEFAULT 0,
                    response_time_ms REAL DEFAULT 0,
                    urgency_score REAL DEFAULT 0,
                    system_load REAL DEFAULT 0,
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            # Schedule recommendations table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS schedule_recommendations (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    source_name TEXT NOT NULL,
                    update_frequency TEXT NOT NULL,
                    interval_minutes INTEGER NOT NULL,
                    next_update_time TEXT NOT NULL,
                    reason TEXT,
                    confidence REAL NOT NULL,
                    adaptive_factors TEXT,
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                    applied_at TEXT,
                    effectiveness_score REAL
                )
            """)
            
            # Activity patterns table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS activity_patterns (
                    source_name TEXT PRIMARY KEY,
                    pattern_type TEXT NOT NULL,
                    peak_hours TEXT,
                    avg_records_per_hour REAL DEFAULT 0,
                    change_rate REAL DEFAULT 0,
                    error_rate REAL DEFAULT 0,
                    response_time_avg REAL DEFAULT 0,
                    pattern_confidence REAL DEFAULT 0,
                    last_updated TEXT DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            # Performance feedback table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS schedule_performance (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    source_name TEXT NOT NULL,
                    scheduled_time TEXT NOT NULL,
                    actual_execution_time TEXT,
                    execution_duration_ms REAL,
                    records_found INTEGER DEFAULT 0,
                    changes_detected INTEGER DEFAULT 0,
                    success BOOLEAN DEFAULT TRUE,
                    efficiency_score REAL,
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            # Create indexes
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_metrics_source_timestamp ON source_metrics_history(source_name, timestamp)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_recommendations_source ON schedule_recommendations(source_name)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_performance_source ON schedule_performance(source_name)")
            
            conn.commit()
            conn.close()
            
            logger.info("Intelligent scheduler database initialized")
            
        except Exception as e:
            logger.error(f"Failed to initialize scheduler database: {e}")
            raise
    
    def record_source_metrics(self, source_name: str, metrics: Dict[str, Any]):
        """Record metrics for a data source."""
        try:
            conn = sqlite3.connect(self.scheduler_db_path)
            cursor = conn.cursor()
            
            cursor.execute("""
                INSERT INTO source_metrics_history 
                (source_name, timestamp, records_processed, records_changed, 
                 errors_count, response_time_ms, urgency_score, system_load)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                source_name,
                datetime.now().isoformat(),
                metrics.get('records_processed', 0),
                metrics.get('records_changed', 0),
                metrics.get('errors_count', 0),
                metrics.get('response_time_ms', 0),
                metrics.get('urgency_score', 0),
                metrics.get('system_load', 0)
            ))
            
            conn.commit()
            conn.close()
            
            logger.debug(f"Recorded metrics for source: {source_name}")
            return True
            
        except Exception as e:
            logger.error(f"Error recording metrics for {source_name}: {e}")
            return False
    
    def analyze_source_patterns(self, source_name: str) -> SourceMetrics:
        """Analyze historical patterns for a data source."""
        try:
            conn = sqlite3.connect(self.scheduler_db_path)
            cursor = conn.cursor()
            
            # Get recent metrics (last week)
            since_time = (datetime.now() - timedelta(hours=self.schedule_config['learning_window_hours'])).isoformat()
            
            cursor.execute("""
                SELECT timestamp, records_processed, records_changed, errors_count,
                       response_time_ms, urgency_score
                FROM source_metrics_history
                WHERE source_name = ? AND timestamp >= ?
                ORDER BY timestamp DESC
            """, (source_name, since_time))
            
            metrics_data = cursor.fetchall()
            conn.close()
            
            if len(metrics_data) < self.schedule_config['min_samples_for_learning']:
                # Not enough data, return default metrics
                return SourceMetrics(
                    source_name=source_name,
                    avg_records_per_hour=0,
                    change_rate=0,
                    error_rate=0,
                    response_time_avg=0,
                    activity_pattern=ActivityPattern.SPORADIC,
                    peak_hours=[],
                    last_significant_update=datetime.now() - timedelta(days=1),
                    urgency_score=0
                )
            
            # Process metrics data
            hourly_records = []
            change_rates = []
            error_rates = []
            response_times = []
            urgency_scores = []
            hourly_activity = [0] * 24  # Activity by hour of day
            
            for i, (timestamp, records, changes, errors, response_time, urgency) in enumerate(metrics_data):
                try:
                    dt = datetime.fromisoformat(timestamp)
                    hour = dt.hour
                    
                    # Calculate rates
                    if records > 0:
                        change_rate = changes / records
                        error_rate = errors / records
                    else:
                        change_rate = 0
                        error_rate = 0 if errors == 0 else 1.0
                    
                    hourly_records.append(records)
                    change_rates.append(change_rate)
                    error_rates.append(error_rate)
                    response_times.append(response_time)
                    urgency_scores.append(urgency)
                    
                    # Track activity by hour
                    hourly_activity[hour] += records
                    
                except Exception as e:
                    logger.warning(f"Error processing metrics record: {e}")
                    continue
            
            # Calculate statistics
            avg_records_per_hour = statistics.mean(hourly_records) if hourly_records else 0
            avg_change_rate = statistics.mean(change_rates) if change_rates else 0
            avg_error_rate = statistics.mean(error_rates) if error_rates else 0
            avg_response_time = statistics.mean(response_times) if response_times else 0
            avg_urgency_score = statistics.mean(urgency_scores) if urgency_scores else 0
            
            # Determine activity pattern
            activity_pattern = self.classify_activity_pattern(hourly_records, hourly_activity)
            
            # Find peak hours (top 25% of active hours)
            peak_threshold = max(hourly_activity) * 0.75 if max(hourly_activity) > 0 else 0
            peak_hours = [hour for hour, activity in enumerate(hourly_activity) if activity >= peak_threshold]
            
            # Find last significant update
            last_significant_update = datetime.now() - timedelta(days=1)
            for timestamp, records, changes, _, _, urgency in metrics_data:
                if changes > 0 or urgency > 0.5:
                    last_significant_update = datetime.fromisoformat(timestamp)
                    break
            
            return SourceMetrics(
                source_name=source_name,
                avg_records_per_hour=avg_records_per_hour,
                change_rate=avg_change_rate,
                error_rate=avg_error_rate,
                response_time_avg=avg_response_time,
                activity_pattern=activity_pattern,
                peak_hours=peak_hours,
                last_significant_update=last_significant_update,
                urgency_score=avg_urgency_score
            )
            
        except Exception as e:
            logger.error(f"Error analyzing patterns for {source_name}: {e}")
            return SourceMetrics(
                source_name=source_name,
                avg_records_per_hour=0,
                change_rate=0,
                error_rate=0,
                response_time_avg=0,
                activity_pattern=ActivityPattern.SPORADIC,
                peak_hours=[],
                last_significant_update=datetime.now() - timedelta(days=1),
                urgency_score=0
            )
    
    def classify_activity_pattern(self, hourly_records: List[float], hourly_activity: List[float]) -> ActivityPattern:
        """Classify the activity pattern for a data source."""
        if not hourly_records:
            return ActivityPattern.DORMANT
        
        total_activity = sum(hourly_activity)
        max_hourly = max(hourly_records) if hourly_records else 0
        avg_hourly = statistics.mean(hourly_records)
        
        # Calculate coefficient of variation
        std_dev = statistics.stdev(hourly_records) if len(hourly_records) > 1 else 0
        cv = std_dev / avg_hourly if avg_hourly > 0 else 0
        
        # Classify based on patterns
        if total_activity < 10:
            return ActivityPattern.DORMANT
        elif cv > 2.0:  # High variability
            if max_hourly > avg_hourly * 5:
                return ActivityPattern.BURST
            else:
                return ActivityPattern.SPORADIC
        elif cv < 0.5:  # Low variability
            return ActivityPattern.STEADY
        else:
            # Check for periodic patterns
            active_hours = sum(1 for activity in hourly_activity if activity > avg_hourly)
            if 6 <= active_hours <= 12:  # Clear active period
                return ActivityPattern.PERIODIC
            else:
                return ActivityPattern.STEADY
    
    def calculate_adaptive_frequency(self, source_metrics: SourceMetrics) -> ScheduleRecommendation:
        """Calculate adaptive update frequency for a source."""
        try:
            # Base scoring factors
            factors = {
                'activity_level': min(source_metrics.avg_records_per_hour / 100, 1.0),
                'change_rate': min(source_metrics.change_rate * 10, 1.0),
                'urgency_score': source_metrics.urgency_score,
                'error_rate': min(source_metrics.error_rate * 10, 1.0),
                'response_time': min(source_metrics.response_time_avg / 1000, 1.0),
                'system_load': 0.3  # Would be calculated from system metrics
            }
            
            # Calculate weighted score
            weighted_score = 0
            for factor_name, factor_value in factors.items():
                weight = self.schedule_config['factor_weights'].get(factor_name, 0)
                weighted_score += factor_value * weight
            
            # Adjust based on activity pattern
            pattern_multipliers = {
                ActivityPattern.CRITICAL: 1.5,
                ActivityPattern.BURST: 1.3,
                ActivityPattern.STEADY: 1.0,
                ActivityPattern.PERIODIC: 0.9,
                ActivityPattern.SPORADIC: 0.7,
                ActivityPattern.DORMANT: 0.5
            }
            
            pattern_multiplier = pattern_multipliers.get(source_metrics.activity_pattern, 1.0)
            final_score = weighted_score * pattern_multiplier
            
            # Determine update frequency based on score
            if final_score >= 0.8:
                frequency = UpdateFrequency.CRITICAL
            elif final_score >= 0.6:
                frequency = UpdateFrequency.HIGH
            elif final_score >= 0.4:
                frequency = UpdateFrequency.NORMAL
            elif final_score >= 0.2:
                frequency = UpdateFrequency.LOW
            else:
                frequency = UpdateFrequency.MINIMAL
            
            # Calculate specific interval within frequency range
            min_interval, max_interval = self.schedule_config['frequency_intervals'][frequency]
            
            # Adjust interval based on peak hours
            current_hour = datetime.now().hour
            if current_hour in source_metrics.peak_hours:
                interval_multiplier = 0.7  # More frequent during peak hours
            else:
                interval_multiplier = 1.0
            
            target_interval = min_interval + (max_interval - min_interval) * (1 - final_score)
            final_interval = int(target_interval * interval_multiplier)
            
            # Calculate next update time
            next_update = datetime.now() + timedelta(minutes=final_interval)
            
            # Generate explanation
            reason_parts = []
            if factors['activity_level'] > 0.7:
                reason_parts.append(f"high activity ({source_metrics.avg_records_per_hour:.1f} records/hour)")
            if factors['change_rate'] > 0.5:
                reason_parts.append(f"significant changes ({source_metrics.change_rate:.1%})")
            if factors['urgency_score'] > 0.7:
                reason_parts.append(f"urgent cases detected ({source_metrics.urgency_score:.1%})")
            if factors['error_rate'] > 0.3:
                reason_parts.append(f"elevated error rate ({source_metrics.error_rate:.1%})")
            
            if not reason_parts:
                reason_parts.append("standard monitoring")
            
            reason = f"Adaptive scheduling based on: {', '.join(reason_parts)}"
            
            return ScheduleRecommendation(
                source_name=source_metrics.source_name,
                update_frequency=frequency,
                interval_minutes=final_interval,
                next_update_time=next_update,
                reason=reason,
                confidence=min(final_score + 0.2, 1.0),
                adaptive_factors=factors
            )
            
        except Exception as e:
            logger.error(f"Error calculating adaptive frequency for {source_metrics.source_name}: {e}")
            
            # Return safe default
            return ScheduleRecommendation(
                source_name=source_metrics.source_name,
                update_frequency=UpdateFrequency.NORMAL,
                interval_minutes=240,  # 4 hours
                next_update_time=datetime.now() + timedelta(hours=4),
                reason="Default schedule due to analysis error",
                confidence=0.5,
                adaptive_factors={'error': 1.0}
            )
    
    def save_schedule_recommendation(self, recommendation: ScheduleRecommendation) -> bool:
        """Save a schedule recommendation to the database."""
        try:
            conn = sqlite3.connect(self.scheduler_db_path)
            cursor = conn.cursor()
            
            cursor.execute("""
                INSERT INTO schedule_recommendations 
                (source_name, update_frequency, interval_minutes, next_update_time,
                 reason, confidence, adaptive_factors)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (
                recommendation.source_name,
                recommendation.update_frequency.value,
                recommendation.interval_minutes,
                recommendation.next_update_time.isoformat(),
                recommendation.reason,
                recommendation.confidence,
                json.dumps(recommendation.adaptive_factors)
            ))
            
            conn.commit()
            conn.close()
            
            return True
            
        except Exception as e:
            logger.error(f"Error saving schedule recommendation: {e}")
            return False
    
    def get_current_schedules(self) -> List[ScheduleRecommendation]:
        """Get current schedule recommendations for all sources."""
        try:
            conn = sqlite3.connect(self.scheduler_db_path)
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            
            # Get latest recommendation for each source
            cursor.execute("""
                SELECT * FROM schedule_recommendations r1
                WHERE r1.created_at = (
                    SELECT MAX(r2.created_at) FROM schedule_recommendations r2
                    WHERE r2.source_name = r1.source_name
                )
                ORDER BY r1.source_name
            """)
            
            recommendations = []
            for row in cursor.fetchall():
                try:
                    adaptive_factors = json.loads(row['adaptive_factors']) if row['adaptive_factors'] else {}
                    
                    recommendations.append(ScheduleRecommendation(
                        source_name=row['source_name'],
                        update_frequency=UpdateFrequency(row['update_frequency']),
                        interval_minutes=row['interval_minutes'],
                        next_update_time=datetime.fromisoformat(row['next_update_time']),
                        reason=row['reason'],
                        confidence=row['confidence'],
                        adaptive_factors=adaptive_factors
                    ))
                except Exception as e:
                    logger.warning(f"Error parsing recommendation record: {e}")
                    continue
            
            conn.close()
            return recommendations
            
        except Exception as e:
            logger.error(f"Error getting current schedules: {e}")
            return []
    
    def update_all_schedules(self) -> Dict[str, Any]:
        """Update schedules for all configured sources."""
        logger.info("Updating intelligent schedules for all sources")
        start_time = datetime.now()
        
        stats = {
            'sources_analyzed': 0,
            'schedules_updated': 0,
            'total_processing_time': 0,
            'schedule_changes': []
        }
        
        try:
            # Get list of sources from configuration or database
            sources = ['namus', 'florida_fdle', 'backup_sources']
            
            for source_name in sources:
                try:
                    logger.info(f"Analyzing source: {source_name}")
                    
                    # Analyze source patterns
                    source_metrics = self.analyze_source_patterns(source_name)
                    
                    # Calculate adaptive frequency
                    recommendation = self.calculate_adaptive_frequency(source_metrics)
                    
                    # Save recommendation
                    if self.save_schedule_recommendation(recommendation):
                        stats['schedules_updated'] += 1
                        
                        stats['schedule_changes'].append({
                            'source_name': source_name,
                            'frequency': recommendation.update_frequency.value,
                            'interval_minutes': recommendation.interval_minutes,
                            'next_update': recommendation.next_update_time.isoformat(),
                            'confidence': recommendation.confidence,
                            'reason': recommendation.reason
                        })
                        
                        logger.info(
                            f"Updated schedule for {source_name}: "
                            f"{recommendation.update_frequency.value} "
                            f"({recommendation.interval_minutes} min intervals)"
                        )
                    
                    stats['sources_analyzed'] += 1
                    
                except Exception as e:
                    logger.error(f"Error updating schedule for {source_name}: {e}")
                    continue
            
            stats['total_processing_time'] = (datetime.now() - start_time).total_seconds()
            
            logger.info(
                f"Schedule update completed: {stats['schedules_updated']} schedules updated "
                f"for {stats['sources_analyzed']} sources"
            )
            
            return stats
            
        except Exception as e:
            logger.error(f"Error updating schedules: {e}")
            stats['total_processing_time'] = (datetime.now() - start_time).total_seconds()
            stats['error'] = str(e)
            return stats
    
    def record_schedule_performance(self, source_name: str, performance_data: Dict[str, Any]):
        """Record the performance of a scheduled update for learning."""
        try:
            conn = sqlite3.connect(self.scheduler_db_path)
            cursor = conn.cursor()
            
            # Calculate efficiency score
            execution_duration = performance_data.get('execution_duration_ms', 0)
            records_found = performance_data.get('records_found', 0)
            changes_detected = performance_data.get('changes_detected', 0)
            
            # Efficiency = (useful work) / (time spent)
            useful_work = changes_detected + (records_found * 0.1)  # Weight changes higher
            time_factor = max(execution_duration / 1000, 1)  # Convert to seconds, min 1
            efficiency_score = useful_work / time_factor
            
            cursor.execute("""
                INSERT INTO schedule_performance 
                (source_name, scheduled_time, actual_execution_time, execution_duration_ms,
                 records_found, changes_detected, success, efficiency_score)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                source_name,
                performance_data.get('scheduled_time', datetime.now().isoformat()),
                performance_data.get('actual_execution_time', datetime.now().isoformat()),
                execution_duration,
                records_found,
                changes_detected,
                performance_data.get('success', True),
                efficiency_score
            ))
            
            conn.commit()
            conn.close()
            
            logger.debug(f"Recorded performance for {source_name}: efficiency={efficiency_score:.2f}")
            return True
            
        except Exception as e:
            logger.error(f"Error recording schedule performance: {e}")
            return False
    
    def get_scheduling_statistics(self) -> Dict[str, Any]:
        """Get statistics about intelligent scheduling performance."""
        try:
            conn = sqlite3.connect(self.scheduler_db_path)
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            
            # Overall statistics
            cursor.execute("SELECT COUNT(DISTINCT source_name) FROM schedule_recommendations")
            total_sources = cursor.fetchone()[0]
            
            cursor.execute("""
                SELECT update_frequency, COUNT(*) as count 
                FROM schedule_recommendations 
                WHERE created_at >= datetime('now', '-24 hours')
                GROUP BY update_frequency
            """)
            frequency_distribution = dict(cursor.fetchall())
            
            # Performance statistics
            cursor.execute("""
                SELECT source_name, AVG(efficiency_score) as avg_efficiency,
                       COUNT(*) as execution_count
                FROM schedule_performance 
                WHERE created_at >= datetime('now', '-7 days')
                GROUP BY source_name
            """)
            source_performance = [dict(row) for row in cursor.fetchall()]
            
            # Recent activity
            cursor.execute("""
                SELECT source_name, MAX(timestamp) as last_metrics
                FROM source_metrics_history
                GROUP BY source_name
            """)
            source_activity = [dict(row) for row in cursor.fetchall()]
            
            conn.close()
            
            return {
                'total_sources': total_sources,
                'frequency_distribution': frequency_distribution,
                'source_performance': source_performance,
                'source_activity': source_activity,
                'config': self.schedule_config
            }
            
        except Exception as e:
            logger.error(f"Error getting scheduling statistics: {e}")
            return {'error': str(e)}

def main():
    """CLI entry point for intelligent scheduling."""
    import argparse
    
    parser = argparse.ArgumentParser(description="Intelligent Scheduler")
    parser.add_argument('--config', help='Configuration file path')
    parser.add_argument('--update-schedules', action='store_true', help='Update all schedules')
    parser.add_argument('--analyze-source', help='Analyze specific source')
    parser.add_argument('--stats', action='store_true', help='Show scheduling statistics')
    parser.add_argument('--current-schedules', action='store_true', help='Show current schedules')
    
    args = parser.parse_args()
    
    config = {
        'database_path': 'database/app.db',
        'scheduler_db_path': 'intelligent_scheduler.db'
    }
    
    scheduler = IntelligentScheduler(config)
    
    if args.update_schedules:
        result = scheduler.update_all_schedules()
        print(f"Schedule update completed: {json.dumps(result, indent=2)}")
    elif args.analyze_source:
        metrics = scheduler.analyze_source_patterns(args.analyze_source)
        recommendation = scheduler.calculate_adaptive_frequency(metrics)
        print(f"Analysis for {args.analyze_source}:")
        print(f"  Metrics: {asdict(metrics)}")
        print(f"  Recommendation: {asdict(recommendation)}")
    elif args.current_schedules:
        schedules = scheduler.get_current_schedules()
        for schedule in schedules:
            print(f"{schedule.source_name}: {schedule.update_frequency.value} "
                  f"({schedule.interval_minutes} min) - {schedule.reason}")
    elif args.stats:
        stats = scheduler.get_scheduling_statistics()
        print(json.dumps(stats, indent=2, default=str))
    else:
        parser.print_help()

if __name__ == '__main__':
    main()