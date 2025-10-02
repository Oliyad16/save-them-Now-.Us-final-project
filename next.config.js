/** @type {import('next').NextConfig} */
const nextConfig = {
  // App directory is now stable in Next.js 14

  // Optimize for production deployment
  swcMinify: true,

  // Increase build timeout for static generation
  staticPageGenerationTimeout: 180,

  // Configure external packages that should not be bundled
  experimental: {
    serverComponentsExternalPackages: ['leaflet']
  },

  // Image optimization
  images: {
    domains: ['cdnjs.cloudflare.com'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.cloudflare.com',
      },
      {
        protocol: 'https',
        hostname: '**.basemaps.cartocdn.com',
      }
    ],
  },

  // Headers for proper map tile loading
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
        ],
      },
    ]
  },

  // Webpack configuration for Leaflet
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      }
    }

    return config
  }
}

module.exports = nextConfig