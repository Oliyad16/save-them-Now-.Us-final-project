'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'

interface ProgressiveImageProps {
  src: string
  alt: string
  placeholder?: string
  className?: string
  width?: number
  height?: number
  quality?: number
  priority?: boolean
  blur?: boolean
  onLoad?: () => void
  onError?: (error: Error) => void
}

/**
 * Progressive Image Loading Component with advanced features:
 * - Intersection Observer for lazy loading
 * - Blur-to-sharp transition
 * - WebP format detection and fallback
 * - Responsive image sizing
 * - Loading states and error handling
 * - Zero cost solution for better UX
 */
export default function ProgressiveImage({
  src,
  alt,
  placeholder,
  className = '',
  width,
  height,
  quality = 75,
  priority = false,
  blur = true,
  onLoad,
  onError
}: ProgressiveImageProps) {
  const [isLoaded, setIsLoaded] = useState(false)
  const [isIntersecting, setIsIntersecting] = useState(priority)
  const [hasError, setHasError] = useState(false)
  const [currentSrc, setCurrentSrc] = useState<string>('')
  const [webpSrc, setWebpSrc] = useState<string>('')
  const imgRef = useRef<HTMLImageElement>(null)
  const observerRef = useRef<IntersectionObserver | null>(null)

  // Generate optimized image URLs
  const generateOptimizedUrls = useCallback(() => {
    if (!src) return

    // Check if we can use Next.js Image optimization
    const isExternalImage = src.startsWith('http://') || src.startsWith('https://')
    
    if (!isExternalImage && typeof window !== 'undefined') {
      // Use Next.js image optimization for internal images
      const params = new URLSearchParams({
        url: src,
        w: width?.toString() || '800',
        h: height?.toString() || '600',
        q: quality.toString()
      })
      
      setCurrentSrc(`/_next/image?${params}`)
      
      // Generate WebP version
      const webpParams = new URLSearchParams({
        url: src,
        w: width?.toString() || '800',
        h: height?.toString() || '600',
        q: quality.toString(),
        f: 'webp'
      })
      setWebpSrc(`/_next/image?${webpParams}`)
    } else {
      setCurrentSrc(src)
      setWebpSrc(src)
    }
  }, [src, width, height, quality])

  // Check WebP support
  const supportsWebP = useCallback((): Promise<boolean> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas')
      canvas.width = 1
      canvas.height = 1
      const ctx = canvas.getContext('2d')
      
      if (!ctx) {
        resolve(false)
        return
      }
      
      ctx.fillRect(0, 0, 1, 1)
      canvas.toBlob((blob) => {
        resolve(blob?.type === 'image/webp')
      }, 'image/webp')
    })
  }, [])

  // Intersection Observer setup
  useEffect(() => {
    if (priority) return

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsIntersecting(true)
            observerRef.current?.unobserve(entry.target)
          }
        })
      },
      {
        rootMargin: '50px 0px', // Start loading 50px before visible
        threshold: 0.1
      }
    )

    if (imgRef.current) {
      observerRef.current.observe(imgRef.current)
    }

    return () => {
      observerRef.current?.disconnect()
    }
  }, [priority])

  // Generate optimized URLs when component mounts or src changes
  useEffect(() => {
    generateOptimizedUrls()
  }, [generateOptimizedUrls])

  // Load image when it becomes visible
  useEffect(() => {
    if (!isIntersecting || !currentSrc) return

    const loadImage = async () => {
      try {
        // Check WebP support and use appropriate format
        const useWebP = await supportsWebP()
        const imageSrc = useWebP && webpSrc ? webpSrc : currentSrc

        // Preload the image
        const img = new Image()
        img.crossOrigin = 'anonymous'
        
        img.onload = () => {
          setIsLoaded(true)
          onLoad?.()
        }
        
        img.onerror = () => {
          // Fallback to original src if optimized version fails
          if (imageSrc !== src) {
            const fallbackImg = new Image()
            fallbackImg.crossOrigin = 'anonymous'
            
            fallbackImg.onload = () => {
              setCurrentSrc(src)
              setIsLoaded(true)
              onLoad?.()
            }
            
            fallbackImg.onerror = () => {
              setHasError(true)
              onError?.(new Error(`Failed to load image: ${src}`))
            }
            
            fallbackImg.src = src
          } else {
            setHasError(true)
            onError?.(new Error(`Failed to load image: ${src}`))
          }
        }
        
        img.src = imageSrc
      } catch (error) {
        setHasError(true)
        onError?.(error instanceof Error ? error : new Error('Unknown image loading error'))
      }
    }

    loadImage()
  }, [isIntersecting, currentSrc, webpSrc, src, onLoad, onError, supportsWebP])

  // Generate placeholder styles
  const getPlaceholderStyle = () => {
    if (placeholder) {
      return {
        backgroundImage: `url("${placeholder}")`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        filter: blur ? 'blur(5px)' : 'none'
      }
    }

    // Generate a subtle gradient placeholder
    return {
      background: 'linear-gradient(135deg, #f0f0f0 0%, #e0e0e0 50%, #f0f0f0 100%)',
      backgroundSize: '200% 200%',
      animation: 'shimmer 1.5s ease-in-out infinite'
    }
  }

  // Error state
  if (hasError) {
    return (
      <div 
        className={`flex items-center justify-center bg-gray-200 text-gray-500 ${className}`}
        style={{ width, height }}
        aria-label={alt}
      >
        <div className="text-center p-4">
          <svg 
            className="mx-auto mb-2 w-8 h-8" 
            fill="currentColor" 
            viewBox="0 0 20 20"
          >
            <path 
              fillRule="evenodd" 
              d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" 
              clipRule="evenodd" 
            />
          </svg>
          <div className="text-sm">Failed to load image</div>
        </div>
      </div>
    )
  }

  return (
    <div 
      ref={imgRef}
      className={`relative overflow-hidden ${className}`}
      style={{ width, height }}
    >
      {/* Placeholder/Loading State */}
      {!isLoaded && (
        <div
          className="absolute inset-0 transition-opacity duration-300"
          style={getPlaceholderStyle()}
          aria-hidden="true"
        />
      )}

      {/* Loading indicator */}
      {isIntersecting && !isLoaded && !hasError && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Main Image */}
      {isIntersecting && (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={currentSrc}
          alt={alt}
          className={`
            w-full h-full object-cover transition-all duration-500 ease-out
            ${isLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-105'}
            ${blur && !isLoaded ? 'filter blur-sm' : ''}
          `}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          onLoad={() => {
            setIsLoaded(true)
            onLoad?.()
          }}
          onError={() => {
            setHasError(true)
            onError?.(new Error(`Failed to load image: ${src}`))
          }}
        />
      )}

      {/* Overlay effects */}
      {isLoaded && (
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300" />
      )}
    </div>
  )
}

// Utility component for image galleries with masonry layout
export function ImageGallery({ 
  images, 
  onImageClick 
}: { 
  images: Array<{src: string, alt: string, id: string}>
  onImageClick?: (image: {src: string, alt: string, id: string}) => void
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {images.map((image, index) => (
        <div
          key={image.id}
          className="group cursor-pointer"
          onClick={() => onImageClick?.(image)}
        >
          <ProgressiveImage
            src={image.src}
            alt={image.alt}
            className="w-full h-48 rounded-lg shadow-md group-hover:shadow-xl transition-shadow duration-300"
            priority={index < 4} // Prioritize first 4 images
            blur={true}
            quality={80}
          />
          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-300 rounded-lg" />
        </div>
      ))}
    </div>
  )
}

// CSS for shimmer animation (add to global styles)
export const shimmerCSS = `
@keyframes shimmer {
  0% {
    background-position: -200% 0%;
  }
  100% {
    background-position: 200% 0%;
  }
}
`