'use client'

import React, { useState, useRef, useCallback } from 'react'
import { findSimilarFaces } from '@/lib/ai/FacialSimilarityBrowser'
import { MissingPerson } from '@/types/missing-person'
import ProgressiveImage from '@/components/ui/ProgressiveImage'

interface FacialSearchProps {
  missingPersons: MissingPerson[]
  onResultsFound?: (results: Array<{person: MissingPerson, similarity: number}>) => void
  className?: string
}

interface SearchResult {
  person: MissingPerson
  similarity: number
  confidence: number
}

/**
 * Facial Similarity Search Component
 * Allows users to upload a photo and find similar missing persons
 * Zero cost AI-powered facial recognition using TensorFlow.js
 */
export default function FacialSearchComponent({
  missingPersons,
  onResultsFound,
  className = ''
}: FacialSearchProps) {
  const [isSearching, setIsSearching] = useState(false)
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [uploadedImage, setUploadedImage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dropRef = useRef<HTMLDivElement>(null)

  const handleFileSelect = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file')
      return
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      setError('Image file is too large. Please select a file under 10MB.')
      return
    }

    setError(null)
    setIsSearching(true)

    try {
      // Create preview
      const imageUrl = URL.createObjectURL(file)
      setUploadedImage(imageUrl)

      // Prepare candidates with photos
      const candidatesWithPhotos = missingPersons.filter(person => person.photo)
        .map(person => ({
          id: person.id.toString(),
          imageUrl: person.photo!
        }))

      console.log(`🔍 Searching ${candidatesWithPhotos.length} missing persons with photos...`)

      // Perform facial similarity search
      const similarityResults = await findSimilarFaces(file, candidatesWithPhotos)

      // Map results back to missing persons
      const results: SearchResult[] = similarityResults
        .filter(result => result.similarity > 0.3) // Minimum similarity threshold
        .slice(0, 10) // Limit to top 10 results
        .map(result => {
          const person = missingPersons.find(p => p.id.toString() === result.id)!
          return {
            person,
            similarity: result.similarity,
            confidence: result.similarity > 0.6 ? 0.8 : result.similarity > 0.4 ? 0.6 : 0.4
          }
        })

      setSearchResults(results)
      onResultsFound?.(results.map(r => ({ person: r.person, similarity: r.similarity })))

      if (results.length === 0) {
        setError('No similar faces found. Try a different image or check that the photo shows a clear face.')
      }

    } catch (err) {
      console.error('Facial search error:', err)
      setError('Failed to process the image. Please try a different photo.')
    } finally {
      setIsSearching(false)
    }
  }, [missingPersons, onResultsFound])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      handleFileSelect(files[0])
    }
  }, [handleFileSelect])

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length > 0) {
      handleFileSelect(files[0])
    }
  }, [handleFileSelect])

  const clearSearch = useCallback(() => {
    setSearchResults([])
    setUploadedImage(null)
    setError(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [])

  const getSimilarityColor = (similarity: number): string => {
    if (similarity >= 0.7) return 'text-green-400'
    if (similarity >= 0.5) return 'text-yellow-400'
    return 'text-red-400'
  }

  const getSimilarityLabel = (similarity: number): string => {
    if (similarity >= 0.7) return 'High Match'
    if (similarity >= 0.5) return 'Possible Match'
    return 'Low Match'
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Upload Area */}
      <div className="bg-gray-900 rounded-xl p-6">
        <div className="text-center mb-4">
          <h3 className="text-xl font-semibold text-white mb-2">
            🤖 AI-Powered Facial Recognition Search
          </h3>
          <p className="text-gray-300 text-sm">
            Upload a photo to find missing persons who look similar. This uses advanced AI to compare facial features.
          </p>
        </div>

        <div
          ref={dropRef}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`
            border-2 border-dashed rounded-lg p-8 text-center transition-all duration-300
            ${dragActive 
              ? 'border-blue-500 bg-blue-500/10' 
              : 'border-gray-600 hover:border-gray-500'
            }
          `}
        >
          {uploadedImage ? (
            <div className="space-y-4">
              <div className="mx-auto w-32 h-32 rounded-lg overflow-hidden">
                <ProgressiveImage
                  src={uploadedImage}
                  alt="Uploaded search image"
                  className="w-full h-full object-cover"
                  priority
                />
              </div>
              <button
                onClick={clearSearch}
                className="text-blue-400 hover:text-blue-300 text-sm font-medium"
                disabled={isSearching}
              >
                Upload Different Image
              </button>
            </div>
          ) : (
            <>
              <div className="mx-auto w-16 h-16 text-gray-400 mb-4">
                <svg fill="currentColor" viewBox="0 0 20 20">
                  <path 
                    fillRule="evenodd" 
                    d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" 
                    clipRule="evenodd" 
                  />
                </svg>
              </div>
              
              <div className="space-y-2">
                <p className="text-gray-300">
                  Drag & drop an image here, or{' '}
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="text-blue-400 hover:text-blue-300 font-medium"
                  >
                    browse files
                  </button>
                </p>
                <p className="text-xs text-gray-500">
                  Supports JPG, PNG, WebP • Max 10MB • Clear face photo works best
                </p>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileInput}
                className="hidden"
              />
            </>
          )}
        </div>
      </div>

      {/* Loading State */}
      {isSearching && (
        <div className="bg-gray-900 rounded-xl p-8 text-center">
          <div className="inline-flex items-center space-x-3">
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-white">Analyzing facial features...</span>
          </div>
          <p className="text-gray-400 text-sm mt-2">
            This may take a few seconds while our AI processes the image
          </p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-900/20 border border-red-500 rounded-xl p-4">
          <div className="flex items-start space-x-3">
            <svg className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <div>
              <h4 className="text-red-300 font-medium">Search Error</h4>
              <p className="text-red-200 text-sm mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Results */}
      {searchResults.length > 0 && (
        <div className="bg-gray-900 rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-white">
              Similar Faces Found
            </h3>
            <span className="text-sm text-gray-400">
              {searchResults.length} result{searchResults.length !== 1 ? 's' : ''}
            </span>
          </div>

          <div className="grid gap-4">
            {searchResults.map((result, index) => (
              <div
                key={result.person.id}
                className="bg-gray-800 rounded-lg p-4 hover:bg-gray-750 transition-colors"
              >
                <div className="flex items-start space-x-4">
                  {/* Person Photo */}
                  <div className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0">
                    {result.person.photo ? (
                      <ProgressiveImage
                        src={result.person.photo}
                        alt={`Photo of ${result.person.name}`}
                        className="w-full h-full object-cover"
                        priority={index < 3}
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-700 flex items-center justify-center">
                        <svg className="w-8 h-8 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                  </div>

                  {/* Person Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="text-lg font-semibold text-white truncate">
                          {result.person.name}
                        </h4>
                        <p className="text-gray-300 text-sm">
                          {result.person.location}
                        </p>
                        <p className="text-gray-400 text-sm">
                          {result.person.reportedMissing}
                        </p>
                      </div>

                      {/* Similarity Score */}
                      <div className="text-right flex-shrink-0 ml-4">
                        <div className={`text-lg font-bold ${getSimilarityColor(result.similarity)}`}>
                          {(result.similarity * 100).toFixed(1)}%
                        </div>
                        <div className={`text-xs ${getSimilarityColor(result.similarity)}`}>
                          {getSimilarityLabel(result.similarity)}
                        </div>
                      </div>
                    </div>

                    {/* Additional Info */}
                    <div className="mt-3 flex flex-wrap gap-2">
                      {result.person.age && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-700 text-gray-300">
                          Age: {result.person.age}
                        </span>
                      )}
                      {result.person.category && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-600/20 text-blue-300">
                          {result.person.category.replace('Missing ', '')}
                        </span>
                      )}
                    </div>

                    {/* Action Button */}
                    <button className="mt-3 text-sm text-blue-400 hover:text-blue-300 font-medium">
                      View Full Details →
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Disclaimer */}
          <div className="mt-6 p-4 bg-yellow-900/20 border border-yellow-500/30 rounded-lg">
            <div className="flex items-start space-x-2">
              <svg className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <div>
                <h4 className="text-yellow-300 font-medium text-sm">Important Notice</h4>
                <p className="text-yellow-200 text-xs mt-1">
                  Facial recognition results are estimates and should not be the sole basis for identification. 
                  Always verify with official sources and contact law enforcement with any potential matches.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}