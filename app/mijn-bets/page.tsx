import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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

export default async function MyBetsPage() {
  const data = await getMielData()
  const pendingBets = data.bets.filter((bet) => ['PENDING', 'PLACED', 'DRAFT'].includes(bet.status))
  const settledBets = data.bets.filter((bet) => !['PENDING', 'PLACED', 'DRAFT'].includes(bet.status))

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-6 md:py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-2 text-xs font-black uppercase text-primary">Miel only</p>
          <h1 className="text-4xl font-black tracking-normal md:text-5xl">Mijn bets</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Overzicht van bankroll, open inzetten, mogelijke uitbetalingen en recente walletbewegingen.
          </p>
        </div>
        <div className="rounded-md bg-primary px-4 py-3 text-primary-foreground">
          <p className="text-xs font-black uppercase">Beschikbaar saldo</p>
          <p className="text-3xl font-black">{formatCredits(data.balance)}</p>
        </div>
      </div>

      <section className="grid gap-3 sm:grid-cols-3">
        <Metric label="Open inzet" value={formatCredits(data.openStake)} />
        <Metric label="Mogelijke return" value={formatCredits(data.possibleReturn)} />
        <Metric label="Open tickets" value={String(pendingBets.length)} />
      </section>

      <div className="grid grid-cols-4 overflow-hidden rounded-md border text-center text-xs font-black sm:text-sm">
        {[
          ['Openstaand', pendingBets.length],
          ['Gewonnen', data.bets.filter((bet) => bet.status === 'WON').length],
          ['Verloren', data.bets.filter((bet) => bet.status === 'LOST').length],
          ['Terugbetaald', data.bets.filter((bet) => ['REFUNDED', 'PARTIALLY_VOID'].includes(bet.status)).length],
        ].map(([tab, count], index) => (
          <div key={tab} className={index === 0 ? 'bg-primary p-3 text-primary-foreground' : 'bg-card p-3 text-muted-foreground'}>
            {tab} <span className="hidden sm:inline">({count})</span>
          </div>
        ))}
      </div>

      <section className="grid gap-5 lg:grid-cols-[1fr_360px]">
        <Card>
          <CardHeader>
            <CardTitle>Open tickets</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            {pendingBets.length ? (
              pendingBets.map((bet) => <BetCard key={bet.id} bet={bet} />)
            ) : (
              <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                Geen open tickets.
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

      {settledBets.length ? (
        <Card>
          <CardHeader>
            <CardTitle>Afgehandeld</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            {settledBets.map((bet) => <BetCard key={bet.id} bet={bet} compact />)}
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs font-black uppercase text-muted-foreground">{label}</p>
        <p className="mt-2 text-3xl font-black text-primary">{value}</p>
      </CardContent>
    </Card>
  )
}

function BetCard({ bet, compact }: { bet: BetRow; compact?: boolean }) {
  return (
    <article className="grid gap-3 rounded-md border bg-secondary p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase text-primary">{bet.type}</p>
          <h2 className="text-xl font-black">{bet.title}</h2>
          <p className="text-sm text-muted-foreground">{bet.subtitle}</p>
        </div>
        <span className="rounded-md bg-card px-3 py-2 text-sm font-black text-primary">@ {formatOdd(bet.odds)}</span>
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
      <div className="grid gap-2 text-sm sm:grid-cols-3">
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
