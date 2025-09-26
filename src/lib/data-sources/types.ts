export interface DataSource {
  id: string
  name: string
  type: 'api' | 'rss' | 'scraper' | 'webhook'
  baseUrl: string
  apiKey?: string
  rateLimit: {
    requestsPerMinute: number
    burstLimit: number
  }
  schedule: {
    intervalMinutes: number
    priority: 'critical' | 'high' | 'medium' | 'low'
  }
  lastSync?: Date
  status: 'active' | 'inactive' | 'error' | 'rate_limited'
  errorCount: number
  metadata?: Record<string, any>
}

export interface DataSourceConfig {
  sources: DataSource[]
  globalSettings: {
    maxConcurrentSources: number
    retryAttempts: number
    retryDelayMs: number
    healthCheckIntervalMs: number
  }
}

export interface SyncResult {
  sourceId: string
  startTime: Date
  endTime: Date
  recordsProcessed: number
  recordsAdded: number
  recordsUpdated: number
  recordsSkipped: number
  errors: string[]
  success: boolean
}

export interface CollectedRecord {
  sourceId: string
  sourceRecordId: string
  recordType: 'missing_person' | 'amber_alert' | 'resolved_case'
  data: any
  collectedAt: Date
  hash: string // For duplicate detection
}

export interface DataSourceStatus {
  sourceId: string
  isHealthy: boolean
  lastSuccessfulSync: Date | null
  consecutiveErrors: number
  averageResponseTime: number
  lastError?: string
}