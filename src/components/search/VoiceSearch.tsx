'use client'

import React, { useState, useEffect } from 'react'
import { useVoiceSearch } from '@/hooks/useSpeechRecognition'

interface VoiceSearchProps {
  onSearchQuery: (query: string) => void
  onTranscriptChange?: (transcript: string) => void
  className?: string
  placeholder?: string
  disabled?: boolean
}

/**
 * Voice Search Component with Web Speech API
 * Provides hands-free search capability with visual feedback
 * Zero cost solution for accessibility and convenience
 */
export default function VoiceSearch({
  onSearchQuery,
  onTranscriptChange,
  className = '',
  placeholder = 'Try saying: "Search for John Smith" or "Find missing persons in California"',
  disabled = false
}: VoiceSearchProps) {
  const [showPermissionPrompt, setShowPermissionPrompt] = useState(false)
  const [hasTriedMicrophone, setHasTriedMicrophone] = useState(false)

  const {
    currentQuery,
    displayQuery,
    isListening,
    hasRecognitionSupport,
    confidence,
    browserSupportMessage,
    startVoiceSearch,
    stopListening,
    submitCurrentQuery,
    clearQuery
  } = useVoiceSearch({
    onSearchQuery: (query, confidence) => {
      console.log(`🎤 Voice search: "${query}" (confidence: ${confidence})`)
      onSearchQuery(query)
      setShowPermissionPrompt(false)
    },
    autoSubmit: true,
    pauseTimeout: 1500
  })

  // Update parent component with transcript changes
  useEffect(() => {
    onTranscriptChange?.(displayQuery)
  }, [displayQuery, onTranscriptChange])

  const handleMicrophoneClick = async () => {
    if (!hasRecognitionSupport) return

    if (isListening) {
      stopListening()
      return
    }

    try {
      // Check microphone permissions
      if (!hasTriedMicrophone) {
        setShowPermissionPrompt(true)
        setHasTriedMicrophone(true)
        
        // Check if we can access the microphone
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
            stream.getTracks().forEach(track => track.stop()) // Clean up
            setShowPermissionPrompt(false)
          } catch (micError) {
            console.warn('Microphone access denied:', micError)
            setShowPermissionPrompt(false)
            return
          }
        }
      }

      startVoiceSearch()
    } catch (error) {
      console.error('Voice search failed:', error)
      setShowPermissionPrompt(false)
    }
  }

  const getConfidenceColor = (confidence: number): string => {
    if (confidence >= 0.8) return 'text-green-400'
    if (confidence >= 0.6) return 'text-yellow-400'
    return 'text-red-400'
  }

  const getConfidenceLabel = (confidence: number): string => {
    if (confidence >= 0.8) return 'High'
    if (confidence >= 0.6) return 'Medium'
    return 'Low'
  }

  if (!hasRecognitionSupport) {
    return (
      <div className={`bg-gray-800 rounded-lg p-4 ${className}`}>
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-gray-700 rounded-full">
            <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM15.657 6.343a1 1 0 011.414 0A9.972 9.972 0 0119 12a9.972 9.972 0 01-1.929 5.657 1 1 0 11-1.414-1.414A7.971 7.971 0 0017 12c0-2.21-.896-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 12a5.983 5.983 0 01-.757 2.829 1 1 0 11-1.415-1.414A3.987 3.987 0 0014 12a3.987 3.987 0 00-1.172-2.829 1 1 0 010-1.414z" clipRule="evenodd" />
              <path d="M13.5 5.172C14.91 6.582 15.5 8.246 15.5 10s-.59 3.418-2 4.828" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-300">Voice Search Unavailable</p>
            <p className="text-xs text-gray-500">{browserSupportMessage}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Voice Search Interface */}
      <div className="bg-gray-800 rounded-lg p-4">
        <div className="flex items-center space-x-4">
          {/* Microphone Button */}
          <button
            onClick={handleMicrophoneClick}
            disabled={disabled}
            className={`
              relative p-3 rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500
              ${isListening
                ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
              }
              ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
            title={isListening ? 'Click to stop recording' : 'Click to start voice search'}
          >
            {isListening ? (
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
              </svg>
            )}

            {/* Recording indicator */}
            {isListening && (
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-white rounded-full flex items-center justify-center">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-ping" />
              </div>
            )}
          </button>

          {/* Voice Input Display */}
          <div className="flex-1 min-h-[60px] flex items-center">
            {isListening ? (
              <div className="space-y-2 w-full">
                <div className="flex items-center space-x-2">
                  <div className="flex space-x-1">
                    {[0, 1, 2].map((i) => (
                      <div
                        key={i}
                        className="w-1 h-8 bg-blue-400 rounded-full animate-pulse"
                        style={{ animationDelay: `${i * 0.2}s` }}
                      />
                    ))}
                  </div>
                  <span className="text-blue-300 text-sm font-medium">Listening...</span>
                </div>
                
                {displayQuery && (
                  <div className="bg-gray-700 rounded-md p-3">
                    <p className="text-white text-lg">{displayQuery}</p>
                    {confidence > 0 && (
                      <div className="flex items-center space-x-2 mt-1">
                        <span className="text-xs text-gray-400">Confidence:</span>
                        <span className={`text-xs font-medium ${getConfidenceColor(confidence)}`}>
                          {getConfidenceLabel(confidence)} ({(confidence * 100).toFixed(0)}%)
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : displayQuery ? (
              <div className="bg-gray-700 rounded-md p-3 w-full">
                <div className="flex items-center justify-between">
                  <p className="text-white text-lg">{displayQuery}</p>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={submitCurrentQuery}
                      className="text-green-400 hover:text-green-300 text-sm font-medium"
                    >
                      Search
                    </button>
                    <button
                      onClick={clearQuery}
                      className="text-gray-400 hover:text-gray-300 text-sm"
                    >
                      Clear
                    </button>
                  </div>
                </div>
                {confidence > 0 && (
                  <div className="flex items-center space-x-2 mt-1">
                    <span className="text-xs text-gray-400">Confidence:</span>
                    <span className={`text-xs font-medium ${getConfidenceColor(confidence)}`}>
                      {getConfidenceLabel(confidence)} ({(confidence * 100).toFixed(0)}%)
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-gray-400 text-sm italic">
                {placeholder}
              </div>
            )}
          </div>
        </div>

        {/* Voice Commands Help */}
        {!isListening && !displayQuery && (
          <div className="mt-3 pt-3 border-t border-gray-700">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
              <div className="text-center p-2 bg-gray-700/50 rounded">
                <div className="text-blue-300 font-medium">Search by Name</div>
                <div className="text-gray-400">&quot;Find John Smith&quot;</div>
              </div>
              <div className="text-center p-2 bg-gray-700/50 rounded">
                <div className="text-blue-300 font-medium">Search by Location</div>
                <div className="text-gray-400">&quot;Missing in California&quot;</div>
              </div>
              <div className="text-center p-2 bg-gray-700/50 rounded">
                <div className="text-blue-300 font-medium">Search by Age</div>
                <div className="text-gray-400">&quot;Children under 10&quot;</div>
              </div>
              <div className="text-center p-2 bg-gray-700/50 rounded">
                <div className="text-blue-300 font-medium">Filter by Status</div>
                <div className="text-gray-400">&quot;Active cases only&quot;</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Permission Prompt */}
      {showPermissionPrompt && (
        <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <svg className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <div>
              <h4 className="text-blue-300 font-medium text-sm">Microphone Access Required</h4>
              <p className="text-blue-200 text-sm mt-1">
                Please allow microphone access when prompted to use voice search. 
                Your audio is processed locally and never sent to our servers.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Browser Instructions */}
      {hasTriedMicrophone && !isListening && (
        <div className="bg-gray-800/50 rounded-lg p-3 text-xs text-gray-400">
          💡 <strong>Tip:</strong> Speak clearly and pause briefly when finished. 
          The search will automatically submit after detecting a pause in your speech.
        </div>
      )}
    </div>
  )
}