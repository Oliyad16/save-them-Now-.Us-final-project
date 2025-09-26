'use client'

import React, { useState, useRef } from 'react'
import Image from 'next/image'
import { MissingPerson } from '@/types/missing-person'

interface SocialShareProps {
  person?: MissingPerson
  customMessage?: string
  platform?: 'facebook' | 'twitter' | 'instagram' | 'tiktok' | 'linkedin' | 'whatsapp'
  onShare?: (platform: string, success: boolean) => void
}

interface ShareContent {
  title: string
  description: string
  image: string
  url: string
  hashtags: string[]
  callToAction: string
}

/**
 * Advanced Social Media Share Optimizer
 * Generates platform-specific optimized content for maximum viral potential
 * Zero cost solution for enhanced reach and engagement
 */
export default function SocialShareOptimizer({
  person,
  customMessage,
  platform,
  onShare
}: SocialShareProps) {
  const [isGeneratingContent, setIsGeneratingContent] = useState(false)
  const [shareContent, setShareContent] = useState<ShareContent | null>(null)
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([])
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Platform-specific optimizations
  const platformConfigs = {
    facebook: {
      maxTitleLength: 100,
      maxDescriptionLength: 300,
      imageRatio: '1.91:1',
      recommendedHashtags: 3,
      tone: 'empathetic'
    },
    twitter: {
      maxTitleLength: 280,
      maxDescriptionLength: 280,
      imageRatio: '16:9',
      recommendedHashtags: 5,
      tone: 'urgent'
    },
    instagram: {
      maxTitleLength: 2200,
      maxDescriptionLength: 2200,
      imageRatio: '1:1',
      recommendedHashtags: 10,
      tone: 'visual-story'
    },
    tiktok: {
      maxTitleLength: 100,
      maxDescriptionLength: 300,
      imageRatio: '9:16',
      recommendedHashtags: 6,
      tone: 'call-to-action'
    },
    linkedin: {
      maxTitleLength: 150,
      maxDescriptionLength: 700,
      imageRatio: '1.91:1',
      recommendedHashtags: 3,
      tone: 'professional'
    },
    whatsapp: {
      maxTitleLength: 65,
      maxDescriptionLength: 200,
      imageRatio: '1:1',
      recommendedHashtags: 2,
      tone: 'personal'
    }
  }

  // Generate optimized content based on platform and person data
  const generateOptimizedContent = async (targetPlatform: string): Promise<ShareContent> => {
    const config = platformConfigs[targetPlatform as keyof typeof platformConfigs]
    
    let title = ''
    let description = ''
    let hashtags: string[] = []
    let callToAction = ''

    if (person) {
      // Generate person-specific content
      const age = person.age ? ` (${person.age})` : ''
      const location = person.location || 'Unknown location'
      const timeframe = getTimeframe(person.reportedMissing || person.date)

      switch (config.tone) {
        case 'urgent':
          title = `🚨 HELP FIND ${person.name.toUpperCase()}${age} - MISSING ${timeframe}`
          description = `${person.name}${age} has been missing from ${location} ${timeframe}. Every share counts - help bring them home! #MissingPerson #BringThemHome`
          callToAction = 'RT to help find them!'
          break

        case 'empathetic':
          title = `Help Find ${person.name}${age} - Missing ${timeframe}`
          description = `${person.name} has been missing from ${location} ${timeframe}. Their family needs our help to bring them home safely. Please share this post to spread awareness. #FindThem #MissingPerson`
          callToAction = 'Please share to help their family'
          break

        case 'visual-story':
          title = `💙 Help Find ${person.name}${age}`
          description = `${person.name} has been missing from ${location} ${timeframe}.\n\nEvery missing person is someone's child, parent, sibling, or friend. They matter. Their story matters.\n\n✨ Share this post\n🙏 Say a prayer\n👁️ Keep your eyes open\n\n#MissingPerson #BringThemHome #EveryLifeMatters #FindThem`
          callToAction = '💙 Share their story'
          break

        case 'call-to-action':
          title = `MISSING: ${person.name}${age}`
          description = `Help find ${person.name}! Missing ${timeframe} from ${location}. Share this video to help bring them home! #FindThem #MissingPerson`
          callToAction = 'Share this now!'
          break

        case 'professional':
          title = `Community Alert: Help Locate ${person.name}${age}`
          description = `${person.name} has been reported missing from ${location} ${timeframe}. As a community, we can help law enforcement and families by sharing this information responsibly. If you have any information, please contact local authorities. #CommunitySupport #MissingPerson`
          callToAction = 'Share within your professional network'
          break

        case 'personal':
          title = `🙏 Please help find ${person.name}${age}`
          description = `${person.name} is missing from ${location} ${timeframe}. Can you share this with your contacts? Every share helps. Thank you! 🙏`
          callToAction = 'Forward to your contacts'
          break
      }

      // Generate relevant hashtags
      const baseHashtags = ['MissingPerson', 'FindThem', 'BringThemHome', 'SaveThemNow']
      const categoryHashtags = person.category === 'Missing Children' 
        ? ['MissingChild', 'AmberAlert', 'ChildSafety']
        : person.category === 'Missing Veterans'
        ? ['MissingVeteran', 'VeteranSupport', 'HonorThem']
        : ['MissingAdult', 'CommunityWatch']
      
      const locationHashtags = person.location 
        ? [person.location.split(',').pop()?.trim().replace(/\s+/g, '') || '']
        : []

      hashtags = [...baseHashtags, ...categoryHashtags, ...locationHashtags]
        .filter(Boolean)
        .slice(0, config.recommendedHashtags)

    } else {
      // General SaveThemNow content
      title = 'Help Find Missing Persons Across America'
      description = 'Every 90 seconds, someone goes missing in the United States. SaveThemNow.Jesus uses AI and community power to help find them. Join our mission.'
      hashtags = ['SaveThemNow', 'MissingPersons', 'CommunitySupport', 'AI4Good']
      callToAction = 'Join the mission'
    }

    // Truncate content based on platform limits
    if (title.length > config.maxTitleLength) {
      title = title.substring(0, config.maxTitleLength - 3) + '...'
    }
    if (description.length > config.maxDescriptionLength) {
      description = description.substring(0, config.maxDescriptionLength - 3) + '...'
    }

    return {
      title,
      description,
      image: await generateOptimizedImage(targetPlatform, person),
      url: person 
        ? `${window.location.origin}/?person=${person.id}` 
        : window.location.origin,
      hashtags,
      callToAction
    }
  }

  // Generate platform-optimized images
  const generateOptimizedImage = async (platform: string, person?: MissingPerson): Promise<string> => {
    const canvas = canvasRef.current
    if (!canvas) return ''

    const ctx = canvas.getContext('2d')!
    const config = platformConfigs[platform as keyof typeof platformConfigs]

    // Set canvas dimensions based on platform
    let width = 1200, height = 630 // Default Facebook size
    switch (platform) {
      case 'twitter':
        width = 1200; height = 675
        break
      case 'instagram':
        width = 1080; height = 1080
        break
      case 'tiktok':
        width = 1080; height = 1920
        break
      case 'whatsapp':
        width = 400; height = 400
        break
    }

    canvas.width = width
    canvas.height = height

    // Create gradient background
    const gradient = ctx.createLinearGradient(0, 0, width, height)
    gradient.addColorStop(0, '#000000')
    gradient.addColorStop(0.5, '#1a1a2e')
    gradient.addColorStop(1, '#16213e')
    
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, width, height)

    // Add logo/branding
    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 48px Arial'
    ctx.textAlign = 'center'
    ctx.fillText('SaveThemNow.Jesus', width / 2, 80)

    if (person) {
      // Add person info
      ctx.fillStyle = '#ffffff'
      ctx.font = 'bold 36px Arial'
      ctx.fillText(`MISSING: ${person.name}`, width / 2, height / 2 - 100)
      
      ctx.font = '24px Arial'
      ctx.fillText(`${person.location}`, width / 2, height / 2 - 60)
      
      // Add urgency indicator
      ctx.fillStyle = '#ff4444'
      ctx.font = 'bold 20px Arial'
      ctx.fillText('HELP FIND THEM', width / 2, height / 2 + 100)
    } else {
      // General branding
      ctx.fillStyle = '#ffffff'
      ctx.font = '28px Arial'
      ctx.fillText('Every 90 seconds, someone goes missing.', width / 2, height / 2 - 50)
      ctx.fillText('Help us find them.', width / 2, height / 2)
    }

    // Add call-to-action
    ctx.fillStyle = '#3b82f6'
    ctx.fillRect(width / 2 - 150, height - 120, 300, 60)
    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 20px Arial'
    ctx.fillText('SHARE TO HELP', width / 2, height - 85)

    return canvas.toDataURL('image/jpeg', 0.8)
  }

  // Get human-readable timeframe
  const getTimeframe = (dateString: string): string => {
    const date = new Date(dateString)
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - date.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays === 1) return 'yesterday'
    if (diffDays < 7) return `${diffDays} days ago`
    if (diffDays < 30) return `${Math.ceil(diffDays / 7)} weeks ago`
    if (diffDays < 365) return `${Math.ceil(diffDays / 30)} months ago`
    return `${Math.ceil(diffDays / 365)} years ago`
  }

  // Handle platform-specific sharing
  const shareOnPlatform = async (platform: string) => {
    setIsGeneratingContent(true)
    
    try {
      const content = await generateOptimizedContent(platform)
      setShareContent(content)

      const shareUrl = content.url
      const text = `${content.title}\n\n${content.description}\n\n${content.hashtags.map(h => `#${h}`).join(' ')}`
      
      let platformUrl = ''
      
      switch (platform) {
        case 'facebook':
          platformUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${encodeURIComponent(text)}`
          break
        case 'twitter':
          platformUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(shareUrl)}`
          break
        case 'linkedin':
          platformUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`
          break
        case 'whatsapp':
          platformUrl = `https://wa.me/?text=${encodeURIComponent(text + ' ' + shareUrl)}`
          break
        default:
          // Copy to clipboard for other platforms
          await navigator.clipboard.writeText(text + '\n\n' + shareUrl)
          alert('Content copied to clipboard!')
          return
      }

      if (platformUrl) {
        window.open(platformUrl, '_blank', 'width=600,height=400')
      }

      onShare?.(platform, true)
    } catch (error) {
      console.error('Share failed:', error)
      onShare?.(platform, false)
    } finally {
      setIsGeneratingContent(false)
    }
  }

  // Batch share across multiple platforms
  const shareMultiplePlatforms = async () => {
    for (const platform of selectedPlatforms) {
      await new Promise(resolve => setTimeout(resolve, 1000)) // Delay between shares
      await shareOnPlatform(platform)
    }
  }

  const platforms = [
    { id: 'facebook', name: 'Facebook', icon: '📘', color: 'bg-blue-600' },
    { id: 'twitter', name: 'Twitter/X', icon: '🐦', color: 'bg-gray-900' },
    { id: 'instagram', name: 'Instagram', icon: '📷', color: 'bg-pink-600' },
    { id: 'tiktok', name: 'TikTok', icon: '🎵', color: 'bg-black' },
    { id: 'linkedin', name: 'LinkedIn', icon: '💼', color: 'bg-blue-700' },
    { id: 'whatsapp', name: 'WhatsApp', icon: '💬', color: 'bg-green-600' },
  ]

  return (
    <div className="space-y-6">
      <canvas ref={canvasRef} className="hidden" />
      
      {/* Platform Selection */}
      <div className="bg-gray-900 rounded-xl p-6">
        <h3 className="text-xl font-semibold text-white mb-4">
          📱 Optimized Social Sharing
        </h3>
        <p className="text-gray-300 text-sm mb-6">
          Share with platform-specific optimized content for maximum reach and engagement.
        </p>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {platforms.map(platform => (
            <button
              key={platform.id}
              onClick={() => shareOnPlatform(platform.id)}
              disabled={isGeneratingContent}
              className={`
                flex items-center space-x-3 p-4 rounded-lg text-white transition-all duration-200
                ${platform.color} hover:scale-105 hover:shadow-lg
                ${isGeneratingContent ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              `}
            >
              <span className="text-2xl">{platform.icon}</span>
              <div className="text-left">
                <div className="font-medium text-sm">{platform.name}</div>
                <div className="text-xs opacity-75">Optimized</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Multi-Platform Share */}
      <div className="bg-gray-900 rounded-xl p-6">
        <h4 className="text-lg font-semibold text-white mb-3">
          🚀 Viral Campaign Mode
        </h4>
        <p className="text-gray-300 text-sm mb-4">
          Select multiple platforms to create a coordinated sharing campaign.
        </p>

        <div className="space-y-3 mb-4">
          {platforms.map(platform => (
            <label key={platform.id} className="flex items-center space-x-3 text-white">
              <input
                type="checkbox"
                checked={selectedPlatforms.includes(platform.id)}
                onChange={(e) => {
                  if (e.target.checked) {
                    setSelectedPlatforms(prev => [...prev, platform.id])
                  } else {
                    setSelectedPlatforms(prev => prev.filter(p => p !== platform.id))
                  }
                }}
                className="rounded"
              />
              <span className="text-xl">{platform.icon}</span>
              <span className="text-sm">{platform.name}</span>
            </label>
          ))}
        </div>

        <button
          onClick={shareMultiplePlatforms}
          disabled={selectedPlatforms.length === 0 || isGeneratingContent}
          className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white py-3 px-6 rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isGeneratingContent 
            ? '🔄 Generating Content...' 
            : `🚀 Share on ${selectedPlatforms.length} Platform${selectedPlatforms.length !== 1 ? 's' : ''}`
          }
        </button>
      </div>

      {/* Content Preview */}
      {shareContent && (
        <div className="bg-gray-900 rounded-xl p-6">
          <h4 className="text-lg font-semibold text-white mb-3">📝 Generated Content Preview</h4>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Title</label>
              <div className="bg-gray-800 p-3 rounded text-white text-sm">{shareContent.title}</div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Description</label>
              <div className="bg-gray-800 p-3 rounded text-white text-sm whitespace-pre-wrap">{shareContent.description}</div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Hashtags</label>
              <div className="bg-gray-800 p-3 rounded text-blue-400 text-sm">
                {shareContent.hashtags.map(tag => `#${tag}`).join(' ')}
              </div>
            </div>

            {shareContent.image && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Generated Image</label>
                <div className="relative w-full max-w-md h-64">
                  <Image 
                    src={shareContent.image} 
                    alt="Generated social media image"
                    fill
                    className="object-cover rounded border border-gray-700"
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Sharing Tips */}
      <div className="bg-blue-900/20 border border-blue-500/30 rounded-xl p-6">
        <h4 className="text-blue-300 font-semibold mb-3">💡 Sharing Tips for Maximum Impact</h4>
        <ul className="space-y-2 text-blue-200 text-sm">
          <li>• Share during peak hours (7-9 AM, 12-1 PM, 7-9 PM)</li>
          <li>• Add personal context: &quot;Please share from [your city]&quot;</li>
          <li>• Tag relevant local news outlets and community groups</li>
          <li>• Use location tags when available</li>
          <li>• Engage with comments to boost visibility</li>
          <li>• Share multiple times over several days, not just once</li>
        </ul>
      </div>
    </div>
  )
}