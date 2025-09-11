'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, Button } from '@/components/ui'
import { TierGuard, UserTier } from '@/components/access'
import { cn } from '@/lib/utils'

export interface MapFilters {
  category: string
  status: string
  ageRange: [number, number]
  gender: string
  dateRange: [Date | null, Date | null]
  location: string
  radius: number
  ethnicity: string
  circumstances: string[]
  riskLevel: string
  timeSinceMissing: string
}

interface MapFiltersProps {
  filters: MapFilters
  onFiltersChange: (filters: MapFilters) => void
  currentTier: UserTier
  onUpgrade?: () => void
  className?: string
}

const basicFilters = ['category', 'status', 'location']
const premiumFilters = ['ageRange', 'gender', 'dateRange', 'radius']
const heroFilters = ['ethnicity', 'circumstances', 'riskLevel', 'timeSinceMissing']

const circumstanceOptions = [
  'Runaway',
  'Abduction',
  'Lost/Missing',
  'Mental Health Related',
  'Substance Abuse Related',
  'Domestic Violence Related',
  'Medical Emergency',
  'Alzheimer\'s/Dementia',
  'Other'
]

export function MapFilters({ 
  filters, 
  onFiltersChange, 
  currentTier, 
  onUpgrade,
  className 
}: MapFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [activeSection, setActiveSection] = useState<string | null>(null)

  const updateFilter = <K extends keyof MapFilters>(key: K, value: MapFilters[K]) => {
    onFiltersChange({ ...filters, [key]: value })
  }

  const FilterSection = ({ 
    title, 
    children, 
    requiredTier, 
    isOpen = false 
  }: { 
    title: string
    children: React.ReactNode
    requiredTier?: UserTier
    isOpen?: boolean 
  }) => {
    const hasAccess = !requiredTier || (currentTier !== 'anonymous' && 
      (requiredTier === 'basic' || 
       (requiredTier === 'premium' && ['premium', 'hero', 'champion'].includes(currentTier)) ||
       (requiredTier === 'hero' && ['hero', 'champion'].includes(currentTier))))

    return (
      <motion.div
        className="border-b border-mission-gray-700 last:border-b-0"
        initial={false}
      >
        <button
          className="w-full p-4 flex items-center justify-between text-left hover:bg-mission-gray-800/50 transition-colors"
          onClick={() => setActiveSection(activeSection === title ? null : title)}
        >
          <div className="flex items-center gap-3">
            <span className="font-medium text-white">{title}</span>
            {requiredTier && !hasAccess && (
              <span className={`px-2 py-1 text-xs rounded-full bg-tier-${requiredTier}/20 border border-tier-${requiredTier}/50 text-tier-${requiredTier}`}>
                {requiredTier}
              </span>
            )}
          </div>
          <motion.svg
            className="w-5 h-5 text-mission-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            animate={{ rotate: activeSection === title ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </motion.svg>
        </button>

        <AnimatePresence>
          {activeSection === title && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden"
            >
              <div className="p-4 pt-0">
                {hasAccess ? (
                  children
                ) : (
                  <TierGuard
                    currentTier={currentTier}
                    requiredTier={requiredTier!}
                    feature={`Advanced ${title}`}
                    description={`Unlock enhanced filtering options for ${title.toLowerCase()}`}
                    upgradeAction={onUpgrade}
                  >
                    <div />
                  </TierGuard>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    )
  }

  return (
    <Card className={cn('w-full max-w-sm', className)}>
      <CardContent className="p-0">
        {/* Header */}
        <div className="p-4 border-b border-mission-gray-700">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-white">Map Filters</h3>
            <div className="flex items-center gap-2">
              {/* Active filters count */}
              <span className="text-xs text-mission-gray-400">
                {Object.values(filters).filter(v => 
                  v && v !== '' && (Array.isArray(v) ? v.length > 0 : true)
                ).length} active
              </span>
              
              {/* Clear all button */}
              <Button
                variant="ghost"
                size="xs"
                onClick={() => onFiltersChange({
                  category: '',
                  status: '',
                  ageRange: [0, 100],
                  gender: '',
                  dateRange: [null, null],
                  location: '',
                  radius: 50,
                  ethnicity: '',
                  circumstances: [],
                  riskLevel: '',
                  timeSinceMissing: ''
                })}
              >
                Clear
              </Button>
            </div>
          </div>
        </div>

        {/* Basic Filters */}
        <FilterSection title="Basic Search">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-mission-gray-300 mb-2">
                Category
              </label>
              <select
                value={filters.category}
                onChange={(e) => updateFilter('category', e.target.value)}
                className="w-full px-3 py-2 bg-mission-gray-800 border border-mission-gray-700 text-white rounded-lg focus:ring-2 focus:ring-mission-primary focus:border-mission-primary"
              >
                <option value="">All Categories</option>
                <option value="Missing Adults">Missing Adults</option>
                <option value="Missing Children">Missing Children</option>
                <option value="Missing Veterans">Missing Veterans</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-mission-gray-300 mb-2">
                Status
              </label>
              <select
                value={filters.status}
                onChange={(e) => updateFilter('status', e.target.value)}
                className="w-full px-3 py-2 bg-mission-gray-800 border border-mission-gray-700 text-white rounded-lg focus:ring-2 focus:ring-mission-primary focus:border-mission-primary"
              >
                <option value="">All Status</option>
                <option value="Active">Active</option>
                <option value="Cold Case">Cold Case</option>
                <option value="Resolved">Resolved</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-mission-gray-300 mb-2">
                Location
              </label>
              <input
                type="text"
                value={filters.location}
                onChange={(e) => updateFilter('location', e.target.value)}
                placeholder="Enter city, state, or ZIP"
                className="w-full px-3 py-2 bg-mission-gray-800 border border-mission-gray-700 text-white rounded-lg focus:ring-2 focus:ring-mission-primary focus:border-mission-primary placeholder-mission-gray-500"
              />
            </div>
          </div>
        </FilterSection>

        {/* Premium Filters */}
        <FilterSection title="Advanced Search" requiredTier="premium">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-mission-gray-300 mb-2">
                Age Range: {filters.ageRange[0]} - {filters.ageRange[1]}
              </label>
              <div className="flex gap-2">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={filters.ageRange[0]}
                  onChange={(e) => updateFilter('ageRange', [Number(e.target.value), filters.ageRange[1]])}
                  className="flex-1"
                />
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={filters.ageRange[1]}
                  onChange={(e) => updateFilter('ageRange', [filters.ageRange[0], Number(e.target.value)])}
                  className="flex-1"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-mission-gray-300 mb-2">
                Gender
              </label>
              <select
                value={filters.gender}
                onChange={(e) => updateFilter('gender', e.target.value)}
                className="w-full px-3 py-2 bg-mission-gray-800 border border-mission-gray-700 text-white rounded-lg focus:ring-2 focus:ring-mission-primary focus:border-mission-primary"
              >
                <option value="">All Genders</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Non-binary">Non-binary</option>
                <option value="Unknown">Unknown</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-mission-gray-300 mb-2">
                Search Radius: {filters.radius} miles
              </label>
              <input
                type="range"
                min="1"
                max="500"
                value={filters.radius}
                onChange={(e) => updateFilter('radius', Number(e.target.value))}
                className="w-full"
              />
            </div>
          </div>
        </FilterSection>

        {/* Hero Filters */}
        <FilterSection title="Expert Analysis" requiredTier="hero">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-mission-gray-300 mb-2">
                Risk Level
              </label>
              <select
                value={filters.riskLevel}
                onChange={(e) => updateFilter('riskLevel', e.target.value)}
                className="w-full px-3 py-2 bg-mission-gray-800 border border-mission-gray-700 text-white rounded-lg focus:ring-2 focus:ring-mission-primary focus:border-mission-primary"
              >
                <option value="">All Risk Levels</option>
                <option value="Low">Low Risk</option>
                <option value="Medium">Medium Risk</option>
                <option value="High">High Risk</option>
                <option value="Critical">Critical</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-mission-gray-300 mb-2">
                Circumstances
              </label>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {circumstanceOptions.map((circumstance) => (
                  <label key={circumstance} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={filters.circumstances.includes(circumstance)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          updateFilter('circumstances', [...filters.circumstances, circumstance])
                        } else {
                          updateFilter('circumstances', filters.circumstances.filter(c => c !== circumstance))
                        }
                      }}
                      className="rounded border-mission-gray-700 text-mission-primary focus:ring-mission-primary focus:ring-offset-black"
                    />
                    <span className="ml-2 text-sm text-mission-gray-300">{circumstance}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-mission-gray-300 mb-2">
                Time Since Missing
              </label>
              <select
                value={filters.timeSinceMissing}
                onChange={(e) => updateFilter('timeSinceMissing', e.target.value)}
                className="w-full px-3 py-2 bg-mission-gray-800 border border-mission-gray-700 text-white rounded-lg focus:ring-2 focus:ring-mission-primary focus:border-mission-primary"
              >
                <option value="">Any Time</option>
                <option value="24h">Last 24 Hours</option>
                <option value="7d">Last Week</option>
                <option value="30d">Last Month</option>
                <option value="90d">Last 3 Months</option>
                <option value="1y">Last Year</option>
                <option value="5y">Last 5 Years</option>
              </select>
            </div>
          </div>
        </FilterSection>

        {/* Save/Load Presets (Champion feature) */}
        {currentTier === 'champion' && (
          <FilterSection title="Saved Searches">
            <div className="space-y-3">
              <Button variant="ghost" size="sm" className="w-full justify-start">
                📌 High-Risk Children Cases
              </Button>
              <Button variant="ghost" size="sm" className="w-full justify-start">
                📌 Recent Missing Veterans
              </Button>
              <Button variant="ghost" size="sm" className="w-full justify-start">
                📌 Cold Cases - Adults
              </Button>
              <Button variant="primary" size="sm" className="w-full">
                Save Current Search
              </Button>
            </div>
          </FilterSection>
        )}
      </CardContent>
    </Card>
  )
}