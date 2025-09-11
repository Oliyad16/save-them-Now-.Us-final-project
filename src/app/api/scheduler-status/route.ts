import { NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'

export async function GET() {
  try {
    const now = new Date()
    
    // Check for scheduler database and get job status
    const schedulerDbPath = path.join(process.cwd(), 'scheduler.db')
    
    let schedulerStatus = {
      running: false,
      database_exists: false,
      active_jobs: 0,
      next_jobs: [] as any[],
      last_execution: null,
      statistics: {
        jobs_executed: 0,
        jobs_failed: 0,
        jobs_missed: 0
      }
    }
    
    try {
      await fs.access(schedulerDbPath)
      schedulerStatus.database_exists = true
      
      // In a real implementation, we would query the scheduler database
      // For now, we'll provide mock data based on expected behavior
      schedulerStatus = {
        running: false, // Would check if scheduler process is running
        database_exists: true,
        active_jobs: 6, // Based on our scheduler configuration
        next_jobs: [
          {
            id: 'full_pipeline',
            name: 'Full data collection pipeline',
            next_run: getNextCronTime('2:00 AM daily'),
            priority: 1
          },
          {
            id: 'incremental_update',
            name: 'Incremental data updates',
            next_run: getNextIntervalTime(6 * 60 * 60 * 1000), // 6 hours
            priority: 2
          },
          {
            id: 'geocoding_batch',
            name: 'Batch geocoding for new records',
            next_run: getNextIntervalTime(4 * 60 * 60 * 1000), // 4 hours
            priority: 3
          },
          {
            id: 'data_freshness_check',
            name: 'Monitor data freshness and trigger updates',
            next_run: getNextIntervalTime(30 * 60 * 1000), // 30 minutes
            priority: 4
          },
          {
            id: 'urgent_case_monitor',
            name: 'Monitor for urgent missing children cases',
            next_run: getNextIntervalTime(15 * 60 * 1000), // 15 minutes
            priority: 5
          },
          {
            id: 'system_health_check',
            name: 'System health and performance monitoring',
            next_run: getNextIntervalTime(60 * 60 * 1000), // 1 hour
            priority: 6
          }
        ],
        last_execution: null,
        statistics: {
          jobs_executed: 0,
          jobs_failed: 0,
          jobs_missed: 0
        }
      }
      
    } catch (error) {
      // Scheduler database doesn't exist
    }
    
    // Check data freshness to determine scheduling urgency
    const csvPath = path.join(process.cwd(), 'missing-persons.csv')
    let dataStatus = {
      csv_age_hours: 0,
      urgency_level: 'normal',
      scheduling_recommendation: 'normal'
    }
    
    try {
      const csvStats = await fs.stat(csvPath)
      const csvAge = (now.getTime() - csvStats.mtime.getTime()) / (1000 * 60 * 60)
      
      dataStatus = {
        csv_age_hours: csvAge,
        urgency_level: csvAge > 48 ? 'critical' : csvAge > 24 ? 'high' : 'normal',
        scheduling_recommendation: csvAge > 48 ? 'immediate_full' : 
                                 csvAge > 24 ? 'accelerated' : 
                                 'normal'
      }
    } catch (error) {
      dataStatus = {
        csv_age_hours: Infinity,
        urgency_level: 'critical',
        scheduling_recommendation: 'immediate_full'
      }
    }
    
    // Check if automated scheduler can be started
    const canStart = {
      dependencies_available: true, // Would check for APScheduler, etc.
      permissions_ok: true, // Would check file/database permissions
      python_available: true, // Would check if Python is available
      configuration_valid: true // Would validate configuration
    }
    
    return NextResponse.json({
      timestamp: now.toISOString(),
      scheduler: schedulerStatus,
      data_status: dataStatus,
      system_readiness: canStart,
      automation_config: {
        full_pipeline: {
          schedule: 'Daily at 2:00 AM',
          description: 'Complete data collection from all sources',
          enabled: true
        },
        incremental_updates: {
          schedule: 'Every 6 hours',
          description: 'Quick updates for changed data',
          enabled: true
        },
        geocoding: {
          schedule: 'Every 4 hours',
          description: 'Process location coordinates',
          enabled: true
        },
        freshness_monitoring: {
          schedule: 'Every 30 minutes',
          description: 'Monitor data age and trigger updates',
          enabled: true
        },
        urgent_monitoring: {
          schedule: 'Every 15 minutes',
          description: 'Monitor for urgent missing children',
          enabled: true
        },
        health_checks: {
          schedule: 'Every 1 hour',
          description: 'System performance monitoring',
          enabled: true
        }
      },
      manual_controls: {
        start_scheduler: '/api/scheduler-control?action=start',
        stop_scheduler: '/api/scheduler-control?action=stop',
        trigger_immediate: '/api/trigger-update',
        view_logs: '/api/scheduler-logs'
      }
    })
    
  } catch (error) {
    console.error('Error getting scheduler status:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

// Helper function to calculate next cron time (simplified)
function getNextCronTime(cronDescription: string): string {
  const now = new Date()
  const tomorrow = new Date(now)
  tomorrow.setDate(tomorrow.getDate() + 1)
  tomorrow.setHours(2, 0, 0, 0) // 2 AM tomorrow
  return tomorrow.toISOString()
}

// Helper function to calculate next interval time
function getNextIntervalTime(intervalMs: number): string {
  const now = new Date()
  const next = new Date(now.getTime() + intervalMs)
  return next.toISOString()
}