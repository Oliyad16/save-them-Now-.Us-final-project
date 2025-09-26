'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { LoadingState } from '@/components/ui/LoadingState'

interface DataQualityMetrics {
  timestamp: Date
  totalRecords: number
  freshness: {
    lastUpdate: Date
    sourceUpdates: Array<{
      sourceId: string
      sourceName: string
      lastSync: Date
      status: 'healthy' | 'stale' | 'error'
      recordCount: number
    }>
  }
  validation: {
    totalValidated: number
    passed: number
    failed: number
    warnings: number
    confidence: {
      high: number // > 0.8
      medium: number // 0.5 - 0.8
      low: number // < 0.5
    }
    topIssues: Array<{
      field: string
      issueType: string
      count: number
      severity: 'error' | 'warning' | 'info'
    }>
  }
  duplicates: {
    potentialDuplicates: number
    highConfidenceDuplicates: number
    resolved: number
    pending: number
  }
  processing: {
    totalCollected: number
    pending: number
    processed: number
    failed: number
    averageProcessingTimeMs: number
  }
  realtime: {
    connectionsCount: number
    connectionsByTier: Record<string, number>
    updatesSentLast24h: number
    averageLatencyMs: number
  }
  coverage: {
    statesCovered: number
    citiesCovered: number
    categoryCoverage: Record<string, number>
    ageGroups: Record<string, number>
  }
}

interface HealthAlert {
  id: string
  severity: 'critical' | 'warning' | 'info'
  component: string
  message: string
  timestamp: Date
  acknowledged: boolean
  details?: any
}

export default function DataQualityDashboard() {
  const [metrics, setMetrics] = useState<DataQualityMetrics | null>(null)
  const [alerts, setAlerts] = useState<HealthAlert[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [selectedTimeRange, setSelectedTimeRange] = useState<'1h' | '24h' | '7d' | '30d'>('24h')

  const loadDashboardData = useCallback(async () => {
    try {
      const response = await fetch(`/api/admin/data-quality?range=${selectedTimeRange}`)
      const data = await response.json()
      
      setMetrics(data.metrics)
      setAlerts(data.alerts)
    } catch (error) {
      console.error('Failed to load dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }, [selectedTimeRange])

  const refreshDashboardData = useCallback(async () => {
    setRefreshing(true)
    try {
      await loadDashboardData()
    } finally {
      setRefreshing(false)
    }
  }, [loadDashboardData])

  useEffect(() => {
    loadDashboardData()
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      if (!refreshing) {
        refreshDashboardData()
      }
    }, 30000)

    return () => clearInterval(interval)
  }, [selectedTimeRange, loadDashboardData, refreshDashboardData, refreshing])

  const acknowledgeAlert = async (alertId: string) => {
    try {
      await fetch(`/api/admin/alerts/${alertId}/acknowledge`, { method: 'POST' })
      setAlerts(prev => prev.map(alert => 
        alert.id === alertId ? { ...alert, acknowledged: true } : alert
      ))
    } catch (error) {
      console.error('Failed to acknowledge alert:', error)
    }
  }

  const triggerManualSync = async (sourceId: string) => {
    try {
      await fetch('/api/admin/data-sources/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceId })
      })
      
      // Refresh data after sync
      setTimeout(() => refreshDashboardData(), 2000)
    } catch (error) {
      console.error('Failed to trigger manual sync:', error)
    }
  }

  if (loading) {
    return <LoadingState message="Loading dashboard data..." />
  }

  if (!metrics) {
    return (
      <div className="p-6">
        <div className="text-center text-red-500">
          Failed to load dashboard data. Please try again.
        </div>
      </div>
    )
  }

  const calculateHealthScore = (): number => {
    let score = 100
    
    // Penalize stale data sources
    const staleSources = metrics.freshness.sourceUpdates.filter(s => s.status !== 'healthy').length
    score -= staleSources * 10
    
    // Penalize validation failures
    const failureRate = metrics.validation.failed / metrics.validation.totalValidated
    score -= failureRate * 30
    
    // Penalize processing backlogs
    const pendingRate = metrics.processing.pending / metrics.processing.totalCollected
    score -= pendingRate * 20
    
    return Math.max(0, Math.round(score))
  }

  const healthScore = calculateHealthScore()
  const healthColor = healthScore >= 90 ? 'text-green-600' : 
                     healthScore >= 70 ? 'text-yellow-600' : 'text-red-600'

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Data Quality Dashboard</h1>
          <p className="text-gray-600 mt-1">
            Last updated: {new Date(metrics.timestamp).toLocaleString()}
            {refreshing && <span className="ml-2 text-blue-600">Refreshing...</span>}
          </p>
        </div>
        
        <div className="flex gap-4">
          <select 
            value={selectedTimeRange}
            onChange={(e) => setSelectedTimeRange(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-lg bg-white"
          >
            <option value="1h">Last Hour</option>
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
          </select>
          
          <Button 
            onClick={refreshDashboardData}
            disabled={refreshing}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>
      </div>

      {/* Health Score & Critical Alerts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>System Health Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-4xl font-bold ${healthColor}`}>
              {healthScore}%
            </div>
            <div className="text-sm text-gray-600 mt-2">
              {healthScore >= 90 ? '🟢 Excellent' : 
               healthScore >= 70 ? '🟡 Good' : '🔴 Needs Attention'}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Active Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {alerts.filter(a => !a.acknowledged).slice(0, 3).map(alert => (
                <div key={alert.id} className={`p-2 rounded text-sm ${
                  alert.severity === 'critical' ? 'bg-red-100 text-red-800' :
                  alert.severity === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-blue-100 text-blue-800'
                }`}>
                  <div className="flex justify-between items-start">
                    <span>{alert.message}</span>
                    <Button
                      size="sm"
                      onClick={() => acknowledgeAlert(alert.id)}
                      className="ml-2 text-xs"
                    >
                      ✓
                    </Button>
                  </div>
                </div>
              ))}
              {alerts.filter(a => !a.acknowledged).length === 0 && (
                <div className="text-green-600 text-sm">No active alerts</div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Real-time Connections</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {metrics.realtime.connectionsCount}
            </div>
            <div className="text-sm text-gray-600 mt-2">
              Active connections
            </div>
            <div className="mt-4 space-y-1 text-xs">
              {Object.entries(metrics.realtime.connectionsByTier).map(([tier, count]) => (
                <div key={tier} className="flex justify-between">
                  <span className="capitalize">{tier}:</span>
                  <span>{count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Data Freshness */}
      <Card>
        <CardHeader>
          <CardTitle>Data Source Health</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {metrics.freshness.sourceUpdates.map(source => {
              const minutesAgo = Math.round((Date.now() - new Date(source.lastSync).getTime()) / 60000)
              const statusColor = source.status === 'healthy' ? 'text-green-600' :
                                 source.status === 'stale' ? 'text-yellow-600' : 'text-red-600'
              
              return (
                <div key={source.sourceId} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-medium text-sm">{source.sourceName}</h3>
                    <span className={`text-xs ${statusColor}`}>
                      {source.status.toUpperCase()}
                    </span>
                  </div>
                  
                  <div className="text-xs text-gray-600 space-y-1">
                    <div>Last sync: {minutesAgo}m ago</div>
                    <div>Records: {source.recordCount.toLocaleString()}</div>
                  </div>
                  
                  <Button
                    size="sm"
                    onClick={() => triggerManualSync(source.sourceId)}
                    className="mt-3 w-full text-xs"
                    disabled={source.status === 'error'}
                  >
                    Manual Sync
                  </Button>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Data Quality Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Validation Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-green-600">
                    {metrics.validation.passed.toLocaleString()}
                  </div>
                  <div className="text-xs text-gray-600">Passed</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-yellow-600">
                    {metrics.validation.warnings.toLocaleString()}
                  </div>
                  <div className="text-xs text-gray-600">Warnings</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-red-600">
                    {metrics.validation.failed.toLocaleString()}
                  </div>
                  <div className="text-xs text-gray-600">Failed</div>
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-medium text-sm mb-3">Top Issues</h4>
                <div className="space-y-2">
                  {metrics.validation.topIssues.slice(0, 5).map((issue, index) => (
                    <div key={index} className="flex justify-between items-center text-sm">
                      <span className="text-gray-700">
                        {issue.field}: {issue.issueType}
                      </span>
                      <span className={`px-2 py-1 rounded text-xs ${
                        issue.severity === 'error' ? 'bg-red-100 text-red-800' :
                        issue.severity === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {issue.count}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Processing Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-blue-600">
                    {metrics.processing.pending.toLocaleString()}
                  </div>
                  <div className="text-xs text-gray-600">Pending</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-600">
                    {metrics.processing.processed.toLocaleString()}
                  </div>
                  <div className="text-xs text-gray-600">Processed</div>
                </div>
              </div>

              <div className="border-t pt-4">
                <div className="flex justify-between text-sm">
                  <span>Total Collected:</span>
                  <span>{metrics.processing.totalCollected.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Failed:</span>
                  <span className="text-red-600">{metrics.processing.failed.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Avg Processing Time:</span>
                  <span>{Math.round(metrics.processing.averageProcessingTimeMs)}ms</span>
                </div>
              </div>

              {metrics.processing.pending > 100 && (
                <div className="bg-yellow-100 border border-yellow-300 rounded p-3 text-sm text-yellow-800">
                  ⚠️ High pending count may indicate processing bottleneck
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Coverage Statistics */}
      <Card>
        <CardHeader>
          <CardTitle>Data Coverage</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div>
              <h4 className="font-medium text-sm mb-3">Geographic Coverage</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>States:</span>
                  <span>{metrics.coverage.statesCovered}/50</span>
                </div>
                <div className="flex justify-between">
                  <span>Cities:</span>
                  <span>{metrics.coverage.citiesCovered.toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-medium text-sm mb-3">Categories</h4>
              <div className="space-y-2 text-sm">
                {Object.entries(metrics.coverage.categoryCoverage).map(([category, count]) => (
                  <div key={category} className="flex justify-between">
                    <span>{category}:</span>
                    <span>{count.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h4 className="font-medium text-sm mb-3">Age Groups</h4>
              <div className="space-y-2 text-sm">
                {Object.entries(metrics.coverage.ageGroups).map(([group, count]) => (
                  <div key={group} className="flex justify-between">
                    <span>{group}:</span>
                    <span>{count.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h4 className="font-medium text-sm mb-3">Duplicates</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Potential:</span>
                  <span>{metrics.duplicates.potentialDuplicates}</span>
                </div>
                <div className="flex justify-between">
                  <span>High Confidence:</span>
                  <span className="text-red-600">{metrics.duplicates.highConfidenceDuplicates}</span>
                </div>
                <div className="flex justify-between">
                  <span>Resolved:</span>
                  <span className="text-green-600">{metrics.duplicates.resolved}</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* All Alerts */}
      {alerts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>All System Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {alerts.map(alert => (
                <div
                  key={alert.id}
                  className={`p-4 rounded-lg border ${
                    alert.acknowledged 
                      ? 'bg-gray-50 border-gray-200' 
                      : alert.severity === 'critical' 
                        ? 'bg-red-50 border-red-200' 
                        : alert.severity === 'warning'
                          ? 'bg-yellow-50 border-yellow-200'
                          : 'bg-blue-50 border-blue-200'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          alert.severity === 'critical' ? 'bg-red-600 text-white' :
                          alert.severity === 'warning' ? 'bg-yellow-600 text-white' :
                          'bg-blue-600 text-white'
                        }`}>
                          {alert.severity.toUpperCase()}
                        </span>
                        <span className="font-medium">{alert.component}</span>
                        <span className="text-xs text-gray-500">
                          {new Date(alert.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-gray-700">{alert.message}</p>
                    </div>
                    
                    {!alert.acknowledged && (
                      <Button
                        size="sm"
                        onClick={() => acknowledgeAlert(alert.id)}
                        className="ml-4"
                      >
                        Acknowledge
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}