import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import AuthSessionProvider from '@/components/SessionProvider'
import ServiceWorkerProvider from '@/components/ServiceWorkerProvider'
import { ClientErrorBoundary } from '@/components/ClientErrorBoundary'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'SaveThemNow.Jesus - Missing Persons Awareness',
  description: 'Helping locate missing persons across the United States',
  manifest: '/manifest.json',
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#000000',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#000000" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="SaveThemNow" />
        <link rel="apple-touch-icon" href="/favicon-192x192.png" />
      </head>
      <body className={inter.className}>
        <ClientErrorBoundary>
          <ServiceWorkerProvider>
            <AuthSessionProvider>
              {children}
            </AuthSessionProvider>
          </ServiceWorkerProvider>
        </ClientErrorBoundary>
      </body>
    </html>
  )
}