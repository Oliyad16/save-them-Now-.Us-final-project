import { NextRequest, NextResponse } from 'next/server'
import { spawn } from 'child_process'
import path from 'path'

interface MonitoringRequest {
  action: 'start' | 'stop' | 'test_alert' | 'record_metric'
  severity?: 'critical' | 'high' | 'medium' | 'low' | 'info'
  interval?: number
  metric_data?: {
    name: string
    value: number
    unit: string
    description: string
    threshold_warning?: number
    threshold_critical?: number
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: MonitoringRequest = await request.json()
    
    let args = ['data_pipeline/utils/monitoring_alerting.py']
    
    switch (body.action) {
      case 'start':
        args.push('--start')
        if (body.interval) {
          args.push('--interval', body.interval.toString())
        }
        
        // Start monitoring in background
        const child = spawn('python', args, {
          cwd: process.cwd(),
          detached: true,
          stdio: 'ignore'
        })
        
        child.unref()
        
        return NextResponse.json({
          success: true,
          message: 'Background monitoring started',
          monitoring_interval: body.interval || 300,
          started_at: new Date().toISOString()
        })
        
      case 'stop':
        // This would need additional implementation to stop running monitors
        return NextResponse.json({
          success: true,
          message: 'Stop monitoring request received',
          note: 'Background processes may continue until next check'
        })
        
      case 'test_alert':
        if (!body.severity) {
          return NextResponse.json({
            error: 'severity is required for test_alert action'
          }, { status: 400 })
        }
        
        args.push('--test-alert', body.severity)
        break
        
      case 'record_metric':
        if (!body.metric_data) {
          return NextResponse.json({
            error: 'metric_data is required for record_metric action'
          }, { status: 400 })
        }
        
        // This would need additional implementation in the Python script
        return NextResponse.json({
          success: true,
          message: 'Metric recording functionality not yet implemented',
          metric_data: body.metric_data
        })
        
      default:
        return NextResponse.json({
          error: 'Invalid action',
          valid_actions: ['start', 'stop', 'test_alert', 'record_metric']
        }, { status: 400 })
    }
    
    // For test_alert action, execute and wait for result
    if (body.action === 'test_alert') {
      const child = spawn('python', args, {
        cwd: process.cwd(),
        stdio: 'pipe'
      })
      
      let output = ''
      let error = ''
      
      child.stdout.on('data', (data) => {
        output += data.toString()
      })
      
      child.stderr.on('data', (data) => {
        error += data.toString()
      })
      
      const result = await new Promise((resolve) => {
        const timeout = setTimeout(() => {
          child.kill()
          resolve({
            success: false,
            error: 'Test alert operation timed out'
          })
        }, 30000) // 30 second timeout
        
        child.on('close', (code) => {
          clearTimeout(timeout)
          resolve({
            success: code === 0,
            exit_code: code,
            output: output,
            error: error || null
          })
        })
      })
      
      const testResult = result as any
      
      if (testResult.success) {
        return NextResponse.json({
          success: true,
          action: body.action,
          severity: body.severity,
          message: 'Test alert created successfully',
          output: testResult.output
        })
      } else {
        return NextResponse.json({
          success: false,
          action: body.action,
          error: testResult.error || 'Test alert creation failed',
          exit_code: testResult.exit_code
        }, { status: 500 })
      }
    }
    
  } catch (error) {
    console.error('Error in monitoring alerts:', error)
    return NextResponse.json({ 
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const detailed = searchParams.get('detailed') === 'true'
    
    // Get monitoring status
    const child = spawn('python', [
      'data_pipeline/utils/monitoring_alerting.py', '--status'
    ], {
      cwd: process.cwd(),
      stdio: 'pipe'
    })
    
    let output = ''
    let error = ''
    
    child.stdout.on('data', (data) => {
      output += data.toString()
    })
    
    child.stderr.on('data', (data) => {
      error += data.toString()
    })
    
    const result = await new Promise((resolve) => {
      const timeout = setTimeout(() => {
        child.kill()
        resolve({ success: false, error: 'Monitoring status check timed out' })
      }, 30000) // 30 second timeout
      
      child.on('close', (code) => {
        clearTimeout(timeout)
        resolve({
          success: code === 0,
          output: output,
          error: error || null
        })
      })
    })
    
    const statusResult = result as any
    
    if (statusResult.success) {
      try {
        const status = JSON.parse(statusResult.output)
        
        // Calculate additional metrics
        const alertSummary = calculateAlertSummary(status.active_alerts || {})
        const healthScore = status.system_health?.overall_health_score || 100
        const systemStatus = determineSystemStatus(healthScore, status.active_alerts || {})
        
        const response = {
          timestamp: new Date().toISOString(),
          monitoring_status: {
            active: status.monitoring_active,
            system_status: systemStatus,
            health_score: healthScore,
            alert_summary: alertSummary
          },
          system_health: status.system_health,
          capabilities: {
            alert_types: [
              'data_staleness',
              'sync_failure', 
              'high_error_rate',
              'performance_degradation',
              'system_resource',
              'urgent_case_detected',
              'source_unavailable',
              'schedule_deviation'
            ],
            severity_levels: ['critical', 'high', 'medium', 'low', 'info'],
            notification_channels: ['email', 'webhook', 'console']
          }
        }
        
        if (detailed) {
          response.recent_alerts = status.recent_alerts || []
          response.notification_statistics = status.notification_stats || {}
          response.monitoring_config = status.monitoring_config || {}
        }
        
        return NextResponse.json(response)
        
      } catch (e) {
        return NextResponse.json({
          error: 'Failed to parse monitoring status',
          raw_output: statusResult.output
        }, { status: 500 })
      }
    } else {
      return NextResponse.json({
        error: 'Failed to get monitoring status',
        details: statusResult.error
      }, { status: 500 })
    }
    
  } catch (error) {
    console.error('Error getting monitoring status:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

function calculateAlertSummary(activeAlerts: Record<string, number>): any {
  const total = Object.values(activeAlerts).reduce((sum, count) => sum + count, 0)
  
  return {
    total_active: total,
    by_severity: activeAlerts,
    critical_count: activeAlerts.critical || 0,
    high_count: activeAlerts.high || 0,
    medium_count: activeAlerts.medium || 0,
    requires_immediate_attention: (activeAlerts.critical || 0) + (activeAlerts.high || 0) > 0
  }
}

function determineSystemStatus(healthScore: number, activeAlerts: Record<string, number>): string {
  const criticalAlerts = activeAlerts.critical || 0
  const highAlerts = activeAlerts.high || 0
  
  if (criticalAlerts > 0) {
    return 'critical'
  } else if (highAlerts > 0 || healthScore < 70) {
    return 'degraded'
  } else if (healthScore < 90) {
    return 'warning'
  } else {
    return 'healthy'
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { alert_id, action } = body
    
    if (!alert_id || !action) {
      return NextResponse.json({
        error: 'alert_id and action are required'
      }, { status: 400 })
    }
    
    const validActions = ['acknowledge', 'resolve', 'suppress']
    if (!validActions.includes(action)) {
      return NextResponse.json({
        error: 'Invalid action',
        valid_actions: validActions
      }, { status: 400 })
    }
    
    // This would need additional implementation in the Python script
    // For now, return a placeholder response
    return NextResponse.json({
      success: true,
      message: `Alert ${action} functionality not yet implemented`,
      alert_id: alert_id,
      action: action,
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('Error updating alert:', error)
    return NextResponse.json({ 
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}