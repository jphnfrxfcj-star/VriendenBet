'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'

const groups = [
  { title: 'Overzicht', items: [['Dashboard', '/admin']] },
  { title: 'Deelnemers', items: [['Deelnemers en scores', '/admin/deelnemers'], ['Parameters', '/admin/eigenschappen']] },
  { title: 'Spellen', items: [['Spellen en aanvragen', '/admin/evenementen'], ['Voetbal', '/admin/voetbal']] },
  { title: 'Weddenschappen en saldo', items: [['Weddenschappen', '/admin/weddenschappen'], ['Miel Smash', '/admin/slot'], ['Saldo en transacties', '/admin/wallet'], ['Activiteitenlog', '/admin/auditlog']] },
]
export function AdminNav() {
  const pathname = usePathname()
  const router = useRouter()
  return <>
    <label className="grid gap-2 text-sm font-bold lg:hidden">Ga naar
      <select className="min-h-11 w-full rounded-md border bg-card px-3" value={pathname} onChange={(event) => router.push(event.target.value)}>
        {groups.map((group) => <optgroup key={group.title} label={group.title}>{group.items.map(([label, href]) => <option key={href} value={href}>{label}</option>)}</optgroup>)}
      </select>
    </label>
    <nav aria-label="Beheer" className="hidden gap-4 rounded-md border bg-card p-3 lg:grid">
      {groups.map((group) => <div key={group.title} className="grid gap-1">
        <p className="px-3 py-2 text-xs font-black uppercase text-muted-foreground">{group.title}</p>
        {group.items.map(([label, href]) => <Link key={href} href={href} aria-current={pathname === href ? 'page' : undefined} className={`rounded-md px-3 py-2 text-sm font-bold ${pathname === href ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-secondary hover:text-foreground'}`}>{label}</Link>)}
      </div>)}
    </nav>
  </>
}
