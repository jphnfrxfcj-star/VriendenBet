import type { ReactNode } from 'react'
import { AdminNav } from './AdminNav'
import { redirect } from 'next/navigation'
import { requireRole } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export default async function AdminLayout({ children }: { children: ReactNode }) {
  try {
    await requireRole(['ADMIN'])
  } catch {
    redirect('/login')
  }

  return (
    <div className="mx-auto grid w-full max-w-7xl gap-5 px-4 py-6 lg:grid-cols-[220px_minmax(0,1fr)] md:py-10">
      <aside className="min-w-0 self-start lg:sticky lg:top-20"><AdminNav /></aside>
      <div className="grid min-w-0 gap-4">
        {children}
      </div>
    </div>
  )
}
