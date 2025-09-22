'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

interface SearchSuggestion {
  id: string
  text: string
  type: 'location' | 'name' | 'category' | 'recent'
  icon: string
}

interface EnhancedSearchProps {
  value: string
  onChange: (value: string) => void
  onSuggestionSelect?: (suggestion: SearchSuggestion) => void
  placeholder?: string
  className?: string
  suggestions?: SearchSuggestion[]
  recentSearches?: string[]
}

const defaultSuggestions: SearchSuggestion[] = [
  { id: '1', text: 'Missing Children', type: 'category', icon: '👶' },
  { id: '2', text: 'Missing Adults', type: 'category', icon: '👤' },
  { id: '3', text: 'Missing Veterans', type: 'category', icon: '🎖️' },
  { id: '4', text: 'California', type: 'location', icon: '📍' },
  { id: '5', text: 'Texas', type: 'location', icon: '📍' },
  { id: '6', text: 'Florida', type: 'location', icon: '📍' },
  { id: '7', text: 'New York', type: 'location', icon: '📍' },
]

export function EnhancedSearch({
  value,
  onChange,
  onSuggestionSelect,
  placeholder = "Search by name, location, or category...",
  className,
  suggestions = defaultSuggestions,
  recentSearches = []
}: EnhancedSearchProps) {
  const [isFocused, setIsFocused] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [filteredSuggestions, setFilteredSuggestions] = useState<SearchSuggestion[]>([])
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Filter suggestions based on input
  useEffect(() => {
    if (!value.trim()) {
      const recentSuggestions = recentSearches.map((search, index) => ({
        id: `recent-${index}`,
        text: search,
        type: 'recent' as const,
        icon: '🕒'
      }))
      setFilteredSuggestions([...recentSuggestions, ...suggestions].slice(0, 8))
    } else {
      const filtered = suggestions.filter(suggestion =>
        suggestion.text.toLowerCase().includes(value.toLowerCase())
      ).slice(0, 6)
      setFilteredSuggestions(filtered)
    }
    setHighlightedIndex(-1)
  }, [value, suggestions, recentSearches])

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setHighlightedIndex(prev => 
          prev < filteredSuggestions.length - 1 ? prev + 1 : 0
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setHighlightedIndex(prev => 
          prev > 0 ? prev - 1 : filteredSuggestions.length - 1
        )
        break
      case 'Enter':
        e.preventDefault()
        if (highlightedIndex >= 0 && filteredSuggestions[highlightedIndex]) {
          handleSuggestionClick(filteredSuggestions[highlightedIndex])
        }
        break
      case 'Escape':
        setShowSuggestions(false)
        inputRef.current?.blur()
        break
    }
  }

  const handleSuggestionClick = (suggestion: SearchSuggestion) => {
    onChange(suggestion.text)
    onSuggestionSelect?.(suggestion)
    setShowSuggestions(false)
    setHighlightedIndex(-1)
  }

  const handleFocus = () => {
    setIsFocused(true)
    setShowSuggestions(true)
  }

  const handleBlur = () => {
    setIsFocused(false)
    // Delay hiding suggestions to allow for clicking
    setTimeout(() => setShowSuggestions(false), 150)
  }

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const getSuggestionTypeColor = (type: string) => {
    switch (type) {
      case 'location': return 'text-blue-400'
      case 'name': return 'text-green-400'
      case 'category': return 'text-purple-400'
      case 'recent': return 'text-mission-gray-400'
      default: return 'text-mission-gray-300'
    }
  }

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      {/* Search Input */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <motion.div
            animate={{ scale: isFocused ? 1.1 : 1 }}
            transition={{ duration: 0.2 }}
          >
            🔍
          </motion.div>
        </div>
        
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={cn(
            'w-full pl-12 pr-4 py-3 bg-mission-gray-800 border text-white rounded-lg',
            'placeholder-mission-gray-400 transition-all duration-200',
            'focus:ring-2 focus:ring-mission-primary focus:border-mission-primary',
            'focus:bg-mission-gray-700',
            isFocused 
              ? 'border-mission-primary shadow-glow-blue' 
              : 'border-mission-gray-700 hover:border-mission-gray-600'
          )}
        />

        {/* Clear Button */}
        {value && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            onClick={() => onChange('')}
            className="absolute inset-y-0 right-0 pr-4 flex items-center text-mission-gray-400 hover:text-white transition-colors"
          >
            ✕
          </motion.button>
        )}
      </div>

      {/* Suggestions Dropdown */}
      <AnimatePresence>
        {showSuggestions && filteredSuggestions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute top-full left-0 right-0 mt-2 bg-mission-gray-800 border border-mission-gray-700 rounded-lg shadow-xl z-50 max-h-80 overflow-y-auto"
          >
            {/* Header */}
            <div className="px-4 py-2 border-b border-mission-gray-700">
              <span className="text-xs font-medium text-mission-gray-400 uppercase tracking-wide">
                {value ? 'Suggestions' : 'Recent & Popular'}
              </span>
            </div>

            {/* Suggestions List */}
            <div className="py-2">
              {filteredSuggestions.map((suggestion, index) => (
                <motion.button
                  key={suggestion.id}
                  onClick={() => handleSuggestionClick(suggestion)}
                  className={cn(
                    'w-full px-4 py-3 text-left flex items-center space-x-3 transition-colors',
                    'hover:bg-mission-gray-700 focus:bg-mission-gray-700 focus:outline-none',
                    highlightedIndex === index && 'bg-mission-gray-700'
                  )}
                  whileHover={{ x: 4 }}
                  transition={{ duration: 0.1 }}
                >
                  <span className="text-lg flex-shrink-0">
                    {suggestion.icon}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-white truncate">
                      {suggestion.text}
                    </div>
                    <div className={cn(
                      "text-xs capitalize",
                      getSuggestionTypeColor(suggestion.type)
                    )}>
                      {suggestion.type}
                    </div>
                  </div>
                  {suggestion.type === 'recent' && (
                    <motion.button
                      onClick={(e) => {
                        e.stopPropagation()
                        // TODO: Implement remove from recent searches
                      }}
                      className="p-1 text-mission-gray-500 hover:text-mission-gray-300 transition-colors"
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                    >
                      ✕
                    </motion.button>
                  )}
                </motion.button>
              ))}
            </div>

            {/* Footer */}
            <div className="px-4 py-2 border-t border-mission-gray-700 text-center">
              <span className="text-xs text-mission-gray-500">
                Use ↑↓ to navigate, Enter to select, Esc to close
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}