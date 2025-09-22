import { MissingPerson } from '@/types/missing-person'

export interface ClusterPoint {
  id: string
  latitude: number
  longitude: number
  weight: number
  riskLevel?: string
  category: string
  data: MissingPerson
}

export interface Cluster {
  id: string
  center: { latitude: number; longitude: number }
  points: ClusterPoint[]
  radius: number
  riskScore: number
  dominantCategory: string
  patterns: string[]
  insights: string[]
}

export interface ClusteringOptions {
  algorithm: 'density' | 'kmeans' | 'hierarchical' | 'risk-based'
  maxDistance: number // in kilometers
  minPoints: number
  riskWeighting: boolean
  timeWeighting: boolean
  categoryGrouping: boolean
}

export class AIClusteringService {
  
  /**
   * Main clustering function that routes to appropriate algorithm
   */
  static cluster(
    persons: MissingPerson[], 
    options: ClusteringOptions
  ): Cluster[] {
    const points = this.convertToClusterPoints(persons)
    
    switch (options.algorithm) {
      case 'density':
        return this.densityBasedClustering(points, options)
      case 'kmeans':
        return this.kMeansClustering(points, options)
      case 'hierarchical':
        return this.hierarchicalClustering(points, options)
      case 'risk-based':
        return this.riskBasedClustering(points, options)
      default:
        return this.densityBasedClustering(points, options)
    }
  }

  /**
   * Convert missing persons to cluster points
   */
  private static convertToClusterPoints(persons: MissingPerson[]): ClusterPoint[] {
    return persons
      .filter(p => p.latitude && p.longitude)
      .map(person => ({
        id: person.id.toString(),
        latitude: person.latitude!,
        longitude: person.longitude!,
        weight: this.calculatePointWeight(person),
        riskLevel: (person as any).riskLevel,
        category: person.category,
        data: person
      }))
  }

  /**
   * Calculate point weight based on various factors
   */
  private static calculatePointWeight(person: MissingPerson): number {
    let weight = 1

    // Age factor (children get higher weight)
    if (person.age && person.age < 18) weight += 2
    if (person.age && person.age > 65) weight += 1

    // Category factor
    if (person.category === 'Missing Children') weight += 2
    if (person.category === 'Missing Veterans') weight += 1

    // Risk level factor
    const riskLevel = (person as any).riskLevel
    if (riskLevel === 'Critical') weight += 3
    if (riskLevel === 'High') weight += 2
    if (riskLevel === 'Medium') weight += 1

    // Time factor (recent cases get higher weight)
    const reportedDate = new Date(person.reportedMissing)
    const daysSince = (Date.now() - reportedDate.getTime()) / (1000 * 60 * 60 * 24)
    if (daysSince < 7) weight += 2
    else if (daysSince < 30) weight += 1

    return weight
  }

  /**
   * Density-based clustering (DBSCAN-like)
   */
  private static densityBasedClustering(
    points: ClusterPoint[], 
    options: ClusteringOptions
  ): Cluster[] {
    const clusters: Cluster[] = []
    const visited = new Set<string>()
    const clustered = new Set<string>()

    for (const point of points) {
      if (visited.has(point.id)) continue
      visited.add(point.id)

      const neighbors = this.getNeighbors(point, points, options.maxDistance)
      
      if (neighbors.length < options.minPoints) continue

      // Create new cluster
      const cluster: Cluster = {
        id: `cluster-${clusters.length}`,
        center: { latitude: point.latitude, longitude: point.longitude },
        points: [point],
        radius: 0,
        riskScore: 0,
        dominantCategory: point.category,
        patterns: [],
        insights: []
      }

      clustered.add(point.id)
      
      // Expand cluster
      const queue = [...neighbors]
      while (queue.length > 0) {
        const neighbor = queue.shift()!
        if (!neighbor || clustered.has(neighbor.id)) continue

        if (!visited.has(neighbor.id)) {
          visited.add(neighbor.id)
          const neighborNeighbors = this.getNeighbors(neighbor, points, options.maxDistance)
          if (neighborNeighbors.length >= options.minPoints) {
            queue.push(...neighborNeighbors)
          }
        }

        if (!clustered.has(neighbor.id)) {
          cluster.points.push(neighbor)
          clustered.add(neighbor.id)
        }
      }

      if (cluster.points.length >= options.minPoints) {
        this.finalizeCluster(cluster)
        clusters.push(cluster)
      }
    }

    return clusters
  }

  /**
   * K-means clustering
   */
  private static kMeansClustering(
    points: ClusterPoint[], 
    options: ClusteringOptions
  ): Cluster[] {
    const k = Math.min(Math.ceil(points.length / 10), 20) // Dynamic k
    const clusters: Cluster[] = []
    
    // Initialize centroids randomly
    const centroids = this.initializeCentroids(points, k)
    
    let iterations = 0
    const maxIterations = 100
    let converged = false

    while (!converged && iterations < maxIterations) {
      // Assign points to nearest centroid
      const assignments = new Map<string, ClusterPoint[]>()
      
      for (const point of points) {
        let nearestCentroid = 0
        let minDistance = Infinity
        
        for (let i = 0; i < centroids.length; i++) {
          const distance = this.haversineDistance(
            point.latitude, point.longitude,
            centroids[i].latitude, centroids[i].longitude
          )
          if (distance < minDistance) {
            minDistance = distance
            nearestCentroid = i
          }
        }
        
        const centroidKey = `centroid-${nearestCentroid}`
        if (!assignments.has(centroidKey)) {
          assignments.set(centroidKey, [])
        }
        assignments.get(centroidKey)!.push(point)
      }

      // Update centroids
      converged = true
      for (let i = 0; i < centroids.length; i++) {
        const centroidKey = `centroid-${i}`
        const assignedPoints = assignments.get(centroidKey) || []
        
        if (assignedPoints.length > 0) {
          const newLat = assignedPoints.reduce((sum, p) => sum + p.latitude, 0) / assignedPoints.length
          const newLng = assignedPoints.reduce((sum, p) => sum + p.longitude, 0) / assignedPoints.length
          
          if (Math.abs(centroids[i].latitude - newLat) > 0.001 || 
              Math.abs(centroids[i].longitude - newLng) > 0.001) {
            converged = false
          }
          
          centroids[i] = { latitude: newLat, longitude: newLng }
        }
      }
      
      iterations++
    }

    // Create final clusters
    for (let i = 0; i < centroids.length; i++) {
      const centroidKey = `centroid-${i}`
      const assignedPoints = points.filter(point => {
        let nearestCentroid = 0
        let minDistance = Infinity
        
        for (let j = 0; j < centroids.length; j++) {
          const distance = this.haversineDistance(
            point.latitude, point.longitude,
            centroids[j].latitude, centroids[j].longitude
          )
          if (distance < minDistance) {
            minDistance = distance
            nearestCentroid = j
          }
        }
        
        return nearestCentroid === i
      })

      if (assignedPoints.length >= options.minPoints) {
        const cluster: Cluster = {
          id: `kmeans-cluster-${i}`,
          center: centroids[i],
          points: assignedPoints,
          radius: 0,
          riskScore: 0,
          dominantCategory: '',
          patterns: [],
          insights: []
        }
        
        this.finalizeCluster(cluster)
        clusters.push(cluster)
      }
    }

    return clusters
  }

  /**
   * Risk-based clustering prioritizing high-risk cases
   */
  private static riskBasedClustering(
    points: ClusterPoint[], 
    options: ClusteringOptions
  ): Cluster[] {
    // Sort points by risk/weight (highest first)
    const sortedPoints = [...points].sort((a, b) => b.weight - a.weight)
    const clusters: Cluster[] = []
    const clustered = new Set<string>()

    for (const point of sortedPoints) {
      if (clustered.has(point.id)) continue

      // Find nearby high-risk points
      const nearbyPoints = this.getNeighbors(point, points, options.maxDistance)
        .filter(p => !clustered.has(p.id))
        .sort((a, b) => b.weight - a.weight)

      if (nearbyPoints.length >= options.minPoints - 1) { // -1 because we include the center point
        const cluster: Cluster = {
          id: `risk-cluster-${clusters.length}`,
          center: { latitude: point.latitude, longitude: point.longitude },
          points: [point, ...nearbyPoints.slice(0, 20)], // Limit cluster size
          radius: 0,
          riskScore: 0,
          dominantCategory: point.category,
          patterns: [],
          insights: []
        }

        cluster.points.forEach(p => clustered.add(p.id))
        this.finalizeCluster(cluster)
        clusters.push(cluster)
      }
    }

    return clusters
  }

  /**
   * Hierarchical clustering
   */
  private static hierarchicalClustering(
    points: ClusterPoint[], 
    options: ClusteringOptions
  ): Cluster[] {
    // Start with each point as its own cluster
    let clusters: Cluster[] = points.map((point, index) => ({
      id: `hier-cluster-${index}`,
      center: { latitude: point.latitude, longitude: point.longitude },
      points: [point],
      radius: 0,
      riskScore: point.weight,
      dominantCategory: point.category,
      patterns: [],
      insights: []
    }))

    // Merge closest clusters until distance threshold is reached
    while (clusters.length > 1) {
      let minDistance = Infinity
      let mergeIndexes = [-1, -1]

      // Find closest cluster pair
      for (let i = 0; i < clusters.length; i++) {
        for (let j = i + 1; j < clusters.length; j++) {
          const distance = this.haversineDistance(
            clusters[i].center.latitude, clusters[i].center.longitude,
            clusters[j].center.latitude, clusters[j].center.longitude
          )
          
          if (distance < minDistance) {
            minDistance = distance
            mergeIndexes = [i, j]
          }
        }
      }

      // Break if minimum distance exceeds threshold
      if (minDistance > options.maxDistance) break

      // Merge the two closest clusters
      const [i, j] = mergeIndexes
      const mergedCluster: Cluster = {
        id: `merged-${clusters[i].id}-${clusters[j].id}`,
        center: {
          latitude: (clusters[i].center.latitude + clusters[j].center.latitude) / 2,
          longitude: (clusters[i].center.longitude + clusters[j].center.longitude) / 2
        },
        points: [...clusters[i].points, ...clusters[j].points],
        radius: 0,
        riskScore: 0,
        dominantCategory: '',
        patterns: [],
        insights: []
      }

      this.finalizeCluster(mergedCluster)
      
      // Remove merged clusters and add new one
      clusters = clusters.filter((_, index) => index !== i && index !== j)
      clusters.push(mergedCluster)
    }

    return clusters.filter(c => c.points.length >= options.minPoints)
  }

  /**
   * Get neighboring points within distance
   */
  private static getNeighbors(
    point: ClusterPoint, 
    allPoints: ClusterPoint[], 
    maxDistance: number
  ): ClusterPoint[] {
    return allPoints.filter(other => {
      if (other.id === point.id) return false
      const distance = this.haversineDistance(
        point.latitude, point.longitude,
        other.latitude, other.longitude
      )
      return distance <= maxDistance
    })
  }

  /**
   * Initialize centroids for k-means
   */
  private static initializeCentroids(
    points: ClusterPoint[], 
    k: number
  ): { latitude: number; longitude: number }[] {
    const centroids = []
    const usedPoints = new Set<string>()

    // Use k-means++ initialization
    if (points.length > 0) {
      // First centroid: random point
      const firstPoint = points[Math.floor(Math.random() * points.length)]
      centroids.push({ latitude: firstPoint.latitude, longitude: firstPoint.longitude })
      usedPoints.add(firstPoint.id)

      // Subsequent centroids: choose points far from existing centroids
      for (let i = 1; i < k && i < points.length; i++) {
        let maxMinDistance = 0
        let bestPoint = points[0]

        for (const point of points) {
          if (usedPoints.has(point.id)) continue

          let minDistanceToCentroids = Infinity
          for (const centroid of centroids) {
            const distance = this.haversineDistance(
              point.latitude, point.longitude,
              centroid.latitude, centroid.longitude
            )
            minDistanceToCentroids = Math.min(minDistanceToCentroids, distance)
          }

          if (minDistanceToCentroids > maxMinDistance) {
            maxMinDistance = minDistanceToCentroids
            bestPoint = point
          }
        }

        centroids.push({ latitude: bestPoint.latitude, longitude: bestPoint.longitude })
        usedPoints.add(bestPoint.id)
      }
    }

    return centroids
  }

  /**
   * Finalize cluster by calculating center, radius, risk score, and insights
   */
  private static finalizeCluster(cluster: Cluster): void {
    if (cluster.points.length === 0) return

    // Calculate center (weighted by point weight)
    const totalWeight = cluster.points.reduce((sum, p) => sum + p.weight, 0)
    cluster.center.latitude = cluster.points.reduce((sum, p) => sum + (p.latitude * p.weight), 0) / totalWeight
    cluster.center.longitude = cluster.points.reduce((sum, p) => sum + (p.longitude * p.weight), 0) / totalWeight

    // Calculate radius (maximum distance from center)
    cluster.radius = Math.max(...cluster.points.map(p => 
      this.haversineDistance(
        cluster.center.latitude, cluster.center.longitude,
        p.latitude, p.longitude
      )
    ))

    // Calculate risk score (average weighted risk)
    cluster.riskScore = cluster.points.reduce((sum, p) => sum + p.weight, 0) / cluster.points.length

    // Determine dominant category
    const categoryCount = new Map<string, number>()
    cluster.points.forEach(p => {
      categoryCount.set(p.category, (categoryCount.get(p.category) || 0) + 1)
    })
    cluster.dominantCategory = Array.from(categoryCount.entries())
      .reduce((a, b) => a[1] > b[1] ? a : b)[0]

    // Generate patterns and insights
    cluster.patterns = this.generatePatterns(cluster)
    cluster.insights = this.generateInsights(cluster)
  }

  /**
   * Generate pattern descriptions for cluster
   */
  private static generatePatterns(cluster: Cluster): string[] {
    const patterns: string[] = []
    
    // Age patterns
    const ages = cluster.points.map(p => p.data.age).filter(Boolean)
    if (ages.length > 0) {
      const avgAge = ages.reduce((sum: number, age: number | undefined) => sum + (age || 0), 0) / ages.length
      if (avgAge < 18) patterns.push('Youth concentration')
      else if (avgAge > 65) patterns.push('Elderly concentration')
    }

    // Time patterns
    const dates = cluster.points.map(p => new Date(p.data.reportedMissing))
    const daysSinceOldest = (Date.now() - Math.min(...dates.map(d => d.getTime()))) / (1000 * 60 * 60 * 24)
    const daysSinceNewest = (Date.now() - Math.max(...dates.map(d => d.getTime()))) / (1000 * 60 * 60 * 24)
    
    if (daysSinceNewest < 7) patterns.push('Recent activity')
    if (daysSinceOldest - daysSinceNewest < 30) patterns.push('Temporal clustering')

    // Category patterns
    if (cluster.dominantCategory === 'Missing Children' && cluster.points.length > 3) {
      patterns.push('High-risk area for children')
    }

    return patterns
  }

  /**
   * Generate insights for cluster
   */
  private static generateInsights(cluster: Cluster): string[] {
    const insights: string[] = []
    
    if (cluster.riskScore > 2) {
      insights.push('High-priority area requiring immediate attention')
    }
    
    if (cluster.points.length > 10) {
      insights.push('Significant case concentration - possible pattern')
    }

    const childrenCount = cluster.points.filter(p => p.data.category === 'Missing Children').length
    if (childrenCount > cluster.points.length * 0.6) {
      insights.push('Children safety hotspot - increased patrol recommended')
    }

    const recentCount = cluster.points.filter(p => {
      const daysSince = (Date.now() - new Date(p.data.reportedMissing).getTime()) / (1000 * 60 * 60 * 24)
      return daysSince < 30
    }).length
    
    if (recentCount > cluster.points.length * 0.5) {
      insights.push('Recent activity surge - investigate common factors')
    }

    return insights
  }

  /**
   * Calculate distance between two points using Haversine formula
   */
  private static haversineDistance(
    lat1: number, lon1: number, 
    lat2: number, lon2: number
  ): number {
    const R = 6371 // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLon = (lon2 - lon1) * Math.PI / 180
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
  }
}