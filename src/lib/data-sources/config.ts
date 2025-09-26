import { DataSourceConfig } from './types'

export const DATA_SOURCE_CONFIG: DataSourceConfig = {
  sources: [
    {
      id: 'namus',
      name: 'National Missing and Unidentified Persons System',
      type: 'api',
      baseUrl: 'https://www.namus.gov/api/CaseSets/NamUs/MissingPersons/Search',
      rateLimit: {
        requestsPerMinute: 30,
        burstLimit: 5
      },
      schedule: {
        intervalMinutes: 30,
        priority: 'high'
      },
      status: 'active',
      errorCount: 0,
      metadata: {
        searchParams: {
          take: 100,
          skip: 0
        },
        endpoints: {
          search: '/Search',
          details: '/Cases/{id}'
        }
      }
    },
    {
      id: 'ncmec',
      name: 'National Center for Missing & Exploited Children',
      type: 'rss',
      baseUrl: 'https://www.missingkids.org/gethelpnow/search',
      rateLimit: {
        requestsPerMinute: 15,
        burstLimit: 3
      },
      schedule: {
        intervalMinutes: 240, // 4 hours
        priority: 'medium'
      },
      status: 'active',
      errorCount: 0,
      metadata: {
        focusAreas: ['missing_children', 'age_progression']
      }
    },
    {
      id: 'amber_alerts',
      name: 'AMBER Alert Network (Weather Service)',
      type: 'rss',
      baseUrl: 'https://api.weather.gov/alerts',
      rateLimit: {
        requestsPerMinute: 60,
        burstLimit: 10
      },
      schedule: {
        intervalMinutes: 5, // Critical - check every 5 minutes
        priority: 'critical'
      },
      status: 'active',
      errorCount: 0,
      metadata: {
        feeds: [
          'https://api.weather.gov/alerts/active.atom?region_type=land',
          'https://api.weather.gov/alerts/active?event=Child%20Abduction%20Emergency'
        ],
        filterTypes: ['Child Abduction Emergency', 'AMBER Alert']
      }
    },
    {
      id: 'florida_fdle',
      name: 'Florida Department of Law Enforcement',
      type: 'scraper',
      baseUrl: 'https://www.fdle.state.fl.us/MissingPersons',
      rateLimit: {
        requestsPerMinute: 10,
        burstLimit: 2
      },
      schedule: {
        intervalMinutes: 120, // 2 hours
        priority: 'medium'
      },
      status: 'active',
      errorCount: 0,
      metadata: {
        selectors: {
          caseList: '.missing-person-case',
          personName: '.person-name',
          caseNumber: '.case-number'
        }
      }
    },
    {
      id: 'california_doj',
      name: 'California Department of Justice',
      type: 'scraper',
      baseUrl: 'https://oag.ca.gov/missing',
      rateLimit: {
        requestsPerMinute: 20,
        burstLimit: 4
      },
      schedule: {
        intervalMinutes: 180, // 3 hours
        priority: 'medium'
      },
      status: 'active',
      errorCount: 0,
      metadata: {
        endpoints: [
          '/missing-persons',
          '/missing',
          '/bureau/california-justice-information-services/missing-persons'
        ]
      }
    },
    {
      id: 'texas_dps',
      name: 'Texas Department of Public Safety',
      type: 'scraper',
      baseUrl: 'https://www.dps.texas.gov/internetforms/missingPerson',
      rateLimit: {
        requestsPerMinute: 12,
        burstLimit: 3
      },
      schedule: {
        intervalMinutes: 150, // 2.5 hours
        priority: 'medium'
      },
      status: 'active',
      errorCount: 0
    }
  ],
  globalSettings: {
    maxConcurrentSources: 3,
    retryAttempts: 3,
    retryDelayMs: 5000,
    healthCheckIntervalMs: 60000 // 1 minute
  }
}

// Environment-specific overrides
export function getDataSourceConfig(): DataSourceConfig {
  const config = { ...DATA_SOURCE_CONFIG }
  
  // Apply environment-specific settings
  if (process.env.NODE_ENV === 'development') {
    // Reduce frequency in development
    config.sources.forEach(source => {
      source.schedule.intervalMinutes *= 4
    })
  }
  
  if (process.env.DATA_COLLECTION_ENABLED === 'false') {
    config.sources.forEach(source => {
      source.status = 'inactive'
    })
  }
  
  // Apply custom intervals from environment
  const customInterval = process.env.COLLECTION_INTERVAL_MINUTES
  if (customInterval && !isNaN(parseInt(customInterval))) {
    const minutes = parseInt(customInterval)
    config.sources.forEach(source => {
      if (source.schedule.priority !== 'critical') {
        source.schedule.intervalMinutes = minutes
      }
    })
  }
  
  const amberInterval = process.env.AMBER_ALERT_INTERVAL_MINUTES
  if (amberInterval && !isNaN(parseInt(amberInterval))) {
    const amberSource = config.sources.find(s => s.id === 'amber_alerts')
    if (amberSource) {
      amberSource.schedule.intervalMinutes = parseInt(amberInterval)
    }
  }
  
  return config
}