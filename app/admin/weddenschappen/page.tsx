import { AdminCard, AdminPageShell, EmptyState } from '../shared'
import { StatusBadge } from '@/components/StatusBadge'
import { prisma } from '@/lib/prisma'
import { formatCredits, formatOdd } from '@/lib/utils'

type AdminBetRow = {
  id: string
  type: string
  title: string
  selection: string
  user: string
  status: string
  stake: number
  odds: number
  potentialPayout: number
  payout: number | null
  placedAt: Date | null
}

const openStatuses = new Set(['PENDING', 'PLACED', 'DRAFT'])

export default async function AdminBetsPage() {
  const bets = await getAdminBets()
  const openBets = bets.filter((bet) => openStatuses.has(bet.status))
  const settledBets = bets.filter((bet) => !openStatuses.has(bet.status))

  return (
    <AdminPageShell
      title="Weddenschappen"
      subtitle="Alle openstaande en afgehandelde bets van Miel, inclusief inzet, odds, return en payout."
    >
      <section className="grid gap-3 sm:grid-cols-3">
        <Metric label="Openstaand" value={String(openBets.length)} />
        <Metric label="Open inzet" value={formatCredits(openBets.reduce((sum, bet) => sum + bet.stake, 0))} />
        <Metric
          label="Mogelijke return"
          value={formatCredits(openBets.reduce((sum, bet) => sum + bet.potentialPayout, 0))}
        />
      </section>

      <AdminCard title="Openstaande weddenschappen">
        {openBets.length ? (
          <BetList bets={openBets} />
        ) : (
          <EmptyState>Geen openstaande weddenschappen.</EmptyState>
        )}
      </AdminCard>

      <AdminCard title="Wedgeschiedenis">
        {settledBets.length ? (
          <BetList bets={settledBets} />
        ) : (
          <EmptyState>Nog geen afgehandelde weddenschappen.</EmptyState>
        )}
      </AdminCard>
    </AdminPageShell>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-card p-4">
      <p className="text-xs font-black uppercase text-muted-foreground">{label}</p>
      <p className="mt-2 text-3xl font-black text-primary">{value}</p>
    </div>
  )
}

function BetList({ bets }: { bets: AdminBetRow[] }) {
  return (
    <div className="grid gap-3">
      {bets.map((bet) => (
        <article key={bet.id} className="grid gap-3 rounded-md border bg-secondary p-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase text-primary">{bet.type}</p>
              <h2 className="text-xl font-black">{bet.title}</h2>
              <p className="text-sm text-muted-foreground">
                {bet.selection} · {bet.user}
              </p>
            </div>
            <StatusBadge status={bet.status} />
          </div>
          <div className="grid gap-2 text-sm md:grid-cols-5">
            <Line label="Inzet" value={formatCredits(bet.stake)} />
            <Line label="Odd" value={`@ ${formatOdd(bet.odds)}`} highlight />
            <Line label="Mogelijk" value={formatCredits(bet.potentialPayout)} highlight />
            <Line label="Payout" value={bet.payout === null ? '-' : formatCredits(bet.payout)} />
            <Line label="Geplaatst" value={bet.placedAt?.toLocaleString('nl-BE') ?? '-'} />
          </div>
        </article>
      ))}
    </div>
  )
}

function Line({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <p className="flex items-center justify-between gap-3 rounded-md bg-card px-3 py-2">
      <span className="font-bold text-muted-foreground">{label}</span>
      <strong className={highlight ? 'text-primary' : ''}>{value}</strong>
    </p>
  )
}

async function getAdminBets(): Promise<AdminBetRow[]> {
  const [eventBets, builders] = await Promise.all([
    prisma.eventBet.findMany({
      include: { event: true, selectedTeam: true, mielUser: true },
      orderBy: { placedAt: 'desc' },
    }),
    prisma.footballBetBuilder.findMany({
      include: {
        footballMatch: true,
        mielUser: true,
        selections: { include: { footballSelection: true } },
      },
      orderBy: [{ placedAt: 'desc' }, { createdAt: 'desc' }],
    }),
  ])

  return [
    ...eventBets.map((bet) => ({
      id: bet.id,
      type: 'Weekendspel',
      title: bet.event.title,
      selection: bet.selectedTeam.name,
      user: bet.mielUser.displayName,
      status: bet.status,
      stake: Number(bet.stake),
      odds: Number(bet.oddsAtPlacement),
      potentialPayout: Number(bet.potentialPayout),
      payout: bet.payout === null ? null : Number(bet.payout),
      placedAt: bet.placedAt,
    })),
    ...builders.map((builder) => ({
      id: builder.id,
      type: 'Voetbalbetbuilder',
      title: builder.footballMatch.title,
      selection: builder.selections.map((selection) => selection.footballSelection.label).join(' + '),
      user: builder.mielUser.displayName,
      status: builder.status,
      stake: Number(builder.stake),
      odds: Number(builder.finalOdds),
      potentialPayout: Number(builder.potentialPayout),
      payout: builder.payout === null ? null : Number(builder.payout),
      placedAt: builder.placedAt ?? builder.createdAt,
    })),
  ].sort((a, b) => (b.placedAt?.getTime() ?? 0) - (a.placedAt?.getTime() ?? 0))
}
