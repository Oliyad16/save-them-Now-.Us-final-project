import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import AuthSessionProvider from '@/components/SessionProvider'
import ServiceWorkerProvider from '@/components/ServiceWorkerProvider'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'SaveThemNow.Jesus - Missing Persons Awareness',
  description: 'Helping locate missing persons across the United States',
  manifest: '/manifest.json',
  themeColor: '#000000',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1',
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
        <ServiceWorkerProvider>
          <AuthSessionProvider>
            {children}
          </AuthSessionProvider>
        </ServiceWorkerProvider>
      </body>
    </html>
  )
}