"""
Comprehensive monitoring and alerting system.
Monitors data pipeline health, performance, and critical events with configurable alerts.
"""

import sqlite3
import json
import smtplib
import requests
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional, Tuple, Callable
from pathlib import Path
from dataclasses import dataclass, asdict
from enum import Enum
import statistics
import threading
import time

from .logger import get_logger

logger = get_logger("monitoring_alerting")

class AlertSeverity(Enum):
    """Alert severity levels."""
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    INFO = "info"

class AlertType(Enum):
    """Types of alerts."""
    DATA_STALENESS = "data_staleness"
    SYNC_FAILURE = "sync_failure"
    HIGH_ERROR_RATE = "high_error_rate"
    PERFORMANCE_DEGRADATION = "performance_degradation"
    SYSTEM_RESOURCE = "system_resource"
    URGENT_CASE_DETECTED = "urgent_case_detected"
    SOURCE_UNAVAILABLE = "source_unavailable"
    SCHEDULE_DEVIATION = "schedule_deviation"

class AlertStatus(Enum):
    """Alert status."""
    ACTIVE = "active"
    ACKNOWLEDGED = "acknowledged"
    RESOLVED = "resolved"
    SUPPRESSED = "suppressed"

@dataclass
class Alert:
    """Represents a monitoring alert."""
    id: str
    alert_type: AlertType
    severity: AlertSeverity
    title: str
    message: str
    source: str
    metric_values: Dict[str, Any]
    threshold_values: Dict[str, Any]
    created_at: datetime
    status: AlertStatus = AlertStatus.ACTIVE
    acknowledged_at: Optional[datetime] = None
    resolved_at: Optional[datetime] = None
    suppressed_until: Optional[datetime] = None

@dataclass
class MonitoringMetric:
    """A monitoring metric with thresholds."""
    name: str
    current_value: float
    threshold_critical: Optional[float]
    threshold_warning: Optional[float]
    unit: str
    description: str
    last_updated: datetime

class MonitoringAlertingSystem:
    """Comprehensive monitoring and alerting system."""
    
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.db_path = Path(config.get('database_path', 'database/app.db'))
        self.monitoring_db_path = Path(config.get('monitoring_db_path', 'monitoring.db'))
        
        # Initialize monitoring database
        self.init_monitoring_database()
        
        # Monitoring configuration
        self.monitoring_config = {
            # Data freshness thresholds (hours)
            'data_staleness_warning': 12,
            'data_staleness_critical': 24,
            
            # Error rate thresholds (percentage)
            'error_rate_warning': 5.0,
            'error_rate_critical': 10.0,
            
            # Performance thresholds
            'response_time_warning': 30.0,  # seconds
            'response_time_critical': 60.0,
            'success_rate_warning': 95.0,  # percentage
            'success_rate_critical': 90.0,
            
            # System resource thresholds
            'disk_usage_warning': 80.0,  # percentage
            'disk_usage_critical': 90.0,
            'memory_usage_warning': 80.0,
            'memory_usage_critical': 90.0,
            
            # Alert suppression
            'alert_cooldown_minutes': 30,
            'max_alerts_per_hour': 10,
            
            # Notification settings
            'notification_channels': ['email', 'webhook'],
            'escalation_delay_minutes': 60
        }
        
        # Alert notification handlers
        self.notification_handlers = {
            'email': self.send_email_alert,
            'webhook': self.send_webhook_alert,
            'console': self.send_console_alert
        }
        
        # Background monitoring thread
        self.monitoring_thread = None
        self.monitoring_active = False
        
    def init_monitoring_database(self):
        """Initialize the monitoring database."""
        try:
            conn = sqlite3.connect(self.monitoring_db_path)
            cursor = conn.cursor()
            
            # Alerts table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS alerts (
                    id TEXT PRIMARY KEY,
                    alert_type TEXT NOT NULL,
                    severity TEXT NOT NULL,
                    title TEXT NOT NULL,
                    message TEXT NOT NULL,
                    source TEXT NOT NULL,
                    metric_values TEXT,
                    threshold_values TEXT,
                    status TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    acknowledged_at TEXT,
                    resolved_at TEXT,
                    suppressed_until TEXT
                )
            """)
            
            # Metrics history table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS metrics_history (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    metric_name TEXT NOT NULL,
                    metric_value REAL NOT NULL,
                    unit TEXT,
                    source TEXT NOT NULL,
                    timestamp TEXT NOT NULL,
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            # Alert notifications table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS alert_notifications (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    alert_id TEXT NOT NULL,
                    notification_channel TEXT NOT NULL,
                    notification_status TEXT NOT NULL,
                    sent_at TEXT NOT NULL,
                    response TEXT,
                    error_message TEXT,
                    FOREIGN KEY (alert_id) REFERENCES alerts (id)
                )
            """)
            
            # System health snapshots table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS system_health_snapshots (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    timestamp TEXT NOT NULL,
                    cpu_usage REAL DEFAULT 0,
                    memory_usage REAL DEFAULT 0,
                    disk_usage REAL DEFAULT 0,
                    active_connections INTEGER DEFAULT 0,
                    pending_jobs INTEGER DEFAULT 0,
                    error_count_1h INTEGER DEFAULT 0,
                    data_freshness_hours REAL DEFAULT 0,
                    overall_health_score REAL DEFAULT 100,
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            # Create indexes
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_alerts_type_severity ON alerts(alert_type, severity)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_alerts_created ON alerts(created_at)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_metrics_name_timestamp ON metrics_history(metric_name, timestamp)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_health_timestamp ON system_health_snapshots(timestamp)")
            
            conn.commit()
            conn.close()
            
            logger.info("Monitoring database initialized")
            
        except Exception as e:
            logger.error(f"Failed to initialize monitoring database: {e}")
            raise
    
    def record_metric(self, metric: MonitoringMetric, source: str = "system"):
        """Record a metric value."""
        try:
            conn = sqlite3.connect(self.monitoring_db_path)
            cursor = conn.cursor()
            
            cursor.execute("""
                INSERT INTO metrics_history 
                (metric_name, metric_value, unit, source, timestamp)
                VALUES (?, ?, ?, ?, ?)
            """, (
                metric.name,
                metric.current_value,
                metric.unit,
                source,
                metric.last_updated.isoformat()
            ))
            
            conn.commit()
            conn.close()
            
            # Check thresholds and generate alerts
            self.check_metric_thresholds(metric, source)
            
            return True
            
        except Exception as e:
            logger.error(f"Error recording metric {metric.name}: {e}")
            return False
    
    def check_metric_thresholds(self, metric: MonitoringMetric, source: str):
        """Check if a metric exceeds thresholds and generate alerts."""
        try:
            alerts_to_create = []
            
            # Check critical threshold
            if metric.threshold_critical is not None and metric.current_value >= metric.threshold_critical:
                alerts_to_create.append({
                    'severity': AlertSeverity.CRITICAL,
                    'title': f"Critical threshold exceeded: {metric.name}",
                    'message': f"{metric.description} has reached critical level: {metric.current_value} {metric.unit} (threshold: {metric.threshold_critical} {metric.unit})"
                })
            
            # Check warning threshold
            elif metric.threshold_warning is not None and metric.current_value >= metric.threshold_warning:
                alerts_to_create.append({
                    'severity': AlertSeverity.MEDIUM,
                    'title': f"Warning threshold exceeded: {metric.name}",
                    'message': f"{metric.description} has reached warning level: {metric.current_value} {metric.unit} (threshold: {metric.threshold_warning} {metric.unit})"
                })
            
            # Create alerts
            for alert_data in alerts_to_create:
                alert = Alert(
                    id=f"{metric.name}_{source}_{int(time.time())}",
                    alert_type=self.determine_alert_type(metric.name),
                    severity=alert_data['severity'],
                    title=alert_data['title'],
                    message=alert_data['message'],
                    source=source,
                    metric_values={metric.name: metric.current_value},
                    threshold_values={
                        'warning': metric.threshold_warning,
                        'critical': metric.threshold_critical
                    },
                    created_at=datetime.now()
                )
                
                self.create_alert(alert)
            
        except Exception as e:
            logger.error(f"Error checking thresholds for metric {metric.name}: {e}")
    
    def determine_alert_type(self, metric_name: str) -> AlertType:
        """Determine alert type based on metric name."""
        metric_name_lower = metric_name.lower()
        
        if 'staleness' in metric_name_lower or 'freshness' in metric_name_lower:
            return AlertType.DATA_STALENESS
        elif 'error' in metric_name_lower:
            return AlertType.HIGH_ERROR_RATE
        elif 'response_time' in metric_name_lower or 'performance' in metric_name_lower:
            return AlertType.PERFORMANCE_DEGRADATION
        elif 'sync' in metric_name_lower or 'failure' in metric_name_lower:
            return AlertType.SYNC_FAILURE
        elif 'urgent' in metric_name_lower:
            return AlertType.URGENT_CASE_DETECTED
        elif 'cpu' in metric_name_lower or 'memory' in metric_name_lower or 'disk' in metric_name_lower:
            return AlertType.SYSTEM_RESOURCE
        else:
            return AlertType.PERFORMANCE_DEGRADATION
    
    def create_alert(self, alert: Alert) -> bool:
        """Create a new alert."""
        try:
            # Check if similar alert exists and is active
            if self.is_duplicate_alert(alert):
                logger.debug(f"Suppressing duplicate alert: {alert.title}")
                return False
            
            # Check rate limiting
            if self.is_rate_limited(alert):
                logger.debug(f"Rate limiting alert: {alert.title}")
                return False
            
            # Save alert to database
            conn = sqlite3.connect(self.monitoring_db_path)
            cursor = conn.cursor()
            
            cursor.execute("""
                INSERT INTO alerts 
                (id, alert_type, severity, title, message, source, metric_values, 
                 threshold_values, status, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                alert.id,
                alert.alert_type.value,
                alert.severity.value,
                alert.title,
                alert.message,
                alert.source,
                json.dumps(alert.metric_values),
                json.dumps(alert.threshold_values, default=str),
                alert.status.value,
                alert.created_at.isoformat()
            ))
            
            conn.commit()
            conn.close()
            
            # Send notifications
            self.send_alert_notifications(alert)
            
            logger.info(f"Created {alert.severity.value} alert: {alert.title}")
            return True
            
        except Exception as e:
            logger.error(f"Error creating alert: {e}")
            return False
    
    def is_duplicate_alert(self, new_alert: Alert) -> bool:
        """Check if a similar alert already exists."""
        try:
            conn = sqlite3.connect(self.monitoring_db_path)
            cursor = conn.cursor()
            
            # Look for similar active alerts within cooldown period
            cooldown_time = (datetime.now() - timedelta(minutes=self.monitoring_config['alert_cooldown_minutes'])).isoformat()
            
            cursor.execute("""
                SELECT COUNT(*) FROM alerts 
                WHERE alert_type = ? 
                AND source = ? 
                AND status IN ('active', 'acknowledged')
                AND created_at >= ?
            """, (
                new_alert.alert_type.value,
                new_alert.source,
                cooldown_time
            ))
            
            count = cursor.fetchone()[0]
            conn.close()
            
            return count > 0
            
        except Exception as e:
            logger.error(f"Error checking for duplicate alerts: {e}")
            return False
    
    def is_rate_limited(self, alert: Alert) -> bool:
        """Check if alert creation is rate limited."""
        try:
            conn = sqlite3.connect(self.monitoring_db_path)
            cursor = conn.cursor()
            
            # Count alerts in the last hour
            one_hour_ago = (datetime.now() - timedelta(hours=1)).isoformat()
            
            cursor.execute("""
                SELECT COUNT(*) FROM alerts 
                WHERE created_at >= ?
            """, (one_hour_ago,))
            
            count = cursor.fetchone()[0]
            conn.close()
            
            return count >= self.monitoring_config['max_alerts_per_hour']
            
        except Exception as e:
            logger.error(f"Error checking rate limits: {e}")
            return False
    
    def send_alert_notifications(self, alert: Alert):
        """Send notifications for an alert through configured channels."""
        for channel in self.monitoring_config['notification_channels']:
            try:
                if channel in self.notification_handlers:
                    success = self.notification_handlers[channel](alert)
                    
                    # Record notification attempt
                    self.record_notification_attempt(alert.id, channel, success)
                    
                else:
                    logger.warning(f"Unknown notification channel: {channel}")
                    
            except Exception as e:
                logger.error(f"Error sending {channel} notification for alert {alert.id}: {e}")
                self.record_notification_attempt(alert.id, channel, False, str(e))
    
    def record_notification_attempt(self, alert_id: str, channel: str, success: bool, error_message: str = None):
        """Record a notification attempt."""
        try:
            conn = sqlite3.connect(self.monitoring_db_path)
            cursor = conn.cursor()
            
            cursor.execute("""
                INSERT INTO alert_notifications 
                (alert_id, notification_channel, notification_status, sent_at, error_message)
                VALUES (?, ?, ?, ?, ?)
            """, (
                alert_id,
                channel,
                'success' if success else 'failed',
                datetime.now().isoformat(),
                error_message
            ))
            
            conn.commit()
            conn.close()
            
        except Exception as e:
            logger.error(f"Error recording notification attempt: {e}")
    
    def send_email_alert(self, alert: Alert) -> bool:
        """Send alert via email."""
        try:
            # Get email configuration
            email_config = self.config.get('email', {})
            if not email_config.get('enabled', False):
                return False
            
            smtp_server = email_config.get('smtp_server')
            smtp_port = email_config.get('smtp_port', 587)
            username = email_config.get('username')
            password = email_config.get('password')
            from_email = email_config.get('from_email', username)
            to_emails = email_config.get('alert_recipients', [])
            
            if not all([smtp_server, username, password, to_emails]):
                logger.warning("Email configuration incomplete")
                return False
            
            # Create email message
            msg = MIMEMultipart()
            msg['From'] = from_email
            msg['To'] = ', '.join(to_emails)
            msg['Subject'] = f"[{alert.severity.value.upper()}] {alert.title}"
            
            # Email body
            body = f"""
Alert Details:
- Type: {alert.alert_type.value}
- Severity: {alert.severity.value}
- Source: {alert.source}
- Time: {alert.created_at.strftime('%Y-%m-%d %H:%M:%S')}

Message:
{alert.message}

Metric Values:
{json.dumps(alert.metric_values, indent=2)}

Thresholds:
{json.dumps(alert.threshold_values, indent=2, default=str)}

Alert ID: {alert.id}

This is an automated alert from the SaveThemNow.Jesus missing persons data pipeline monitoring system.
"""
            
            msg.attach(MIMEText(body, 'plain'))
            
            # Send email
            server = smtplib.SMTP(smtp_server, smtp_port)
            server.starttls()
            server.login(username, password)
            server.send_message(msg)
            server.quit()
            
            logger.info(f"Email alert sent for {alert.id}")
            return True
            
        except Exception as e:
            logger.error(f"Error sending email alert: {e}")
            return False
    
    def send_webhook_alert(self, alert: Alert) -> bool:
        """Send alert via webhook."""
        try:
            # Get webhook configuration
            webhook_config = self.config.get('webhook', {})
            if not webhook_config.get('enabled', False):
                return False
            
            webhook_url = webhook_config.get('url')
            if not webhook_url:
                logger.warning("Webhook URL not configured")
                return False
            
            # Prepare webhook payload
            payload = {
                'alert_id': alert.id,
                'alert_type': alert.alert_type.value,
                'severity': alert.severity.value,
                'title': alert.title,
                'message': alert.message,
                'source': alert.source,
                'metric_values': alert.metric_values,
                'threshold_values': alert.threshold_values,
                'created_at': alert.created_at.isoformat(),
                'status': alert.status.value
            }
            
            # Send webhook
            headers = {'Content-Type': 'application/json'}
            auth_token = webhook_config.get('auth_token')
            if auth_token:
                headers['Authorization'] = f'Bearer {auth_token}'
            
            response = requests.post(
                webhook_url,
                json=payload,
                headers=headers,
                timeout=10
            )
            
            if response.status_code == 200:
                logger.info(f"Webhook alert sent for {alert.id}")
                return True
            else:
                logger.warning(f"Webhook returned status {response.status_code} for alert {alert.id}")
                return False
            
        except Exception as e:
            logger.error(f"Error sending webhook alert: {e}")
            return False
    
    def send_console_alert(self, alert: Alert) -> bool:
        """Send alert to console/logs."""
        try:
            severity_prefix = {
                AlertSeverity.CRITICAL: "🔴",
                AlertSeverity.HIGH: "🟠",
                AlertSeverity.MEDIUM: "🟡",
                AlertSeverity.LOW: "🔵",
                AlertSeverity.INFO: "ℹ️"
            }
            
            prefix = severity_prefix.get(alert.severity, "⚠️")
            
            logger.info(f"\n{prefix} ALERT: {alert.title}")
            logger.info(f"   Type: {alert.alert_type.value}")
            logger.info(f"   Severity: {alert.severity.value}")
            logger.info(f"   Source: {alert.source}")
            logger.info(f"   Time: {alert.created_at}")
            logger.info(f"   Message: {alert.message}")
            
            return True
            
        except Exception as e:
            logger.error(f"Error sending console alert: {e}")
            return False
    
    def collect_system_health_metrics(self) -> Dict[str, MonitoringMetric]:
        """Collect system health metrics."""
        try:
            metrics = {}
            now = datetime.now()
            
            # Data freshness metric
            csv_path = Path('missing-persons.csv')
            if csv_path.exists():
                csv_age = (now - datetime.fromtimestamp(csv_path.stat().st_mtime)).total_seconds() / 3600
                metrics['data_freshness_hours'] = MonitoringMetric(
                    name='data_freshness_hours',
                    current_value=csv_age,
                    threshold_warning=self.monitoring_config['data_staleness_warning'],
                    threshold_critical=self.monitoring_config['data_staleness_critical'],
                    unit='hours',
                    description='Age of CSV data file',
                    last_updated=now
                )
            
            # Error rate metric (from recent logs)
            error_rate = self.calculate_recent_error_rate()
            metrics['error_rate_percent'] = MonitoringMetric(
                name='error_rate_percent',
                current_value=error_rate,
                threshold_warning=self.monitoring_config['error_rate_warning'],
                threshold_critical=self.monitoring_config['error_rate_critical'],
                unit='%',
                description='Error rate in last hour',
                last_updated=now
            )
            
            # System resource metrics would be collected here
            # For now, using placeholder values
            
            import psutil
            
            # CPU usage
            cpu_usage = psutil.cpu_percent(interval=1)
            metrics['cpu_usage_percent'] = MonitoringMetric(
                name='cpu_usage_percent',
                current_value=cpu_usage,
                threshold_warning=80.0,
                threshold_critical=90.0,
                unit='%',
                description='System CPU usage',
                last_updated=now
            )
            
            # Memory usage
            memory = psutil.virtual_memory()
            metrics['memory_usage_percent'] = MonitoringMetric(
                name='memory_usage_percent',
                current_value=memory.percent,
                threshold_warning=80.0,
                threshold_critical=90.0,
                unit='%',
                description='System memory usage',
                last_updated=now
            )
            
            # Disk usage
            disk = psutil.disk_usage('/')
            disk_usage_percent = (disk.used / disk.total) * 100
            metrics['disk_usage_percent'] = MonitoringMetric(
                name='disk_usage_percent',
                current_value=disk_usage_percent,
                threshold_warning=80.0,
                threshold_critical=90.0,
                unit='%',
                description='System disk usage',
                last_updated=now
            )
            
            return metrics
            
        except Exception as e:
            logger.error(f"Error collecting system health metrics: {e}")
            return {}
    
    def calculate_recent_error_rate(self) -> float:
        """Calculate error rate from recent operations."""
        try:
            # This would analyze recent logs or database records
            # For now, return a placeholder value
            return 2.5  # 2.5% error rate
            
        except Exception as e:
            logger.error(f"Error calculating error rate: {e}")
            return 0.0
    
    def run_monitoring_cycle(self):
        """Run a single monitoring cycle."""
        try:
            logger.debug("Running monitoring cycle")
            
            # Collect system health metrics
            metrics = self.collect_system_health_metrics()
            
            # Record and check each metric
            for metric in metrics.values():
                self.record_metric(metric, "system_monitor")
            
            # Take system health snapshot
            self.take_health_snapshot(metrics)
            
            # Clean up old data
            self.cleanup_old_monitoring_data()
            
        except Exception as e:
            logger.error(f"Error in monitoring cycle: {e}")
    
    def take_health_snapshot(self, metrics: Dict[str, MonitoringMetric]):
        """Take a snapshot of overall system health."""
        try:
            conn = sqlite3.connect(self.monitoring_db_path)
            cursor = conn.cursor()
            
            # Calculate overall health score
            health_factors = []
            
            for metric in metrics.values():
                if metric.threshold_critical:
                    # Calculate health factor (0-1, where 1 is healthy)
                    if metric.current_value >= metric.threshold_critical:
                        health_factors.append(0.0)
                    elif metric.threshold_warning and metric.current_value >= metric.threshold_warning:
                        health_factors.append(0.5)
                    else:
                        health_factors.append(1.0)
            
            overall_health = (sum(health_factors) / len(health_factors) * 100) if health_factors else 100
            
            # Count recent errors
            one_hour_ago = (datetime.now() - timedelta(hours=1)).isoformat()
            cursor.execute("""
                SELECT COUNT(*) FROM alerts 
                WHERE created_at >= ? AND severity IN ('critical', 'high')
            """, (one_hour_ago,))
            
            error_count_1h = cursor.fetchone()[0]
            
            # Insert health snapshot
            cursor.execute("""
                INSERT INTO system_health_snapshots 
                (timestamp, cpu_usage, memory_usage, disk_usage, error_count_1h, 
                 data_freshness_hours, overall_health_score)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (
                datetime.now().isoformat(),
                metrics.get('cpu_usage_percent', MonitoringMetric('', 0, None, None, '', '', datetime.now())).current_value,
                metrics.get('memory_usage_percent', MonitoringMetric('', 0, None, None, '', '', datetime.now())).current_value,
                metrics.get('disk_usage_percent', MonitoringMetric('', 0, None, None, '', '', datetime.now())).current_value,
                error_count_1h,
                metrics.get('data_freshness_hours', MonitoringMetric('', 0, None, None, '', '', datetime.now())).current_value,
                overall_health
            ))
            
            conn.commit()
            conn.close()
            
        except Exception as e:
            logger.error(f"Error taking health snapshot: {e}")
    
    def cleanup_old_monitoring_data(self):
        """Clean up old monitoring data beyond retention period."""
        try:
            conn = sqlite3.connect(self.monitoring_db_path)
            cursor = conn.cursor()
            
            # Clean up old metrics (keep 30 days)
            thirty_days_ago = (datetime.now() - timedelta(days=30)).isoformat()
            cursor.execute("DELETE FROM metrics_history WHERE created_at < ?", (thirty_days_ago,))
            
            # Clean up old health snapshots (keep 90 days)
            ninety_days_ago = (datetime.now() - timedelta(days=90)).isoformat()
            cursor.execute("DELETE FROM system_health_snapshots WHERE created_at < ?", (ninety_days_ago,))
            
            # Clean up resolved alerts (keep 7 days)
            seven_days_ago = (datetime.now() - timedelta(days=7)).isoformat()
            cursor.execute("""
                DELETE FROM alerts 
                WHERE status = 'resolved' AND resolved_at < ?
            """, (seven_days_ago,))
            
            conn.commit()
            conn.close()
            
        except Exception as e:
            logger.error(f"Error cleaning up monitoring data: {e}")
    
    def start_monitoring(self, interval_seconds: int = 300):
        """Start background monitoring."""
        if self.monitoring_active:
            logger.warning("Monitoring already active")
            return
        
        self.monitoring_active = True
        
        def monitoring_loop():
            while self.monitoring_active:
                try:
                    self.run_monitoring_cycle()
                    time.sleep(interval_seconds)
                except Exception as e:
                    logger.error(f"Error in monitoring loop: {e}")
                    time.sleep(60)  # Wait a minute on error
        
        self.monitoring_thread = threading.Thread(target=monitoring_loop, daemon=True)
        self.monitoring_thread.start()
        
        logger.info(f"Started background monitoring (interval: {interval_seconds}s)")
    
    def stop_monitoring(self):
        """Stop background monitoring."""
        self.monitoring_active = False
        if self.monitoring_thread and self.monitoring_thread.is_alive():
            self.monitoring_thread.join(timeout=10)
        
        logger.info("Stopped background monitoring")
    
    def get_monitoring_status(self) -> Dict[str, Any]:
        """Get current monitoring status and recent alerts."""
        try:
            conn = sqlite3.connect(self.monitoring_db_path)
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            
            # Count active alerts by severity
            cursor.execute("""
                SELECT severity, COUNT(*) as count 
                FROM alerts 
                WHERE status IN ('active', 'acknowledged')
                GROUP BY severity
            """)
            active_alerts = dict(cursor.fetchall())
            
            # Recent alerts (last 24 hours)
            twenty_four_hours_ago = (datetime.now() - timedelta(hours=24)).isoformat()
            cursor.execute("""
                SELECT * FROM alerts 
                WHERE created_at >= ?
                ORDER BY created_at DESC 
                LIMIT 10
            """, (twenty_four_hours_ago,))
            recent_alerts = [dict(row) for row in cursor.fetchall()]
            
            # Latest health snapshot
            cursor.execute("""
                SELECT * FROM system_health_snapshots 
                ORDER BY timestamp DESC 
                LIMIT 1
            """)
            health_snapshot = cursor.fetchone()
            health_data = dict(health_snapshot) if health_snapshot else {}
            
            # Notification statistics
            cursor.execute("""
                SELECT notification_channel, notification_status, COUNT(*) as count
                FROM alert_notifications 
                WHERE sent_at >= ?
                GROUP BY notification_channel, notification_status
            """, (twenty_four_hours_ago,))
            notification_stats = {}
            for row in cursor.fetchall():
                channel = row[0]
                status = row[1]
                count = row[2]
                if channel not in notification_stats:
                    notification_stats[channel] = {}
                notification_stats[channel][status] = count
            
            conn.close()
            
            return {
                'monitoring_active': self.monitoring_active,
                'active_alerts': active_alerts,
                'recent_alerts': recent_alerts,
                'system_health': health_data,
                'notification_stats': notification_stats,
                'monitoring_config': self.monitoring_config
            }
            
        except Exception as e:
            logger.error(f"Error getting monitoring status: {e}")
            return {'error': str(e)}

def main():
    """CLI entry point for monitoring and alerting."""
    import argparse
    
    parser = argparse.ArgumentParser(description="Monitoring and Alerting System")
    parser.add_argument('--config', help='Configuration file path')
    parser.add_argument('--start', action='store_true', help='Start monitoring')
    parser.add_argument('--status', action='store_true', help='Show monitoring status')
    parser.add_argument('--test-alert', help='Create test alert with specified severity')
    parser.add_argument('--interval', type=int, default=300, help='Monitoring interval in seconds')
    
    args = parser.parse_args()
    
    config = {
        'database_path': 'database/app.db',
        'monitoring_db_path': 'monitoring.db',
        'email': {
            'enabled': False
        },
        'webhook': {
            'enabled': False
        }
    }
    
    monitor = MonitoringAlertingSystem(config)
    
    if args.start:
        logger.info("Starting monitoring system...")
        monitor.start_monitoring(args.interval)
        
        # Keep running until interrupted
        try:
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            logger.info("Stopping monitoring system...")
            monitor.stop_monitoring()
            
    elif args.status:
        status = monitor.get_monitoring_status()
        print(json.dumps(status, indent=2, default=str))
        
    elif args.test_alert:
        # Create a test alert
        test_alert = Alert(
            id=f"test_alert_{int(time.time())}",
            alert_type=AlertType.DATA_STALENESS,
            severity=AlertSeverity(args.test_alert.lower()),
            title=f"Test Alert - {args.test_alert}",
            message=f"This is a test alert with {args.test_alert} severity",
            source="test",
            metric_values={'test_metric': 100},
            threshold_values={'warning': 80, 'critical': 90},
            created_at=datetime.now()
        )
        
        if monitor.create_alert(test_alert):
            print(f"Test alert created: {test_alert.id}")
        else:
            print("Failed to create test alert")
            
    else:
        parser.print_help()

if __name__ == '__main__':
    main()