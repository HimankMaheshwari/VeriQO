import type { Metadata } from 'next'
import '@/styles/globals.css'
import { Toaster } from 'react-hot-toast'
import { SessionProvider } from 'next-auth/react'

export const metadata: Metadata = {
  title: {
    default: 'VeriQO — Legal Metrology Compliance Platform',
    template: '%s | VeriQO',
  },
  description:
    'VeriQO is an AI-assisted Legal Metrology compliance and consumer-protection platform for packaged commodities in India.',
  keywords: ['Legal Metrology', 'Packaged Commodities', 'Compliance', 'India', 'Consumer Protection'],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>
        <SessionProvider>
          {children}
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                background: 'var(--bg-surface)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-strong)',
                borderRadius: 'var(--radius-md)',
                fontSize: 'var(--text-sm)',
              },
            }}
          />
        </SessionProvider>
      </body>
    </html>
  )
}
