import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import HeaderAuth from '@/components/HeaderAuth'
import { DynamicTranslationProvider } from '@/components/providers/DynamicTranslationProvider'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Leyla Suite',
  description: 'AI-powered conversational assistant for premium business services',
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link href="/themes/calendar_rouge_district.css" rel="stylesheet" />
      </head>
      <body className={inter.className}>
        <DynamicTranslationProvider>
          <div className="min-h-screen bg-dark-900">
            <HeaderAuth />
            <div className="max-w-6xl mx-auto px-4 py-6">
              {children}
            </div>
          </div>
        </DynamicTranslationProvider>
      </body>
    </html>
  )
} 