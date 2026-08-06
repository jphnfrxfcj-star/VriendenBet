import Link from 'next/link'
import { Activity, Home, Shield, Trophy, UserRound, WalletCards } from 'lucide-react'
import { getSessionUser } from '@/lib/auth'

const viewerItems = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/weekendspellen', label: 'Spellen', icon: Trophy },
  { href: '/match', label: 'Match', icon: Activity },
  { href: '/live', label: 'Live', icon: WalletCards },
  { href: '/deelnemers', label: 'Spelers', icon: UserRound },
]

export async function AppNav() {
  const user = await getSessionUser()
  const items =
    user?.role === 'ADMIN'
      ? viewerItems.map((item) => (item.href === '/deelnemers' ? { href: '/admin', label: 'Admin', icon: Shield } : item))
      : user?.role === 'MIEL'
      ? viewerItems.map((item) => (item.href === '/live' ? { ...item, href: '/mijn-bets', label: 'Mijn bets' } : item))
      : viewerItems

  return (
    <>
      <header className="sticky top-0 z-30 border-b bg-background/88 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-3 font-black">
            <span className="grid size-10 place-items-center rounded-md border-2 border-primary text-sm text-primary">
              MB
            </span>
            <span>MielBet</span>
          </Link>
          <nav className="hidden items-center gap-6 text-sm font-bold text-muted-foreground md:flex">
            <Link href="/weekendspellen">Weekendspellen</Link>
            <Link href="/match">Miels match</Link>
            <Link href="/deelnemers">Deelnemers</Link>
            <Link href="/spel-voorstellen">Spel voorstellen</Link>
            {user?.role === 'ADMIN' ? (
              <Link href="/admin" className="inline-flex items-center gap-2 text-primary">
                <Shield className="size-4" />
                Admin
              </Link>
            ) : null}
          </nav>
          <Link href={user ? '/profiel' : '/login'} className="rounded-md bg-secondary px-3 py-2 text-sm font-black">
            {user?.displayName ?? 'Login'}
          </Link>
        </div>
      </header>

      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t bg-background/95 px-1 pb-[env(safe-area-inset-bottom)] pt-1 backdrop-blur md:hidden">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex min-h-14 flex-col items-center justify-center gap-1 rounded-md text-[11px] font-bold text-muted-foreground"
          >
            <item.icon className="size-5" />
            {item.label}
          </Link>
        ))}
      </nav>
    </>
  )
}
