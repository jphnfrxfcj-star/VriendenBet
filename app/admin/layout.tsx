import Link from 'next/link'
import { redirect } from 'next/navigation'
import { requireRole } from '@/lib/auth'

const items = [
  ['Dashboard', '/admin'],
  ['Deelnemers', '/admin/deelnemers'],
  ['Eigenschappen', '/admin/eigenschappen'],
  ['Templates', '/admin/templates'],
  ['Evenementen', '/admin/evenementen'],
  ['Voetbal', '/admin/voetbal'],
  ['Wallet', '/admin/wallet'],
  ['Voorstellen', '/admin/voorstellen'],
  ['Auditlog', '/admin/auditlog'],
]

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  try {
    await requireRole(['ADMIN'])
  } catch {
    redirect('/login')
  }

  return (
    <div className="mx-auto grid w-full max-w-7xl gap-5 px-4 py-6 md:grid-cols-[240px_1fr] md:py-10">
      <aside className="hidden rounded-md border bg-card p-3 md:block">
        <p className="px-3 py-2 text-xs font-black uppercase text-primary">Admin</p>
        <nav className="grid gap-1">
          {items.map(([label, href]) => (
            <Link key={href} href={href} className="rounded-md px-3 py-2 text-sm font-bold text-muted-foreground hover:bg-secondary hover:text-foreground">
              {label}
            </Link>
          ))}
        </nav>
      </aside>
      <div>{children}</div>
    </div>
  )
}
