"""
Data staleness monitoring and alerting system.
Monitors data freshness and sends alerts when data becomes stale.
"""

import json
import smtplib
from datetime import datetime, timedelta
from email.mime.text import MIMEText as MimeText
from email.mime.multipart import MIMEMultipart as MimeMultipart
from pathlib import Path
from typing import Dict, Any, List, Optional
import requests

from .logger import get_logger

logger = get_logger("staleness_monitor")

class DataStalenessMonitor:
    """Monitor data freshness and send alerts when data becomes stale."""
    
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.csv_path = Path(config.get('csv_path', 'missing-persons.csv'))
        self.database_path = Path(config.get('database_path', 'database/app.db'))
        
        # Staleness thresholds (in hours) - Optimized for faster detection
        self.thresholds = {
            'warning': config.get('warning_threshold_hours', 6),   # Reduced from 24h
            'critical': config.get('critical_threshold_hours', 12), # Reduced from 48h  
            'emergency': config.get('emergency_threshold_hours', 24) # Reduced from 72h
        }
        
        # Alert configuration
        self.alert_config = config.get('alerts', {})
        self.webhook_url = self.alert_config.get('webhook_url', '')
        self.email_config = self.alert_config.get('email', {})
        
        # State tracking
        self.state_file = Path('data_staleness_state.json')
        self.last_alerts = self.load_alert_state()
    
    def load_alert_state(self) -> Dict[str, Any]:
        """Load the last alert state to prevent spam."""
        try:
            if self.state_file.exists():
                with open(self.state_file, 'r') as f:
                    return json.load(f)
        except Exception as e:
            logger.logger.error(f"Failed to load alert state: {e}")
        
        return {'last_alert_time': None, 'last_alert_level': None}
    
    def save_alert_state(self, alert_level: str):
        """Save alert state to prevent spam."""
        try:
            state = {
                'last_alert_time': datetime.now().isoformat(),
                'last_alert_level': alert_level
            }
            with open(self.state_file, 'w') as f:
                json.dump(state, f, indent=2)
        except Exception as e:
            logger.logger.error(f"Failed to save alert state: {e}")
    
    def check_csv_staleness(self) -> Dict[str, Any]:
        """Check CSV file staleness."""
        if not self.csv_path.exists():
            return {
                'status': 'missing',
                'age_hours': float('inf'),
                'level': 'emergency',
                'message': 'CSV file is missing'
            }
        
        try:
            file_age = datetime.now() - datetime.fromtimestamp(self.csv_path.stat().st_mtime)
            age_hours = file_age.total_seconds() / 3600
            
            # Determine alert level
            level = 'ok'
            if age_hours > self.thresholds['emergency']:
                level = 'emergency'
            elif age_hours > self.thresholds['critical']:
                level = 'critical'
            elif age_hours > self.thresholds['warning']:
                level = 'warning'
            
            return {
                'status': 'exists',
                'age_hours': age_hours,
                'level': level,
                'last_modified': datetime.fromtimestamp(self.csv_path.stat().st_mtime).isoformat(),
                'message': f"CSV data is {age_hours:.1f} hours old"
            }
            
        except Exception as e:
            logger.logger.error(f"Error checking CSV staleness: {e}")
            return {
                'status': 'error',
                'age_hours': float('inf'),
                'level': 'emergency',
                'message': f"Error checking CSV: {e}"
            }
    
    def check_database_staleness(self) -> Dict[str, Any]:
        """Check database staleness."""
        if not self.database_path.exists():
            return {
                'status': 'missing',
                'age_hours': float('inf'),
                'level': 'emergency',
                'message': 'Database file is missing'
            }
        
        try:
            file_age = datetime.now() - datetime.fromtimestamp(self.database_path.stat().st_mtime)
            age_hours = file_age.total_seconds() / 3600
            
            # Database can be less fresh than CSV since it's updated from CSV
            adjusted_thresholds = {
                'warning': self.thresholds['warning'] + 6,
                'critical': self.thresholds['critical'] + 12,
                'emergency': self.thresholds['emergency'] + 24
            }
            
            level = 'ok'
            if age_hours > adjusted_thresholds['emergency']:
                level = 'emergency'
            elif age_hours > adjusted_thresholds['critical']:
                level = 'critical'
            elif age_hours > adjusted_thresholds['warning']:
                level = 'warning'
            
            return {
                'status': 'exists',
                'age_hours': age_hours,
                'level': level,
                'last_modified': datetime.fromtimestamp(self.database_path.stat().st_mtime).isoformat(),
                'message': f"Database is {age_hours:.1f} hours old"
            }
            
        except Exception as e:
            logger.logger.error(f"Error checking database staleness: {e}")
            return {
                'status': 'error',
                'age_hours': float('inf'),
                'level': 'emergency',
                'message': f"Error checking database: {e}"
            }
    
    def should_send_alert(self, level: str) -> bool:
        """Determine if we should send an alert to prevent spam."""
        if not self.last_alerts.get('last_alert_time'):
            return True
        
        last_alert_time = datetime.fromisoformat(self.last_alerts['last_alert_time'])
        time_since_last = datetime.now() - last_alert_time
        
        # Send alerts based on level and time since last alert
        if level == 'emergency':
            return time_since_last > timedelta(hours=2)  # Every 2 hours for emergency
        elif level == 'critical':
            return time_since_last > timedelta(hours=6)  # Every 6 hours for critical
        elif level == 'warning':
            return time_since_last > timedelta(hours=24)  # Daily for warnings
        
        return False
    
    def send_webhook_alert(self, alert_data: Dict[str, Any]):
        """Send alert via webhook."""
        if not self.webhook_url:
            return
        
        try:
            payload = {
                'text': f"🚨 Data Staleness Alert - {alert_data['level'].upper()}",
                'attachments': [{
                    'color': self.get_alert_color(alert_data['level']),
                    'fields': [
                        {'title': 'CSV Status', 'value': alert_data['csv']['message'], 'short': False},
                        {'title': 'Database Status', 'value': alert_data['database']['message'], 'short': False},
                        {'title': 'Time', 'value': datetime.now().strftime('%Y-%m-%d %H:%M:%S'), 'short': True}
                    ]
                }]
            }
            
            response = requests.post(self.webhook_url, json=payload, timeout=10)
            response.raise_for_status()
            logger.logger.info("Webhook alert sent successfully")
            
        except Exception as e:
            logger.logger.error(f"Failed to send webhook alert: {e}")
    
    def send_email_alert(self, alert_data: Dict[str, Any]):
        """Send alert via email."""
        if not self.email_config.get('enabled', False):
            return
        
        try:
            msg = MimeMultipart()
            msg['From'] = self.email_config['from_email']
            msg['To'] = ', '.join(self.email_config['recipients'])
            msg['Subject'] = f"SaveThemNow.Jesus - Data Staleness Alert ({alert_data['level'].upper()})"
            
            body = f"""
Data Staleness Alert - {alert_data['level'].upper()}

CSV Status: {alert_data['csv']['message']}
Database Status: {alert_data['database']['message']}

Overall Level: {alert_data['level']}
Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

Please check the data pipeline and update mechanisms.

---
SaveThemNow.Jesus Monitoring System
            """.strip()
            
            msg.attach(MimeText(body, 'plain'))
            
            server = smtplib.SMTP(self.email_config['smtp_server'], self.email_config['smtp_port'])
            server.starttls()
            server.login(self.email_config['username'], self.email_config['password'])
            text = msg.as_string()
            server.sendmail(self.email_config['from_email'], self.email_config['recipients'], text)
            server.quit()
            
            logger.logger.info("Email alert sent successfully")
            
        except Exception as e:
            logger.logger.error(f"Failed to send email alert: {e}")
    
    def get_alert_color(self, level: str) -> str:
        """Get color for alert level."""
        colors = {
            'ok': '#36a64f',      # Green
            'warning': '#ffb74d', # Orange
            'critical': '#f44336', # Red
            'emergency': '#9c27b0' # Purple
        }
        return colors.get(level, '#2196f3')  # Blue default
    
    def check_and_alert(self) -> Dict[str, Any]:
        """Main method to check staleness and send alerts."""
        logger.logger.info("Checking data staleness")
        
        # Check both CSV and database
        csv_status = self.check_csv_staleness()
        db_status = self.check_database_staleness()
        
        # Determine overall alert level (highest of the two)
        levels = ['ok', 'warning', 'critical', 'emergency']
        csv_level_idx = levels.index(csv_status['level']) if csv_status['level'] in levels else 3
        db_level_idx = levels.index(db_status['level']) if db_status['level'] in levels else 3
        overall_level = levels[max(csv_level_idx, db_level_idx)]
        
        alert_data = {
            'level': overall_level,
            'csv': csv_status,
            'database': db_status,
            'timestamp': datetime.now().isoformat()
        }
        
        # Send alerts if necessary
        if overall_level != 'ok' and self.should_send_alert(overall_level):
            logger.logger.warning(f"Sending {overall_level} level staleness alert")
            
            self.send_webhook_alert(alert_data)
            self.send_email_alert(alert_data)
            self.save_alert_state(overall_level)
        
        logger.logger.info(f"Staleness check complete - Level: {overall_level}")
        return alert_data
    
    def get_staleness_summary(self) -> Dict[str, Any]:
        """Get a summary of current staleness without sending alerts."""
        csv_status = self.check_csv_staleness()
        db_status = self.check_database_staleness()
        
        return {
            'csv': csv_status,
            'database': db_status,
            'last_check': datetime.now().isoformat(),
            'thresholds': self.thresholds
        }

def main():
    """CLI entry point for staleness monitoring."""
    import argparse
    
    parser = argparse.ArgumentParser(description="Data Staleness Monitor")
    parser.add_argument('--config', help='Configuration file path')
    parser.add_argument('--check', action='store_true', help='Check staleness and send alerts')
    parser.add_argument('--summary', action='store_true', help='Show staleness summary')
    
    args = parser.parse_args()
    
    # Default configuration
    config = {
        'csv_path': 'missing-persons.csv',
        'database_path': 'database/app.db',
        'warning_threshold_hours': 24,
        'critical_threshold_hours': 48,
        'emergency_threshold_hours': 72,
        'alerts': {
            'webhook_url': '',  # Set this for Slack/Discord alerts
            'email': {
                'enabled': False,
                'smtp_server': 'smtp.gmail.com',
                'smtp_port': 587,
                'username': '',
                'password': '',
                'from_email': '',
                'recipients': []
            }
        }
    }
    
    monitor = DataStalenessMonitor(config)
    
    if args.check:
        result = monitor.check_and_alert()
        print(f"Staleness check complete - Level: {result['level']}")
    elif args.summary:
        summary = monitor.get_staleness_summary()
        print(json.dumps(summary, indent=2, default=str))
    else:
        parser.print_help()

if __name__ == '__main__':
    main()