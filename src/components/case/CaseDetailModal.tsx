'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import { MissingPerson } from '@/types/missing-person'
import { Card, CardContent, CardHeader, CardTitle, Button } from '@/components/ui'

interface CaseDetailModalProps {
  person: MissingPerson | null
  isOpen: boolean
  onClose: () => void
  onShare?: (platform: string) => void
  onReport?: (person: MissingPerson) => void
}

export function CaseDetailModal({ 
  person, 
  isOpen, 
  onClose, 
  onShare, 
  onReport 
}: CaseDetailModalProps) {
  const [imageError, setImageError] = useState(false)

  if (!person) return null

  const handleShare = (platform: string) => {
    onShare?.(platform)
    // Basic sharing functionality
    const url = `${window.location.origin}/case/${person.id}`
    const text = `Help find ${person.name} - Missing since ${person.reportedMissing} from ${person.location}`
    
    if (platform === 'twitter') {
      window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`)
    } else if (platform === 'facebook') {
      window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`)
    } else if (platform === 'copy') {
      navigator.clipboard.writeText(`${text} - ${url}`)
      // Could show a toast notification here
    }
  }

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long', 
        day: 'numeric'
      })
    } catch {
      return dateString
    }
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active': return 'text-green-400 bg-green-400/20 border-green-400/30'
      case 'cold case': return 'text-yellow-400 bg-yellow-400/20 border-yellow-400/30'
      case 'resolved': return 'text-blue-400 bg-blue-400/20 border-blue-400/30'
      default: return 'text-gray-400 bg-gray-400/20 border-gray-400/30'
    }
  }

  const getCategoryColor = (category: string) => {
    switch (category.toLowerCase()) {
      case 'missing children': return 'text-red-400 bg-red-400/20 border-red-400/30'
      case 'missing adults': return 'text-blue-400 bg-blue-400/20 border-blue-400/30'
      case 'missing veterans': return 'text-purple-400 bg-purple-400/20 border-purple-400/30'
      default: return 'text-gray-400 bg-gray-400/20 border-gray-400/30'
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto"
          >
            <Card className="bg-gray-900 border-gray-700 shadow-2xl">
              <CardHeader className="sticky top-0 bg-gray-900 border-b border-gray-700 z-10">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-2xl font-bold text-white mb-2">
                      {person.name}
                    </CardTitle>
                    <div className="flex flex-wrap gap-2">
                      <span className={`px-2 py-1 text-xs rounded-full border font-medium ${getStatusColor(person.status)}`}>
                        {person.status}
                      </span>
                      <span className={`px-2 py-1 text-xs rounded-full border font-medium ${getCategoryColor(person.category)}`}>
                        {person.category.replace('Missing ', '')}
                      </span>
                      {person.caseNumber && (
                        <span className="px-2 py-1 text-xs rounded-full border text-gray-400 bg-gray-400/20 border-gray-400/30 font-medium">
                          Case #{person.caseNumber}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={onClose}
                    className="p-2 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-gray-800"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </CardHeader>

              <CardContent className="p-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Photo Section */}
                  <div className="lg:col-span-1">
                    <div className="sticky top-0">
                      {person.photo && !imageError ? (
                        <div className="relative aspect-square w-full rounded-lg overflow-hidden bg-gray-800">
                          <Image
                            src={person.photo}
                            alt={`Photo of ${person.name}`}
                            fill
                            className="object-cover"
                            onError={() => setImageError(true)}
                            sizes="(max-width: 768px) 100vw, 33vw"
                          />
                        </div>
                      ) : (
                        <div className="aspect-square w-full rounded-lg bg-gray-800 flex items-center justify-center">
                          <div className="text-center text-gray-500">
                            <div className="text-6xl mb-2">👤</div>
                            <p>Photo Not Available</p>
                          </div>
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="mt-6 space-y-3">
                        <Button
                          className="w-full bg-red-600 hover:bg-red-700 text-white"
                          onClick={() => onReport?.(person)}
                        >
                          🚨 Report Information
                        </Button>
                        
                        <div className="grid grid-cols-2 gap-2">
                          <Button
                            variant="ghost"
                            className="text-xs border border-gray-600 hover:bg-gray-800"
                            onClick={() => handleShare('twitter')}
                          >
                            🐦 Tweet
                          </Button>
                          <Button
                            variant="ghost"
                            className="text-xs border border-gray-600 hover:bg-gray-800"
                            onClick={() => handleShare('facebook')}
                          >
                            📘 Share
                          </Button>
                        </div>
                        
                        <Button
                          variant="ghost"
                          className="w-full text-xs border border-gray-600 hover:bg-gray-800"
                          onClick={() => handleShare('copy')}
                        >
                          📋 Copy Link
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Details Section */}
                  <div className="lg:col-span-2 space-y-6">
                    {/* Basic Information */}
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                        📋 Basic Information
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-3">
                          <InfoItem label="Missing Since" value={formatDate(person.reportedMissing)} />
                          <InfoItem label="Location" value={person.location} />
                          {person.age && <InfoItem label="Age" value={`${person.age} years old`} />}
                          {person.gender && <InfoItem label="Gender" value={person.gender} />}
                        </div>
                        <div className="space-y-3">
                          {person.ethnicity && <InfoItem label="Ethnicity" value={person.ethnicity} />}
                          <InfoItem label="Status" value={person.status} />
                          <InfoItem label="Category" value={person.category} />
                          <InfoItem label="Last Updated" value={formatDate(person.date)} />
                        </div>
                      </div>
                    </div>

                    {/* Description */}
                    {person.description && (
                      <div>
                        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                          📝 Description
                        </h3>
                        <Card className="bg-gray-800 border-gray-700">
                          <CardContent className="p-4">
                            <p className="text-gray-300 leading-relaxed">
                              {person.description}
                            </p>
                          </CardContent>
                        </Card>
                      </div>
                    )}

                    {/* Circumstances */}
                    {person.circumstances && (
                      <div>
                        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                          🔍 Circumstances
                        </h3>
                        <Card className="bg-gray-800 border-gray-700">
                          <CardContent className="p-4">
                            <p className="text-gray-300 leading-relaxed">
                              {person.circumstances}
                            </p>
                          </CardContent>
                        </Card>
                      </div>
                    )}

                    {/* Location Details */}
                    {(person.latitude || person.longitude) && (
                      <div>
                        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                          📍 Location Details
                        </h3>
                        <Card className="bg-gray-800 border-gray-700">
                          <CardContent className="p-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              {person.latitude && (
                                <InfoItem label="Latitude" value={person.latitude.toString()} />
                              )}
                              {person.longitude && (
                                <InfoItem label="Longitude" value={person.longitude.toString()} />
                              )}
                            </div>
                            {person.latitude && person.longitude && (
                              <div className="mt-4">
                                <Button
                                  variant="ghost"
                                  className="text-xs border border-gray-600 hover:bg-gray-800"
                                  onClick={() => {
                                    window.open(`https://www.google.com/maps?q=${person.latitude},${person.longitude}`)
                                  }}
                                >
                                  🗺️ View on Google Maps
                                </Button>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      </div>
                    )}

                    {/* Contact Information */}
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                        📞 Contact Information
                      </h3>
                      <Card className="bg-gray-800 border-gray-700">
                        <CardContent className="p-4">
                          <div className="space-y-2 text-sm text-gray-300">
                            <p>If you have information about this case, please contact:</p>
                            <div className="mt-3 space-y-2">
                              <div className="flex items-center gap-2 font-medium text-white">
                                <span>🚨</span>
                                <span>Emergency: 911</span>
                              </div>
                              <div className="flex items-center gap-2 font-medium text-white">
                                <span>📞</span>
                                <span>National Missing Persons: 1-800-THE-LOST</span>
                              </div>
                              {person.caseNumber && (
                                <div className="flex items-center gap-2 text-gray-400">
                                  <span>📋</span>
                                  <span>Reference Case Number: {person.caseNumber}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-xs text-gray-500 uppercase tracking-wide font-medium">{label}</span>
      <span className="text-white font-medium">{value}</span>
    </div>
  )
}

export default CaseDetailModal