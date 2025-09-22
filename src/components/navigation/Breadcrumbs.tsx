'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface BreadcrumbItem {
  label: string
  href: string
  icon?: string
}

interface BreadcrumbsProps {
  className?: string
  customItems?: BreadcrumbItem[]
  showHome?: boolean
}

const pathLabels: Record<string, { label: string; icon?: string }> = {
  '/': { label: 'Home', icon: '🏠' },
  '/about': { label: 'About', icon: 'ℹ️' },
  '/analysis': { label: 'AI Analysis', icon: '🤖' },
  '/dashboard': { label: 'Dashboard', icon: '📊' },
  '/profile': { label: 'Profile', icon: '👤' },
  '/auth': { label: 'Authentication', icon: '🔐' },
  '/auth/signin': { label: 'Sign In', icon: '🔑' },
  '/auth/signup': { label: 'Sign Up', icon: '📝' },
  '/settings': { label: 'Settings', icon: '⚙️' },
  '/donate': { label: 'Donate', icon: '💝' },
  '/pricing': { label: 'Pricing', icon: '💰' },
}

export function Breadcrumbs({ 
  className, 
  customItems, 
  showHome = true 
}: BreadcrumbsProps) {
  const pathname = usePathname()

  // If custom items are provided, use them
  if (customItems) {
    return (
      <nav 
        className={cn("flex items-center space-x-1 text-sm", className)}
        aria-label="Breadcrumb"
      >
        {customItems.map((item, index) => (
          <div key={item.href} className="flex items-center">
            {index > 0 && (
              <span className="mx-2 text-mission-gray-500">
                /
              </span>
            )}
            <BreadcrumbLink
              href={item.href}
              label={item.label}
              icon={item.icon}
              isLast={index === customItems.length - 1}
            />
          </div>
        ))}
      </nav>
    )
  }

  // Generate breadcrumbs from pathname
  const pathSegments = pathname.split('/').filter(Boolean)
  const breadcrumbs: BreadcrumbItem[] = []

  // Add home if requested and not already there
  if (showHome && pathname !== '/') {
    breadcrumbs.push({
      label: pathLabels['/'].label,
      href: '/',
      icon: pathLabels['/'].icon
    })
  }

  // Build breadcrumbs from path segments
  let currentPath = ''
  pathSegments.forEach((segment, index) => {
    currentPath += `/${segment}`
    const pathInfo = pathLabels[currentPath]
    
    if (pathInfo) {
      breadcrumbs.push({
        label: pathInfo.label,
        href: currentPath,
        icon: pathInfo.icon
      })
    } else {
      // Fallback for unknown paths
      breadcrumbs.push({
        label: segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' '),
        href: currentPath
      })
    }
  })

  // Don't show breadcrumbs for home page only
  if (pathname === '/') {
    return null
  }

  // If we have no breadcrumbs or only home, don't show
  if (breadcrumbs.length === 0 || (breadcrumbs.length === 1 && breadcrumbs[0].href === '/')) {
    return null
  }

  return (
    <motion.nav 
      className={cn("flex items-center space-x-1 text-sm py-2", className)}
      aria-label="Breadcrumb"
      initial={{ opacity: 0, y: -5 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
    >
      {breadcrumbs.map((item, index) => (
        <div key={item.href} className="flex items-center">
          {index > 0 && (
            <span className="mx-2 text-mission-gray-500">
              /
            </span>
          )}
          <BreadcrumbLink
            href={item.href}
            label={item.label}
            icon={item.icon}
            isLast={index === breadcrumbs.length - 1}
          />
        </div>
      ))}
    </motion.nav>
  )
}

interface BreadcrumbLinkProps {
  href: string
  label: string
  icon?: string
  isLast: boolean
}

function BreadcrumbLink({ href, label, icon, isLast }: BreadcrumbLinkProps) {
  const content = (
    <span
      className={cn(
        "flex items-center space-x-1 transition-all duration-200 rounded-md px-2 py-1",
        isLast
          ? "text-white font-medium bg-mission-gray-800"
          : "text-mission-gray-400 hover:text-white hover:bg-mission-gray-800 hover:scale-105"
      )}
    >
      {icon && (
        <span className="text-xs opacity-80">{icon}</span>
      )}
      <span className="truncate max-w-[120px] sm:max-w-none">{label}</span>
    </span>
  )

  if (isLast) {
    return (
      <span 
        className="cursor-default"
        aria-current="page"
      >
        {content}
      </span>
    )
  }

  return (
    <Link
      href={href}
      className="focus:outline-none focus:ring-2 focus:ring-mission-primary focus:ring-offset-2 focus:ring-offset-mission-gray-900 rounded-md"
    >
      {content}
    </Link>
  )
}

// Structured data for SEO
export function BreadcrumbStructuredData({ items }: { items: BreadcrumbItem[] }) {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": items.map((item, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "name": item.label,
      "item": `${typeof window !== 'undefined' ? window.location.origin : ''}${item.href}`
    }))
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  )
}