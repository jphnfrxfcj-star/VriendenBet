'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useRef } from 'react'
import { Activity, Club, Home, Menu, Trophy, X } from 'lucide-react'

const primary = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/weekendspellen', label: 'Spellen', icon: Trophy },
  { href: '/match', label: 'Match', icon: Activity },
  { href: '/slot', label: 'Slot', icon: Club },
]

export function NavigationLinks({ admin, betting, mobile = false }: { admin: boolean; betting: boolean; mobile?: boolean }) {
  const pathname = usePathname()
  const dialog = useRef<HTMLDialogElement>(null)
  const extra = [
    { href: '/spel-voorstellen', label: 'Spel aanvragen' },
    { href: '/deelnemers', label: 'Deelnemers' },
    { href: '/live', label: 'Live overzicht' },
    ...(betting ? [{ href: '/mijn-bets', label: 'Mijn weddenschappen' }] : []),
    { href: '/profiel', label: 'Profiel' },
    ...(admin ? [{ href: '/admin', label: 'Beheer' }] : []),
  ]
  const active = (href: string) => href === '/' ? pathname === href : pathname === href || pathname.startsWith(`${href}/`)

  if (!mobile) return <nav aria-label="Hoofdnavigatie" className="hidden items-center gap-1 text-sm font-bold xl:flex">
    {[...primary.slice(1), extra[0], extra[1], ...(admin ? [extra[extra.length - 1]] : [])].map(({ href, label }) =>
      <Link key={href} href={href} aria-current={active(href) ? 'page' : undefined} className={`rounded-md px-3 py-3 ${active(href) ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-secondary hover:text-foreground'}`}>{label}</Link>,
    )}
  </nav>

  return <>
    <nav aria-label="Mobiele navigatie" className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t bg-background/95 px-2 pb-[env(safe-area-inset-bottom)] pt-1 backdrop-blur xl:hidden">
      {primary.map(({ href, label, icon: Icon }) => <Link key={href} href={href} aria-current={active(href) ? 'page' : undefined} className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-md text-xs font-bold ${active(href) ? 'bg-primary/10 text-primary' : 'text-muted-foreground'}`}><Icon className="size-5" />{label}</Link>)}
      <button type="button" aria-haspopup="dialog" onClick={() => dialog.current?.showModal()} className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-md text-xs font-bold ${extra.some(({ href }) => active(href)) ? 'bg-primary/10 text-primary' : 'text-muted-foreground'}`}><Menu className="size-5" />Meer</button>
    </nav>
    <dialog ref={dialog} aria-labelledby="navigation-title" onClick={(event) => { if (event.target === event.currentTarget) dialog.current?.close() }} className="fixed inset-0 m-auto w-[calc(100%-2rem)] max-w-sm rounded-xl border bg-card p-4 text-foreground shadow-2xl backdrop:bg-black/65">
      <div className="mb-3 flex items-center justify-between"><h2 id="navigation-title" className="text-lg font-black">Meer ontdekken</h2><button type="button" aria-label="Menu sluiten" onClick={() => dialog.current?.close()} className="grid size-11 place-items-center rounded-md bg-secondary"><X className="size-5" /></button></div>
      <nav aria-label="Alle pagina’s" className="grid gap-2">{extra.map(({ href, label }) => <Link key={href} href={href} onClick={() => dialog.current?.close()} aria-current={active(href) ? 'page' : undefined} className={`rounded-md px-4 py-3 font-bold ${active(href) ? 'bg-primary text-primary-foreground' : 'bg-secondary hover:bg-primary/10'}`}>{label}</Link>)}</nav>
    </dialog>
  </>
}
