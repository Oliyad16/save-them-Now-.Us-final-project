import { NextRequest, NextResponse } from 'next/server'
import { spawn } from 'child_process'
import path from 'path'

interface TriggerRequest {
  type: 'full' | 'incremental' | 'geocoding' | 'urgent'
  priority: 'low' | 'medium' | 'high' | 'critical'
  reason?: string
}

export async function POST(request: NextRequest) {
  try {
    const body: TriggerRequest = await request.json()
    
    // Validate request
    const validTypes = ['full', 'incremental', 'geocoding', 'urgent']
    const validPriorities = ['low', 'medium', 'high', 'critical']
    
    if (!validTypes.includes(body.type)) {
      return NextResponse.json({ 
        error: 'Invalid update type',
        valid_types: validTypes 
      }, { status: 400 })
    }
    
    if (!validPriorities.includes(body.priority)) {
      return NextResponse.json({ 
        error: 'Invalid priority level',
        valid_priorities: validPriorities 
      }, { status: 400 })
    }
    
    // Get current data freshness
    const now = new Date()
    const csvPath = path.join(process.cwd(), 'missing-persons.csv')
    
    let triggerJustification = body.reason || 'Manual trigger'
    
    // Check if trigger is justified based on data freshness
    try {
      const fs = await import('fs/promises')
      const csvStats = await fs.stat(csvPath)
      const csvAge = (now.getTime() - csvStats.mtime.getTime()) / (1000 * 60 * 60)
      
      if (csvAge > 48) {
        triggerJustification = `Data critically stale (${csvAge.toFixed(1)} hours old)`
        body.priority = 'critical'
      } else if (csvAge > 24) {
        triggerJustification = `Data stale (${csvAge.toFixed(1)} hours old)`
        if (body.priority === 'low') body.priority = 'medium'
      }
    } catch (error) {
      triggerJustification = 'CSV file missing or inaccessible'
      body.priority = 'critical'
    }
    
    // Determine command based on update type
    let command: string
    let args: string[]
    
    switch (body.type) {
      case 'full':
        command = 'python'
        args = ['pipeline_cli.py', 'run']
        break
      case 'incremental':
        command = 'python'
        args = ['pipeline_cli.py', 'run', '--incremental']
        break
      case 'geocoding':
        command = 'python'
        args = ['pipeline_cli.py', 'geocode', '--limit', '1000']
        break
      case 'urgent':
        command = 'python'
        args = ['pipeline_cli.py', 'run', '--urgent-only']
        break
      default:
        return NextResponse.json({ error: 'Unknown update type' }, { status: 400 })
    }
    
    // Create trigger record
    const triggerRecord = {
      id: `trigger_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: body.type,
      priority: body.priority,
      reason: triggerJustification,
      triggered_at: now.toISOString(),
      triggered_by: 'api',
      status: 'initiated'
    }
    
    // For high/critical priority, execute immediately
    // For lower priority, queue for next scheduled run
    if (body.priority === 'critical' || body.priority === 'high') {
      try {
        // Execute pipeline command
        const child = spawn(command, args, {
          cwd: process.cwd(),
          detached: true,
          stdio: 'ignore'
        })
        
        child.unref() // Allow parent to exit
        
        triggerRecord.status = 'executing'
        
        return NextResponse.json({
          success: true,
          trigger: triggerRecord,
          message: `${body.type} update triggered with ${body.priority} priority`,
          execution: 'immediate'
        })
        
      } catch (error) {
        triggerRecord.status = 'failed'
        
        return NextResponse.json({
          success: false,
          trigger: triggerRecord,
          error: error instanceof Error ? error.message : 'Unknown error',
          execution: 'failed'
        }, { status: 500 })
      }
    } else {
      // Queue for next scheduled run
      triggerRecord.status = 'queued'
      
      return NextResponse.json({
        success: true,
        trigger: triggerRecord,
        message: `${body.type} update queued with ${body.priority} priority`,
        execution: 'queued'
      })
    }
    
  } catch (error) {
    console.error('Error triggering update:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      success: false
    }, { status: 500 })
  }
}

export async function GET() {
  try {
    // Get current trigger queue status and recent triggers
    const now = new Date()
    
    // Check data freshness to determine if auto-trigger is needed
    const csvPath = path.join(process.cwd(), 'missing-persons.csv')
    const dbPath = path.join(process.cwd(), 'database', 'app.db')
    
    let autoTriggerRecommendation = null
    
    try {
      const fs = await import('fs/promises')
      const csvStats = await fs.stat(csvPath)
      const csvAge = (now.getTime() - csvStats.mtime.getTime()) / (1000 * 60 * 60)
      
      if (csvAge > 72) {
        autoTriggerRecommendation = {
          type: 'full',
          priority: 'critical',
          reason: `Data extremely stale (${csvAge.toFixed(1)} hours old)`,
          recommended_action: 'immediate'
        }
      } else if (csvAge > 48) {
        autoTriggerRecommendation = {
          type: 'full',
          priority: 'high',
          reason: `Data critically stale (${csvAge.toFixed(1)} hours old)`,
          recommended_action: 'immediate'
        }
      } else if (csvAge > 24) {
        autoTriggerRecommendation = {
          type: 'incremental',
          priority: 'medium',
          reason: `Data stale (${csvAge.toFixed(1)} hours old)`,
          recommended_action: 'queue'
        }
      }
    } catch (error) {
      autoTriggerRecommendation = {
        type: 'full',
        priority: 'critical',
        reason: 'CSV file missing or inaccessible',
        recommended_action: 'immediate'
      }
    }
    
    return NextResponse.json({
      timestamp: now.toISOString(),
      auto_trigger_recommendation: autoTriggerRecommendation,
      available_triggers: [
        {
          type: 'full',
          description: 'Complete data collection from all sources',
          estimated_duration: '15-30 minutes',
          resource_intensive: true
        },
        {
          type: 'incremental',
          description: 'Update only changed/new records',
          estimated_duration: '5-10 minutes',
          resource_intensive: false
        },
        {
          type: 'geocoding',
          description: 'Process records missing coordinates',
          estimated_duration: '5-15 minutes',
          resource_intensive: false
        },
        {
          type: 'urgent',
          description: 'Process only urgent missing children cases',
          estimated_duration: '2-5 minutes',
          resource_intensive: false
        }
      ],
      priority_levels: {
        'critical': 'Execute immediately, override running jobs',
        'high': 'Execute immediately',
        'medium': 'Queue for next available slot',
        'low': 'Queue for next scheduled run'
      }
    })
    
  } catch (error) {
    console.error('Error getting trigger status:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}