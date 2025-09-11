import { NextRequest, NextResponse } from 'next/server'
import { spawn } from 'child_process'
import path from 'path'

interface SyncRequest {
  sources?: string[]
  force?: boolean
  priority_threshold?: number
  confidence_threshold?: number
}

export async function POST(request: NextRequest) {
  try {
    const body: SyncRequest = await request.json()
    
    // Build command arguments
    const args = ['data_pipeline/utils/incremental_updater.py', '--sync']
    
    if (body.sources && body.sources.length > 0) {
      args.push('--sources', ...body.sources)
    }
    
    // Execute incremental sync
    const child = spawn('python', args, {
      cwd: process.cwd(),
      detached: true,
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
    
    // Wait for completion with timeout
    const result = await new Promise((resolve) => {
      const timeout = setTimeout(() => {
        child.kill()
        resolve({
          success: false,
          error: 'Sync operation timed out',
          timeout: true
        })
      }, 300000) // 5 minute timeout
      
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
    
    const syncResult = result as any
    
    if (syncResult.success) {
      // Try to parse output as JSON
      let syncStats = null
      try {
        const jsonMatch = syncResult.output.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          syncStats = JSON.parse(jsonMatch[0])
        }
      } catch (e) {
        // Output wasn't JSON, that's okay
      }
      
      return NextResponse.json({
        success: true,
        message: 'Incremental sync completed successfully',
        sync_stats: syncStats,
        raw_output: syncResult.output,
        execution_time: new Date().toISOString()
      })
    } else {
      return NextResponse.json({
        success: false,
        error: syncResult.error || 'Sync operation failed',
        exit_code: syncResult.exit_code,
        raw_output: syncResult.output,
        timeout: syncResult.timeout || false
      }, { status: 500 })
    }
    
  } catch (error) {
    console.error('Error running incremental sync:', error)
    return NextResponse.json({ 
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function GET() {
  try {
    // Get sync status
    const child = spawn('python', [
      'data_pipeline/utils/incremental_updater.py', '--status'
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
        resolve({ success: false, error: 'Status check timed out' })
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
      // Parse JSON output
      try {
        const status = JSON.parse(statusResult.output)
        
        return NextResponse.json({
          timestamp: new Date().toISOString(),
          incremental_sync: status,
          capabilities: {
            supported_sources: ['namus', 'florida_fdle'],
            operations: ['insert', 'update', 'skip', 'delete'],
            features: [
              'Delta synchronization',
              'Priority-based processing',
              'Confidence scoring',
              'Batch processing',
              'Change detection'
            ]
          },
          recommendations: generateSyncRecommendations(status)
        })
      } catch (e) {
        return NextResponse.json({
          error: 'Failed to parse status output',
          raw_output: statusResult.output
        }, { status: 500 })
      }
    } else {
      return NextResponse.json({
        error: 'Failed to get sync status',
        details: statusResult.error
      }, { status: 500 })
    }
    
  } catch (error) {
    console.error('Error getting sync status:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

function generateSyncRecommendations(status: any): any[] {
  const recommendations = []
  
  if (status.pending_operations > 100) {
    recommendations.push({
      type: 'performance',
      priority: 'medium',
      message: `${status.pending_operations} operations pending. Consider processing queue.`,
      action: 'process_queue'
    })
  }
  
  if (status.source_sync_status) {
    for (const source of status.source_sync_status) {
      if (source.error_count > 5) {
        recommendations.push({
          type: 'reliability',
          priority: 'high',
          message: `Source ${source.source_name} has ${source.error_count} errors. Check configuration.`,
          action: 'check_source_config'
        })
      }
      
      const lastSync = new Date(source.last_sync_time)
      const hoursSinceSync = (Date.now() - lastSync.getTime()) / (1000 * 60 * 60)
      
      if (hoursSinceSync > 12) {
        recommendations.push({
          type: 'freshness',
          priority: 'medium',
          message: `Source ${source.source_name} hasn't synced in ${hoursSinceSync.toFixed(1)} hours.`,
          action: 'trigger_sync'
        })
      }
    }
  }
  
  const recentOps = status.recent_operations_24h || {}
  const totalRecentOps = Object.values(recentOps).reduce((a: any, b: any) => a + b, 0)
  
  if (totalRecentOps === 0) {
    recommendations.push({
      type: 'activity',
      priority: 'low',
      message: 'No sync operations in the last 24 hours. Consider running sync.',
      action: 'run_sync'
    })
  }
  
  return recommendations
}