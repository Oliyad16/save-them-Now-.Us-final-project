import { dataSourceManager } from '../data-sources/DataSourceManager'
import { changeDetectionService, ChangeEvent } from '../data-processing/ChangeDetectionService'
import { realtimeService } from '../realtime/RealtimeService'
import { adminDb } from '@/lib/firebase/admin'
import * as cron from 'node-cron'

export interface ScheduledTask {
  id: string
  name: string
  type: 'data_collection' | 'change_detection' | 'cleanup' | 'health_check' | 'custom'
  schedule: string // Cron expression
  priority: 'critical' | 'high' | 'medium' | 'low'
  enabled: boolean
  lastRun?: Date
  nextRun?: Date
  runCount: number
  errorCount: number
  averageRunTimeMs: number
  metadata?: Record<string, any>
}

export interface TaskExecution {
  id: string
  taskId: string
  startTime: Date
  endTime?: Date
  status: 'running' | 'completed' | 'failed' | 'timeout'
  result?: any
  error?: string
  durationMs?: number
}

export class TaskScheduler {
  private tasks: Map<string, ScheduledTask> = new Map()
  private cronJobs: Map<string, cron.ScheduledTask> = new Map()
  private runningExecutions: Map<string, TaskExecution> = new Map()
  private isInitialized = false

  async initialize(): Promise<void> {
    if (this.isInitialized) return

    console.log('⏰ Initializing Task Scheduler...')

    // Load existing tasks from database
    await this.loadTasksFromDatabase()

    // Register default tasks
    this.registerDefaultTasks()

    // Start all enabled tasks
    this.startAllEnabledTasks()

    // Start maintenance tasks
    this.startMaintenanceTasks()

    this.isInitialized = true
    console.log(`✅ Task Scheduler initialized with ${this.tasks.size} tasks`)
  }

  private async loadTasksFromDatabase(): Promise<void> {
    if (!adminDb) return

    try {
      const snapshot = await adminDb.collection('scheduled_tasks').get()
      
      snapshot.docs.forEach(doc => {
        const data = doc.data() as ScheduledTask
        this.tasks.set(data.id, data)
      })

      console.log(`📂 Loaded ${snapshot.size} tasks from database`)
    } catch (error) {
      console.warn('Warning loading tasks from database:', error)
    }
  }

  private registerDefaultTasks(): void {
    const defaultTasks: Omit<ScheduledTask, 'runCount' | 'errorCount' | 'averageRunTimeMs'>[] = [
      {
        id: 'amber_alerts_critical',
        name: 'AMBER Alert Collection (Critical)',
        type: 'data_collection',
        schedule: '*/5 * * * *', // Every 5 minutes
        priority: 'critical',
        enabled: process.env.DATA_COLLECTION_ENABLED !== 'false',
        metadata: { sourceType: 'amber_alerts', immediate: true }
      },
      {
        id: 'namus_collection',
        name: 'NamUs Data Collection',
        type: 'data_collection',
        schedule: '0 */30 * * * *', // Every 30 minutes
        priority: 'high',
        enabled: process.env.DATA_COLLECTION_ENABLED !== 'false',
        metadata: { sourceType: 'namus' }
      },
      {
        id: 'ncmec_collection',
        name: 'NCMEC Data Collection',
        type: 'data_collection',
        schedule: '0 0 */4 * * *', // Every 4 hours
        priority: 'medium',
        enabled: process.env.DATA_COLLECTION_ENABLED !== 'false',
        metadata: { sourceType: 'ncmec' }
      },
      {
        id: 'state_florida_collection',
        name: 'Florida FDLE Collection',
        type: 'data_collection',
        schedule: '0 0 */2 * * *', // Every 2 hours
        priority: 'medium',
        enabled: process.env.DATA_COLLECTION_ENABLED !== 'false',
        metadata: { sourceType: 'florida_fdle' }
      },
      {
        id: 'change_detection',
        name: 'Change Detection Processing',
        type: 'change_detection',
        schedule: '*/10 * * * *', // Every 10 minutes
        priority: 'high',
        enabled: true
      },
      {
        id: 'health_check',
        name: 'System Health Check',
        type: 'health_check',
        schedule: '*/15 * * * *', // Every 15 minutes
        priority: 'medium',
        enabled: true
      },
      {
        id: 'daily_cleanup',
        name: 'Daily Data Cleanup',
        type: 'cleanup',
        schedule: '0 2 * * *', // Daily at 2 AM
        priority: 'low',
        enabled: true,
        metadata: { cleanupType: 'daily' }
      },
      {
        id: 'weekly_analytics',
        name: 'Weekly Analytics Generation',
        type: 'custom',
        schedule: '0 3 * * 0', // Weekly on Sunday at 3 AM
        priority: 'low',
        enabled: true,
        metadata: { type: 'analytics' }
      }
    ]

    for (const taskData of defaultTasks) {
      const existingTask = this.tasks.get(taskData.id)
      
      if (!existingTask) {
        const task: ScheduledTask = {
          ...taskData,
          runCount: 0,
          errorCount: 0,
          averageRunTimeMs: 0,
          nextRun: this.calculateNextRun(taskData.schedule)
        }
        
        this.tasks.set(task.id, task)
      }
    }
  }

  private startAllEnabledTasks(): void {
    for (const task of this.tasks.values()) {
      if (task.enabled) {
        this.startTask(task.id)
      }
    }
  }

  private startTask(taskId: string): void {
    const task = this.tasks.get(taskId)
    if (!task || !task.enabled) return

    // Stop existing job if running
    this.stopTask(taskId)

    try {
      const cronJob = cron.schedule(task.schedule, async () => {
        await this.executeTask(taskId)
      }, {
        timezone: 'UTC'
      })

      this.cronJobs.set(taskId, cronJob)
      
      // Update next run time
      task.nextRun = this.calculateNextRun(task.schedule)
      
      console.log(`⏰ Started task: ${task.name} (${task.schedule})`)
    } catch (error) {
      console.error(`❌ Failed to start task ${taskId}:`, error)
    }
  }

  private stopTask(taskId: string): void {
    const cronJob = this.cronJobs.get(taskId)
    if (cronJob) {
      cronJob.stop()
      cronJob.destroy()
      this.cronJobs.delete(taskId)
      
      const task = this.tasks.get(taskId)
      if (task) {
        console.log(`⏸️ Stopped task: ${task.name}`)
      }
    }
  }

  private async executeTask(taskId: string): Promise<void> {
    const task = this.tasks.get(taskId)
    if (!task) return

    const execution: TaskExecution = {
      id: `exec_${taskId}_${Date.now()}`,
      taskId,
      startTime: new Date(),
      status: 'running'
    }

    this.runningExecutions.set(execution.id, execution)
    task.lastRun = execution.startTime
    task.nextRun = this.calculateNextRun(task.schedule)

    console.log(`🚀 Executing task: ${task.name}`)

    try {
      const result = await this.runTaskByType(task)
      
      execution.endTime = new Date()
      execution.status = 'completed'
      execution.result = result
      execution.durationMs = execution.endTime.getTime() - execution.startTime.getTime()

      // Update task statistics
      task.runCount++
      task.averageRunTimeMs = (task.averageRunTimeMs * (task.runCount - 1) + execution.durationMs) / task.runCount

      console.log(`✅ Task completed: ${task.name} (${execution.durationMs}ms)`)

    } catch (error) {
      execution.endTime = new Date()
      execution.status = 'failed'
      execution.error = error instanceof Error ? error.message : String(error)
      execution.durationMs = execution.endTime.getTime() - execution.startTime.getTime()

      task.errorCount++
      
      console.error(`❌ Task failed: ${task.name} - ${execution.error}`)

      // Disable task if too many consecutive errors
      if (task.errorCount > 5) {
        task.enabled = false
        this.stopTask(taskId)
        console.error(`🛑 Disabled task due to repeated failures: ${task.name}`)
      }
    } finally {
      this.runningExecutions.delete(execution.id)
      await this.saveTaskExecution(execution)
      await this.saveTask(task)
    }
  }

  private async runTaskByType(task: ScheduledTask): Promise<any> {
    switch (task.type) {
      case 'data_collection':
        return await this.runDataCollection(task)
      
      case 'change_detection':
        return await this.runChangeDetection(task)
      
      case 'health_check':
        return await this.runHealthCheck(task)
      
      case 'cleanup':
        return await this.runCleanup(task)
      
      case 'custom':
        return await this.runCustomTask(task)
      
      default:
        throw new Error(`Unknown task type: ${task.type}`)
    }
  }

  private async runDataCollection(task: ScheduledTask): Promise<any> {
    const sourceType = task.metadata?.sourceType
    
    if (sourceType === 'amber_alerts') {
      // Special handling for AMBER alerts
      const result = await dataSourceManager.triggerManualSync('amber_alerts')
      
      // If new AMBER alerts found, trigger immediate change detection
      if (result.recordsAdded > 0) {
        console.log(`🚨 ${result.recordsAdded} new AMBER alerts - triggering immediate processing`)
        await this.runChangeDetection(task)
      }
      
      return result
    } else if (sourceType) {
      return await dataSourceManager.triggerManualSync(sourceType)
    } else {
      // Run all active sources
      const activeSources = dataSourceManager.getActiveSources()
      const results = []
      
      for (const source of activeSources) {
        try {
          const result = await dataSourceManager.triggerManualSync(source.id)
          results.push(result)
        } catch (error) {
          console.warn(`Warning in source ${source.id}:`, error)
        }
      }
      
      return { sources: results }
    }
  }

  private async runChangeDetection(task: ScheduledTask): Promise<any> {
    const changes = await changeDetectionService.processCollectedRecords()
    
    // Broadcast critical changes immediately
    const criticalChanges = changes.filter(c => c.priority === 'critical')
    for (const change of criticalChanges) {
      await realtimeService.broadcastUpdate(change)
    }

    // Batch broadcast other changes
    const otherChanges = changes.filter(c => c.priority !== 'critical')
    for (const change of otherChanges) {
      await realtimeService.broadcastUpdate(change)
    }

    return {
      totalChanges: changes.length,
      criticalChanges: criticalChanges.length,
      changesByType: this.groupChangesByType(changes)
    }
  }

  private groupChangesByType(changes: ChangeEvent[]): Record<string, number> {
    const groups: Record<string, number> = {}
    
    for (const change of changes) {
      groups[change.type] = (groups[change.type] || 0) + 1
    }
    
    return groups
  }

  private async runHealthCheck(task: ScheduledTask): Promise<any> {
    const health = {
      timestamp: new Date(),
      dataSourceManager: {
        activeSources: dataSourceManager.getActiveSources().length,
        status: dataSourceManager.getAllStatus()
      },
      realtimeService: {
        connections: realtimeService.getConnectionStats()
      },
      scheduler: {
        tasksRunning: this.runningExecutions.size,
        totalTasks: this.tasks.size,
        enabledTasks: Array.from(this.tasks.values()).filter(t => t.enabled).length
      },
      processingStats: await changeDetectionService.getProcessingStats()
    }

    // Alert on critical issues
    const issues = this.analyzeHealthIssues(health)
    if (issues.length > 0) {
      console.warn('⚠️ Health check detected issues:', issues)
    }

    return health
  }

  private analyzeHealthIssues(health: any): string[] {
    const issues: string[] = []

    // Check data source health
    const unhealthySources = health.dataSourceManager.status.filter((s: any) => !s.isHealthy)
    if (unhealthySources.length > 0) {
      issues.push(`${unhealthySources.length} data sources are unhealthy`)
    }

    // Check for stalled processing
    if (health.processingStats && health.processingStats.pending > 100) {
      issues.push(`${health.processingStats.pending} records pending processing`)
    }

    // Check for excessive failed executions
    const failedTasks = Array.from(this.tasks.values()).filter(t => t.errorCount > 3)
    if (failedTasks.length > 0) {
      issues.push(`${failedTasks.length} tasks have multiple failures`)
    }

    return issues
  }

  private async runCleanup(task: ScheduledTask): Promise<any> {
    const results = {
      collectedRecords: 0,
      realtimeUpdates: 0,
      taskExecutions: 0,
      subscriptions: 0
    }

    if (!adminDb) return results

    try {
      const cutoffDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // 7 days ago

      // Clean up old collected records
      let snapshot = await adminDb.collection('collected_records')
        .where('status', '==', 'processed')
        .where('processedAt', '<', cutoffDate)
        .limit(100)
        .get()

      if (!snapshot.empty) {
        const batch = adminDb.batch()
        snapshot.docs.forEach(doc => batch.delete(doc.ref))
        await batch.commit()
        results.collectedRecords = snapshot.size
      }

      // Clean up old task executions
      snapshot = await adminDb.collection('task_executions')
        .where('startTime', '<', cutoffDate)
        .limit(100)
        .get()

      if (!snapshot.empty) {
        const batch = adminDb.batch()
        snapshot.docs.forEach(doc => batch.delete(doc.ref))
        await batch.commit()
        results.taskExecutions = snapshot.size
      }

      // Clean up old realtime subscriptions
      snapshot = await adminDb.collection('realtime_subscriptions')
        .where('lastActivity', '<', cutoffDate)
        .limit(100)
        .get()

      if (!snapshot.empty) {
        const batch = adminDb.batch()
        snapshot.docs.forEach(doc => batch.delete(doc.ref))
        await batch.commit()
        results.subscriptions = snapshot.size
      }

      console.log(`🧹 Cleanup completed:`, results)
      return results

    } catch (error) {
      console.error('❌ Cleanup failed:', error)
      throw error
    }
  }

  private async runCustomTask(task: ScheduledTask): Promise<any> {
    const customType = task.metadata?.type

    switch (customType) {
      case 'analytics':
        return await this.generateAnalytics()
      
      default:
        throw new Error(`Unknown custom task type: ${customType}`)
    }
  }

  private async generateAnalytics(): Promise<any> {
    // Generate weekly analytics
    const analytics = {
      period: 'weekly',
      generatedAt: new Date(),
      stats: {
        newCases: 0,
        resolvedCases: 0,
        amberAlerts: 0,
        dataSourceStats: dataSourceManager.getAllStatus()
      }
    }

    // In a real implementation, you'd calculate actual statistics
    console.log('📊 Generated analytics:', analytics)
    return analytics
  }

  private calculateNextRun(schedule: string): Date {
    try {
      // Use a cron parser library in real implementation
      // For now, return approximate next run
      const now = new Date()
      return new Date(now.getTime() + 60 * 60 * 1000) // 1 hour from now
    } catch (error) {
      return new Date(Date.now() + 60 * 60 * 1000)
    }
  }

  private startMaintenanceTasks(): void {
    // Clean up completed executions every hour
    setInterval(() => {
      this.cleanupCompletedExecutions()
    }, 60 * 60 * 1000)

    // Save all task states every 10 minutes
    setInterval(() => {
      this.saveAllTasks()
    }, 10 * 60 * 1000)
  }

  private cleanupCompletedExecutions(): void {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000) // 24 hours ago
    
    for (const [id, execution] of this.runningExecutions) {
      if (execution.endTime && execution.endTime < cutoff) {
        this.runningExecutions.delete(id)
      }
    }
  }

  private async saveAllTasks(): Promise<void> {
    for (const task of this.tasks.values()) {
      await this.saveTask(task)
    }
  }

  private async saveTask(task: ScheduledTask): Promise<void> {
    if (!adminDb) return

    try {
      await adminDb.collection('scheduled_tasks').doc(task.id).set(task)
    } catch (error) {
      console.warn(`Warning saving task ${task.id}:`, error)
    }
  }

  private async saveTaskExecution(execution: TaskExecution): Promise<void> {
    if (!adminDb) return

    try {
      await adminDb.collection('task_executions').add(execution)
    } catch (error) {
      console.warn(`Warning saving execution ${execution.id}:`, error)
    }
  }

  // Public API methods
  async addTask(taskData: Omit<ScheduledTask, 'runCount' | 'errorCount' | 'averageRunTimeMs'>): Promise<void> {
    const task: ScheduledTask = {
      ...taskData,
      runCount: 0,
      errorCount: 0,
      averageRunTimeMs: 0,
      nextRun: this.calculateNextRun(taskData.schedule)
    }

    this.tasks.set(task.id, task)
    await this.saveTask(task)

    if (task.enabled) {
      this.startTask(task.id)
    }

    console.log(`➕ Added task: ${task.name}`)
  }

  async updateTask(taskId: string, updates: Partial<ScheduledTask>): Promise<void> {
    const task = this.tasks.get(taskId)
    if (!task) throw new Error(`Task not found: ${taskId}`)

    const wasEnabled = task.enabled
    Object.assign(task, updates)

    if ('schedule' in updates) {
      task.nextRun = this.calculateNextRun(task.schedule)
    }

    await this.saveTask(task)

    // Restart task if schedule or enabled status changed
    if (updates.schedule || updates.enabled !== undefined) {
      if (wasEnabled) this.stopTask(taskId)
      if (task.enabled) this.startTask(taskId)
    }

    console.log(`📝 Updated task: ${task.name}`)
  }

  async deleteTask(taskId: string): Promise<void> {
    const task = this.tasks.get(taskId)
    if (!task) return

    this.stopTask(taskId)
    this.tasks.delete(taskId)

    if (adminDb) {
      try {
        await adminDb.collection('scheduled_tasks').doc(taskId).delete()
      } catch (error) {
        console.warn(`Warning deleting task ${taskId}:`, error)
      }
    }

    console.log(`🗑️ Deleted task: ${task.name}`)
  }

  getTasks(): ScheduledTask[] {
    return Array.from(this.tasks.values())
  }

  getTask(taskId: string): ScheduledTask | undefined {
    return this.tasks.get(taskId)
  }

  getRunningExecutions(): TaskExecution[] {
    return Array.from(this.runningExecutions.values())
  }

  async triggerTask(taskId: string): Promise<TaskExecution> {
    const task = this.tasks.get(taskId)
    if (!task) throw new Error(`Task not found: ${taskId}`)

    console.log(`🎯 Manually triggering task: ${task.name}`)
    await this.executeTask(taskId)
    
    // Return the most recent execution
    const executions = Array.from(this.runningExecutions.values())
      .filter(e => e.taskId === taskId)
      .sort((a, b) => b.startTime.getTime() - a.startTime.getTime())

    return executions[0]
  }

  async shutdown(): Promise<void> {
    console.log('🛑 Shutting down Task Scheduler...')

    // Stop all cron jobs
    for (const [taskId, cronJob] of this.cronJobs) {
      cronJob.stop()
      cronJob.destroy()
    }

    // Wait for running executions to complete (with timeout)
    const timeout = new Promise(resolve => setTimeout(resolve, 30000)) // 30 seconds
    const executions = Array.from(this.runningExecutions.values())
      .filter(e => e.status === 'running')

    if (executions.length > 0) {
      console.log(`⏳ Waiting for ${executions.length} running tasks to complete...`)
      
      await Promise.race([
        Promise.all(executions.map(e => this.waitForExecution(e.id))),
        timeout
      ])
    }

    // Save final state
    await this.saveAllTasks()

    this.tasks.clear()
    this.cronJobs.clear()
    this.runningExecutions.clear()

    console.log('✅ Task Scheduler shutdown complete')
  }

  private async waitForExecution(executionId: string): Promise<void> {
    return new Promise((resolve) => {
      const checkComplete = () => {
        const execution = this.runningExecutions.get(executionId)
        if (!execution || execution.status !== 'running') {
          resolve()
        } else {
          setTimeout(checkComplete, 1000)
        }
      }
      checkComplete()
    })
  }
}

export const taskScheduler = new TaskScheduler()