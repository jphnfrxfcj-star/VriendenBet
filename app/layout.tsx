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
        <main className="sportsbook-grid min-h-[calc(100vh-4rem)] pb-20 md:pb-0">{children}</main>
      </body>
    </html>
  )
}
