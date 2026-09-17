import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import './globals.css'
import { AppNav } from '@/components/AppNav'

export const metadata: Metadata = {
  title: 'MielBet',
  description: 'Ludiek fictief gokplatform met virtuele eurobudgetten voor een besloten weekend.',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="nl" className="dark" data-scroll-behavior="smooth">
      <body>
        <AppNav />
        <main id="main-content" className="sportsbook-grid min-h-[calc(100dvh-4rem)] pb-[calc(5rem+env(safe-area-inset-bottom))] xl:pb-0">{children}</main>
      </body>
    </html>
  )
}
