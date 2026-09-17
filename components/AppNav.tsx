import Link from 'next/link'
import { ChevronDown } from 'lucide-react'
import { NavigationLinks } from './NavigationLinks'
import { getSessionUser } from '@/lib/auth'
import { wallet as demoWallet } from '@/lib/demo-data'
import { prisma } from '@/lib/prisma'
import { canUseMielMode, roleLabels } from '@/lib/roles'
import { formatCredits } from '@/lib/utils'

export async function AppNav() {
  const user = await getSessionUser()
  const mielBalance = canUseMielMode(user?.role) ? await getMielBalance(user.role === 'MIEL' ? user.userId : undefined) : null

  return (
    <>
      <header className="sticky top-0 z-30 border-b bg-background/88 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-3 px-4">
          <Link href="/" className="flex shrink-0 items-center gap-2 font-black">
            <span className="grid size-10 place-items-center rounded-md border-2 border-primary text-sm text-primary">
              MB
            </span>
            <span>MielBet</span>
          </Link>
          <NavigationLinks admin={user?.role === 'ADMIN'} betting={canUseMielMode(user?.role)} />
          {user ? (
            <details className="group relative">
              <summary className="inline-flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-md bg-secondary px-3 py-2 text-sm font-black [&::-webkit-details-marker]:hidden">
                <span className="max-w-24 truncate sm:max-w-40">{user.displayName}</span>
                {mielBalance !== null ? (
                  <span className="rounded bg-primary px-2 py-1 text-xs text-primary-foreground">
                    {formatCredits(mielBalance)}
                  </span>
                ) : null}
                <ChevronDown className="size-4 text-muted-foreground transition group-open:rotate-180" />
              </summary>
              <div className="absolute right-0 top-[calc(100%+0.5rem)] z-50 grid w-64 max-w-[calc(100vw-2rem)] overflow-hidden rounded-md border bg-card p-1 text-sm font-bold shadow-2xl shadow-black/25">
                <div className="px-3 py-2 text-xs font-black uppercase text-muted-foreground">
                  {roleLabels[user.role]}
                </div>
                <Link href="/profiel" className="rounded px-3 py-2 text-muted-foreground hover:bg-secondary hover:text-foreground">
                  Profiel
                </Link>
                {canUseMielMode(user.role) ? (
                  <Link href="/mijn-bets" className="rounded px-3 py-2 text-muted-foreground hover:bg-secondary hover:text-foreground">
                    Mijn weddenschappen
                  </Link>
                ) : null}
                <Link href="/slot" className="rounded px-3 py-2 text-muted-foreground hover:bg-secondary hover:text-foreground">
                  Miel Smash
                </Link>
                {user.role === 'ADMIN' ? (
                  <>
                    <Link href="/admin/weddenschappen" className="rounded px-3 py-2 text-muted-foreground hover:bg-secondary hover:text-foreground">
                      Admin weddenschappen
                    </Link>
                    <Link href="/admin/slot" className="rounded px-3 py-2 text-muted-foreground hover:bg-secondary hover:text-foreground">
                      Slotbeheer
                    </Link>
                  </>
                ) : null}
              </div>
            </details>
          ) : (
            <Link href="/login" className="inline-flex min-h-11 items-center rounded-md bg-secondary px-3 py-2 text-sm font-black">
              Login
            </Link>
          )}
        </div>
      </header>

      <NavigationLinks mobile admin={user?.role === 'ADMIN'} betting={canUseMielMode(user?.role)} />
    </>
  )
}

async function getMielBalance(userId?: string) {
  try {
    const wallet = userId
      ? await prisma.wallet.findUnique({ where: { userId } })
      : await prisma.wallet.findFirst({ where: { user: { role: 'MIEL', isActive: true } } })
    return wallet ? Number(wallet.balance) : null
  } catch (error) {
    if (process.env.NODE_ENV === 'production') {
      throw error
    }

    return demoWallet.balance
  }
}
