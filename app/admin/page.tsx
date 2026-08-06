import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { prisma } from '@/lib/prisma'
import { formatCredits } from '@/lib/utils'

export default async function AdminDashboardPage() {
  const [
    activeEvents,
    pendingEvents,
    openSuggestions,
    openFootballMarkets,
    recentBets,
    recentTransactions,
    recentAudit,
    mielWallet,
  ] = await getDashboardData()

  const metrics = [
    ['Actieve evenementen', String(activeEvents), '/admin/evenementen'],
    ['Af te handelen', String(pendingEvents), '/admin/evenementen'],
    ['Miels saldo', mielWallet ? formatCredits(Number(mielWallet.balance)) : 'Geen wallet', '/admin/wallet'],
    ['Open voetbalmarkten', String(openFootballMarkets), '/admin/voetbal'],
    ['Open voorstellen', String(openSuggestions), '/admin/voorstellen'],
  ]

  return (
    <div className="grid gap-5">
      <div>
        <p className="mb-2 text-xs font-black uppercase text-primary">Bert en Jean</p>
        <h1 className="text-4xl font-black tracking-normal">Admin dashboard</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Centrale cockpit voor deelnemers, scores, games, odds, wallet, voorstellen en auditlogs.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {metrics.map(([label, value, href]) => (
          <Link key={label} href={href}>
            <Card className="h-full transition hover:border-primary">
              <CardHeader>
                <CardTitle className="text-sm text-muted-foreground">{label}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-black text-primary">{value}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Recente weddenschappen</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 text-sm text-muted-foreground">
            {recentBets.length ? (
              recentBets.map((bet) => (
                <p key={bet.id}>
                  {bet.event.title} · {bet.selectedTeam.name} · {String(bet.stake)} · {bet.status}
                </p>
              ))
            ) : (
              <p>Nog geen eventbets.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Wallettransacties</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 text-sm text-muted-foreground">
            {recentTransactions.length ? (
              recentTransactions.map((transaction) => (
                <p key={transaction.id}>
                  {transaction.wallet.user.displayName} · {transaction.type} · {formatCredits(Number(transaction.amount))}
                </p>
              ))
            ) : (
              <p>Nog geen transacties.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Auditlog</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 text-sm text-muted-foreground">
            {recentAudit.map((log) => (
              <p key={log.id}>
                {log.action} · {log.entityType} · {log.user?.displayName ?? 'System'}
              </p>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

async function getDashboardData() {
  try {
    return await Promise.all([
      prisma.event.count({ where: { status: { in: ['OPEN_FOR_SELECTION', 'ODDS_READY', 'IN_PROGRESS'] } } }),
      prisma.event.count({ where: { status: { in: ['BET_PLACED', 'IN_PROGRESS'] } } }),
      prisma.gameSuggestion.count({ where: { status: { in: ['SUBMITTED', 'UNDER_REVIEW'] } } }),
      prisma.footballMarket.count({ where: { status: 'OPEN' } }),
      prisma.eventBet.findMany({ include: { event: true, selectedTeam: true }, orderBy: { placedAt: 'desc' }, take: 5 }),
      prisma.walletTransaction.findMany({ include: { wallet: { include: { user: true } } }, orderBy: { createdAt: 'desc' }, take: 5 }),
      prisma.auditLog.findMany({ include: { user: true }, orderBy: { createdAt: 'desc' }, take: 6 }),
      prisma.wallet.findFirst({ where: { user: { role: 'MIEL' } }, include: { user: true } }),
    ])
  } catch (error) {
    if (process.env.NODE_ENV === 'production') {
      throw error
    }

    return [0, 0, 0, 0, [], [], [], null] as const
  }
}
