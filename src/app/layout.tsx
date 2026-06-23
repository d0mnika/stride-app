import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import ServiceWorkerRegistration from '@/components/ServiceWorkerRegistration'
import './globals.css'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#F5F1EB',
  viewportFit: 'cover',
}

export const metadata: Metadata = {
  title: 'Stride',
  description: 'Adaptive study planner — build realistic plans, stay on track before exams.',
  manifest: '/manifest.json',
  icons: { apple: '/apple-touch-icon.png' },
  formatDetection: { telephone: false },
  other: {
    'apple-mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'black-translucent',
    'apple-mobile-web-app-title': 'Stride',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <head>
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="apple-touch-icon-precomposed" href="/apple-touch-icon.png" />
      </head>
      <body className="min-h-full flex flex-col">
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <ServiceWorkerRegistration />
        {children}
      </body>
    </html>
  )
}
