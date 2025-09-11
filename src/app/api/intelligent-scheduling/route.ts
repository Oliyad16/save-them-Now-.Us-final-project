import { NextRequest, NextResponse } from 'next/server'
import { spawn } from 'child_process'
import path from 'path'

interface SchedulingRequest {
  action: 'update_schedules' | 'analyze_source' | 'record_metrics'
  source_name?: string
  metrics?: {
    records_processed?: number
    records_changed?: number
    errors_count?: number
    response_time_ms?: number
    urgency_score?: number
    system_load?: number
  }
  performance_data?: {
    scheduled_time?: string
    actual_execution_time?: string
    execution_duration_ms?: number
    records_found?: number
    changes_detected?: number
    success?: boolean
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: SchedulingRequest = await request.json()
    
    let args = ['data_pipeline/utils/intelligent_scheduler.py']
    let input_data = null
    
    switch (body.action) {
      case 'update_schedules':
        args.push('--update-schedules')
        break
        
      case 'analyze_source':
        if (!body.source_name) {
          return NextResponse.json({
            error: 'source_name is required for analyze_source action'
          }, { status: 400 })
        }
        args.push('--analyze-source', body.source_name)
        break
        
      case 'record_metrics':
        if (!body.source_name || !body.metrics) {
          return NextResponse.json({
            error: 'source_name and metrics are required for record_metrics action'
          }, { status: 400 })
        }
        // This would need additional implementation in the Python script
        // For now, return a placeholder response
        return NextResponse.json({
          success: true,
          message: 'Metrics recording functionality not yet implemented',
          source_name: body.source_name,
          metrics: body.metrics
        })
        
      default:
        return NextResponse.json({
          error: 'Invalid action',
          valid_actions: ['update_schedules', 'analyze_source', 'record_metrics']
        }, { status: 400 })
    }
    
    // Execute the Python script
    const child = spawn('python', args, {
      cwd: process.cwd(),
      stdio: 'pipe'
    })
    
    let output = ''
    let error = ''
    
    // Handle input data if needed
    if (input_data) {
      child.stdin.write(JSON.stringify(input_data))
      child.stdin.end()
    }
    
    child.stdout.on('data', (data) => {
      output += data.toString()
    })
    
    child.stderr.on('data', (data) => {
      error += data.toString()
    })
    
    // Wait for completion with timeout
    const result = await new Promise((resolve) => {
      const timeout = setTimeout(() => {
        child.kill()
        resolve({
          success: false,
          error: 'Intelligent scheduling operation timed out',
          timeout: true
        })
      }, 120000) // 2 minute timeout
      
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
    
    const scheduleResult = result as any
    
    if (scheduleResult.success) {
      // Try to parse JSON output
      let parsedOutput = null
      try {
        const jsonMatch = scheduleResult.output.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          parsedOutput = JSON.parse(jsonMatch[0])
        }
      } catch (e) {
        // Output might not be JSON, that's okay
      }
      
      return NextResponse.json({
        success: true,
        action: body.action,
        result: parsedOutput,
        raw_output: scheduleResult.output,
        execution_time: new Date().toISOString()
      })
    } else {
      return NextResponse.json({
        success: false,
        action: body.action,
        error: scheduleResult.error || 'Intelligent scheduling operation failed',
        exit_code: scheduleResult.exit_code,
        raw_output: scheduleResult.output,
        timeout: scheduleResult.timeout || false
      }, { status: 500 })
    }
    
  } catch (error) {
    console.error('Error in intelligent scheduling:', error)
    return NextResponse.json({ 
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action') || 'stats'
    
    let args = ['data_pipeline/utils/intelligent_scheduler.py']
    
    switch (action) {
      case 'stats':
        args.push('--stats')
        break
      case 'current_schedules':
        args.push('--current-schedules')
        break
      default:
        return NextResponse.json({
          error: 'Invalid action parameter',
          valid_actions: ['stats', 'current_schedules']
        }, { status: 400 })
    }
    
    // Execute the Python script
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
        resolve({ success: false, error: 'Intelligent scheduling query timed out' })
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
    
    const queryResult = result as any
    
    if (queryResult.success) {
      try {
        if (action === 'current_schedules') {
          // Parse schedule list output
          const schedules = parseScheduleList(queryResult.output)
          return NextResponse.json({
            timestamp: new Date().toISOString(),
            current_schedules: schedules,
            intelligent_scheduling: {
              enabled: true,
              learning_window_hours: 168,
              adaptation_features: [
                'Activity pattern recognition',
                'Peak hour optimization',
                'Error rate adaptation',
                'Response time consideration',
                'Urgency-based prioritization'
              ]
            }
          })
        } else {
          // Parse JSON statistics
          const stats = JSON.parse(queryResult.output)
          return NextResponse.json({
            timestamp: new Date().toISOString(),
            scheduling_intelligence: stats,
            system_capabilities: {
              frequency_levels: ['critical', 'high', 'normal', 'low', 'minimal'],
              activity_patterns: ['burst', 'steady', 'periodic', 'sporadic', 'dormant'],
              adaptive_factors: [
                'Activity level',
                'Change rate',
                'Urgency score',
                'Error rate',
                'Response time',
                'System load'
              ]
            },
            recommendations: generateIntelligentRecommendations(stats)
          })
        }
      } catch (e) {
        return NextResponse.json({
          error: 'Failed to parse scheduling output',
          raw_output: queryResult.output
        }, { status: 500 })
      }
    } else {
      return NextResponse.json({
        error: 'Failed to get intelligent scheduling information',
        details: queryResult.error
      }, { status: 500 })
    }
    
  } catch (error) {
    console.error('Error getting intelligent scheduling info:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

function parseScheduleList(output: string): any[] {
  const schedules = []
  const lines = output.split('\n')
  
  for (const line of lines) {
    const match = line.match(/^(\w+):\s+(\w+)\s+\((\d+)\s+min\)\s+-\s+(.+)$/)
    if (match) {
      schedules.push({
        source_name: match[1],
        frequency: match[2],
        interval_minutes: parseInt(match[3]),
        reason: match[4]
      })
    }
  }
  
  return schedules
}

function generateIntelligentRecommendations(stats: any): any[] {
  const recommendations = []
  
  if (stats.total_sources < 3) {
    recommendations.push({
      type: 'configuration',
      priority: 'medium',
      message: 'Consider adding more data sources for better scheduling intelligence',
      action: 'expand_sources'
    })
  }
  
  if (stats.source_performance) {
    const lowEfficiencySources = stats.source_performance.filter((s: any) => s.avg_efficiency < 0.5)
    if (lowEfficiencySources.length > 0) {
      recommendations.push({
        type: 'performance',
        priority: 'high',
        message: `${lowEfficiencySources.length} sources have low efficiency. Consider optimizing schedules.`,
        action: 'optimize_schedules',
        affected_sources: lowEfficiencySources.map((s: any) => s.source_name)
      })
    }
  }
  
  const criticalFrequency = stats.frequency_distribution?.critical || 0
  if (criticalFrequency > stats.total_sources * 0.5) {
    recommendations.push({
      type: 'resource_usage',
      priority: 'medium',
      message: 'High number of critical frequency schedules may impact system resources',
      action: 'review_critical_schedules'
    })
  }
  
  if (stats.source_activity) {
    const staleSources = stats.source_activity.filter((s: any) => {
      const lastMetrics = new Date(s.last_metrics)
      const hoursSince = (Date.now() - lastMetrics.getTime()) / (1000 * 60 * 60)
      return hoursSince > 24
    })
    
    if (staleSources.length > 0) {
      recommendations.push({
        type: 'data_freshness',
        priority: 'high',
        message: `${staleSources.length} sources haven't reported metrics in >24 hours`,
        action: 'check_source_connectivity',
        affected_sources: staleSources.map((s: any) => s.source_name)
      })
    }
  }
  
  return recommendations
}