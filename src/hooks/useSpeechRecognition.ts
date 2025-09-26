import { useState, useEffect, useRef, useCallback } from 'react'

interface SpeechRecognitionHookOptions {
  continuous?: boolean
  interimResults?: boolean
  lang?: string
  onResult?: (transcript: string, isFinal: boolean) => void
  onError?: (error: any) => void
  onStart?: () => void
  onEnd?: () => void
}

interface SpeechRecognitionHookResult {
  transcript: string
  interimTranscript: string
  finalTranscript: string
  isListening: boolean
  hasRecognitionSupport: boolean
  confidence: number
  startListening: () => void
  stopListening: () => void
  resetTranscript: () => void
  browserSupportMessage: string
}

/**
 * Advanced Web Speech API Hook
 * Provides voice recognition capabilities with fallbacks and error handling
 * Zero cost solution for voice-enabled search
 */
export function useSpeechRecognition({
  continuous = true,
  interimResults = true,
  lang = 'en-US',
  onResult,
  onError,
  onStart,
  onEnd
}: SpeechRecognitionHookOptions = {}): SpeechRecognitionHookResult {
  const [transcript, setTranscript] = useState('')
  const [interimTranscript, setInterimTranscript] = useState('')
  const [finalTranscript, setFinalTranscript] = useState('')
  const [isListening, setIsListening] = useState(false)
  const [hasRecognitionSupport, setHasRecognitionSupport] = useState(false)
  const [confidence, setConfidence] = useState(0)
  const [browserSupportMessage, setBrowserSupportMessage] = useState('')

  const recognitionRef = useRef<any>(null)
  const timeoutRef = useRef<NodeJS.Timeout>()

  // Check for speech recognition support
  useEffect(() => {
    const SpeechRecognition = 
      (window as any).SpeechRecognition || 
      (window as any).webkitSpeechRecognition ||
      (window as any).mozSpeechRecognition ||
      (window as any).msSpeechRecognition

    if (SpeechRecognition) {
      setHasRecognitionSupport(true)
      setBrowserSupportMessage('Voice search is supported in your browser')
      
      recognitionRef.current = new SpeechRecognition()
      const recognition = recognitionRef.current

      // Configure recognition
      recognition.continuous = continuous
      recognition.interimResults = interimResults
      recognition.lang = lang
      recognition.maxAlternatives = 3

      // Handle results
      recognition.onresult = (event: any) => {
        let interimTranscript = ''
        let finalTranscript = ''
        let lastConfidence = 0

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i]
          const transcript = result[0].transcript

          if (result.isFinal) {
            finalTranscript += transcript + ' '
            lastConfidence = result[0].confidence
          } else {
            interimTranscript += transcript
          }
        }

        setInterimTranscript(interimTranscript)
        
        if (finalTranscript) {
          setFinalTranscript(prev => prev + finalTranscript)
          setTranscript(prev => prev + finalTranscript)
          setConfidence(lastConfidence)
          onResult?.(finalTranscript.trim(), true)
        } else if (interimTranscript) {
          onResult?.(interimTranscript, false)
        }
      }

      // Handle start
      recognition.onstart = () => {
        setIsListening(true)
        onStart?.()
        console.log('🎤 Speech recognition started')
      }

      // Handle end
      recognition.onend = () => {
        setIsListening(false)
        setInterimTranscript('')
        onEnd?.()
        console.log('🔇 Speech recognition ended')
      }

      // Handle errors
      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error)
        
        let errorMessage = 'Voice recognition error occurred'
        
        switch (event.error) {
          case 'network':
            errorMessage = 'Network error - please check your connection'
            break
          case 'not-allowed':
            errorMessage = 'Microphone access denied - please allow microphone access'
            break
          case 'no-speech':
            errorMessage = 'No speech detected - please try speaking again'
            break
          case 'aborted':
            errorMessage = 'Speech recognition was aborted'
            break
          case 'audio-capture':
            errorMessage = 'Audio capture failed - please check your microphone'
            break
          case 'service-not-allowed':
            errorMessage = 'Speech recognition service not allowed'
            break
        }

        onError?.({ error: event.error, message: errorMessage })
        setIsListening(false)
      }

      // Handle no match
      recognition.onnomatch = () => {
        console.warn('Speech recognition: no match found')
        onError?.({ error: 'no-match', message: 'Could not recognize speech clearly' })
      }

    } else {
      setHasRecognitionSupport(false)
      
      // Determine specific browser support message
      const isFirefox = navigator.userAgent.toLowerCase().includes('firefox')
      const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent)
      const isChrome = navigator.userAgent.toLowerCase().includes('chrome')
      
      if (isFirefox) {
        setBrowserSupportMessage('Voice search is not yet supported in Firefox. Try Chrome, Safari, or Edge.')
      } else if (isSafari && !window.isSecureContext) {
        setBrowserSupportMessage('Voice search requires HTTPS in Safari. Please use a secure connection.')
      } else if (!isChrome && !isSafari) {
        setBrowserSupportMessage('For the best voice search experience, please use Chrome, Safari, or Edge.')
      } else {
        setBrowserSupportMessage('Voice search is not available in this browser or device.')
      }
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.onresult = null
        recognitionRef.current.onstart = null
        recognitionRef.current.onend = null
        recognitionRef.current.onerror = null
        recognitionRef.current.onnomatch = null
      }
    }
  }, [continuous, interimResults, lang, onResult, onError, onStart, onEnd])

  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListening) {
      try {
        recognitionRef.current.stop()
        
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current)
        }
      } catch (error) {
        console.error('Failed to stop speech recognition:', error)
      }
    }
  }, [isListening])

  const startListening = useCallback(() => {
    if (recognitionRef.current && hasRecognitionSupport && !isListening) {
      try {
        // Clear any existing timeout
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current)
        }

        // Reset transcripts
        setInterimTranscript('')
        
        // Start recognition
        recognitionRef.current.start()
        
        // Set a maximum listening time (30 seconds)
        timeoutRef.current = setTimeout(() => {
          stopListening()
        }, 30000)

      } catch (error) {
        console.error('Failed to start speech recognition:', error)
        onError?.({ error: 'start-failed', message: 'Failed to start voice recognition' })
      }
    }
  }, [hasRecognitionSupport, isListening, onError, stopListening])

  const resetTranscript = useCallback(() => {
    setTranscript('')
    setInterimTranscript('')
    setFinalTranscript('')
    setConfidence(0)
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      if (recognitionRef.current && isListening) {
        try {
          recognitionRef.current.stop()
        } catch (error) {
          console.warn('Error stopping speech recognition on cleanup:', error)
        }
      }
    }
  }, [isListening])

  return {
    transcript: transcript + interimTranscript,
    interimTranscript,
    finalTranscript,
    isListening,
    hasRecognitionSupport,
    confidence,
    startListening,
    stopListening,
    resetTranscript,
    browserSupportMessage
  }
}

/**
 * Voice Search Hook specifically designed for search queries
 * Includes automatic punctuation removal and search optimization
 */
export function useVoiceSearch({
  onSearchQuery,
  autoSubmit = true,
  pauseTimeout = 2000
}: {
  onSearchQuery?: (query: string, confidence: number) => void
  autoSubmit?: boolean
  pauseTimeout?: number
} = {}) {
  const [currentQuery, setCurrentQuery] = useState('')
  const pauseTimeoutRef = useRef<NodeJS.Timeout>()

  const {
    transcript,
    interimTranscript,
    isListening,
    hasRecognitionSupport,
    confidence,
    startListening: startSpeechListening,
    stopListening,
    resetTranscript,
    browserSupportMessage
  } = useSpeechRecognition({
    continuous: false,
    interimResults: true,
    onResult: (transcript, isFinal) => {
      // Clean transcript for search (remove punctuation, normalize)
      const cleanQuery = transcript
        .toLowerCase()
        .replace(/[.,!?;]/g, '')
        .trim()

      setCurrentQuery(cleanQuery)

      if (isFinal && autoSubmit && cleanQuery.length > 2) {
        // Clear any existing timeout
        if (pauseTimeoutRef.current) {
          clearTimeout(pauseTimeoutRef.current)
        }

        // Set timeout to submit search after pause
        pauseTimeoutRef.current = setTimeout(() => {
          onSearchQuery?.(cleanQuery, confidence)
        }, 500)
      }
    },
    onError: (error) => {
      console.warn('Voice search error:', error)
    }
  })

  const startVoiceSearch = useCallback(() => {
    resetTranscript()
    setCurrentQuery('')
    startSpeechListening()
  }, [resetTranscript, startSpeechListening])

  const submitCurrentQuery = useCallback(() => {
    if (currentQuery.trim().length > 2) {
      onSearchQuery?.(currentQuery.trim(), confidence)
    }
  }, [currentQuery, confidence, onSearchQuery])

  const clearQuery = useCallback(() => {
    setCurrentQuery('')
    resetTranscript()
    if (pauseTimeoutRef.current) {
      clearTimeout(pauseTimeoutRef.current)
    }
  }, [resetTranscript])

  // Cleanup timeouts
  useEffect(() => {
    return () => {
      if (pauseTimeoutRef.current) {
        clearTimeout(pauseTimeoutRef.current)
      }
    }
  }, [])

  return {
    currentQuery,
    isListening,
    hasRecognitionSupport,
    confidence,
    browserSupportMessage,
    startVoiceSearch,
    stopListening,
    submitCurrentQuery,
    clearQuery,
    // Show interim results for better UX
    displayQuery: currentQuery || interimTranscript.toLowerCase().replace(/[.,!?;]/g, '').trim()
  }
}