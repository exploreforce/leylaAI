import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import HeaderAuth from '@/components/HeaderAuth'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Leyla AI Management Centre',
  description: 'AI-powered conversational assistant for premium business services',
  viewport: 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no',
}

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
        <div className="min-h-screen bg-dark-900">
          <HeaderAuth />
          <div className="max-w-6xl mx-auto px-4 py-6">
            {children}
          </div>
        </div>
      </body>
    </html>
  )
} 