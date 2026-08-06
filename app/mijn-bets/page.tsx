import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatusBadge } from '@/components/StatusBadge'
import { footballMatch, wallet as demoWallet, weekendEvents } from '@/lib/demo-data'
import { getSessionUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { formatCredits, formatOdd } from '@/lib/utils'

type BetRow = {
  id: string
  type: string
  title: string
  subtitle: string
  status: string
  stake: number
  odds: number
  potentialPayout: number
  selections: string[]
}

type TransactionRow = {
  id: string
  type: string
  amount: number
  description: string
  createdAt: Date
}

type MielData = {
  balance: number
  openStake: number
  possibleReturn: number
  bets: BetRow[]
  transactions: TransactionRow[]
}

const tabConfig = [
  { id: 'open', label: 'Openstaand' },
  { id: 'won', label: 'Gewonnen' },
  { id: 'lost', label: 'Verloren' },
  { id: 'refunded', label: 'Terugbetaald' },
] as const

type BetTab = (typeof tabConfig)[number]['id']

export default async function MyBetsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const params = await searchParams
  const data = await getMielData()
  const pendingBets = data.bets.filter((bet) => ['PENDING', 'PLACED', 'DRAFT'].includes(bet.status))
  const activeTab = tabConfig.some((tab) => tab.id === params.tab) ? (params.tab as BetTab) : 'open'
  const visibleBets = filterBets(data.bets, activeTab)
  const activeTabLabel = tabConfig.find((tab) => tab.id === activeTab)?.label ?? 'Openstaand'
  const tabCounts: Record<BetTab, number> = {
    open: pendingBets.length,
    won: data.bets.filter((bet) => bet.status === 'WON').length,
    lost: data.bets.filter((bet) => bet.status === 'LOST').length,
    refunded: data.bets.filter((bet) => ['REFUNDED', 'PARTIALLY_VOID'].includes(bet.status)).length,
  }

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-6 md:py-10">
      <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
        <div className="min-w-0">
          <p className="mb-2 text-xs font-black uppercase text-primary">Miel only</p>
          <h1 className="text-4xl font-black tracking-normal md:text-5xl">Mijn weddenschappen</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Overzicht van bankroll, open inzetten, mogelijke uitbetalingen en recente walletbewegingen.
          </p>
        </div>
        <div className="w-full rounded-md bg-primary px-4 py-3 text-primary-foreground md:w-auto md:min-w-56">
          <p className="text-xs font-black uppercase">Beschikbaar saldo</p>
          <p className="text-3xl font-black">{formatCredits(data.balance)}</p>
        </div>
      </div>

      <section className="grid gap-3 sm:grid-cols-3">
        <Metric label="Open inzet" value={formatCredits(data.openStake)} />
        <Metric label="Mogelijke return" value={formatCredits(data.possibleReturn)} />
        <Metric label="Openstaand" value={String(pendingBets.length)} />
      </section>

      <nav className="grid grid-cols-2 gap-2 rounded-md border bg-card p-1 text-center text-xs font-black sm:grid-cols-4 sm:text-sm">
        {tabConfig.map((tab) => (
          <Link
            key={tab.id}
            href={`/mijn-bets?tab=${tab.id}`}
            aria-current={activeTab === tab.id ? 'page' : undefined}
            className={`flex min-h-11 items-center justify-center whitespace-nowrap rounded px-3 py-2 transition ${
              activeTab === tab.id
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
            }`}
          >
            {tab.label} <span>({tabCounts[tab.id]})</span>
          </Link>
        ))}
      </nav>

      <section className="grid gap-5 lg:grid-cols-[1fr_360px]">
        <Card>
          <CardHeader>
            <CardTitle>{activeTab === 'open' ? 'Openstaande weddenschappen' : activeTabLabel}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            {visibleBets.length ? (
              visibleBets.map((bet) => <BetCard key={bet.id} bet={bet} />)
            ) : (
              <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                Geen weddenschappen in deze categorie.
              </p>
            )}
          </CardContent>
        </Card>

        <aside className="grid gap-5 lg:sticky lg:top-20 lg:self-start">
          <Card>
            <CardHeader>
              <CardTitle>Bankroll</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
              <WalletLine label="Saldo" value={formatCredits(data.balance)} highlight />
              <WalletLine label="Gereserveerd" value={formatCredits(data.openStake)} />
              <WalletLine label="Max inzet/ticket" value={formatCredits(250)} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Laatste transacties</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2">
              {data.transactions.length ? (
                data.transactions.map((transaction) => (
                  <div key={transaction.id} className="grid gap-1 rounded-md bg-secondary p-3 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <strong>{transaction.type}</strong>
                      <span className={transaction.amount >= 0 ? 'font-black text-primary' : 'font-black text-destructive'}>
                        {formatCredits(transaction.amount)}
                      </span>
                    </div>
                    <p className="text-muted-foreground">{transaction.description}</p>
                  </div>
                ))
              ) : (
                <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                  Nog geen transacties.
                </p>
              )}
            </CardContent>
          </Card>
        </aside>
      </section>

    </div>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="flex min-h-24 items-center justify-between gap-4 p-4 sm:p-5">
        <p className="max-w-32 text-xs font-black uppercase leading-tight text-muted-foreground">{label}</p>
        <p className="text-right text-2xl font-black text-primary sm:text-3xl">{value}</p>
      </CardContent>
    </Card>
  )
}

function BetCard({ bet, compact }: { bet: BetRow; compact?: boolean }) {
  return (
    <article className="grid gap-3 rounded-md border bg-secondary p-4">
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
        <div className="min-w-0">
          <p className="text-xs font-black uppercase text-primary">{bet.type}</p>
          <h2 className="break-words text-xl font-black leading-tight">{bet.title}</h2>
          <p className="text-sm text-muted-foreground">{bet.subtitle}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:grid sm:justify-items-end">
          <StatusBadge status={bet.status} />
          <span className="rounded-md bg-card px-3 py-2 text-sm font-black text-primary">@ {formatOdd(bet.odds)}</span>
        </div>
      </div>
      {!compact && bet.selections.length ? (
        <div className="grid gap-2">
          {bet.selections.map((selection) => (
            <p key={selection} className="rounded-md bg-card px-3 py-2 text-sm font-bold">
              {selection}
            </p>
          ))}
        </div>
      ) : null}
      <div className="grid gap-2 text-sm md:grid-cols-3">
        <WalletLine label="Inzet" value={formatCredits(bet.stake)} />
        <WalletLine label="Mogelijk" value={formatCredits(bet.potentialPayout)} highlight />
        <WalletLine label="Status" value={bet.status} />
      </div>
    </article>
  )
}

function WalletLine({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex min-h-11 items-center justify-between gap-3 rounded-md bg-card px-3 py-2">
      <span className="text-sm font-bold text-muted-foreground">{label}</span>
      <strong className={highlight ? 'text-primary' : ''}>{value}</strong>
    </div>
  )
}

function filterBets(bets: BetRow[], tab: BetTab) {
  if (tab === 'open') return bets.filter((bet) => ['PENDING', 'PLACED', 'DRAFT'].includes(bet.status))
  if (tab === 'won') return bets.filter((bet) => bet.status === 'WON')
  if (tab === 'lost') return bets.filter((bet) => bet.status === 'LOST')
  return bets.filter((bet) => ['REFUNDED', 'PARTIALLY_VOID'].includes(bet.status))
}

async function getMielData(): Promise<MielData> {
  const session = await getSessionUser()
  if (session?.role === 'MIEL') {
    try {
      const [wallet, eventBets, betBuilders] = await Promise.all([
        prisma.wallet.findUnique({
          where: { userId: session.userId },
          include: { transactions: { orderBy: { createdAt: 'desc' }, take: 8 } },
        }),
        prisma.eventBet.findMany({
          where: { mielUserId: session.userId },
          include: { event: true, selectedTeam: true },
          orderBy: { placedAt: 'desc' },
        }),
        prisma.footballBetBuilder.findMany({
          where: { mielUserId: session.userId },
          include: {
            footballMatch: true,
            selections: { include: { footballSelection: true } },
          },
          orderBy: { createdAt: 'desc' },
        }),
      ])

      const bets: BetRow[] = [
        ...eventBets.map((bet) => ({
          id: bet.id,
          type: 'Weekendspel',
          title: bet.event.title,
          subtitle: bet.selectedTeam.name,
          status: bet.status,
          stake: Number(bet.stake),
          odds: Number(bet.oddsAtPlacement),
          potentialPayout: Number(bet.potentialPayout),
          selections: [bet.selectedTeam.name],
        })),
        ...betBuilders.map((builder) => ({
          id: builder.id,
          type: 'Voetbalbetbuilder',
          title: builder.footballMatch.title,
          subtitle: `${builder.selections.length} selecties`,
          status: builder.status,
          stake: Number(builder.stake),
          odds: Number(builder.finalOdds),
          potentialPayout: Number(builder.potentialPayout),
          selections: builder.selections.map((selection) => selection.footballSelection.label),
        })),
      ]

      const openStake = bets
        .filter((bet) => ['PENDING', 'PLACED', 'DRAFT'].includes(bet.status))
        .reduce((sum, bet) => sum + bet.stake, 0)
      const possibleReturn = bets
        .filter((bet) => ['PENDING', 'PLACED', 'DRAFT'].includes(bet.status))
        .reduce((sum, bet) => sum + bet.potentialPayout, 0)

      return {
        balance: wallet ? Number(wallet.balance) : 0,
        openStake,
        possibleReturn,
        bets,
        transactions:
          wallet?.transactions.map((transaction) => ({
            id: transaction.id,
            type: transaction.type,
            amount: Number(transaction.amount),
            description: transaction.description,
            createdAt: transaction.createdAt,
          })) ?? [],
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'production') {
        throw error
      }
    }
  }

  return getDemoMielData()
}

function getDemoMielData(): MielData {
  const bets: BetRow[] = [
    {
      id: 'demo-weekend',
      type: 'Weekendspel',
      title: weekendEvents[0].title,
      subtitle: 'Team Groen',
      status: 'PENDING',
      stake: 50,
      odds: weekendEvents[0].odds[0].finalOdds,
      potentialPayout: 50 * weekendEvents[0].odds[0].finalOdds,
      selections: ['Team Groen wint touwtrekken 4 tegen 4'],
    },
    {
      id: 'demo-football',
      type: 'Voetbalbetbuilder',
      title: footballMatch.title,
      subtitle: '3 selecties',
      status: 'PLACED',
      stake: 50,
      odds: footballMatch.betBuilder.finalOdds,
      potentialPayout: footballMatch.betBuilder.potentialPayout,
      selections: footballMatch.selections.slice(0, 3).map((selection) => selection.label),
    },
  ]
  const openStake = bets.reduce((sum, bet) => sum + bet.stake, 0)
  const possibleReturn = bets.reduce((sum, bet) => sum + bet.potentialPayout, 0)

  return {
    balance: demoWallet.balance,
    openStake,
    possibleReturn,
    bets,
    transactions: [
      {
        id: 'demo-start',
        type: 'STARTING_BALANCE',
        amount: demoWallet.balance,
        description: 'Startbudget weekend',
        createdAt: new Date(),
      },
      {
        id: 'demo-stake',
        type: 'BET_STAKE',
        amount: -openStake,
        description: 'Openstaande inzet',
        createdAt: new Date(),
      },
    ],
  }
}
